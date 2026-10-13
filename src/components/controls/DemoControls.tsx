/**
 * DemoControls — light-theme caregiver panel.
 * Always-visible speed slider, help button shows selected patient name.
 */
import { useSimulator } from '../../simulator/SimulatorContext'
import { PATIENTS_BY_ID } from '../../data/patients'

interface Props { selectedPatientId?: string }

export function DemoControls({ selectedPatientId }: Props) {
  const { status, speedMultiplier, tickPosition, setSpeed, triggerManualAssistance, dynamicPatients } = useSimulator()
  const isRunning = status === 'running'

  const allPatientsById = { ...PATIENTS_BY_ID, ...Object.fromEntries(dynamicPatients.map((p) => [p.patient_id, p])) }
  const patientName = selectedPatientId ? (allPatientsById[selectedPatientId]?.name ?? 'Patient') : 'Patient'
  const speedLabel = speedMultiplier === 1 ? 'Normal (2s / reading)' : `${speedMultiplier}× faster`

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Monitoring</h2>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          {isRunning ? 'Live' : status === 'paused' ? 'Paused' : 'Stopped'}
        </span>
      </div>

      {isRunning && <p className="text-xs text-gray-400">Reading #{tickPosition + 1}</p>}

      {/* Always-visible speed slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="speed-range" className="text-xs font-medium text-gray-500">Demo speed</label>
          <span className="text-xs font-semibold text-sky-600">{speedLabel}</span>
        </div>
        <input id="speed-range" type="range" min={1} max={5} step={1} value={speedMultiplier}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full accent-sky-500" aria-label="Simulation speed multiplier" />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Normal</span><span>2×</span><span>3×</span><span>4×</span><span>5×</span>
        </div>
      </div>

      {/* Help request button */}
      <div className="border-t border-gray-100 pt-3 space-y-1.5">
        <p className="text-xs text-gray-400">Log a manual help request for the current patient.</p>
        <button
          className="w-full rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors flex items-center justify-center gap-2"
          onClick={triggerManualAssistance}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Request Help — {patientName}
        </button>
      </div>
    </div>
  )
}
