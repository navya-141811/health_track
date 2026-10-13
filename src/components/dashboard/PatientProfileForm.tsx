import { useState } from 'react'
import type { PatientProfile } from '../../types'

interface Props {
  patient: PatientProfile
  onSave: (patient: PatientProfile) => void
  onCancel: () => void
}

export function PatientProfileForm({ patient, onSave, onCancel }: Props) {
  const [name, setName] = useState(patient.name)
  const [phone, setPhone] = useState(patient.patient_phone ?? '')
  const [age, setAge] = useState(String(patient.age))
  const [condition, setCondition] = useState(patient.medical_conditions ?? '')
  const [hrLower, setHrLower] = useState(String(patient.threshold_hr_lower))
  const [hrUpper, setHrUpper] = useState(String(patient.threshold_hr_upper))
  const [tempLower, setTempLower] = useState(String(patient.threshold_temp_lower))
  const [tempUpper, setTempUpper] = useState(String(patient.threshold_temp_upper))
  const [spo2Lower, setSpo2Lower] = useState(String(patient.threshold_spo2_lower))
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAge = Number(age)
    if (!name.trim() || !phone.trim() || !Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setError('Enter the patient name, mobile number, and an age from 1 to 120.')
      return
    }

    const numbers = [hrLower, hrUpper, tempLower, tempUpper, spo2Lower].map(Number)
    if (numbers.some((value) => !Number.isFinite(value))) {
      setError('Enter valid numbers for the thresholds, or leave the existing values unchanged.')
      return
    }
    if (Number(hrLower) >= Number(hrUpper) || Number(tempLower) >= Number(tempUpper)) {
      setError('Each lower threshold must be less than its upper threshold.')
      return
    }

    onSave({
      ...patient,
      name: name.trim(),
      patient_phone: phone.trim(),
      age: parsedAge,
      medical_conditions: condition.trim(),
      threshold_hr_lower: Number(hrLower),
      threshold_hr_upper: Number(hrUpper),
      threshold_hr_rationale: 'Caregiver-entered demo setting. Confirm thresholds with the patient’s clinician.',
      threshold_temp_lower: Number(tempLower),
      threshold_temp_upper: Number(tempUpper),
      threshold_temp_rationale: 'Caregiver-entered demo setting. Confirm thresholds with the patient’s clinician.',
      threshold_spo2_lower: Number(spo2Lower),
      threshold_spo2_rationale: 'Caregiver-entered demo setting. Confirm thresholds with the patient’s clinician.',
    })
  }

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-900'
  const labelClass = 'mb-1 block text-sm font-medium text-gray-300'

  return (
    <div className="min-h-[calc(100vh-57px)] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-950 p-5 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <button type="button" onClick={onCancel} className="mb-5 text-sm font-medium text-sky-300 hover:text-sky-200">
          ← Back to dashboard
        </button>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-700 bg-gray-900 p-5 shadow-2xl shadow-black/20 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Patient profile</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Complete patient details</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Add the information you have for {patient.name}. Threshold values are optional to change and should follow clinician guidance.
          </p>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="profile-name">Patient name</label>
              <input className={inputClass} id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-phone">Patient mobile number</label>
              <input className={inputClass} id="profile-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter mobile number" required />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-age">Age</label>
              <input className={inputClass} id="profile-age" type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="profile-condition">Medical conditions</label>
              <textarea className={`${inputClass} min-h-24 resize-y`} id="profile-condition" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Enter any known conditions, or leave blank" />
              <p className="mt-1 text-xs text-gray-500">Optional. This is caregiver-provided information and does not produce a diagnosis.</p>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-100">Safety thresholds</h3>
              <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-400">Optional to change</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-gray-400">Current values are demo placeholders. Change them only if you have clinician-provided limits; leaving them as shown keeps these demo settings.</p>

            <div className="mt-4 space-y-4">
              <ThresholdPair title="Heart rate (BPM)" low={hrLower} high={hrUpper} setLow={setHrLower} setHigh={setHrUpper} />
              <ThresholdPair title="Temperature (°C)" low={tempLower} high={tempUpper} setLow={setTempLower} setHigh={setTempUpper} step="0.1" />
                <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                <label className={labelClass} htmlFor="profile-spo2">SpO₂ lower limit (%)</label>
                <input className={inputClass} id="profile-spo2" type="number" min="50" max="100" value={spo2Lower} onChange={(e) => setSpo2Lower(e.target.value)} />
              </div>
            </div>
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800">Cancel</button>
            <button type="submit" className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500">Save profile and view patient →</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ThresholdPair({
  title,
  low,
  high,
  setLow,
  setHigh,
  step = '1',
}: {
  title: string
  low: string
  high: string
  setLow: (value: string) => void
  setHigh: (value: string) => void
  step?: string
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
      <p className="mb-3 text-sm font-medium text-gray-200">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Lower limit</label>
          <input aria-label={`${title} lower limit`} type="number" step={step} value={low} onChange={(e) => setLow(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-900" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Upper limit</label>
          <input aria-label={`${title} upper limit`} type="number" step={step} value={high} onChange={(e) => setHigh(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-900" />
        </div>
      </div>
    </div>
  )
}
