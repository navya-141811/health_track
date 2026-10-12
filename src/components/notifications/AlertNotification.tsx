/**
 * AlertNotification — two-tier alert system.
 *
 * Tier 1 — Abnormal (priority: "review"):
 *   A slide-in notification toast (bottom-right), auto-dismisses after 12s.
 *   No sound. Calm amber styling.
 *
 * Tier 2 — Emergency (priority: "urgent"):
 *   A full-width red banner at the top + plays the AlarmSound buzzer.
 *   Stays until caregiver dismisses it.
 *
 * Watches for NEW events (status === 'new') and triggers accordingly.
 */
import { useEffect, useRef, useState } from 'react'
import { useSimulator } from '../../simulator/SimulatorContext'
import { AlarmSound } from '../../simulator/AlarmSound'
import type { CareEvent } from '../../types'

// ── Emergency Banner ──────────────────────────────────────────────────────────

function EmergencyBanner({
  events,
  onDismiss,
}: {
  events: CareEvent[]
  onDismiss: () => void
}) {
  const stopAlarm = () => {
    AlarmSound.stop()
    onDismiss()
  }

  if (events.length === 0) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg"
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Pulsing icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-red-400 animate-ping absolute" />
            <div className="w-8 h-8 rounded-full bg-red-300 flex items-center justify-center relative">
              <svg className="w-4 h-4 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <p className="font-bold text-sm">
              🚨 EMERGENCY — {events.length} urgent alert{events.length > 1 ? 's' : ''} active
            </p>
            <p className="text-xs text-red-100 mt-0.5">
              {events.map((e) => {
                const rk = e.rule_key?.split(':')[1] ?? ''
                const labels: Record<string, string> = {
                  hr_upper: 'Heart rate too high',
                  hr_lower: 'Heart rate too low',
                  spo2_lower: 'Oxygen level critically low',
                  temp_upper: 'Temperature too high',
                  temp_lower: 'Temperature too low',
                }
                return labels[rk] ?? 'Vital sign out of range'
              }).join(' · ')}
            </p>
          </div>
        </div>
        <button
          onClick={stopAlarm}
          className="flex-shrink-0 rounded-lg border border-red-300 bg-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
        >
          Stop Alarm
        </button>
      </div>
    </div>
  )
}

// ── Abnormal Toast ────────────────────────────────────────────────────────────

interface Toast {
  id: string
  message: string
  detail: string
}

function AbnormalToast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 12000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 shadow-lg max-w-sm animate-in slide-in-from-right"
    >
      <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-orange-800">{toast.message}</p>
        <p className="text-xs text-orange-600 mt-0.5">{toast.detail}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="text-orange-300 hover:text-orange-500 text-xs"
      >✕</button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AlertNotification() {
  const { events } = useSimulator()
  const seenIdsRef = useRef<Set<string>>(new Set())

  const [emergencyEvents, setEmergencyEvents] = useState<CareEvent[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    for (const event of events) {
      if (seenIdsRef.current.has(event.event_id)) continue
      if (event.status !== 'new') continue
      if (event.category === 'data_quality') continue

      seenIdsRef.current.add(event.event_id)

      if (event.priority === 'urgent') {
        // Tier 2 — Emergency: banner + alarm
        setEmergencyEvents((prev) => {
          if (prev.some((e) => e.event_id === event.event_id)) return prev
          return [...prev, event]
        })
        AlarmSound.playUrgent()
      } else if (event.priority === 'review') {
        // Tier 1 — Abnormal: notification toast only
        const rk = event.rule_key?.split(':')[1] ?? ''
        const labels: Record<string, string> = {
          temp_upper: 'Temperature rising',
          temp_lower: 'Temperature dropping',
        }
        const toast: Toast = {
          id: `toast-${event.event_id}`,
          message: labels[rk] ?? 'Reading outside normal range',
          detail: event.explanation.replace(' Simulated reading — not a medical diagnosis.', ''),
        }
        setToasts((prev) => [...prev, toast])
      }
    }
  }, [events])

  // When urgent events get resolved/acknowledged externally, clean up the banner
  useEffect(() => {
    setEmergencyEvents((prev) =>
      prev.filter((e) => {
        const current = events.find((ev) => ev.event_id === e.event_id)
        return current && current.status !== 'resolved'
      }),
    )
  }, [events])

  const dismissEmergency = () => {
    setEmergencyEvents([])
    AlarmSound.stop()
  }

  const dismissToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <>
      {/* Emergency banner */}
      <EmergencyBanner events={emergencyEvents} onDismiss={dismissEmergency} />

      {/* Abnormal toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
          {toasts.map((t) => (
            <AbnormalToast key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </>
  )
}
