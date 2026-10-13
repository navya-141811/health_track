/**
 * DeviceConnectPage — caregiver picks which device(s) to connect after login.
 *
 * Two fixed devices shown:
 *   CP-001 → Priya Sharma  (Patient 1 — mostly normal, brief spike)
 *   CP-002 → Rajan Mehta   (Patient 2 — normal → abnormal → emergency)
 *
 * Caregiver can connect one or both. Clicking a device shows a connecting
 * animation then calls onPatientConnected for that patient.
 * "Go to Dashboard" appears once at least one device is connected.
 */
import { useEffect, useRef, useState } from 'react'
import { PATIENTS } from '../../data/patients'
import { PatientProfileForm } from '../dashboard/PatientProfileForm'
import type { CaregiverAccount, PatientProfile } from '../../types'
import { DeviceConnectForm } from './DeviceConnectForm'

interface Device {
  deviceId: string
  deviceLabel: string
  patient: PatientProfile
  conditions: string[]
}

const DEVICES: Device[] = [
  {
    deviceId: 'CP-001',
    deviceLabel: 'CarePulse Wearable — Bed 1',
    patient: PATIENTS[0], // Priya Sharma
    conditions: ['Elderly General Care', 'High Blood Pressure'],
  },
  {
    deviceId: 'CP-002',
    deviceLabel: 'CarePulse Wearable — Bed 2',
    patient: PATIENTS[1], // Rajan Mehta
    conditions: ['Heart Condition', 'Diabetes', 'Respiratory Issues'],
  },
]

interface Props {
  caregiver: CaregiverAccount
  onLogout: () => void
  onPatientConnected: (patient: PatientProfile) => void
  onGoToDashboard: () => void
  connectedPatientIds: string[]
}

type DeviceState = 'idle' | 'connecting' | 'connected'

export function DeviceConnectPage({
  caregiver,
  onLogout,
  onPatientConnected,
  onGoToDashboard,
  connectedPatientIds,
}: Props) {
  const [deviceStates, setDeviceStates] = useState<Record<string, DeviceState>>({})
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [devicePatients, setDevicePatients] = useState<Record<string, PatientProfile>>({})
  const [profileDevice, setProfileDevice] = useState<Device | null>(null)
  const connectionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const timers = connectionTimersRef.current
    return () => Object.values(timers).forEach(clearTimeout)
  }, [])

  if (showNewPatientForm) {
    return (
      <DeviceConnectForm
        caregiver={caregiver}
        onCancel={() => setShowNewPatientForm(false)}
        onLogout={onLogout}
        onPatientConnected={(patient) => {
          onPatientConnected(patient)
          onGoToDashboard()
        }}
      />
    )
  }

  const connect = (device: Device) => {
    if (deviceStates[device.deviceId] === 'connecting' || deviceStates[device.deviceId] === 'connected') return

    // Collect the second patient's profile before entering the dashboard.
    if (device.patient.patient_id === 'patient-002') {
      setProfileDevice(device)
      return
    }

    setDeviceStates((prev) => ({ ...prev, [device.deviceId]: 'connecting' }))

    connectionTimersRef.current[device.deviceId] = setTimeout(() => {
      delete connectionTimersRef.current[device.deviceId]
      setDeviceStates((prev) => ({ ...prev, [device.deviceId]: 'connected' }))
      onPatientConnected(device.patient)
    }, 2000)
  }

  if (profileDevice) {
    const patient = devicePatients[profileDevice.deviceId] ?? profileDevice.patient
    return (
      <PatientProfileForm
        patient={patient}
        onCancel={() => setProfileDevice(null)}
        onSave={(updatedPatient) => {
          setDevicePatients((prev) => ({ ...prev, [profileDevice.deviceId]: updatedPatient }))
          setDeviceStates((prev) => ({ ...prev, [profileDevice.deviceId]: 'connected' }))
          onPatientConnected(updatedPatient)
          setProfileDevice(null)
        }}
      />
    )
  }

  const anyConnected = connectedPatientIds.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500 shadow-lg shadow-sky-200 mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CarePulse</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome, {caregiver.displayName}</p>
          <button
            onClick={onLogout}
            className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            Log out
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg shadow-gray-100 px-6 py-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Choose a Demo Device</h2>
            <p className="text-sm text-gray-500 mt-1">
              Connect an existing demo device or set up a new patient.
            </p>
          </div>

          <button
            onClick={() => setShowNewPatientForm(true)}
            className="mb-5 w-full rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-left text-sm font-semibold text-sky-700 transition-colors hover:border-sky-400 hover:bg-sky-100"
          >
            <span className="mr-2 text-lg" aria-hidden="true">＋</span>
            Add New Patient
            <span className="mt-0.5 block pl-7 text-xs font-normal text-gray-500">
              Start a questionnaire and configure monitoring thresholds
            </span>
          </button>

          <div className="space-y-4">
            {DEVICES.map((device) => {
              const patient = devicePatients[device.deviceId] ?? device.patient
              const state = deviceStates[device.deviceId] ?? (connectedPatientIds.includes(patient.patient_id) ? 'connected' : 'idle')
              const isConnected = state === 'connected'
              const isConnecting = state === 'connecting'
              const enteredConditions = patient.medical_conditions
                ?.split(/[,;\n]/)
                .map((condition) => condition.trim())
                .filter(Boolean)
              const displayedConditions = enteredConditions?.length ? enteredConditions : device.conditions

              return (
                <div
                  key={device.deviceId}
                  className={`rounded-xl border p-5 transition-all ${
                    isConnected
                      ? 'border-green-300 bg-green-50'
                      : isConnecting
                      ? 'border-sky-300 bg-sky-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isConnected ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {isConnected ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                          </svg>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{patient.name}</p>
                          <span className="text-xs text-gray-400">Age {patient.age}</span>
                          {isConnected && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{device.deviceId} · {device.deviceLabel}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {displayedConditions.map((c) => (
                            <span key={c} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isConnected ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Demo Ready
                        </div>
                      ) : isConnecting ? (
                        <div className="flex items-center gap-2 text-xs text-sky-500">
                          <div className="w-4 h-4 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
                          Connecting…
                        </div>
                      ) : (
                        <button
                          onClick={() => connect(device)}
                          className="rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Go to dashboard */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            {anyConnected ? (
              <button
                onClick={onGoToDashboard}
                className="w-full rounded-lg bg-green-500 hover:bg-green-600 text-white py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                Go to Dashboard →
              </button>
            ) : (
              <p className="text-center text-xs text-gray-400">
                Connect at least one device to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
