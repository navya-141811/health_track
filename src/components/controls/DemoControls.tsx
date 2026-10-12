/**
 * DemoControls -- caregiver-facing simulation control panel.
 *
 * Primary section: patient, scenario, and playback buttons.
 * Settings section (collapsed by default): simulation speed and
 * how long before a "no new reading" warning appears.
 */
import { useState } from 'react'
import { useSimulator } from '../../simulator/SimulatorContext'
import { PATIENTS } from '../../data/patients'
import { SCENARIOS } from '../../data/scenarios'
import type { ScenarioId } from '../../types'

/** Human-readable scenario names for caregivers — no IDs shown. */
const SCENARIO_LABELS: Record<string, string> = {
  S01: 'Normal — steady readings',
  S02: 'Gradual rise in readings',
  S03: 'Reading crosses a limit',
  S04: 'Brief spike, then normal',
  S05: 'Readings stay high',
  S06: 'Readings returning to normal',
  S07: 'Readings stop arriving',
  S08: 'Stable — manual help request',
}

const SCENARIO_HINTS: Record<string, string> = {
  S01: 'Readings stay close to the patient\'s normal range. No alert expected.',
  S02: 'Heart rate and temperature slowly climb. Watch the graph for the upward trend.',
  S03: 'A reading goes above the set limit. An alert will appear once it stays high for 3 readings.',
  S04: 'A brief spike above the limit, then recovery. Short enough that no alert fires.',
  S05: 'Readings stay above the limit for a sustained period. One alert is raised.',
  S06: 'Starts high, then comes back down. Existing alerts stay open until you close them.',
  S07: 'Readings stop arriving for several seconds. A "no readings" notice appears (not a vital-sign alert).',
  S08: 'Vitals are stable. Use this scenario to test the manual help-request button below.',
}

export function DemoControls() {
  const {
    status,
    scenarioId,
    patientId,
    speedMultiplier,
    staleTimeoutMs,
    tickPosition,
    start,
    pause,
    resume,
    reset,
    setScenario,
    setPatient,
    setSpeed,
    setStaleTimeoutMs,
    triggerManualAssistance,
  } = useSimulator()

  const [settingsOpen, setSettingsOpen] = useState(false)

  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const isIdle = status === 'idle'

  const statusLabel =
    isRunning ? 'Running' : isPaused ? 'Paused' : 'Stopped'
  const statusDot =
    isRunning ? 'bg-green-500' : isPaused ? 'bg-yellow-500' : 'bg-gray-400'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Simulation controls</h2>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`h-2 w-2 rounded-full ${statusDot}`} />
          {statusLabel}
        </span>
      </div>

      {/* Patient selector */}
      <div>
        <label htmlFor="patient-select" className="block text-xs font-medium text-gray-600 mb-1">
          Patient being monitored
        </label>
        <select
          id="patient-select"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={patientId}
          onChange={(e) => setPatient(e.target.value)}
          disabled={isRunning}
        >
          {PATIENTS.map((p) => (
            <option key={p.patient_id} value={p.patient_id}>
              {p.name}
            </option>
          ))}
        </select>
        {isRunning && (
          <p className="text-xs text-gray-400 mt-1">Pause or stop to switch patient.</p>
        )}
      </div>

      {/* Scenario selector */}
      <div>
        <label htmlFor="scenario-select" className="block text-xs font-medium text-gray-600 mb-1">
          Situation to simulate
        </label>
        <select
          id="scenario-select"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={scenarioId}
          onChange={(e) => setScenario(e.target.value as ScenarioId)}
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {SCENARIO_LABELS[s.id] ?? s.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400 leading-relaxed">
          {SCENARIO_HINTS[scenarioId]}
        </p>
      </div>

      {/* Playback buttons */}
      <div className="flex flex-wrap gap-2">
        {isIdle && (
          <CtrlButton onClick={start} variant="primary" label="Start" />
        )}
        {isRunning && (
          <CtrlButton onClick={pause} variant="secondary" label="Pause" />
        )}
        {isPaused && (
          <CtrlButton onClick={resume} variant="primary" label="Resume" />
        )}
        {!isIdle && (
          <CtrlButton onClick={reset} variant="ghost" label="Stop and reset" />
        )}
      </div>

      {/* Tick counter — only visible when running or paused */}
      {!isIdle && (
        <p className="text-xs text-gray-400">
          Step {tickPosition + 1} of scenario
        </p>
      )}

      {/* Manual help request */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500 mb-2">
          Press this to record a help request regardless of the current readings.
        </p>
        <button
          className="w-full rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
          onClick={triggerManualAssistance}
        >
          Request help for this patient
        </button>
      </div>

      {/* Collapsible settings */}
      <div className="border-t border-gray-100 pt-3">
        <button
          className="flex w-full items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
        >
          <span>Simulation settings</span>
          <span>{settingsOpen ? '▲' : '▼'}</span>
        </button>

        {settingsOpen && (
          <div className="mt-3 space-y-4">
            {/* Speed */}
            <div>
              <label htmlFor="speed-range" className="block text-xs text-gray-500 mb-1">
                How fast readings arrive:&nbsp;
                <strong>
                  {speedMultiplier === 1 ? 'Normal speed' : `${speedMultiplier}× faster`}
                </strong>
              </label>
              <input
                id="speed-range"
                type="range"
                min={1}
                max={5}
                step={1}
                value={speedMultiplier}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>Normal (2 s)</span>
                <span>5× faster</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Higher speed makes the demo move quicker. Useful for presentations.
              </p>
            </div>

            {/* Stale timeout */}
            <div>
              <label htmlFor="stale-timeout" className="block text-xs text-gray-500 mb-1">
                "No readings" notice after:&nbsp;
                <strong>{staleTimeoutMs / 1000} seconds</strong>
              </label>
              <input
                id="stale-timeout"
                type="range"
                min={3000}
                max={15000}
                step={1000}
                value={staleTimeoutMs}
                onChange={(e) => setStaleTimeoutMs(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>3 s</span>
                <span>15 s</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                If no new reading arrives within this time while the simulation is running,
                a notice will appear. This is separate from any vital-sign alert.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CtrlButton({
  onClick,
  variant,
  label,
}: {
  onClick: () => void
  variant: 'primary' | 'secondary' | 'ghost'
  label: string
}) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2'
  const styles = {
    primary: `${base} bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-400`,
    secondary: `${base} bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300`,
    ghost: `${base} bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 focus:ring-gray-200`,
  }
  return (
    <button className={styles[variant]} onClick={onClick}>
      {label}
    </button>
  )
}
