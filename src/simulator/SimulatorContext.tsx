/**
 * SimulatorContext — wires the SimulatorEngine, FreshnessMonitor, RuleEngine,
 * ReadingHistoryStore, and EventStore into React state.
 *
 * Only this context touches React state. All business logic stays in the pure
 * engine/store classes.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SimulatorEngine } from '../simulator/SimulatorEngine'
import { FreshnessMonitor } from '../engine/FreshnessMonitor'
import { RuleEngine } from '../engine/RuleEngine'
import { ReadingHistoryStore } from '../store/ReadingHistoryStore'
import { EventStore } from '../store/EventStore'
import { PATIENTS, PATIENTS_BY_ID } from '../data/patients'
import type {
  CareEvent,
  FreshnessState,
  ScenarioId,
  SimulatorStatus,
  VitalReading,
} from '../types'

// ── Context shape ─────────────────────────────────────────────────────────────

export interface SimulatorContextValue {
  // Simulator controls
  status: SimulatorStatus
  scenarioId: ScenarioId
  patientId: string
  tickInterval: number
  speedMultiplier: number
  tickPosition: number

  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  setScenario: (id: ScenarioId) => void
  setPatient: (id: string) => void
  setTickInterval: (ms: number) => void
  setSpeed: (multiplier: number) => void
  triggerManualAssistance: () => void

  // Data
  readingHistories: Record<string, VitalReading[]>
  events: CareEvent[]
  freshnessStates: Record<string, FreshnessState>

  // Event actions
  acknowledgeEvent: (event_id: string) => void
  resolveEvent: (event_id: string) => void

  // Freshness config
  staleTimeoutMs: number
  setStaleTimeoutMs: (ms: number) => void
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SCENARIO: ScenarioId = 'S01'
const DEFAULT_PATIENT = PATIENTS[0].patient_id
const DEFAULT_TICK_MS = 2000
const DEFAULT_STALE_TIMEOUT_MS = 5000

// ── Context ───────────────────────────────────────────────────────────────────

const SimulatorCtx = createContext<SimulatorContextValue | null>(null)

export function useSimulator(): SimulatorContextValue {
  const ctx = useContext(SimulatorCtx)
  if (!ctx) throw new Error('useSimulator must be used inside SimulatorProvider')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  // ── React state (drives re-renders) ───────────────────────────────────────
  const [status, setStatus] = useState<SimulatorStatus>('idle')
  const [scenarioId, setScenarioId] = useState<ScenarioId>(DEFAULT_SCENARIO)
  const [patientId, setPatientId] = useState<string>(DEFAULT_PATIENT)
  const [tickInterval, setTickIntervalState] = useState(DEFAULT_TICK_MS)
  const [speedMultiplier, setSpeedMultiplierState] = useState(1)
  const [tickPosition, setTickPosition] = useState(0)
  const [readingHistories, setReadingHistories] = useState<Record<string, VitalReading[]>>({})
  const [events, setEvents] = useState<CareEvent[]>([])
  const [freshnessStates, setFreshnessStates] = useState<Record<string, FreshnessState>>({})
  const [staleTimeoutMs, setStaleTimeoutMsState] = useState(DEFAULT_STALE_TIMEOUT_MS)

  // ── Stable store/engine refs (never recreated) ────────────────────────────
  const eventStoreRef = useRef(new EventStore())
  const historyStoreRef = useRef(new ReadingHistoryStore())
  const ruleEngineRef = useRef(new RuleEngine(eventStoreRef.current))

  const freshnessMonitorRef = useRef(
    new FreshnessMonitor(eventStoreRef.current, {
      onFreshnessChange: (pid, state) => {
        setFreshnessStates((prev) => ({ ...prev, [pid]: state }))
        // Sync events state when a data_quality event is created/resolved
        setEvents([...eventStoreRef.current.getAll()])
      },
    }, { stale_timeout_ms: DEFAULT_STALE_TIMEOUT_MS }),
  )

  const engineRef = useRef(
    new SimulatorEngine(
      {
        patient_id: DEFAULT_PATIENT,
        scenario_id: DEFAULT_SCENARIO,
        tick_interval_ms: DEFAULT_TICK_MS,
        speed_multiplier: 1,
      },
      {
        onReading: (reading) => {
          historyStoreRef.current.addReading(reading)
          setReadingHistories(historyStoreRef.current.getAllHistories())

          // Update freshness
          freshnessMonitorRef.current.onReadingReceived(reading.patient_id, reading.timestamp)

          // Rule evaluation
          const patient = PATIENTS_BY_ID[reading.patient_id]
          if (patient) {
            ruleEngineRef.current.evaluate(reading, patient)
            setEvents([...eventStoreRef.current.getAll()])
          }
        },
        onTick: (position, _isGap) => {
          setTickPosition(position)
        },
        onStatusChange: (s) => {
          setStatus(s)
          freshnessMonitorRef.current.onSimulatorStatusChange(s)
        },
      },
    ),
  )

  // ── Mount: register patients and start freshness loop ─────────────────────
  useEffect(() => {
    for (const p of PATIENTS) {
      freshnessMonitorRef.current.registerPatient(p.patient_id)
    }
    freshnessMonitorRef.current.start()

    return () => {
      freshnessMonitorRef.current.stop()
      engineRef.current.reset()
    }
  }, [])

  // ── Controls ──────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    engineRef.current.start()
  }, [])

  const pause = useCallback(() => {
    engineRef.current.pause()
  }, [])

  const resume = useCallback(() => {
    engineRef.current.resume()
  }, [])

  const reset = useCallback(() => {
    engineRef.current.reset()
    eventStoreRef.current.clearAll()
    historyStoreRef.current.clearAll()
    ruleEngineRef.current.resetPatient(patientId)
    setReadingHistories({})
    setEvents([])
    setTickPosition(0)
    for (const p of PATIENTS) {
      freshnessMonitorRef.current.resetPatient(p.patient_id)
    }
    setFreshnessStates({})
  }, [patientId])

  const setScenario = useCallback((id: ScenarioId) => {
    engineRef.current.setScenario(id)
    setScenarioId(id)
  }, [])

  const setPatient = useCallback((id: string) => {
    engineRef.current.setPatient(id)
    setPatientId(id)
  }, [])

  const setTickInterval = useCallback((ms: number) => {
    engineRef.current.setTickInterval(ms)
    setTickIntervalState(ms)
  }, [])

  const setSpeed = useCallback((multiplier: number) => {
    engineRef.current.setSpeed(multiplier)
    setSpeedMultiplierState(multiplier)
  }, [])

  const triggerManualAssistance = useCallback(() => {
    const patient = PATIENTS_BY_ID[patientId]
    eventStoreRef.current.createAssistanceEvent({
      patient_id: patientId,
      explanation:
        `Manual assistance requested for ${patient?.name ?? patientId} by the caregiver. ` +
        `This event was created independently of any vital-sign reading.`,
    })
    setEvents([...eventStoreRef.current.getAll()])
  }, [patientId])

  const acknowledgeEvent = useCallback((event_id: string) => {
    eventStoreRef.current.acknowledgeEvent(event_id)
    setEvents([...eventStoreRef.current.getAll()])
  }, [])

  const resolveEvent = useCallback((event_id: string) => {
    eventStoreRef.current.resolveEvent(event_id)
    setEvents([...eventStoreRef.current.getAll()])
  }, [])

  const setStaleTimeoutMs = useCallback((ms: number) => {
    freshnessMonitorRef.current.setStaletimeout(ms)
    setStaleTimeoutMsState(ms)
  }, [])


  const value = useMemo<SimulatorContextValue>(
    () => ({
      status,
      scenarioId,
      patientId,
      tickInterval,
      speedMultiplier,
      tickPosition,
      start,
      pause,
      resume,
      reset,
      setScenario,
      setPatient,
      setTickInterval,
      setSpeed,
      triggerManualAssistance,
      readingHistories,
      events,
      freshnessStates,
      acknowledgeEvent,
      resolveEvent,
      staleTimeoutMs,
      setStaleTimeoutMs,
    }),
    [
      status, scenarioId, patientId, tickInterval, speedMultiplier, tickPosition,
      start, pause, resume, reset, setScenario, setPatient, setTickInterval, setSpeed,
      triggerManualAssistance, readingHistories, events, freshnessStates,
      acknowledgeEvent, resolveEvent, staleTimeoutMs, setStaleTimeoutMs,
    ],
  )

  return <SimulatorCtx.Provider value={value}>{children}</SimulatorCtx.Provider>
}
