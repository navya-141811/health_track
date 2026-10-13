/**
 * EventPanel -- light-theme caregiver-facing alert and activity feed.
 */
import { useState } from 'react'
import type { CareEvent } from '../../types'
import { useSimulator } from '../../simulator/SimulatorContext'
import { PATIENTS_BY_ID } from '../../data/patients'

interface Props { patientId: string }

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  return new Date(iso).toLocaleTimeString()
}

function humanise(event: CareEvent, patientName: string): { headline: string; detail: string } {
  if (event.category === 'assistance') return { headline: `Help requested for ${patientName}`, detail: 'A caregiver pressed the help request button. No vital-sign change triggered this.' }
  if (event.category === 'data_quality') return { headline: `Readings stopped arriving for ${patientName}`, detail: 'The simulation stopped sending readings. This is a connection notice, not a health alert. Readings will resume automatically.' }
  const rk = event.rule_key ?? ''
  const val = event.triggering_value
  const limit = event.configured_limit
  const metricMap: Record<string, { name: string; unit: string }> = {
    hr_upper: { name: 'Heart rate', unit: 'BPM' }, hr_lower: { name: 'Heart rate', unit: 'BPM' },
    temp_upper: { name: 'Temperature', unit: '°C' }, temp_lower: { name: 'Temperature', unit: '°C' },
    spo2_lower: { name: 'Oxygen saturation', unit: '%' },
  }
  const ruleName = rk.includes(':') ? rk.split(':')[1] : rk
  const meta = metricMap[ruleName]
  if (meta && val !== undefined && limit !== undefined) {
    const isUpper = ruleName.endsWith('_upper')
    const direction = isUpper ? 'went above' : 'dropped below'
    return { headline: `${meta.name} ${direction} the safe range`, detail: `${meta.name} was ${val} ${meta.unit} — ${direction} the ${isUpper ? 'upper' : 'lower'} limit of ${limit} ${meta.unit} set for ${patientName}. Simulated reading only.` }
  }
  return { headline: 'Reading outside normal range', detail: event.explanation }
}

function AlertCard({ event, patientName, onAcknowledge, onResolve }: {
  event: CareEvent; patientName: string; onAcknowledge: (id: string) => void; onResolve: (id: string) => void
}) {
  const { headline, detail } = humanise(event, patientName)
  const isResolved = event.status === 'resolved'
  const isAcknowledged = event.status === 'acknowledged' || event.status === 'escalated'

  const urgencyBar = event.category === 'data_quality' ? 'border-l-gray-400' : event.priority === 'urgent' ? 'border-l-red-500' : event.priority === 'review' ? 'border-l-amber-500' : 'border-l-orange-500'
  const bgClass = isResolved ? 'bg-gray-50' : event.category === 'data_quality' ? 'bg-white' : event.priority === 'urgent' ? 'bg-red-50' : event.priority === 'review' ? 'bg-amber-50' : 'bg-orange-50'
  const borderClass = isResolved ? 'border-gray-200' : event.category === 'data_quality' ? 'border-gray-200' : event.priority === 'urgent' ? 'border-red-200' : event.priority === 'review' ? 'border-amber-200' : 'border-orange-200'
  const statusLabel = isResolved ? 'Resolved' : isAcknowledged ? 'Acknowledged' : event.category === 'data_quality' ? 'Active' : 'Needs attention'
  const statusBadge = isResolved ? 'bg-gray-100 text-gray-500' : isAcknowledged ? 'bg-amber-100 text-amber-700' : event.category === 'data_quality' ? 'bg-gray-100 text-gray-600' : event.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-700'

  return (
    <div className={`rounded-lg border-l-4 border p-3 ${urgencyBar} ${bgClass} ${borderClass} ${isResolved ? 'opacity-60' : ''}`} role="listitem">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-semibold ${isResolved ? 'text-gray-500' : 'text-gray-900'}`}>{headline}</p>
        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{relativeTime(event.created_at)}</span>
      </div>
      <p className="mt-1 text-xs text-gray-600 leading-relaxed">{detail}</p>
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge}`}>{statusLabel}</span>
        {!isResolved && (
          <div className="flex gap-2">
            {!isAcknowledged && event.category !== 'data_quality' && (
              <ActionButton label="Acknowledge" onClick={() => onAcknowledge(event.event_id)} colour="yellow" />
            )}
            <ActionButton label="Resolve" onClick={() => onResolve(event.event_id)} colour="gray" />
          </div>
        )}
      </div>
    </div>
  )
}

function ActionButton({ label, onClick, colour }: { label: string; onClick: () => void; colour: 'yellow' | 'gray' | 'red' }) {
  const styles = { yellow: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50', gray: 'border-gray-300 text-gray-600 hover:bg-gray-100', red: 'border-red-300 text-red-600 hover:bg-red-50' }
  return <button className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none ${styles[colour]}`} onClick={onClick}>{label}</button>
}

function CollapsibleSection({ title, count, defaultOpen = true, children }: {
  title: React.ReactNode; count: number; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <button className="w-full flex items-center justify-between mb-2 group" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="flex items-center gap-2">{title}</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400 group-hover:text-gray-600">
          <span>{count}</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && <div className="space-y-2" role="list">{children}</div>}
    </section>
  )
}

export function EventPanel({ patientId }: Props) {
  const { events, acknowledgeEvent, resolveEvent, dynamicPatients } = useSimulator()
  const allPatientsById = { ...PATIENTS_BY_ID, ...Object.fromEntries(dynamicPatients.map((p) => [p.patient_id, p])) }
  const patientName = allPatientsById[patientId]?.name ?? patientId
  const patientEvents = events.filter((e) => e.patient_id === patientId)

  const activeAlerts      = patientEvents.filter((e) => e.category === 'vital_sign' && e.status !== 'resolved')
  const resolvedAlerts    = patientEvents.filter((e) => e.category === 'vital_sign' && e.status === 'resolved')
  const activityLog       = patientEvents.filter((e) => e.category === 'assistance')
  const connectionNotices = patientEvents.filter((e) => e.category === 'data_quality')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Alerts &amp; activity</h2>
        {activeAlerts.length > 0 && (
          <span className="rounded-full bg-red-500 text-white text-xs font-semibold px-2.5 py-0.5">{activeAlerts.length} urgent</span>
        )}
      </div>

      {patientEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm text-gray-400">No alerts yet. Monitoring is running automatically.</p>
        </div>
      )}

      {activeAlerts.length > 0 && (
        <CollapsibleSection title={<span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-600"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />Needs attention</span>} count={activeAlerts.length}>
          {activeAlerts.map((e) => <AlertCard key={e.event_id} event={e} patientName={patientName} onAcknowledge={acknowledgeEvent} onResolve={resolveEvent} />)}
        </CollapsibleSection>
      )}
      {resolvedAlerts.length > 0 && (
        <CollapsibleSection title={<span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Resolved alerts</span>} count={resolvedAlerts.length} defaultOpen={false}>
          {resolvedAlerts.map((e) => <AlertCard key={e.event_id} event={e} patientName={patientName} onAcknowledge={acknowledgeEvent} onResolve={resolveEvent} />)}
        </CollapsibleSection>
      )}
      {activityLog.length > 0 && (
        <CollapsibleSection title={<span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Activity log</span>} count={activityLog.length}>
          {activityLog.map((e) => <AlertCard key={e.event_id} event={e} patientName={patientName} onAcknowledge={acknowledgeEvent} onResolve={resolveEvent} />)}
        </CollapsibleSection>
      )}
      {connectionNotices.length > 0 && (
        <CollapsibleSection title={<span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Connection notices</span>} count={connectionNotices.length}>
          {connectionNotices.map((e) => <AlertCard key={e.event_id} event={e} patientName={patientName} onAcknowledge={acknowledgeEvent} onResolve={resolveEvent} />)}
        </CollapsibleSection>
      )}
    </div>
  )
}
