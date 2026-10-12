/**
 * CarePulse test suite
 *
 * Covers:
 *  1. Scenario determinism
 *  2. SimulatorEngine tick behaviour
 *  3. Pause / resume -- no overlapping timers, no tick skip
 *  4. Reset -- returns to tick 0
 *  5. Patient separation
 *  6. Data-freshness detection (FreshnessMonitor)
 *  7. EventStore category isolation
 *  8. RuleEngine persistence (S04: brief crossing does not fire)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SimulatorEngine } from '../simulator/SimulatorEngine'
import { FreshnessMonitor } from '../engine/FreshnessMonitor'
import { EventStore } from '../store/EventStore'
import { ReadingHistoryStore } from '../store/ReadingHistoryStore'
import { RuleEngine } from '../engine/RuleEngine'
import { SCENARIOS_BY_ID } from '../data/scenarios'
import { PATIENTS_BY_ID } from '../data/patients'
import type { VitalReading, SimulatorStatus, FreshnessState } from '../types'

// ── Typed capture helpers (no vi.fn generic syntax that changed in TS 6) ──────

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
  it('S01 tick 0 always produces heart_rate_bpm=72, temperature_c=36.6', () => {
    const s01 = SCENARIOS_BY_ID['S01']
    const step = s01.steps[0]
    expect(step.heart_rate_bpm).toBe(72)
    expect(step.temperature_c).toBe(36.6)
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

  it('S03 tick 5 produces heart_rate_bpm above Eleanor threshold of 100', () => {
    const s03 = SCENARIOS_BY_ID['S03']
    const eleanor = PATIENTS_BY_ID['patient-001']
    expect(s03.steps[5].heart_rate_bpm).toBeGreaterThan(eleanor.threshold_hr_upper)
  })

  it('same scenario + tick index produces the same values on repeated lookups', () => {
    const s01 = SCENARIOS_BY_ID['S01']
    const values = [0, 1, 2, 3, 4].map((i) => ({
      hr: s01.steps[i % s01.loop_length].heart_rate_bpm,
      temp: s01.steps[i % s01.loop_length].temperature_c,
    }))
    const values2 = [0, 1, 2, 3, 4].map((i) => ({
      hr: s01.steps[i % s01.loop_length].heart_rate_bpm,
      temp: s01.steps[i % s01.loop_length].temperature_c,
    }))
    expect(values).toEqual(values2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. SimulatorEngine tick behaviour
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
    // 10 ticks: ticks 0,1,2 produce readings; ticks 3-9 are gaps
    vi.advanceTimersByTime(100 * 10)
    expect(readings.callCount).toBe(3)
  })

  it('S07 gap ticks still fire onTick with isGap=true', () => {
    const { callbacks, ticks } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S07', tick_interval_ms: 100 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(100 * 10)
    const gapTicks = ticks.calls.filter((t) => t.isGap === true)
    expect(gapTicks.length).toBe(7) // ticks 3-9
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
// 3. Pause / resume
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
    vi.advanceTimersByTime(500) // 1 reading
    engine.pause()
    vi.advanceTimersByTime(2000) // paused -- no more readings
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
    vi.advanceTimersByTime(5000) // paused; no change
    expect(engine.getTickPosition()).toBe(posAfter3)
    engine.resume()
    vi.advanceTimersByTime(500) // 1 more tick
    expect(readings.callCount).toBe(4)
  })

  it('pause then resume does not create a second timer (no double-firing)', () => {
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
    // Exactly 2 readings: 1 before pause + 1 after resume
    expect(readings.callCount).toBe(2)
  })

  it('calling start() while running is a no-op (no second timer)', () => {
    const { callbacks, readings } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    engine.start() // second call ignored
    vi.advanceTimersByTime(500)
    expect(readings.callCount).toBe(1)
  })

  it('status transitions correctly: idle -> running -> paused -> running', () => {
    const { callbacks } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    expect(engine.getStatus()).toBe('idle')
    engine.start()
    expect(engine.getStatus()).toBe('running')
    engine.pause()
    expect(engine.getStatus()).toBe('paused')
    engine.resume()
    expect(engine.getStatus()).toBe('running')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reset
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulatorEngine reset', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

  it('reset stops the engine and returns tick_position to 0', () => {
    const { callbacks } = makeCallbacks()
    const engine = new SimulatorEngine(
      { patient_id: 'patient-001', scenario_id: 'S01', tick_interval_ms: 500 },
      callbacks,
    )
    engine.start()
    vi.advanceTimersByTime(1500) // 3 ticks
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
    const countBeforeAdvance = readings.callCount
    vi.advanceTimersByTime(2000)
    expect(readings.callCount).toBe(countBeforeAdvance) // no new readings
  })

  it('after reset, start() fires from tick 0 (S01 first reading = hr:72, temp:36.6)', () => {
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
    const lastReading = readings.calls[readings.callCount - 1]
    expect(lastReading.heart_rate_bpm).toBe(72)
    expect(lastReading.temperature_c).toBe(36.6)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Patient separation
// ─────────────────────────────────────────────────────────────────────────────

describe('Patient separation', () => {
  it('ReadingHistoryStore keeps patient histories separate', () => {
    const store = new ReadingHistoryStore()
    const r1: VitalReading = {
      reading_id: 'r1', patient_id: 'patient-001', timestamp: new Date().toISOString(),
      heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97, source: 'synthetic', scenario_id: 'S01',
    }
    const r2: VitalReading = {
      reading_id: 'r2', patient_id: 'patient-002', timestamp: new Date().toISOString(),
      heart_rate_bpm: 68, temperature_c: 36.8, spo2_pct: 97, source: 'synthetic', scenario_id: 'S01',
    }
    store.addReading(r1)
    store.addReading(r2)
    expect(store.getHistory('patient-001')).toHaveLength(1)
    expect(store.getHistory('patient-002')).toHaveLength(1)
    expect(store.getHistory('patient-001')[0].heart_rate_bpm).toBe(72)
    expect(store.getHistory('patient-002')[0].heart_rate_bpm).toBe(68)
  })

  it('EventStore.getVitalSignEvents returns only events for that patient', () => {
    const store = new EventStore()
    const r: VitalReading = {
      reading_id: 'r1', patient_id: 'patient-001', timestamp: new Date().toISOString(),
      heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97, source: 'synthetic', scenario_id: 'S01',
    }
    store.createVitalSignEvent({
      patient_id: 'patient-001', reading: r, explanation: 'test',
      priority: 'review', triggering_value: 72, configured_limit: 100,
    })
    store.createVitalSignEvent({
      patient_id: 'patient-002',
      reading: { ...r, patient_id: 'patient-002', reading_id: 'r2' },
      explanation: 'test2', priority: 'urgent', triggering_value: 110, configured_limit: 105,
    })
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)
    expect(store.getVitalSignEvents('patient-002')).toHaveLength(1)
  })

  it('clearByPatient only removes that patient\'s events', () => {
    const store = new EventStore()
    const r: VitalReading = {
      reading_id: 'r1', patient_id: 'patient-001', timestamp: new Date().toISOString(),
      heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97, source: 'synthetic', scenario_id: 'S01',
    }
    store.createVitalSignEvent({
      patient_id: 'patient-001', reading: r, explanation: 'e1',
      priority: 'review', triggering_value: 72, configured_limit: 100,
    })
    store.createDataQualityEvent({ patient_id: 'patient-002', explanation: 'gap' })
    store.clearByPatient('patient-001')
    expect(store.getAll()).toHaveLength(1)
    expect(store.getAll()[0].patient_id).toBe('patient-002')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Data-freshness detection
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

    const dqEvents = eventStore.getDataQualityEvents('patient-001')
    expect(dqEvents).toHaveLength(1)
    expect(dqEvents[0].category).toBe('data_quality')

    // Continue advancing -- still only one event (deduplication)
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

  it('resuming readings clears stale state and resolves the data_quality event', () => {
    const { monitor, eventStore } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())

    vi.advanceTimersByTime(6000)
    expect(monitor.getState('patient-001').status).toBe('stale')
    const gapEvent = eventStore.getDataQualityEvents('patient-001')[0]
    expect(gapEvent.status).not.toBe('resolved')

    monitor.onReadingReceived('patient-001', new Date().toISOString())

    expect(monitor.getState('patient-001').status).toBe('fresh')
    expect(eventStore.getById(gapEvent.event_id)?.status).toBe('resolved')
  })

  it('pausing shows "paused" status, not stale -- no data_quality event created', () => {
    const { monitor, eventStore } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())

    monitor.onSimulatorStatusChange('paused')
    vi.advanceTimersByTime(10_000)

    expect(monitor.getState('patient-001').status).toBe('paused')
    expect(eventStore.getDataQualityEvents('patient-001')).toHaveLength(0)
  })

  it('onFreshnessChange is called when state transitions to stale', () => {
    const { monitor, capture } = setup(5000)
    monitor.onSimulatorStatusChange('running')
    monitor.onReadingReceived('patient-001', new Date().toISOString())

    vi.advanceTimersByTime(6000)

    const staleCalls = capture.statesFor('patient-001').filter((s) => s.status === 'stale')
    expect(staleCalls.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. EventStore category isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('EventStore category isolation', () => {
  it('data_quality events do NOT appear in getVitalSignEvents', () => {
    const store = new EventStore()
    store.createDataQualityEvent({ patient_id: 'patient-001', explanation: 'gap' })
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(0)
  })

  it('vital_sign events do NOT appear in getDataQualityEvents', () => {
    const store = new EventStore()
    const r: VitalReading = {
      reading_id: 'r1', patient_id: 'patient-001', timestamp: new Date().toISOString(),
      heart_rate_bpm: 105, temperature_c: 37.0, spo2_pct: 97, source: 'synthetic', scenario_id: 'S03',
    }
    store.createVitalSignEvent({
      patient_id: 'patient-001', reading: r, explanation: 'e',
      priority: 'urgent', triggering_value: 105, configured_limit: 100,
    })
    expect(store.getDataQualityEvents('patient-001')).toHaveLength(0)
  })

  it('createDataQualityEvent returns null on second call (deduplication)', () => {
    const store = new EventStore()
    const first = store.createDataQualityEvent({ patient_id: 'patient-001', explanation: 'gap' })
    const second = store.createDataQualityEvent({ patient_id: 'patient-001', explanation: 'gap again' })
    expect(first).not.toBeNull()
    expect(second).toBeNull()
    expect(store.getDataQualityEvents('patient-001')).toHaveLength(1)
  })

  it('acknowledging does not resolve an event', () => {
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
// 8. RuleEngine persistence
// ─────────────────────────────────────────────────────────────────────────────

describe('RuleEngine persistence (S04 brief crossing does not fire)', () => {
  function makeReading(hr: number, temp: number, pid = 'patient-001'): VitalReading {
    return {
      reading_id: Math.random().toString(36),
      patient_id: pid,
      timestamp: new Date().toISOString(),
      heart_rate_bpm: hr,
      temperature_c: temp,
      source: 'synthetic',
      scenario_id: 'S04',
    }
  }

  it('2 consecutive threshold crossings do NOT fire an event (persistence = 3)', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    const patient = PATIENTS_BY_ID['patient-001'] // threshold_hr_upper = 100

    engine.evaluate(makeReading(102, 37.0), patient)
    engine.evaluate(makeReading(101, 37.0), patient)
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(0)
  })

  it('3+ consecutive crossings DO fire exactly one event', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    const patient = PATIENTS_BY_ID['patient-001']

    engine.evaluate(makeReading(102, 37.0), patient)
    engine.evaluate(makeReading(104, 37.1), patient)
    engine.evaluate(makeReading(106, 37.2), patient) // persistence met
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)

    // More readings still above -- no duplicate
    engine.evaluate(makeReading(105, 37.2), patient)
    engine.evaluate(makeReading(103, 37.1), patient)
    expect(store.getVitalSignEvents('patient-001')).toHaveLength(1)
  })

  it('recovery clears the counter but does NOT auto-resolve the event', () => {
    const store = new EventStore()
    const engine = new RuleEngine(store)
    const patient = PATIENTS_BY_ID['patient-001']

    engine.evaluate(makeReading(102, 37.0), patient)
    engine.evaluate(makeReading(104, 37.1), patient)
    engine.evaluate(makeReading(106, 37.2), patient) // event created
    engine.evaluate(makeReading(80, 36.8), patient)  // condition clears

    const events = store.getVitalSignEvents('patient-001')
    expect(events).toHaveLength(1)
    expect(events[0].status).not.toBe('resolved')
  })
})
