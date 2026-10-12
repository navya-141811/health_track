/**
 * PatientCard -- dashboard summary card for one patient.
 *
 * Shows: name, age, latest HR / temp / SpO2, freshness badge, open event count.
 * The threshold rationale is shown on hover so caregivers can understand
 * why each limit is set where it is.
 * All readings labelled SYNTHETIC.
 */
import type { PatientProfile, VitalReading, FreshnessState, CareEvent } from '../../types'
import { FreshnessStatusBadge } from '../shared/FreshnessStatusBadge'

interface Props {
  patient: PatientProfile
  latestReading: VitalReading | null
  freshnessState: FreshnessState
  openEvents: CareEvent[]
  isSelected: boolean
  onSelect: () => void
}

export function PatientCard({
  patient,
  latestReading,
  freshnessState,
  openEvents,
  isSelected,
  onSelect,
}: Props) {
  const urgentCount = openEvents.filter(
    (e) => e.priority === 'urgent' && e.status !== 'resolved',
  ).length
  const openCount = openEvents.filter((e) => e.status !== 'resolved').length

  return (
    <button
      className={`w-full text-left rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
        isSelected
          ? 'border-brand-500 bg-brand-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-brand-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`Select patient ${patient.name}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{patient.name}</p>
          <p className="text-xs text-gray-400">Age {patient.age}</p>
        </div>
        <FreshnessStatusBadge state={freshnessState} />
      </div>

      {/* Vital readings */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <MetricTile
          label="Heart rate"
          value={latestReading ? `${latestReading.heart_rate_bpm}` : '--'}
          unit="BPM"
          baseline={patient.baseline_hr_bpm}
          baselineUnit="BPM"
          rationale={patient.threshold_hr_rationale}
          alert={
            latestReading
              ? latestReading.heart_rate_bpm > patient.threshold_hr_upper ||
                latestReading.heart_rate_bpm < patient.threshold_hr_lower
              : false
          }
        />
        <MetricTile
          label="Temperature"
          value={latestReading ? latestReading.temperature_c.toFixed(1) : '--'}
          unit="°C"
          baseline={patient.baseline_temp_c}
          baselineUnit="°C"
          rationale={patient.threshold_temp_rationale}
          alert={
            latestReading
              ? latestReading.temperature_c > patient.threshold_temp_upper ||
                latestReading.temperature_c < patient.threshold_temp_lower
              : false
          }
        />
        <MetricTile
          label="SpO2"
          value={latestReading ? `${latestReading.spo2_pct}` : '--'}
          unit="%"
          baseline={patient.baseline_spo2_pct}
          baselineUnit="%"
          rationale={patient.threshold_spo2_rationale}
          alert={
            latestReading
              ? latestReading.spo2_pct < patient.threshold_spo2_lower
              : false
          }
        />
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400 italic">Synthetic data</span>
        {openCount > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              urgentCount > 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {openCount} alert{openCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  )
}

function MetricTile({
  label,
  value,
  unit,
  baseline,
  baselineUnit,
  rationale,
  alert,
}: {
  label: string
  value: string
  unit: string
  baseline: number
  baselineUnit: string
  rationale: string
  alert: boolean
}) {
  return (
    <div
      className={`group relative rounded-lg p-2 text-left ${
        alert ? 'bg-red-50 ring-1 ring-red-300' : 'bg-gray-50'
      }`}
      title={rationale}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${alert ? 'text-red-700' : 'text-gray-800'}`}>
        {value} <span className="text-xs font-normal">{unit}</span>
      </p>
      <p className="text-xs text-gray-400">
        Ref {baseline.toFixed(baselineUnit === '°C' ? 1 : 0)} {baselineUnit}
      </p>

      {/* Rationale tooltip on hover */}
      <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden w-52 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600 shadow-lg group-hover:block">
        <p className="font-medium text-gray-700 mb-1">Why this limit?</p>
        {rationale}
      </div>
    </div>
  )
}
