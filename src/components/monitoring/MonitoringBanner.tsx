/**
 * MonitoringBanner -- light-theme status strip at the top of the monitoring view.
 */
import { useEffect, useState } from 'react'
import type { FreshnessState } from '../../types'

interface Props { freshnessState: FreshnessState; patientName: string }

function formatElapsed(ms: number): string {
  if (ms < 5000) return 'just now'
  if (ms < 60_000) return `${Math.floor(ms / 1000)} seconds ago`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s ago`
}

export function MonitoringBanner({ freshnessState, patientName }: Props) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const { status, last_reading_at } = freshnessState
  const elapsed = last_reading_at ? now - new Date(last_reading_at).getTime() : null

  const wrapperClass =
    status === 'fresh'  ? 'border-gray-200 bg-white border-l-4 border-l-green-400' :
    status === 'stale'  ? 'border-amber-200 bg-amber-50 border-l-4 border-l-amber-400' :
    status === 'paused' ? 'border-gray-200 bg-gray-50 border-l-4 border-l-gray-300' :
                          'border-gray-200 bg-white border-l-4 border-l-gray-200'

  const dotClass =
    status === 'fresh'  ? 'bg-green-500 animate-pulse' :
    status === 'stale'  ? 'bg-amber-500' :
    status === 'paused' ? 'bg-gray-300' : 'bg-gray-200'

  const stateLabel =
    status === 'fresh'  ? 'Receiving readings' :
    status === 'stale'  ? 'Readings stopped'   :
    status === 'paused' ? 'Simulation paused'  : 'Waiting to start'

  const stateLabelColor =
    status === 'fresh'  ? 'text-green-700' :
    status === 'stale'  ? 'text-amber-700' :
    status === 'paused' ? 'text-gray-500'  : 'text-gray-400'

  return (
    <div role="status" aria-label={`Monitoring status for ${patientName}`}
      className={`rounded-xl border px-4 py-3 ${wrapperClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotClass}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900">{patientName}</p>
            <p className={`text-xs ${stateLabelColor}`}>{stateLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Last reading</p>
          <p className="text-sm font-medium text-gray-700">
            {last_reading_at ? new Date(last_reading_at).toLocaleTimeString() : '—'}
          </p>
          {elapsed !== null && elapsed > 2000 && (
            <p className={`text-xs ${status === 'stale' ? 'text-amber-600' : 'text-gray-400'}`}>
              {formatElapsed(elapsed)}
            </p>
          )}
        </div>
      </div>
      {status === 'stale' && (
        <p className="mt-2 text-xs text-amber-700 border-t border-amber-100 pt-2">
          No new readings arriving. Check the device connection.
        </p>
      )}
      {status === 'no_data' && (
        <p className="mt-2 text-xs text-gray-400 border-t border-gray-100 pt-2">
          Readings will begin automatically once the simulation starts.
        </p>
      )}
    </div>
  )
}
