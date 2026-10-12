/**
 * FreshnessStatusBadge — displays the current data-freshness state for a patient.
 *
 * States: fresh | stale | paused | no_data
 * Stale state shows elapsed time since last reading.
 */
import { useEffect, useState } from 'react'
import type { FreshnessState } from '../../types'

interface Props {
  state: FreshnessState
}

function formatElapsed(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s ago`
}

export function FreshnessStatusBadge({ state }: Props) {
  const [now, setNow] = useState(Date.now())

  // Tick every second so elapsed time updates in the UI
  useEffect(() => {
    if (state.status !== 'stale') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [state.status])

  const elapsed = state.last_reading_at
    ? now - new Date(state.last_reading_at).getTime()
    : null

  switch (state.status) {
    case 'fresh':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Fresh
        </span>
      )
    case 'stale':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Stale{elapsed !== null ? ` · ${formatElapsed(elapsed)}` : ''}
        </span>
      )
    case 'paused':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
          Simulation paused
        </span>
      )
    case 'no_data':
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          No data
        </span>
      )
  }
}
