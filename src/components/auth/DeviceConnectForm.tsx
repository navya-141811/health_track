/**
 * DeviceConnectForm — step-by-step wizard for connecting a device and setting up a patient.
 *
 * Step 1: Connect Device  (enter device ID — simulated scan)
 * Step 2: Patient Info    (name, age, conditions)
 * Step 3: Thresholds      (optional, pre-filled with defaults based on conditions)
 */
import { useEffect, useRef, useState } from 'react'
import type { CaregiverAccount, PatientProfile } from '../../types'

const CONDITION_OPTIONS = [
  { id: 'diabetes',        label: 'Diabetes / Blood Sugar',  icon: '🩸' },
  { id: 'heart',           label: 'Heart Condition',          icon: '❤️' },
  { id: 'hypertension',    label: 'High Blood Pressure (BP)', icon: '🫀' },
  { id: 'respiratory',     label: 'Respiratory Issues',       icon: '🫁' },
  { id: 'elderly_general', label: 'Elderly General Care',     icon: '👴' },
]

interface Props {
  caregiver: CaregiverAccount
  onCancel: () => void
  onLogout: () => void
  onPatientConnected: (patient: PatientProfile) => void
}

type Step = 'device' | 'patient' | 'thresholds' | 'connecting'

export function DeviceConnectForm({ caregiver, onCancel, onLogout, onPatientConnected }: Props) {
  const [step, setStep] = useState<Step>('device')
  const [deviceId, setDeviceId] = useState('')
  const [deviceError, setDeviceError] = useState('')
  const [patientError, setPatientError] = useState('')
  const [thresholdError, setThresholdError] = useState('')
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [conditions, setConditions] = useState<string[]>([])

  // Thresholds — pre-filled defaults
  const [hrUpper, setHrUpper] = useState('100')
  const [hrLower, setHrLower] = useState('55')
  const [tempUpper, setTempUpper] = useState('37.8')
  const [tempLower, setTempLower] = useState('36.0')
  const [spo2Lower, setSpo2Lower] = useState('93')

  useEffect(() => () => {
    if (connectionTimerRef.current !== null) clearTimeout(connectionTimerRef.current)
  }, [])

  const toggleCondition = (id: string) => {
    setConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const handleDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (deviceId.trim().length < 4) {
      setDeviceError('Device ID must be at least 4 characters.')
      return
    }
    setDeviceError('')
    setStep('patient')
  }

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const age = Number(patientAge)
    if (!patientName.trim()) {
      setPatientError('Enter the patient’s name.')
      return
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setPatientError('Enter an age between 1 and 120.')
      return
    }
    setPatientError('')
    setStep('thresholds')
  }

  const handleThresholdsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const hrUpperValue = Number(hrUpper)
    const hrLowerValue = Number(hrLower)
    const tempUpperValue = Number(tempUpper)
    const tempLowerValue = Number(tempLower)
    const spo2LowerValue = Number(spo2Lower)
    if (
      !hrUpper.trim() || !hrLower.trim() ||
      !Number.isFinite(hrUpperValue) || !Number.isFinite(hrLowerValue) ||
      hrLowerValue <= 0 || hrUpperValue > 300 || hrLowerValue >= hrUpperValue
    ) {
      setThresholdError('Heart rate limits must be positive, no higher than 300 BPM, and the lower limit must be below the upper limit.')
      return
    }
    if (
      !tempUpper.trim() || !tempLower.trim() ||
      !Number.isFinite(tempUpperValue) || !Number.isFinite(tempLowerValue) ||
      tempLowerValue >= tempUpperValue
    ) {
      setThresholdError('The temperature lower limit must be below the upper limit.')
      return
    }
    if (!spo2Lower.trim() || !Number.isFinite(spo2LowerValue) || spo2LowerValue <= 0 || spo2LowerValue > 100) {
      setThresholdError('The SpO₂ lower limit must be greater than 0 and no higher than 100%.')
      return
    }
    setThresholdError('')
    setStep('connecting')

    // This is a demo-only connection delay; no physical device is contacted.
    connectionTimerRef.current = setTimeout(() => {
      connectionTimerRef.current = null
      const newPatient: PatientProfile = {
        patient_id: `patient-${Date.now()}`,
        name: patientName.trim(),
        age: Number(patientAge),
        device_id: deviceId.trim(),
        known_conditions: conditions,

        baseline_hr_bpm: 72,
        baseline_temp_c: 36.6,
        baseline_spo2_pct: 97,

        threshold_hr_upper: hrUpperValue,
        threshold_hr_lower: hrLowerValue,
        threshold_hr_rationale: `Custom threshold set by ${caregiver.displayName}.`,

        threshold_temp_upper: tempUpperValue,
        threshold_temp_lower: tempLowerValue,
        threshold_temp_rationale: `Custom threshold set by ${caregiver.displayName}.`,

        threshold_spo2_lower: spo2LowerValue,
        threshold_spo2_rationale: `Custom threshold set by ${caregiver.displayName}.`,

        designated_contact_name: caregiver.displayName,
        designated_contact_phone: '',
      }
      onPatientConnected(newPatient)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500 shadow-lg mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CarePulse</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome, {caregiver.displayName}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white transition-colors"
            >
              ← Back to devices
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white transition-colors"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['device', 'patient', 'thresholds'] as Step[]).map((s, i) => {
            const stepOrder: Step[] = ['device', 'patient', 'thresholds']
            const currentIdx = stepOrder.indexOf(step === 'connecting' ? 'thresholds' : step)
            const isDone = i < currentIdx
            const isActive = i === currentIdx
            return (
              <div key={s} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${isDone ? 'bg-sky-500 text-white' : isActive ? 'bg-sky-500 text-white ring-4 ring-sky-100' : 'bg-gray-200 text-gray-400'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`w-10 h-0.5 mx-1 ${isDone ? 'bg-sky-400' : 'bg-gray-200'}`} />}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-xl px-8 py-8">

          {/* ── Step 1: Device ── */}
          {step === 'device' && (
            <form onSubmit={handleDeviceSubmit} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Connect a Device</h2>
                <p className="text-sm text-gray-500 mt-1">Enter a demo device ID. No physical wearable is connected.</p>
              </div>

              <div className="rounded-lg bg-sky-50 border border-sky-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-sky-800">Simulated wearable sensor</p>
                  <p className="text-xs text-sky-600">Demo setup only — no Bluetooth connection</p>
                </div>
              </div>

              <div>
                <label htmlFor="device-id" className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID
                </label>
                <input
                  id="device-id"
                  type="text"
                  required
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  placeholder="e.g. CP-A1B2"
                  maxLength={12}
                />
                {deviceError && (
                  <p className="text-xs text-red-500 mt-1">{deviceError}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">For this demo, enter any ID with 4 or more characters.</p>
              </div>

              <button type="submit"
                className="w-full rounded-lg bg-sky-500 text-white py-2.5 text-sm font-semibold hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors">
                Continue →
              </button>
            </form>
          )}

          {/* ── Step 2: Patient Info ── */}
          {step === 'patient' && (
            <form onSubmit={handlePatientSubmit} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Patient Information</h2>
                <p className="text-sm text-gray-500 mt-1">Demo device <span className="font-mono font-medium text-sky-600">{deviceId}</span> accepted.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="patient-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Patient Name
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label htmlFor="patient-age" className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    id="patient-age"
                    type="number"
                    required
                    min={1}
                    max={120}
                    step={1}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    placeholder="e.g. 68"
                  />
                </div>
              </div>
              {patientError && <p role="alert" className="text-sm text-red-600">{patientError}</p>}

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">
                  Known Conditions <span className="text-gray-400 font-normal">(select all that apply)</span>
                </p>
                <div className="space-y-2">
                  {CONDITION_OPTIONS.map((c) => (
                    <label key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${conditions.includes(c.id) ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="checkbox"
                        checked={conditions.includes(c.id)}
                        onChange={() => toggleCondition(c.id)}
                        className="accent-sky-500"
                      />
                      <span className="text-base">{c.icon}</span>
                      <span className="text-sm text-gray-700">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('device')}
                  className="flex-1 rounded-lg border border-gray-300 text-gray-600 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                  ← Back
                </button>
                <button type="submit"
                  className="flex-1 rounded-lg bg-sky-500 text-white py-2.5 text-sm font-semibold hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors">
                  Next: Thresholds →
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Thresholds ── */}
          {step === 'thresholds' && (
            <form onSubmit={handleThresholdsSubmit} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Alert Thresholds</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pre-filled with standard defaults. Adjust if needed for <strong>{patientName}</strong>.
                </p>
              </div>

              {thresholdError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {thresholdError}
                </p>
              )}

              <div className="space-y-4">
                {/* Heart Rate */}
                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">❤️ Heart Rate (BPM)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Upper limit</label>
                      <input type="number" required min={1} max={300} value={hrUpper} onChange={(e) => setHrUpper(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Lower limit</label>
                      <input type="number" required min={1} max={300} value={hrLower} onChange={(e) => setHrLower(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    </div>
                  </div>
                </div>

                {/* Temperature */}
                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">🌡️ Temperature (°C)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Upper limit</label>
                      <input type="number" required step="0.1" value={tempUpper} onChange={(e) => setTempUpper(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Lower limit</label>
                      <input type="number" required step="0.1" value={tempLower} onChange={(e) => setTempLower(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    </div>
                  </div>
                </div>

                {/* SpO2 */}
                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">🫁 Oxygen Saturation / SpO2 (%)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Lower limit</label>
                      <input type="number" required min={1} max={100} value={spo2Lower} onChange={(e) => setSpo2Lower(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    </div>
                    <div className="flex items-end pb-2">
                      <p className="text-xs text-gray-400">No upper limit for SpO2</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('patient')}
                  className="flex-1 rounded-lg border border-gray-300 text-gray-600 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                  ← Back
                </button>
                <button type="submit"
                  className="flex-1 rounded-lg bg-sky-500 text-white py-2.5 text-sm font-semibold hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors">
                  Start Demo Monitoring →
                </button>
              </div>
            </form>
          )}

          {/* ── Connecting animation ── */}
          {step === 'connecting' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800">Finishing demo setup for {deviceId}…</p>
                <p className="text-sm text-gray-500 mt-1">Preparing simulated monitoring for <strong>{patientName}</strong></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
