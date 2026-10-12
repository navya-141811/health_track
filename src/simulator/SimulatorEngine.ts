/**
 * SimulatorEngine — the sole source of synthetic vital-sign readings.
 *
 * Design rules:
 *  - Pure class, no React dependency. Consumed by a React context/hook.
 *  - Deterministic: same scenario + same tick_position → same reading.
 *  - Exactly one setInterval is active at any time; pause/resume never
 *    creates overlapping timers.
 *  - S07 gap ticks produce no reading (gap: true on the step).
 *  - Reset returns to tick 0 and clears all timers.
 *  - Speed multiplier divides tick_interval_ms.
 *
 * Callbacks let the engine remain decoupled from React state:
 *   onReading  — called when a non-gap tick fires.
 *   onTick     — called on every tick including gaps (for position tracking).
 *   onStatusChange — called when running/paused/idle changes.
 */
import { nanoid } from './nanoid'
import { SCENARIOS_BY_ID } from '../data/scenarios'
import type {
  ScenarioId,
  SimulatorStatus,
  VitalReading,
} from '../types'

export interface SimulatorCallbacks {
  onReading: (reading: VitalReading) => void
  onTick: (position: number, isGap: boolean) => void
  onStatusChange: (status: SimulatorStatus) => void
}

export interface SimulatorConfig {
  patient_id: string
  scenario_id: ScenarioId
  /** Base interval between ticks in ms. Default: 2000. */
  tick_interval_ms?: number
  /** Speed multiplier. Effective interval = tick_interval_ms / speed_multiplier. */
  speed_multiplier?: number
}

export class SimulatorEngine {
  private patient_id: string
  private scenario_id: ScenarioId
  private tick_interval_ms: number
  private speed_multiplier: number

  private status: SimulatorStatus = 'idle'
  private tick_position = 0
  private timer_id: ReturnType<typeof setInterval> | null = null

  private callbacks: SimulatorCallbacks

  constructor(config: SimulatorConfig, callbacks: SimulatorCallbacks) {
    this.patient_id = config.patient_id
    this.scenario_id = config.scenario_id
    this.tick_interval_ms = config.tick_interval_ms ?? 2000
    this.speed_multiplier = config.speed_multiplier ?? 1
    this.callbacks = callbacks
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getStatus(): SimulatorStatus {
    return this.status
  }

  getTickPosition(): number {
    return this.tick_position
  }

  getScenarioId(): ScenarioId {
    return this.scenario_id
  }

  getPatientId(): string {
    return this.patient_id
  }

  getEffectiveInterval(): number {
    return Math.max(100, Math.round(this.tick_interval_ms / this.speed_multiplier))
  }

  /** Start from tick 0. Ignored if already running. */
  start(): void {
    if (this.status === 'running') return
    this.tick_position = 0
    this._setStatus('running')
    this._scheduleNextTick()
  }

  /** Pause at the current tick position. Clears the active timer. */
  pause(): void {
    if (this.status !== 'running') return
    this._clearTimer()
    this._setStatus('paused')
  }

  /** Resume from the paused tick position. */
  resume(): void {
    if (this.status !== 'paused') return
    this._setStatus('running')
    this._scheduleNextTick()
  }

  /**
   * Reset to idle, tick 0, no timer.
   * The calling layer is responsible for clearing accumulated readings.
   */
  reset(): void {
    this._clearTimer()
    this.tick_position = 0
    this._setStatus('idle')
  }

  /** Change patient without resetting position. Restarts if running. */
  setPatient(patient_id: string): void {
    const wasRunning = this.status === 'running'
    if (wasRunning) this._clearTimer()
    this.patient_id = patient_id
    if (wasRunning) this._scheduleNextTick()
  }

  /** Change scenario and reset to tick 0. */
  setScenario(scenario_id: ScenarioId): void {
    const wasRunning = this.status === 'running'
    if (wasRunning) this._clearTimer()
    this.scenario_id = scenario_id
    this.tick_position = 0
    if (wasRunning) this._scheduleNextTick()
  }

  /** Adjust base tick interval in ms. Takes effect on next tick. */
  setTickInterval(ms: number): void {
    this.tick_interval_ms = Math.max(200, ms)
    if (this.status === 'running') {
      this._clearTimer()
      this._scheduleNextTick()
    }
  }

  /** Adjust speed multiplier (1–5). Takes effect on next tick. */
  setSpeed(multiplier: number): void {
    this.speed_multiplier = Math.min(5, Math.max(1, multiplier))
    if (this.status === 'running') {
      this._clearTimer()
      this._scheduleNextTick()
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private _setStatus(s: SimulatorStatus): void {
    this.status = s
    this.callbacks.onStatusChange(s)
  }

  private _clearTimer(): void {
    if (this.timer_id !== null) {
      clearInterval(this.timer_id)
      this.timer_id = null
    }
  }

  private _scheduleNextTick(): void {
    // Guard: never create a second interval
    if (this.timer_id !== null) return

    this.timer_id = setInterval(() => {
      this._processTick()
    }, this.getEffectiveInterval())
  }

  private _processTick(): void {
    if (this.status !== 'running') {
      this._clearTimer()
      return
    }

    const scenario = SCENARIOS_BY_ID[this.scenario_id]
    if (!scenario) return

    const step = scenario.steps[this.tick_position % scenario.loop_length]
    const currentPosition = this.tick_position
    const isGap = step.gap === true

    if (!isGap) {
      const reading: VitalReading = {
        reading_id: `reading-${nanoid()}`,
        patient_id: this.patient_id,
        timestamp: new Date().toISOString(),
        heart_rate_bpm: step.heart_rate_bpm,
        temperature_c: step.temperature_c,
        spo2_pct: step.spo2_pct,
        source: 'synthetic',
        scenario_id: this.scenario_id,
      }
      this.callbacks.onReading(reading)
    }

    this.callbacks.onTick(currentPosition, isGap)
    this.tick_position = (this.tick_position + 1) % scenario.loop_length
  }
}
