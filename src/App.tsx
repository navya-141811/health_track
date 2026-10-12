/**
 * CarePulse -- caregiver monitoring website.
 *
 * Layout:
 *  - Top: prototype notice bar
 *  - Left sidebar: patient cards + demo controls
 *  - Right main: monitoring view (charts + banner + events)
 */
import { useState } from 'react'
import { SimulatorProvider, useSimulator } from './simulator/SimulatorContext'
import { PatientCard } from './components/dashboard/PatientCard'
import { MonitoringBanner } from './components/monitoring/MonitoringBanner'
import { VitalCharts } from './components/monitoring/VitalCharts'
import { EventPanel } from './components/monitoring/EventPanel'
import { DemoControls } from './components/controls/DemoControls'
import { StaleNotification } from './components/notifications/StaleNotification'
import { PrototypeNotice } from './components/shared/PrototypeNotice'
import { PATIENTS, PATIENTS_BY_ID } from './data/patients'

function Dashboard() {
  const {
    readingHistories,
    freshnessStates,
    events,
    setPatient,
  } = useSimulator()

  const [selectedPatientId, setSelectedPatientId] = useState(PATIENTS[0].patient_id)

  const selectedPatient = PATIENTS_BY_ID[selectedPatientId]
  const readings = readingHistories[selectedPatientId] ?? []
  const freshness = freshnessStates[selectedPatientId] ?? {
    patient_id: selectedPatientId,
    status: 'no_data' as const,
    last_reading_at: null,
    active_gap_event_id: null,
  }

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id)
    // Sync simulator to the patient being viewed
    setPatient(id)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PrototypeNotice />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">CarePulse</h1>
          <p className="text-sm text-gray-500">
            Caregiver monitoring dashboard &mdash; synthetic data only
          </p>
        </header>

        <div className="flex gap-6 items-start">
          {/* Left sidebar */}
          <aside className="w-72 flex-shrink-0 space-y-4">
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Patients
              </h2>
              <div className="space-y-2">
                {PATIENTS.map((p) => {
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
              </div>
            </div>

            <DemoControls />
          </aside>

          {/* Main monitoring area */}
          <main className="flex-1 min-w-0 space-y-4">
            <MonitoringBanner
              freshnessState={freshness}
              patientName={selectedPatient.name}
            />

            <VitalCharts readings={readings} patient={selectedPatient} />

            <EventPanel patientId={selectedPatientId} />
          </main>
        </div>
      </div>

      <StaleNotification />
    </div>
  )
}

export default function App() {
  return (
    <SimulatorProvider>
      <Dashboard />
    </SimulatorProvider>
  )
}
