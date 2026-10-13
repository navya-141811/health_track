/**
 * PatientCard -- light-theme dashboard summary card for one patient.
 */
import type { PatientProfile, VitalReading, FreshnessState, CareEvent } from '../../types'
import { FreshnessStatusBadge } from '../shared/FreshnessStatusBadge'

const CONDITION_LABELS: Record<string, string> = {
  diabetes: 'Diabetes',
  heart: 'Heart condition',
  hypertension: 'High blood pressure',
  respiratory: 'Respiratory issues',
  elderly_general: 'Elderly general care',
}

const AVATAR_COLORS = [
  'bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-lime-600',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function getConditions(patient: PatientProfile): string[] {
  if (patient.known_conditions?.length) return patient.known_conditions.map((c) => CONDITION_LABELS[c] ?? c)
  if (patient.medical_conditions) return patient.medical_conditions.split(/[,;\n]/).map((c) => c.trim()).filter(Boolean)
  return []
}

interface Props {
  patient: PatientProfile; latestReading: VitalReading | null
  freshnessState: FreshnessState; openEvents: CareEvent[]
  isSelected: boolean; onSelect: () => void
}

export function PatientCard({ patient, latestReading, freshnessState, openEvents, isSelected, onSelect }: Props) {
  const urgentCount = openEvents.filter((e) => e.priority === 'urgent' && e.status !== 'resolved').length
  const openCount = openEvents.filter((e) => e.status !== 'resolved').length
  const conditions = getConditions(patient)

  return (
    <button
      className={`w-full text-left rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 relative overflow-hidden ${
        isSelected
          ? 'border-sky-400 bg-sky-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-sky-200 hover:shadow-sm'
      }`}
      onClick={onSelect} aria-pressed={isSelected} aria-label={`Select patient ${patient.name}`}
    >
      {/* SYNTHETIC watermark */}
      <span className="pointer-events-none absolute bottom-2 right-2 text-[9px] font-bold uppercase tracking-widest text-gray-200 select-none" aria-hidden="true">
        SYNTHETIC
      </span>

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${avatarColor(patient.name)} flex items-center justify-center text-white text-xs font-bold shadow-sm`} aria-hidden="true">
            {initials(patient.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 leading-tight">{patient.name}</p>
            <p className="text-xs text-gray-400">
              Age {patient.age}
              {patient.device_id && <span className="ml-1.5 text-gray-300">· {patient.device_id}</span>}
            </p>
            {conditions.length > 0 && (
              <p className="mt-1 max-w-36 truncate text-xs text-gray-500" title={conditions.join(', ')}>
                {conditions.join(' · ')}
              </p>
            )}
          </div>
        </div>
        <FreshnessStatusBadge state={freshnessState} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <MetricTile label="HR" value={latestReading ? `${latestReading.heart_rate_bpm}` : '--'} unit="BPM"
          baseline={patient.baseline_hr_bpm} baselineUnit="BPM" rationale={patient.threshold_hr_rationale}
          alert={latestReading ? latestReading.heart_rate_bpm > patient.threshold_hr_upper || latestReading.heart_rate_bpm < patient.threshold_hr_lower : false} />
        <MetricTile label="Temp" value={latestReading ? latestReading.temperature_c.toFixed(1) : '--'} unit="°C"
          baseline={patient.baseline_temp_c} baselineUnit="°C" rationale={patient.threshold_temp_rationale}
          alert={latestReading ? latestReading.temperature_c > patient.threshold_temp_upper || latestReading.temperature_c < patient.threshold_temp_lower : false} />
        <MetricTile label="SpO2" value={latestReading ? `${latestReading.spo2_pct}` : '--'} unit="%"
          baseline={patient.baseline_spo2_pct} baselineUnit="%" rationale={patient.threshold_spo2_rationale}
          alert={latestReading ? latestReading.spo2_pct < patient.threshold_spo2_lower : false} />
      </div>

      {openCount > 0 && (
        <div className="mt-2.5 flex justify-end">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${urgentCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
            {openCount} alert{openCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </button>
  )
}

function MetricTile({ label, value, unit, baseline, baselineUnit, rationale, alert }: {
  label: string; value: string; unit: string; baseline: number; baselineUnit: string; rationale: string; alert: boolean
}) {
  return (
    <div className={`group relative rounded-lg p-2 text-left ${alert ? 'bg-red-50 ring-1 ring-red-300' : 'bg-gray-50'}`} title={rationale}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm font-bold leading-tight ${alert ? 'text-red-700' : 'text-gray-800'}`}>
        {value} <span className="text-xs font-normal">{unit}</span>
      </p>
      <p className="text-[10px] text-gray-400">Ref {baseline.toFixed(baselineUnit === '°C' ? 1 : 0)}</p>
      <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden w-52 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600 shadow-lg group-hover:block">
        <p className="font-medium text-gray-700 mb-1">Why this limit?</p>{rationale}
      </div>
    </div>
  )
}
