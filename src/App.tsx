/**
 * CarePulse App — light-theme hospital monitoring dashboard.
 *
 * Flow:
 *  1. LoginPage      — caregiver signs in
 *  2. DeviceConnect  — new caregivers connect a device + set up patient
 *  3. Dashboard      — monitoring view, auto-starts immediately
 */
import { useEffect, useState } from 'react'
import { SimulatorProvider, useSimulator } from './simulator/SimulatorContext'
import { PatientCard } from './components/dashboard/PatientCard'
import { PatientProfileForm } from './components/dashboard/PatientProfileForm'
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

// ── Dynamic page title hook ───────────────────────────────────────────────────

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — CarePulse` : 'CarePulse'
    return () => { document.title = 'CarePulse' }
  }, [title])
}

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
    updatePatient,
  } = useSimulator()

  const allPatients = [
    ...PATIENTS.filter((p) => !dynamicPatients.some((d) => d.patient_id === p.patient_id)),
    ...dynamicPatients,
  ]
  const allPatientsById: Record<string, PatientProfile> = {}
  allPatients.forEach((p) => { allPatientsById[p.patient_id] = p })

  const [selectedPatientId, setSelectedPatientId] = useState(
    initialPatientId && allPatientsById[initialPatientId]
      ? initialPatientId
      : allPatients[0]?.patient_id ?? '',
  )
  const [showConnectForm, setShowConnectForm] = useState(false)
  const [profilePatient, setProfilePatient] = useState<PatientProfile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedPatient = allPatientsById[selectedPatientId]
  const readings = readingHistories[selectedPatientId] ?? []
  const freshness = freshnessStates[selectedPatientId] ?? {
    patient_id: selectedPatientId,
    status: 'no_data' as const,
    last_reading_at: null,
    active_gap_event_id: null,
  }

  const activeAlerts = events.filter(
    (e) => e.status !== 'resolved' && e.priority === 'urgent' && e.category === 'vital_sign',
  )
  const hasEmergency = activeAlerts.length > 0

  usePageTitle(selectedPatient ? selectedPatient.name : 'Dashboard')

  const handleSelectPatient = (id: string) => {
    if (id === 'patient-002') {
      setProfilePatient(allPatientsById[id])
      return
    }
    setSelectedPatientId(id)
    setPatient(id)
    setSidebarOpen(false)
  }

  const handleProfileSave = (patient: PatientProfile) => {
    updatePatient(patient)
    setSelectedPatientId(patient.patient_id)
    setPatient(patient.patient_id)
    setProfilePatient(null)
  }

  const handleConnectAnother = (patient: PatientProfile) => {
    updatePatient(patient)
    setSelectedPatientId(patient.patient_id)
    setPatient(patient.patient_id)
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

  if (profilePatient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-none text-gray-900">CarePulse</h1>
              <p className="mt-0.5 text-xs text-gray-400">{caregiver.displayName} · {caregiver.role}</p>
            </div>
          </div>
        </header>
        <PatientProfileForm
          patient={profilePatient}
          onSave={handleProfileSave}
          onCancel={() => setProfilePatient(null)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top nav bar */}
      <header className={`border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-sm
        ${hasEmergency ? 'border-red-200 bg-red-50/95' : 'border-gray-200 bg-white/95'}`}>

        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle patient list"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500 flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-gray-900 leading-none">CarePulse</h1>
            <p className="text-xs text-gray-400 leading-none mt-0.5">
              {caregiver.displayName} · {caregiver.role}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {hasEmergency && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white animate-pulse">
              <span className="hidden sm:inline">🚨 EMERGENCY ACTIVE</span>
              <span className="sm:hidden">🚨</span>
            </span>
          )}

          {/* Bell alert icon */}
          <button
            aria-label={`${activeAlerts.length} active alerts`}
            className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              hasEmergency ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"
              className={hasEmergency ? 'animate-bounce' : ''}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {activeAlerts.length > 9 ? '9+' : activeAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowConnectForm(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Connect Patient
          </button>

          {/* De-emphasized logout */}
          <button
            onClick={onLogout}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Log out"
          >
            <span className="hidden sm:inline">Log out</span>
            <svg className="sm:hidden w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)] relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-20 bg-black/30"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Left sidebar */}
        <aside className={`
          fixed md:relative z-20 md:z-auto
          top-[57px] md:top-auto left-0
          h-[calc(100vh-57px)] md:h-auto
          w-72 md:w-64 flex-shrink-0
          border-r border-gray-200 bg-white flex flex-col overflow-y-auto
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Patients ({allPatients.length})
              </p>
              <button
                className="md:hidden text-gray-400 hover:text-gray-600"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close patient list"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

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
              onClick={() => { setShowConnectForm(true); setSidebarOpen(false) }}
              className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Connect Another Patient
            </button>
          </div>

          <div className="p-4 border-t border-gray-200">
            <DemoControls selectedPatientId={selectedPatientId} />
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-5 space-y-4">
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
  const { addPatient, clearSession, pause } = useSimulator()

  usePageTitle(
    view === 'login' ? 'Sign In' :
    view === 'device_connect' ? 'Connect Device' : ''
  )

  const handleLogin = (account: CaregiverAccount) => {
    setCaregiver(account)
    setView('device_connect')
  }

  const handleLogout = () => {
    clearSession()
    pause()
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
