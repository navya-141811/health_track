/**
 * StaleNotification — a small corner notice when readings stop arriving.
 *
 * Deliberately understated: this is NOT a health alert.
 * It means the simulation stopped sending readings.
 * Appears once on transition, auto-dismisses after 8 seconds.
 */
import { useEffect, useRef, useState } from 'react'
import { useSimulator } from '../../simulator/SimulatorContext'
import { PATIENTS_BY_ID } from '../../data/patients'
import type { FreshnessState } from '../../types'

interface Notice {
  id: string
  patientName: string
  since: string
}

export function StaleNotification() {
  const { freshnessStates } = useSimulator()
  const [notices, setNotices] = useState<Notice[]>([])
  const prevRef = useRef<Record<string, FreshnessState>>({})

  useEffect(() => {
    const prev = prevRef.current
    const incoming: Notice[] = []

    for (const [pid, curr] of Object.entries(freshnessStates)) {
      const prevStatus = prev[pid]?.status
      // Only fire on transition into stale (not on every check tick)
      if (prevStatus !== 'stale' && curr.status === 'stale') {
        incoming.push({
          id: `notice-${pid}-${Date.now()}`,
          patientName: PATIENTS_BY_ID[pid]?.name ?? pid,
          since: curr.last_reading_at ?? new Date().toISOString(),
        })
      }
    }

    prevRef.current = { ...freshnessStates }
    if (incoming.length > 0) {
      setNotices((prev) => [...prev, ...incoming])
    }
  }, [freshnessStates])

  const dismiss = (id: string) =>
    setNotices((prev) => prev.filter((n) => n.id !== id))

  if (notices.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="status"
      aria-live="polite"
      aria-label="Reading gap notices"
    >
      {notices.map((n) => (
        <NoticeCard key={n.id} notice={n} onDismiss={dismiss} />
      ))}
    </div>
  )
}

function NoticeCard({
  notice,
  onDismiss,
}: {
  notice: Notice
  onDismiss: (id: string) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notice.id), 8000)
    return () => clearTimeout(timer)
  }, [notice.id, onDismiss])

  const time = new Date(notice.since).toLocaleTimeString()

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md max-w-xs">
      {/* Gray dot — deliberately not red, this is not an emergency */}
      <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-gray-400" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-gray-800">Readings paused</p>
        <p className="text-gray-500 text-xs mt-0.5">
          No new readings for <strong>{notice.patientName}</strong> since {time}.
        </p>
        <p className="text-gray-400 text-xs mt-1 italic">
          This is a simulation gap — not a health alert.
        </p>
      </div>
      <button
        aria-label="Dismiss"
        className="text-gray-300 hover:text-gray-500 focus:outline-none text-xs ml-1"
        onClick={() => onDismiss(notice.id)}
      >
        ✕
      </button>
    </div>
  )
}
