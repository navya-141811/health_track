/**
 * EventPanel -- caregiver-facing alert and activity feed.
 *
 * Three clearly separated sections:
 *   1. Alerts needing attention  (vital_sign, unresolved)
 *   2. Activity log              (vital_sign resolved + assistance)
 *   3. Connection notices        (data_quality — always at bottom, clearly secondary)
 *
 * Language rules:
 *  - No "software alert", "data_quality", "configured limit", "urgent software alert"
 *  - Show what happened in plain English: "Heart rate went high"
 *  - Show the number and what limit it crossed
 *  - Status uses simple words: "Needs attention" / "Seen" / "Closed"
 *  - Data-quality notices are clearly labelled as connection/reading issues, not health alerts
 */
import type { CareEvent } from '../../types'
import { useSimulator } from '../../simulator/SimulatorContext'
import { PATIENTS_BY_ID } from '../../data/patients'

interface Props {
  patientId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  return new Date(iso).toLocaleTimeString()
}

/**
 * Converts internal event data into a caregiver-readable headline and detail.
 * Uses rule_key to identify exactly which metric and direction triggered the alert.
 */
function humanise(event: CareEvent, patientName: string): { headline: string; detail: string } {
  if (event.category === 'assistance') {
    return {
      headline: `Help requested for ${patientName}`,
      detail: 'A caregiver pressed the help request button. No vital-sign change triggered this.',
    }
  }

  if (event.category === 'data_quality') {
    return {
      headline: `Readings stopped arriving for ${patientName}`,
      detail:
        'The simulation stopped sending readings. This is a connection notice, not a health alert. ' +
        'Readings will resume automatically.',
    }
  }

  // vital_sign — use rule_key to build precise plain-English description
  const rk = event.rule_key ?? ''
  const val = event.triggering_value
  const limit = event.configured_limit

  const metricMap: Record<string, { name: string; unit: string }> = {
    hr_upper:   { name: 'Heart rate',           unit: 'BPM' },
    hr_lower:   { name: 'Heart rate',           unit: 'BPM' },
    temp_upper: { name: 'Temperature',          unit: '°C'  },
    temp_lower: { name: 'Temperature',          unit: '°C'  },
    spo2_lower: { name: 'Oxygen saturation',    unit: '%'   },
  }

  // Extract the rule name part after the colon ("patient-001:hr_upper" → "hr_upper")
  const ruleName = rk.includes(':') ? rk.split(':')[1] : rk
  const meta = metricMap[ruleName]

  if (meta && val !== undefined && limit !== undefined) {
    const isUpper = ruleName.endsWith('_upper')
    const direction = isUpper ? 'went above' : 'dropped below'
    const limitLabel = isUpper ? 'upper limit' : 'lower limit'

    return {
      headline: `${meta.name} ${direction} the safe range`,
      detail:
        `${meta.name} was ${val} ${meta.unit} — ${direction} the ${limitLabel} of ${limit} ${meta.unit} ` +
        `set for ${patientName}. Simulated reading only.`,
    }
  }

  // Fallback
  return {
    headline: 'Reading outside normal range',
    detail: event.explanation,
  }
}

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({
  event,
  patientName,
  onAcknowledge,
  onResolve,
}: {
  event: CareEvent
  patientName: string
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}) {
  const { headline, detail } = humanise(event, patientName)
  const isResolved = event.status === 'resolved'
  const isAcknowledged = event.status === 'acknowledged' || event.status === 'escalated'

  // Colour: urgent vital = red, review vital = amber, assistance = orange, quality = gray
  const urgencyBar =
    event.category === 'data_quality'
      ? 'border-l-gray-600'
      : event.priority === 'urgent'
        ? 'border-l-red-500'
        : event.priority === 'review'
          ? 'border-l-amber-500'
          : 'border-l-orange-500'

  const bgClass = isResolved
    ? 'bg-gray-50'
    : event.category === 'data_quality'
      ? 'bg-white'
      : event.priority === 'urgent'
        ? 'bg-red-50'
        : event.priority === 'review'
          ? 'bg-amber-50'
          : 'bg-orange-50'

  const statusLabel =
    isResolved ? 'Closed' :
    isAcknowledged ? 'Seen' :
    event.category === 'data_quality' ? 'Active' :
    'Needs attention'

  const statusColour = isResolved
    ? 'bg-gray-100 text-gray-500'
    : isAcknowledged
      ? 'bg-yellow-100 text-yellow-700'
      : event.category === 'data_quality'
        ? 'bg-gray-100 text-gray-600'
        : 'bg-red-100 text-red-700'

  return (
    <div
      className={`rounded-lg border-l-4 border border-gray-200 p-3 ${urgencyBar} ${bgClass} ${isResolved ? 'opacity-60' : ''}`}
      role="listitem"
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-semibold ${isResolved ? 'text-gray-500' : 'text-gray-900'}`}>
          {headline}
        </p>
        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
          {relativeTime(event.created_at)}
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-600 leading-relaxed">{detail}</p>

      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColour}`}>
          {statusLabel}
        </span>

        {!isResolved && (
          <div className="flex gap-2">
            {!isAcknowledged && event.category !== 'data_quality' && (
              <ActionButton
                label="Mark as seen"
                onClick={() => onAcknowledge(event.event_id)}
                colour="yellow"
              />
            )}
            <ActionButton
              label="Close"
              onClick={() => onResolve(event.event_id)}
              colour="gray"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  colour,
}: {
  label: string
  onClick: () => void
  colour: 'yellow' | 'gray' | 'red'
}) {
  const styles = {
    yellow: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50',
    gray: 'border-gray-300 text-gray-600 hover:bg-gray-100',
    red: 'border-red-300 text-red-600 hover:bg-red-50',
  }
  return (
    <button
      className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-offset-1 ${styles[colour]}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function EventPanel({ patientId }: Props) {
  const { events, acknowledgeEvent, resolveEvent, dynamicPatients } = useSimulator()

  const allPatientsById = {
    ...PATIENTS_BY_ID,
    ...Object.fromEntries(dynamicPatients.map((p) => [p.patient_id, p])),
  }

  const patientName = allPatientsById[patientId]?.name ?? patientId
  const patientEvents = events.filter((e) => e.patient_id === patientId)

  const activeAlerts = patientEvents.filter(
    (e) => e.category === 'vital_sign' && e.status !== 'resolved',
  )
  const activityLog = patientEvents.filter(
    (e) =>
      (e.category === 'vital_sign' && e.status === 'resolved') ||
      e.category === 'assistance',
  )
  const connectionNotices = patientEvents.filter((e) => e.category === 'data_quality')
  const hasAnything = patientEvents.length > 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-5">
      <h2 className="text-sm font-semibold text-gray-700">Alerts &amp; activity</h2>

      {!hasAnything && (
        <p className="text-sm text-gray-400 py-2">
          No alerts yet. Monitoring is running automatically.
        </p>
      )}

      {activeAlerts.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Needs attention ({activeAlerts.length})
          </h3>
          <div className="space-y-2" role="list">
            {activeAlerts.map((e) => (
              <AlertCard
                key={e.event_id}
                event={e}
                patientName={patientName}
                onAcknowledge={acknowledgeEvent}
                onResolve={resolveEvent}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Activity log ──────────────────────────────────────────────────── */}
      {activityLog.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Recent activity
          </h3>
          <div className="space-y-2" role="list">
            {activityLog.map((e) => (
              <AlertCard
                key={e.event_id}
                event={e}
                patientName={patientName}
                onAcknowledge={acknowledgeEvent}
                onResolve={resolveEvent}
              />
            ))}
          </div>
        </section>
      )}

      {connectionNotices.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
            Connection notices
          </h3>
          <div className="space-y-2" role="list">
            {connectionNotices.map((e) => (
              <AlertCard
                key={e.event_id}
                event={e}
                patientName={patientName}
                onAcknowledge={acknowledgeEvent}
                onResolve={resolveEvent}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
