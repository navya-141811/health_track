/**
 * DemoControls — simplified caregiver panel (light theme).
 * Auto-start only — shows live status, speed slider, manual help button.
 */
import { useState } from 'react'
import { useSimulator } from '../../simulator/SimulatorContext'

export function DemoControls() {
  const { status, speedMultiplier, tickPosition, setSpeed, triggerManualAssistance } = useSimulator()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isRunning = status === 'running'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Monitoring</h2>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          {isRunning ? 'Live' : status === 'paused' ? 'Paused' : 'Stopped'}
        </span>
      </div>

      {isRunning && (
        <p className="text-xs text-gray-400">Reading #{tickPosition + 1}</p>
      )}

      <div>
        <p className="text-xs text-gray-500 mb-2">
          Press to log a help request regardless of current readings.
        </p>
        <button
          className="w-full rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
          onClick={triggerManualAssistance}
        >
          Request Help for Patient
        </button>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <button
          className="flex w-full items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
        >
          <span>Demo Speed</span>
          <span>{settingsOpen ? '▲' : '▼'}</span>
        </button>

        {settingsOpen && (
          <div className="mt-3 space-y-2">
            <label htmlFor="speed-range" className="block text-xs text-gray-500">
              Readings arrive:&nbsp;
              <strong className="text-gray-700">
                {speedMultiplier === 1 ? 'Normal (2s)' : `${speedMultiplier}× faster`}
              </strong>
            </label>
            <input
              id="speed-range" type="range" min={1} max={5} step={1}
              value={speedMultiplier}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Normal</span><span>5× faster</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
