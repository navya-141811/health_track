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
import { useState } from 'react'
import { PATIENTS } from '../../data/patients'
import type { CaregiverAccount, PatientProfile } from '../../types'

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
  onPatientConnected: (patient: PatientProfile) => void
  onGoToDashboard: () => void
  connectedPatientIds: string[]
}

type DeviceState = 'idle' | 'connecting' | 'connected'

export function DeviceConnectPage({
  caregiver,
  onPatientConnected,
  onGoToDashboard,
  connectedPatientIds,
}: Props) {
  const [deviceStates, setDeviceStates] = useState<Record<string, DeviceState>>({})

  const connect = (device: Device) => {
    if (deviceStates[device.deviceId] === 'connecting' || deviceStates[device.deviceId] === 'connected') return

    setDeviceStates((prev) => ({ ...prev, [device.deviceId]: 'connecting' }))

    setTimeout(() => {
      setDeviceStates((prev) => ({ ...prev, [device.deviceId]: 'connected' }))
      onPatientConnected(device.patient)
    }, 2000)
  }

  const anyConnected = connectedPatientIds.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500 shadow-lg shadow-sky-900/50 mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">CarePulse</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome, {caregiver.displayName}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl px-6 py-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-200">Connect a Device</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a patient device to begin monitoring. You can connect both.
            </p>
          </div>

          <div className="space-y-4">
            {DEVICES.map((device) => {
              const state = deviceStates[device.deviceId] ?? 'idle'
              const isConnected = state === 'connected'
              const isConnecting = state === 'connecting'

              return (
                <div
                  key={device.deviceId}
                  className={`rounded-xl border p-5 transition-all ${
                    isConnected
                      ? 'border-green-700 bg-green-950/30'
                      : isConnecting
                      ? 'border-sky-700 bg-sky-950/20'
                      : 'border-gray-700 bg-gray-800/60 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Device info */}
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isConnected ? 'bg-green-900/60' : 'bg-gray-700'
                      }`}>
                        {isConnected ? (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          <p className="font-semibold text-gray-100">{device.patient.name}</p>
                          <span className="text-xs text-gray-500">Age {device.patient.age}</span>
                          {isConnected && (
                            <span className="rounded-full bg-green-900/60 px-2 py-0.5 text-xs font-medium text-green-400">
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">{device.deviceId} · {device.deviceLabel}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {device.conditions.map((c) => (
                            <span key={c} className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Connect button */}
                    <div className="flex-shrink-0">
                      {isConnected ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          Live
                        </div>
                      ) : isConnecting ? (
                        <div className="flex items-center gap-2 text-xs text-sky-400">
                          <div className="w-4 h-4 rounded-full border-2 border-sky-700 border-t-sky-400 animate-spin" />
                          Connecting…
                        </div>
                      ) : (
                        <button
                          onClick={() => connect(device)}
                          className="rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
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
          <div className="mt-6 pt-5 border-t border-gray-800">
            {anyConnected ? (
              <button
                onClick={onGoToDashboard}
                className="w-full rounded-lg bg-green-600 hover:bg-green-500 text-white py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                Go to Dashboard →
              </button>
            ) : (
              <p className="text-center text-xs text-gray-600">
                Connect at least one device to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
