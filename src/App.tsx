/**
 * CarePulse App — dark mode hospital monitoring dashboard.
 *
 * Flow:
 *  1. LoginPage      — caregiver signs in
 *  2. DeviceConnect  — new caregivers connect a device + set up patient
 *  3. Dashboard      — dark mode monitoring view, auto-starts immediately
 *
 * caregiver1 → goes directly to dashboard (existing patients, already monitoring)
 * caregiver2 → must complete device connect first
 */
import { useState } from 'react'
import { SimulatorProvider, useSimulator } from './simulator/SimulatorContext'
import { PatientCard } from './components/dashboard/PatientCard'
import { MonitoringBanner } from './components/monitoring/MonitoringBanner'
import { VitalCharts } from './components/monitoring/VitalCharts'
import { EventPanel } from './components/monitoring/EventPanel'
import { DemoControls } from './components/controls/DemoControls'
import { StaleNotification } from './components/notifications/StaleNotification'
import { AlertNotification } from './components/notifications/AlertNotification'
import { LoginPage } from './components/auth/LoginPage'
import { DeviceConnectPage } from './components/auth/DeviceConnectPage'
import { PrototypeNotice } from './components/shared/PrototypeNotice'
import { PATIENTS } from './data/patients'
import type { CaregiverAccount, PatientProfile } from './types'

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ caregiver, initialPatientId, onLogout }: {
  caregiver: CaregiverAccount
  initialPatientId?: string
  onLogout: () => void
}) {
  const {
    readingHistories,
    freshnessStates,
    events,
    setPatient,
    dynamicPatients,
    addPatient,
  } = useSimulator()

  const allPatients = [...PATIENTS, ...dynamicPatients]
  const allPatientsById: Record<string, PatientProfile> = {}
  allPatients.forEach((p) => { allPatientsById[p.patient_id] = p })

  const [selectedPatientId, setSelectedPatientId] = useState(
    initialPatientId && allPatientsById[initialPatientId]
      ? initialPatientId
      : allPatients[0]?.patient_id ?? '',
  )
  const [showConnectForm, setShowConnectForm] = useState(false)

  const selectedPatient = allPatientsById[selectedPatientId]
  const readings = readingHistories[selectedPatientId] ?? []
  const freshness = freshnessStates[selectedPatientId] ?? {
    patient_id: selectedPatientId,
    status: 'no_data' as const,
    last_reading_at: null,
    active_gap_event_id: null,
  }

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id)
    setPatient(id)
  }

  const handleConnectAnother = (patient: PatientProfile) => {
    addPatient(patient)
    setSelectedPatientId(patient.patient_id)
    setShowConnectForm(false)
  }

  if (showConnectForm) {
    return (
      <DeviceConnectPage
        caregiver={caregiver}
        onLogout={onLogout}
        onPatientConnected={handleConnectAnother}
        onGoToDashboard={() => setShowConnectForm(false)}
        connectedPatientIds={allPatients.map((p) => p.patient_id)}
      />
    )
  }

  const activeAlerts = events.filter(
    (e) => e.status !== 'resolved' && e.priority === 'urgent' && e.category === 'vital_sign',
  )
  const hasEmergency = activeAlerts.length > 0

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top nav bar */}
      <header className={`border-b px-6 py-3 flex items-center justify-between sticky top-0 z-30 bg-white/95 backdrop-blur-sm
        ${hasEmergency ? 'border-red-300 bg-red-50/95' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">CarePulse</h1>
            <p className="text-xs text-gray-400 leading-none mt-0.5">
              {caregiver.displayName} · {caregiver.role}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasEmergency && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white animate-pulse">
              🚨 EMERGENCY ACTIVE
            </span>
          )}
          <button
            onClick={() => setShowConnectForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Connect Patient
          </button>
          <button
            onClick={onLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Left sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
          <div className="p-4 space-y-3 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Patients ({allPatients.length})
            </p>

            {allPatients.map((p) => {
              const history = readingHistories[p.patient_id] ?? []
              const latest = history.length > 0 ? history[history.length - 1] : null
              const fs = freshnessStates[p.patient_id] ?? {
                patient_id: p.patient_id,
                status: 'no_data' as const,
                last_reading_at: null,
                active_gap_event_id: null,
              }
              const pEvents = events.filter(
                (e) => e.patient_id === p.patient_id && e.status !== 'resolved',
              )
              return (
                <PatientCard
                  key={p.patient_id}
                  patient={p}
                  latestReading={latest}
                  freshnessState={fs}
                  openEvents={pEvents}
                  isSelected={selectedPatientId === p.patient_id}
                  onSelect={() => handleSelectPatient(p.patient_id)}
                />
              )
            })}

            <button
              onClick={() => setShowConnectForm(true)}
              className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Connect Another Patient
            </button>
          </div>

          <div className="p-4 border-t border-gray-200">
            <DemoControls />
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-5 space-y-4">
          {selectedPatient ? (
            <>
              <MonitoringBanner freshnessState={freshness} patientName={selectedPatient.name} />
              <VitalCharts readings={readings} patient={selectedPatient} />
              <EventPanel patientId={selectedPatientId} />
            </>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-400">
              No patient selected. Connect a patient to begin monitoring.
            </div>
          )}
        </main>
      </div>

      <StaleNotification />
      <AlertNotification />
    </div>
  )
}

// ── App shell ─────────────────────────────────────────────────────────────────

type AppView = 'login' | 'device_connect' | 'dashboard'

function AppShell() {
  const [view, setView] = useState<AppView>('login')
  const [caregiver, setCaregiver] = useState<CaregiverAccount | null>(null)
  const [connectedIds, setConnectedIds] = useState<string[]>([])
  const [initialPatientId, setInitialPatientId] = useState<string>()
  const { addPatient, clearSession } = useSimulator()

  const handleLogin = (account: CaregiverAccount) => {
    setCaregiver(account)
    setView('device_connect')
  }

  const handleLogout = () => {
    clearSession()
    setCaregiver(null)
    setConnectedIds([])
    setInitialPatientId(undefined)
    setView('login')
  }

  const handlePatientConnected = (patient: PatientProfile) => {
    addPatient(patient)
    setInitialPatientId(patient.patient_id)
    setConnectedIds((prev) =>
      prev.includes(patient.patient_id) ? prev : [...prev, patient.patient_id],
    )
  }

  if (view === 'login') return <LoginPage onLogin={handleLogin} />
  if (view === 'device_connect' && caregiver) {
    return (
      <DeviceConnectPage
        caregiver={caregiver}
        onLogout={handleLogout}
        onPatientConnected={handlePatientConnected}
        onGoToDashboard={() => setView('dashboard')}
        connectedPatientIds={connectedIds}
      />
    )
  }
  if (view === 'dashboard' && caregiver) {
    return <Dashboard caregiver={caregiver} initialPatientId={initialPatientId} onLogout={handleLogout} />
  }
  return null
}

export default function App() {
  return (
    <SimulatorProvider>
      <PrototypeNotice />
      <AppShell />
    </SimulatorProvider>
  )
}
