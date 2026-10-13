/**
 * CarePulse test suite
 *
 * Covers:
 *  1.  Scenario determinism — same tick always produces same values
 *  2.  Scenario alert timing — which tick each alert fires on
 *  3.  Multi-metric alerts — temp and SpO2 fire independently of HR
 *  4.  Re-alert after resolve — second crossing fires new event after resolve
 *  5.  SimulatorEngine tick behaviour
 *  6.  Pause / resume — no overlapping timers, no tick skip
 *  7.  Reset — returns to tick 0
 *  8.  Patient separation — histories and events stay isolated
 *  9.  Data-freshness detection (FreshnessMonitor)
 *  10. EventStore category isolation
 *  11. RuleEngine persistence (S04: brief crossing does not fire)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SimulatorEngine } from '../simulator/SimulatorEngine'
import { FreshnessMonitor } from '../engine/FreshnessMonitor'
import { EventStore } from '../store/EventStore'
import { ReadingHistoryStore } from '../store/ReadingHistoryStore'
import { RuleEngine, PERSISTENCE_TICKS } from '../engine/RuleEngine'
import { SCENARIOS_BY_ID } from '../data/scenarios'
import { PATIENTS_BY_ID } from '../data/patients'
import type { VitalReading, SimulatorStatus, FreshnessState } from '../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build a VitalReading with all required fields.
 * spo2_pct defaults to 97 (well within normal range) unless overridden.
 */
function makeReading(
  hr: number,
  temp: number,
  spo2 = 97,
  pid = 'patient-001',
  scenario_id: VitalReading['scenario_id'] = 'S01',
): VitalReading {
  return {
    reading_id: Math.random().toString(36),
    patient_id: pid,
    timestamp: new Date().toISOString(),
    heart_rate_bpm: hr,
    temperature_c: temp,
    spo2_pct: spo2,
    source: 'synthetic',
    scenario_id,
  }
}

function makeReadingCapture() {
  const readings: VitalReading[] = []
  return {
    fn: (r: VitalReading) => { readings.push(r) },
    get calls() { return readings },
    get callCount() { return readings.length },
  }
}

function makeTickCapture() {
  const items: Array<{ position: number; isGap: boolean }> = []
  return {
    fn: (position: number, isGap: boolean) => { items.push({ position, isGap }) },
    get calls() { return items },
  }
}

function makeStatusCapture() {
  const items: SimulatorStatus[] = []
  return {
    fn: (s: SimulatorStatus) => { items.push(s) },
    get calls() { return items },
  }
}

function makeFreshnessCapture() {
  const items: Array<{ pid: string; state: FreshnessState }> = []
  return {
    fn: (pid: string, state: FreshnessState) => { items.push({ pid, state }) },
    get calls() { return items },
    statesFor(pid: string) { return items.filter((i) => i.pid === pid).map((i) => i.state) },
  }
}

function makeCallbacks() {
  const readings = makeReadingCapture()
  const ticks = makeTickCapture()
  const statuses = makeStatusCapture()
  return {
    callbacks: {
      onReading: readings.fn,
      onTick: ticks.fn,
      onStatusChange: statuses.fn,
    },
    readings,
    ticks,
    statuses,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Scenario determinism
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario determinism', () => {
  it('S01 tick 0 always produces hr=72, temp=36.6, spo2=97', () => {
    const step = SCENARIOS_BY_ID['S01'].steps[0]
    expect(step.heart_rate_bpm).toBe(72)
    expect(step.temperature_c).toBe(36.6)
    expect(step.spo2_pct).toBe(97)
  })

  it('S07 ticks 3-9 are all gap ticks', () => {
    const s07 = SCENARIOS_BY_ID['S07']
    for (let t = 3; t <= 9; t++) {
      expect(s07.steps[t].gap).toBe(true)
    }
  })

  it('S07 ticks 0-2 are not gap ticks', () => {
    const s07 = SCENARIOS_BY_ID['S07']
    for (let t = 0; t <= 2; t++) {
      expect(s07.steps[t].gap).toBeFalsy()
    }
  })

  it('S07 ticks 10+ are not gap ticks (readings resume)', () => {
    const s07 = SCENARIOS_BY_ID['S07']
    for (let t = 10; t < s07.loop_length; t++) {
      expect(s07.steps[t].gap).toBeFalsy()
    }
  })

  it('S03 tick 5 is above Priya HR threshold of 100', () => {
    const priya = PATIENTS_BY_ID['patient-001']
    expect(SCENARIOS_BY_ID['S03'].steps[5].heart_rate_bpm).toBeGreaterThan(priya.threshold_hr_upper)
  })

  it('S02 tick 8 crosses all three thresholds for Priya', () => {
    const priya = PATIENTS_BY_ID['patient-001']
    const step = SCENARIOS_BY_ID['S02'].steps[8]
    expect(step.heart_rate_bpm).toBeGreaterThan(priya.threshold_hr_upper)
    expect(step.temperature_c).toBeGreaterThan(priya.threshold_temp_upper)
    expect(step.spo2_pct).toBeLessThan(priya.threshold_spo2_lower)
  })

  it('repeated lookups of same scenario+tick produce identical values', () => {
    const s01 = SCENARIOS_BY_ID['S01']
    const first  = [0,1,2].map((i) => s01.steps[i])
    const second = [0,1,2].map((i) => s01.steps[i])
    expect(first).toEqual(second)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Scenario alert timing
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario alert timing', () => {
  it('S01 produces zero alerts across all ticks (all within range)', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    const priya = PATIENTS_BY_ID['patient-001']
    const s01 = SCENARIOS_BY_ID['S01']
    for (const step of s01.steps) {
      engine.evaluate(makeReading(step.heart_rate_bpm, step.temperature_c, step.spo2_pct), priya)
    }
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(0)
  })

  it(`S03 HR alert fires exactly at tick ${PERSISTENCE_TICKS - 1 + 3} (3rd consecutive crossing)`, () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    const priya = PATIENTS_BY_ID['patient-001']
    const s03 = SCENARIOS_BY_ID['S03']

    // Feed ticks 0-4 (only 2 above threshold at ticks 3,4)
    for (let t = 0; t <= 4; t++) {
      const step = s03.steps[t]
      engine.evaluate(makeReading(step.heart_rate_bpm, step.temperature_c, step.spo2_pct), priya)
    }
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(0) // not yet

    // Tick 5 = 3rd consecutive → alert fires
    const step5 = s03.steps[5]
    engine.evaluate(makeReading(step5.heart_rate_bpm, step5.temperature_c, step5.spo2_pct), priya)
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)
    expect(store.getVitalSignEvents('patient-001')[0].rule_key).toBe('patient-001:hr_upper')
  })

  it('S04 produces zero alerts (only 2 consecutive crossings)', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    const priya = PATIENTS_BY_ID['patient-001']
    const s04 = SCENARIOS_BY_ID['S04']
    for (const step of s04.steps) {
      engine.evaluate(makeReading(step.heart_rate_bpm, step.temperature_c, step.spo2_pct), priya)
    }
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Multi-metric alerts — all three vitals fire independently
// ─────────────────────────────────────────────────────────────────────────────

describe('Multi-metric alerts', () => {
  const priya = PATIENTS_BY_ID['patient-001']
  // Priya's thresholds: HR>100, Temp>37.8, SpO2<93

  it('HR and SpO2 both cross → two separate events with different rule_keys', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)

    // 3 readings: HR above 100 AND SpO2 below 93
    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(103, 37.0, 91), priya) // HR high, SpO2 low
    }

    const events = store.getVitalSignEvents('patient-001')
    expect(events).toHaveLength(2)
    const keys = events.map((e) => e.rule_key).sort()
    expect(keys).toContain('patient-001:hr_upper')
    expect(keys).toContain('patient-001:spo2_lower')
  })

  it('all three metrics crossing simultaneously → three separate events', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)

    // 3 readings: HR above 100, Temp above 37.8, SpO2 below 93
    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(105, 38.0, 90), priya)
    }

    const events = store.getVitalSignEvents('patient-001')
    expect(events).toHaveLength(3)
    const keys = events.map((e) => e.rule_key).sort()
    expect(keys).toContain('patient-001:hr_upper')
    expect(keys).toContain('patient-001:temp_upper')
    expect(keys).toContain('patient-001:spo2_lower')
  })

  it('only temperature crossing → only temperature event, no HR or SpO2 event', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)

    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(80, 38.2, 96), priya) // only temp is above threshold
    }

    const events = store.getVitalSignEvents('patient-001')
    expect(events).toHaveLength(1)
    expect(events[0].rule_key).toBe('patient-001:temp_upper')
  })

  it('only SpO2 dropping → only SpO2 event', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)

    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(75, 36.7, 91), priya) // only SpO2 below threshold
    }

    const events = store.getVitalSignEvents('patient-001')
    expect(events).toHaveLength(1)
    expect(events[0].rule_key).toBe('patient-001:spo2_lower')
  })

  it('S02 scenario produces HR, Temp, and SpO2 alerts all at tick 10', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    const s02 = SCENARIOS_BY_ID['S02']

    for (const step of s02.steps) {
      if (!step.gap) {
        engine.evaluate(makeReading(step.heart_rate_bpm, step.temperature_c, step.spo2_pct), priya)
      }
    }

    const events = store.getVitalSignEvents('patient-001')
    const keys = events.map((e) => e.rule_key)
    expect(keys).toContain('patient-001:hr_upper')
    expect(keys).toContain('patient-001:temp_upper')
    expect(keys).toContain('patient-001:spo2_lower')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Re-alert after resolve — second crossing fires new alert
// ─────────────────────────────────────────────────────────────────────────────

describe('Re-alert after resolve (rise-fall-rise)', () => {
  const priya = PATIENTS_BY_ID['patient-001']

  it('second crossing fires a NEW event after caregiver resolves the first', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)

    // ── First crossing: 3 ticks above HR threshold ─────────────────────
    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(105, 37.0, 96), priya)
    }
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)
    const firstEvent = store.getVitalSignEvents('patient-001')[0]

    // ── Recovery: drops below threshold ───────────────────────────────
    engine.evaluate(makeReading(85, 36.8, 97), priya)
    engine.evaluate(makeReading(80, 36.7, 97), priya)

    // ── Caregiver resolves the first event ────────────────────────────
    store.resolveEvent(firstEvent.event_id)
    expect(store.getById(firstEvent.event_id)?.status).toBe('resolved')

    // ── Second crossing: 3 more ticks above threshold ─────────────────
    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(108, 37.2, 95), priya)
    }

    const allEvents = store.getVitalSignEvents('patient-001')
    const openEvents = allEvents.filter((e) => e.status !== 'resolved')
    // A brand new event should have fired
    expect(openEvents).toHaveLength(1)
    expect(openEvents[0].event_id).not.toBe(firstEvent.event_id)
    expect(openEvents[0].rule_key).toBe('patient-001:hr_upper')
  })

  it('second crossing does NOT fire a new event if the first is still open (unresolved)', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)

    // First crossing
    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(105, 37.0, 96), priya)
    }
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)

    // Recovery — condition clears
    engine.evaluate(makeReading(85, 36.8, 97), priya)
    engine.evaluate(makeReading(80, 36.7, 97), priya)

    // Second crossing — but first event is STILL OPEN (not resolved)
    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(108, 37.2, 95), priya)
    }

    // Still only 1 event — no duplicate while first is open
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)
  })

  it('S03 scenario: first alert fires at tick 5, second fires at tick 10 after resolve', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    const s03 = SCENARIOS_BY_ID['S03']

    // Feed ticks 0-5 → first alert fires at tick 5
    for (let t = 0; t <= 5; t++) {
      const step = s03.steps[t]
      engine.evaluate(makeReading(step.heart_rate_bpm, step.temperature_c, step.spo2_pct), priya)
    }
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)
    const firstAlert = store.getVitalSignEvents('patient-001')[0]

    // Ticks 6-7 recovery
    for (let t = 6; t <= 7; t++) {
      const step = s03.steps[t]
      engine.evaluate(makeReading(step.heart_rate_bpm, step.temperature_c, step.spo2_pct), priya)
    }

    // Caregiver resolves first alert
    store.resolveEvent(firstAlert.event_id)

    // Ticks 8-10: second crossing → second alert fires at tick 10
    for (let t = 8; t <= 10; t++) {
      const step = s03.steps[t]
      engine.evaluate(makeReading(step.heart_rate_bpm, step.temperature_c, step.spo2_pct), priya)
    }

    const allEvents = store.getVitalSignEvents('patient-001')
    const openEvents = allEvents.filter((e) => e.status !== 'resolved')
    expect(openEvents).toHaveLength(1)
    expect(openEvents[0].event_id).not.toBe(firstAlert.event_id)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. SimulatorEngine tick behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulatorEngine tick behaviour', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

  it('does not fire any reading before start() is called', () => {
    const { callbacks, readings } = makeCallbacks()
    new SimulatorEngine({ patient_id: 'patient-001', scenario_id: 'S01' }, callbacks)
    vi.advanceTimersByTime(10_000)
    expect(readings.callCount).toBe(0)
  })

  it('fires onReading after one tick interval when started', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 1000 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(1000)
    expect(readings.callCount).toBe(1)
  })

  it('emitted readings include spo2_pct', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(500)
    expect(typeof readings.calls[0].spo2_pct).toBe('number')
    expect(readings.calls[0].spo2_pct).toBeGreaterThan(0)
  })

  it('reading source is always "synthetic"', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(2000)
    for (const r of readings.calls) {
      expect(r.source).toBe('synthetic')
    }
  })

  it('reading patient_id matches the configured patient', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-002', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(1000)
    expect(readings.calls[0].patient_id).toBe('patient-002')
  })

  it('S07 gap ticks do NOT fire onReading', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S07', tick_interval_ms: 100 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(100 * 10)
    expect(readings.callCount).toBe(3) // ticks 0,1,2 only
  })

  it('S07 gap ticks fire onTick with isGap=true', () => {
    const { callbacks, ticks } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S07', tick_interval_ms: 100 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(100 * 10)
    const gapTicks = ticks.calls.filter((t) => t.isGap === true)
    expect(gapTicks.length).toBe(7)
  })

  it('speed multiplier halves the effective interval', () => {
    const { callbacks } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 2000, speed_multiplier: 2 },
      callbacks,
    )
    expect(engine.getEffectiveInterval()).toBe(1000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Pause / resume
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulatorEngine pause / resume', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

  it('pausing stops reading generation', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(500)
    engine.pause()
    vi.advanceTimersByTime(2000)
    expect(readings.callCount).toBe(1)
  })

  it('resuming continues from where it paused (no tick skip)', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(1500) // 3 ticks
    const posAfter3 = engine.getTickPosition()
    engine.pause()
    vi.advanceTimersByTime(5000)
    expect(engine.getTickPosition()).toBe(posAfter3)
    engine.resume()
    vi.advanceTimersByTime(500)
    expect(readings.callCount).toBe(4)
  })

  it('pause then resume does not create a second timer', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(500)
    engine.pause()
    engine.resume()
    vi.advanceTimersByTime(500)
    expect(readings.callCount).toBe(2)
  })

  it('calling start() while running is a no-op', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    engine.start()
    vi.advanceTimersByTime(500)
    expect(readings.callCount).toBe(1)
  })

  it('status transitions: idle → running → paused → running', () => {
    const { callbacks } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    expect(engine.getStatus()).toBe('idle')
    engine.start();  expect(engine.getStatus()).toBe('running')
    engine.pause();  expect(engine.getStatus()).toBe('paused')
    engine.resume(); expect(engine.getStatus()).toBe('running')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. Reset
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulatorEngine reset', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

  it('reset returns to idle and tick_position 0', () => {
    const { callbacks } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(1500)
    engine.reset()
    expect(engine.getStatus()).toBe('idle')
    expect(engine.getTickPosition()).toBe(0)
  })

  it('reset stops reading generation', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(500)
    engine.reset()
    const count = readings.callCount
    vi.advanceTimersByTime(2000)
    expect(readings.callCount).toBe(count)
  })

  it('after reset, start() fires S01 tick 0 (hr=72, temp=36.6, spo2=97)', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(1500)
    engine.reset()
    engine.start()
    vi.advanceTimersByTime(500)
    const last = readings.calls[readings.callCount - 1]
    expect(last.heart_rate_bpm).toBe(72)
    expect(last.temperature_c).toBe(36.6)
    expect(last.spo2_pct).toBe(97)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. Patient separation
// ─────────────────────────────────────────────────────────────────────────────

describe('Patient separation', () => {
  it('ReadingHistoryStore keeps patient histories separate', () => {
    const store = new ReadingHistoryStore()
    store.addReading(makeReading(72, 36.6, 97, 'patient-001', 'S01'))
    store.addReading(makeReading(68, 36.8, 96, 'patient-002', 'S01'))
    expect(store.getHistory('patient-001')).toHaveLength(1)
    expect(store.getHistory('patient-002')).toHaveLength(1)
    expect(store.getHistory('patient-001')[0].heart_rate_bpm).toBe(72)
    expect(store.getHistory('patient-002')[0].heart_rate_bpm).toBe(68)
  })

  it('getVitalSignEvents returns only events for that patient', () => {
    const store = new EventStore()
    const r1 = makeReading(72, 36.6, 97, 'patient-001', 'S01')
    const r2 = makeReading(68, 36.8, 96, 'patient-002', 'S01')
    store.createVitalSignEvent({
      patient_id: 'patient-001', reading: r1, explanation: 'e1',
      priority: 'review', triggering_value: 72, configured_limit: 100,
      rule_key: 'patient-001:hr_upper',
    })
    store.createVitalSignEvent({
      patient_id: 'patient-002', reading: r2, explanation: 'e2',
      priority: 'urgent', triggering_value: 110, configured_limit: 105,
      rule_key: 'patient-002:hr_upper',
    })
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)
    expect(store.getVitalSignEvents('patient-002')).toHaveLength(1)
  })

  it('clearByPatient only removes that patient\'s events', () => {
    const store = new EventStore()
    store.createVitalSignEvent({
      patient_id: 'patient-001', reading: makeReading(72, 36.6, 97, 'patient-001', 'S01'),
      explanation: 'e1', priority: 'review', triggering_value: 72, configured_limit: 100,
      rule_key: 'patient-001:hr_upper',
    })
    store.createDataQualityEvent({ patient_id: 'patient-002', explanation: 'gap' })
    store.clearByPatient('patient-001')
    expect(store.getAll()).toHaveLength(1)
    expect(store.getAll()[0].patient_id).toBe('patient-002')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. Data-freshness detection
// ─────────────────────────────────────────────────────────────────────────────

describe('FreshnessMonitor', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

  function setup(timeoutMs = 5000) {
    const eventStore = new EventStore()
    const capture = makeFreshnessCapture()
    const monitor = new FreshnessMonitor(
      eventStore,
      { onFreshnessChange: capture.fn },
      { stale_timeout_ms: timeoutMs },
    )
    monitor.registerPatient('patient-001')
    monitor.start()
    return { eventStore, monitor, capture }
  }

  it('normal readings do not trigger a stale warning', () => {
    const { monitor, eventStore } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(2000)
      monitor.onReadingReceived('patient-001', new Date().toISOString())
    }
    expect(eventStore.getDataQualityEvents('patient-001')).toHaveLength(0)
    expect(monitor.getState('patient-001').status).toBe('fresh')
  })

  it('delay shorter than timeout does not trigger stale', () => {
    const { monitor, eventStore } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())
    vi.advanceTimersByTime(4900)
    expect(monitor.getState('patient-001').status).toBe('fresh')
    expect(eventStore.getDataQualityEvents('patient-001')).toHaveLength(0)
  })

  it('delay longer than timeout triggers exactly one data_quality event', () => {
    const { monitor, eventStore } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())
    vi.advanceTimersByTime(6000)
    const dq = eventStore.getDataQualityEvents('patient-001')
    expect(dq).toHaveLength(1)
    expect(dq[0].category).toBe('data_quality')
    vi.advanceTimersByTime(10_000)
    expect(eventStore.getDataQualityEvents('patient-001')).toHaveLength(1)
  })

  it('status becomes stale after timeout', () => {
    const { monitor } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())
    vi.advanceTimersByTime(6000)
    expect(monitor.getState('patient-001').status).toBe('stale')
  })

  it('resuming readings clears stale and resolves the data_quality event', () => {
    const { monitor, eventStore } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())
    vi.advanceTimersByTime(6000)
    const gapEvent = eventStore.getDataQualityEvents('patient-001')[0]
    monitor.onReadingReceived('patient-001', new Date().toISOString())
    expect(monitor.getState('patient-001').status).toBe('fresh')
    expect(eventStore.getById(gapEvent.event_id)?.status).toBe('resolved')
  })

  it('pausing shows "paused" — no data_quality event', () => {
    const { monitor, eventStore } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())
    monitor.onSimulatorStatusChange('paused')
    vi.advanceTimersByTime(10_000)
    expect(monitor.getState('patient-001').status).toBe('paused')
    expect(eventStore.getDataQualityEvents('patient-001')).toHaveLength(0)
  })

  it('onFreshnessChange called on stale transition', () => {
    const { monitor, capture } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())
    vi.advanceTimersByTime(6000)
    const staleCalls = capture.statesFor('patient-001').filter((s) => s.status === 'stale')
    expect(staleCalls.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 10. EventStore category isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('EventStore category isolation', () => {
  it('data_quality events do NOT appear in getVitalSignEvents', () => {
    const store = new EventStore()
    store.createDataQualityEvent({ patient_id: 'patient-001', explanation: 'gap' })
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(0)
  })

  it('vital_sign events do NOT appear in getDataQualityEvents', () => {
    const store = new EventStore()
    store.createVitalSignEvent({
      patient_id: 'patient-001',
      reading: makeReading(105, 37.0, 97, 'patient-001', 'S03'),
      explanation: 'e', priority: 'urgent', triggering_value: 105, configured_limit: 100,
      rule_key: 'patient-001:hr_upper',
    })
    expect(store.getDataQualityEvents('patient-001')).toHaveLength(0)
  })

  it('createDataQualityEvent deduplicates — second call returns null', () => {
    const store = new EventStore()
    const first  = store.createDataQualityEvent({ patient_id: 'patient-001', explanation: 'gap' })
    const second = store.createDataQualityEvent({ patient_id: 'patient-001', explanation: 'again' })
    expect(first).not.toBeNull()
    expect(second).toBeNull()
    expect(store.getDataQualityEvents('patient-001')).toHaveLength(1)
  })

  it('acknowledging does not resolve', () => {
    const store = new EventStore()
    store.createDataQualityEvent({ patient_id: 'patient-001', explanation: 'gap' })
    const event = store.getDataQualityEvents('patient-001')[0]
    store.acknowledgeEvent(event.event_id)
    expect(store.getById(event.event_id)?.status).toBe('acknowledged')
    expect(store.getById(event.event_id)?.resolved_at).toBeUndefined()
  })

  it('assistance events stay in their own category', () => {
    const store = new EventStore()
    store.createAssistanceEvent({ patient_id: 'patient-001', explanation: 'manual' })
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(0)
    expect(store.getDataQualityEvents('patient-001')).toHaveLength(0)
    expect(store.getAssistanceEvents('patient-001')).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 11. RuleEngine persistence
// ─────────────────────────────────────────────────────────────────────────────

describe('RuleEngine persistence', () => {
  const priya = PATIENTS_BY_ID['patient-001']

  it(`${PERSISTENCE_TICKS - 1} consecutive crossings do NOT fire an event`, () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    for (let i = 0; i < PERSISTENCE_TICKS - 1; i++) {
      engine.evaluate(makeReading(103, 37.0, 96), priya)
    }
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(0)
  })

  it(`${PERSISTENCE_TICKS} consecutive crossings fire exactly one event`, () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(103, 37.0, 96), priya)
    }
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)

    // Additional crossings do not create duplicates
    engine.evaluate(makeReading(105, 37.0, 96), priya)
    engine.evaluate(makeReading(103, 37.0, 96), priya)
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)
  })

  it('recovery clears counter but does NOT auto-resolve the event', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    for (let i = 0; i < PERSISTENCE_TICKS; i++) {
      engine.evaluate(makeReading(103, 37.0, 96), priya)
    }
    engine.evaluate(makeReading(80, 36.8, 97), priya) // condition clears

    const events = store.getVitalSignEvents('patient-001')
    expect(events).toHaveLength(1)
    expect(events[0].status).not.toBe('resolved')
  })
})
