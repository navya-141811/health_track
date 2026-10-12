/**
 * FreshnessMonitor — detects when readings stop arriving.
 *
 * Rules:
 *  1. If a new reading arrives before the timeout, status stays 'fresh'.
 *  2. If no reading arrives before the timeout AND the simulator is running,
 *     status becomes 'stale' and one data_quality event is created.
 *  3. If the simulator is intentionally paused, status is 'paused' (not stale).
 *     No data_quality event is created for a pause.
 *  4. Duplicate stale events are suppressed — one active gap event per patient.
 *  5. When a new reading arrives, the stale state clears and the active
 *     data_quality event is resolved.
 *
 * This class is independent of React. It uses setInterval as a check loop
 * with the configurable timeout, but only the EventStore and a provided
 * callback drive side effects.
 */
import type { FreshnessState, SimulatorStatus } from '../types'
import type { EventStore } from '../store/EventStore'

export interface FreshnessMonitorCallbacks {
  /** Called whenever the freshness status for a patient changes. */
  onFreshnessChange: (patientId: string, state: FreshnessState) => void
}

export interface FreshnessMonitorConfig {
  /** Timeout in ms before a running patient is marked stale. Default: 5000. */
  stale_timeout_ms?: number
}

export class FreshnessMonitor {
  private stale_timeout_ms: number
  private states: Record<string, FreshnessState> = {}
  private timer_id: ReturnType<typeof setInterval> | null = null
  private simulator_status: SimulatorStatus = 'idle'

  private eventStore: EventStore
  private callbacks: FreshnessMonitorCallbacks

  constructor(
    eventStore: EventStore,
    callbacks: FreshnessMonitorCallbacks,
    config?: FreshnessMonitorConfig,
  ) {
    this.eventStore = eventStore
    this.callbacks = callbacks
    this.stale_timeout_ms = config?.stale_timeout_ms ?? 5000
  }

  // ── Configuration ──────────────────────────────────────────────────────────

  setStaletimeout(ms: number): void {
    this.stale_timeout_ms = Math.max(1000, ms)
  }

  getStaletimeout(): number {
    return this.stale_timeout_ms
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Start the check loop. Must be called when the app mounts. */
  start(): void {
    if (this.timer_id !== null) return
    // Check every 500 ms — fine-grained enough for a 2–5 s timeout
    this.timer_id = setInterval(() => this._checkAll(), 500)
  }

  stop(): void {
    if (this.timer_id !== null) {
      clearInterval(this.timer_id)
      this.timer_id = null
    }
  }

  // ── State updates from the outside ────────────────────────────────────────

  /** Called by the React layer whenever the simulator status changes. */
  onSimulatorStatusChange(status: SimulatorStatus): void {
    this.simulator_status = status
    // Immediately re-evaluate all tracked patients
    this._checkAll()
  }

  /**
   * Called whenever a new reading arrives.
   * Clears stale state and resolves the active data_quality event.
   */
  onReadingReceived(patient_id: string, timestamp: string): void {
    const prev = this.states[patient_id]
    const prevStatus = prev?.status

    // Resolve an active gap event if one exists
    const activeGapEvent = this.eventStore.getActiveDataQualityEvent(patient_id)
    if (activeGapEvent) {
      this.eventStore.resolveEvent(activeGapEvent.event_id)
    }

    const next: FreshnessState = {
      patient_id,
      status: 'fresh',
      last_reading_at: timestamp,
      active_gap_event_id: null,
    }
    this.states[patient_id] = next

    if (prevStatus !== 'fresh') {
      this.callbacks.onFreshnessChange(patient_id, next)
    }
  }

  /** Register a patient so it can be tracked before its first reading. */
  registerPatient(patient_id: string): void {
    if (!this.states[patient_id]) {
      this.states[patient_id] = {
        patient_id,
        status: 'no_data',
        last_reading_at: null,
        active_gap_event_id: null,
      }
    }
  }

  getState(patient_id: string): FreshnessState {
    return (
      this.states[patient_id] ?? {
        patient_id,
        status: 'no_data',
        last_reading_at: null,
        active_gap_event_id: null,
      }
    )
  }

  getAllStates(): Record<string, FreshnessState> {
    return { ...this.states }
  }

  /** Reset a patient's freshness state. Called on simulator reset. */
  resetPatient(patient_id: string): void {
    this.states[patient_id] = {
      patient_id,
      status: 'no_data',
      last_reading_at: null,
      active_gap_event_id: null,
    }
    this.callbacks.onFreshnessChange(patient_id, this.states[patient_id])
  }

  // ── Internal check loop ────────────────────────────────────────────────────

  private _checkAll(): void {
    const now = Date.now()
    for (const patient_id of Object.keys(this.states)) {
      this._checkPatient(patient_id, now)
    }
  }

  private _checkPatient(patient_id: string, now: number): void {
    const state = this.states[patient_id]
    if (!state) return

    const { last_reading_at } = state

    // ── Simulator is paused → show 'paused', no stale event ─────────────────
    if (this.simulator_status === 'paused') {
      if (state.status !== 'paused') {
        // Resolve any existing gap event when we transition to paused
        const activeGap = this.eventStore.getActiveDataQualityEvent(patient_id)
        if (activeGap && activeGap.category === 'data_quality') {
          this.eventStore.resolveEvent(activeGap.event_id)
        }
        const next: FreshnessState = {
          ...state,
          status: 'paused',
          active_gap_event_id: null,
        }
        this.states[patient_id] = next
        this.callbacks.onFreshnessChange(patient_id, next)
      }
      return
    }

    // ── Simulator is idle → 'no_data' ────────────────────────────────────────
    if (this.simulator_status === 'idle') {
      if (state.status !== 'no_data') {
        const next: FreshnessState = {
          ...state,
          status: 'no_data',
          active_gap_event_id: null,
        }
        this.states[patient_id] = next
        this.callbacks.onFreshnessChange(patient_id, next)
      }
      return
    }

    // ── Simulator is running ─────────────────────────────────────────────────
    if (!last_reading_at) {
      // No reading yet — still considered fresh during warm-up
      return
    }

    const elapsed = now - new Date(last_reading_at).getTime()

    if (elapsed >= this.stale_timeout_ms) {
      // Mark stale if not already stale
      if (state.status !== 'stale') {
        // Create a data_quality event (deduplicated inside EventStore)
        const newEvent = this.eventStore.createDataQualityEvent({
          patient_id,
          explanation:
            `No new reading has arrived for ${Math.round(elapsed / 1000)} seconds ` +
            `(configured timeout: ${this.stale_timeout_ms / 1000} s). ` +
            `This is a data-freshness warning, not a vital-sign alert. ` +
            `Source: synthetic simulator gap.`,
        })
        const next: FreshnessState = {
          ...state,
          status: 'stale',
          active_gap_event_id: newEvent?.event_id ?? state.active_gap_event_id,
        }
        this.states[patient_id] = next
        this.callbacks.onFreshnessChange(patient_id, next)
      }
      // Already stale — do nothing (deduplication: no second event)
      return
    }

    // Within timeout — mark fresh if coming from a non-fresh state
    if (state.status !== 'fresh') {
      const next: FreshnessState = {
        ...state,
        status: 'fresh',
        active_gap_event_id: null,
      }
      this.states[patient_id] = next
      this.callbacks.onFreshnessChange(patient_id, next)
    }
  }
}
