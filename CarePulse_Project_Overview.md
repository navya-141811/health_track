# CarePulse — Project Overview & Implementation Record

> **Project:** Affordable Smart Health Monitoring and Emergency Alert System
> **Prototype:** Software-only caregiver website using synthetic data
> **Purpose:** Demonstrate readings, explainable alerts, and caregiver response.
> CarePulse is **not a medical device** and does not contact emergency services.

---

## 1. What CarePulse is

CarePulse is a **caregiver-facing website** where one caregiver can monitor multiple fictional patients, inspect simulated heart-rate and body-temperature readings, understand why a software alert appeared, acknowledge the event, and demonstrate a response such as contacting a designated person.

This is a **scenario-driven prototype**, not a hardware project. There are no sensors, no WebSockets, no backend server, and no real patient data. Every reading is synthetic and labelled as such.

---

## 2. Confirmed decisions

| Question | Decision | Reason |
|---|---|---|
| Do we need sensors? | No — synthetic data only. | Affordable, quick, reliable for demo. |
| Website or native app? | Responsive website (React SPA). | Works on laptop and mobile browsers. |
| Who uses it? | One caregiver session, multiple fictional patients. | Demonstrates multi-patient monitoring without complex accounts. |
| How many patients? | Two: Eleanor Vance, Marcus Webb. | Shows independent readings, baselines, and thresholds per patient. |
| Data source? | In-browser deterministic simulator only. | No WebSocket, polling, backend, or sensor integration. |
| Random or predefined data? | Predefined deterministic scenario sequences (S01–S08). | Makes graphs, alerts, and tests repeatable. |
| Two vital signs on one graph? | **Two separate stacked charts** (heart rate + temperature). | Incompatible units and ranges; a shared Y-axis would be meaningless. |
| Main visual? | Two time-series graphs, one per vital sign. | Trends are clearer than isolated number cards. |
| How are alerts triggered? | A separate RuleEngine evaluates configured demo thresholds. | Keeps alert logic testable and separate from UI code. |
| Is every threshold crossing an event? | No — persistence rule: ≥ 3 consecutive readings must cross before an event fires. | Prevents alert noise from brief fluctuations (S04). |
| Does acknowledgement resolve an event? | **No.** Acknowledged means seen. Resolved requires an explicit caregiver action. | These are two separate states in the lifecycle. |
| What if readings stop? | A separate FreshnessMonitor shows a data-freshness warning. | Missing data is a data_quality event, not a vital_sign event. |
| Intentional pause vs unexpected gap? | Pause → "Simulation paused" state. Unexpected gap → "Stale". No data_quality event created for a pause. | The caregiver initiated the pause; it is not an outage. |
| Duplicate stale events? | Suppressed — one active data_quality event per patient at a time. | EventStore.createDataQualityEvent returns null if one is already open. |
| Can we make real emergency calls? | No. Show a simulated call panel. Never claim a call connected. | Demonstrates caregiver workflow without false claims. |
| Contact action: primary or fallback? | Simulated call panel is the **primary** action. `tel:` is a secondary link. | Avoids false expectations on laptop browsers. |
| Do we need a backend or database? | No. All state is in-memory for the MVP. | Core monitoring flow comes first. |

---

## 3. Stack (confirmed)

| Layer | Chosen | Version |
|---|---|---|
| Framework | Vite + React + TypeScript | Vite 8, React 19, TS 6 |
| Styling | Tailwind CSS | 3.4.17 |
| Charts | Recharts | 2.15.3 |
| Tests | Vitest + jsdom | 3.2.4 |
| State | In-memory (React Context + class stores) | MVP only |

---

## 4. Project structure

```
src/
  types/
    index.ts               Shared TypeScript types (PatientProfile, VitalReading,
                           CareEvent, ScenarioDefinition, FreshnessState, ...)
  data/
    patients.ts            Two fictional patient profiles (Eleanor Vance, Marcus Webb)
    scenarios.ts           Deterministic scenario definitions S01–S08
  simulator/
    SimulatorEngine.ts     Pure class: tick, start/pause/resume/reset, speed, S07 gap
    SimulatorContext.tsx   React context: wires engine + stores + freshness into state
    nanoid.ts              Minimal ID generator (crypto.randomUUID fallback)
  engine/
    FreshnessMonitor.ts    Detects when readings stop; manages stale/paused/fresh states
    RuleEngine.ts          Evaluates vital-sign thresholds; persistence = 3 ticks
  store/
    EventStore.ts          All CareEvents; category-separated query helpers
    ReadingHistoryStore.ts Per-patient reading arrays (oldest first, max 200)
  components/
    dashboard/
      PatientCard.tsx      Summary card: name, latest HR+temp, freshness badge, open events
    monitoring/
      MonitoringBanner.tsx Last-reading timestamp, elapsed time, stale/paused state
      VitalCharts.tsx      Two separate Recharts time-series charts (HR and temperature)
      EventPanel.tsx       Event history by category (vital_sign / data_quality / assistance)
    controls/
      DemoControls.tsx     Patient/scenario selector, start/pause/resume/reset, speed, timeout
    notifications/
      StaleNotification.tsx In-page toast: one notification on fresh→stale transition
    shared/
      FreshnessStatusBadge.tsx  Colour badge: fresh / stale / paused / no_data
      PrototypeNotice.tsx       Disclaimer banner shown on every page
  test/
    carepulse.test.ts      39 Vitest tests (see Section 8)
    setup.ts               @testing-library/jest-dom import
  App.tsx                  Two-panel layout: sidebar + monitoring view
  main.tsx                 React entry point
```

---

## 5. Patient profiles

Both patients are entirely fictional. All values are for demonstration only.

| Field | Eleanor Vance | Marcus Webb |
|---|---|---|
| patient_id | patient-001 | patient-002 |
| Baseline HR | 72 BPM | 68 BPM |
| Baseline temp | 36.6 °C | 36.8 °C |
| HR upper threshold | 100 BPM | 105 BPM |
| HR lower threshold | 55 BPM | 50 BPM |
| Temp upper threshold | 37.8 °C | 38.0 °C |
| Temp lower threshold | 36.0 °C | 36.1 °C |

Baselines and thresholds are **patient-specific demo settings**, not clinically validated values.

---

## 6. Scenario catalogue

| ID | Name | Steps | Gap ticks | Expected software behaviour |
|---|---|---|---|---|
| S01 | Stable monitoring | 10 | None | No alert. Graph updates without events. |
| S02 | Gradual change | 12 | None | Trend visible; alert fires if persistence met. |
| S03 | Threshold crossing | 10 | None | Event after 3 consecutive crossings. |
| S04 | Temporary fluctuation | 10 | None | Only 2 ticks over threshold — no event. |
| S05 | Sustained crossing | 12 | None | Event fires; duplicates suppressed. |
| S06 | Recovery | 10 | None | Graph recovers; existing events NOT auto-resolved. |
| S07 | Missing readings | 14 | Ticks 3–9 | data_quality event (not vital_sign); resolves on resume. |
| S08 | Manual assistance | 10 | None | Stable vitals; assistance event from button press only. |

All steps are predefined. Same scenario + tick always → same reading.

---

## 7. Key engine rules

### Simulator

- **Clock source:** `setInterval` inside `SimulatorEngine`. No other timing source.
- **Effective interval:** `tick_interval_ms / speed_multiplier` (min 100 ms).
- **Exactly one timer:** `start()` is a no-op if already running. `pause()` calls `clearInterval`. `resume()` calls `setInterval` only after clearing any existing timer.
- **S07 gaps:** Steps with `gap: true` call `onTick` but do **not** call `onReading`.
- **Reset:** Returns `tick_position` to 0, sets status to `idle`, clears the timer. The calling layer clears readings and events.

### Data-freshness (FreshnessMonitor)

- Runs a 500 ms check loop independently of the simulator tick.
- **Default timeout:** 5 seconds (configurable in Demo Controls, 3–15 s range).
- **Stale trigger:** `elapsed >= stale_timeout_ms` AND `simulator_status === 'running'`.
- **Paused:** `simulator_status === 'paused'` → status becomes `'paused'`, no data_quality event.
- **Deduplication:** `EventStore.createDataQualityEvent` returns `null` if an active gap event already exists for that patient.
- **Resolution on resume:** `onReadingReceived` resolves the active gap event via `EventStore.resolveEvent`.

### Rule engine (vital signs)

- **Persistence:** A rule must be met for ≥ 3 consecutive readings before a `vital_sign` event fires.
- **Deduplication:** Checks `getActiveVitalSignEvents` before creating a new event. One active event per crossing.
- **Recovery:** Clears the persistence counter but does **not** auto-resolve the event. Only an explicit `resolveEvent` call does that.

### Event categories

Three categories, never mixed in queries:

| Category | Created by | Shown in |
|---|---|---|
| `vital_sign` | RuleEngine threshold crossing | "Vital-sign alerts" section |
| `data_quality` | FreshnessMonitor stale detection | "Data-quality warnings" section |
| `assistance` | Manual assistance button | "Assistance requests" section |

### Event lifecycle

```
New → Acknowledged → (Escalated) → Resolved
```

- **Acknowledged** means a caregiver has seen it. The event remains open.
- **Resolved** requires an explicit caregiver action (Resolve button) or, for data_quality events, resumption of readings.
- Data recovery (S06) does **not** auto-resolve any vital_sign event.

---

## 8. Tests (39 passing)

```
src/test/carepulse.test.ts
```

| Group | Tests |
|---|---|
| Scenario determinism | S01 tick 0 values; S07 gap/non-gap ticks; S03 crossing value; repeatability |
| SimulatorEngine tick | No reading before start; reading fires at interval; source='synthetic'; patient_id; S07 gaps; gap isGap=true; speed multiplier |
| Pause / resume | Pausing stops readings; resume from same position; no double-timer; start() no-op; status transitions |
| Reset | Stops engine; tick_position=0; no further readings; start after reset fires from tick 0 |
| Patient separation | ReadingHistoryStore keeps histories separate; EventStore per-patient queries; clearByPatient |
| FreshnessMonitor | Normal readings = no warning; short delay = no warning; long delay = exactly one data_quality event; stale status; resume clears + resolves; pause = 'paused' not stale; onFreshnessChange called |
| EventStore isolation | data_quality not in vital_sign list; vital_sign not in data_quality list; dedup returns null; ack ≠ resolve; assistance in own category |
| RuleEngine persistence | 2 ticks = no event; 3 ticks = one event; no duplicate on sustained crossing; recovery ≠ auto-resolve |

Run: `npm test` (Vitest, jsdom environment, ~1.3 s)

---

## 9. UI layout

```
┌─────────────────────────────────────────────────────────────────┐
│ PROTOTYPE NOTICE (amber bar, always visible)                    │
├──────────────────────────┬──────────────────────────────────────┤
│ SIDEBAR (w-72)           │ MAIN MONITORING AREA                 │
│                          │                                       │
│ Patients                 │  MonitoringBanner                    │
│   PatientCard (Eleanor)  │    last reading / elapsed / status   │
│   PatientCard (Marcus)   │                                       │
│                          │  VitalCharts                         │
│ DemoControls             │    Heart Rate chart                  │
│   patient selector       │      - reading line                  │
│   scenario selector      │      - patient reference line        │
│   start/pause/resume/    │      - upper/lower threshold lines   │
│   reset buttons          │    Temperature chart                 │
│   speed slider           │      - reading line                  │
│   timeout slider         │      - patient reference line        │
│   manual assistance btn  │      - upper/lower threshold lines   │
│                          │                                       │
│                          │  EventPanel                          │
│                          │    Vital-sign alerts (separate)      │
│                          │    Data-quality warnings (separate)  │
│                          │    Assistance requests               │
└──────────────────────────┴──────────────────────────────────────┘
    StaleNotification toast (bottom-right, auto-dismiss 6 s)
```

---

## 10. Data-freshness UI contract

| Situation | FreshnessStatusBadge | MonitoringBanner | StaleNotification |
|---|---|---|---|
| Reading within timeout | Green "Fresh" | No warning | — |
| No reading past timeout (running) | Red "Stale · Ns ago" | Red warning + elapsed + explanation | One toast on transition |
| Simulator paused | Yellow "Simulation paused" | Yellow "intentionally paused" message | — |
| No readings yet | Grey "No data" | "None yet" | — |

Stale toast fires **once per transition**, not on every check-loop tick.

---

## 11. What is not in the MVP

- PWA installation or service worker.
- Browser push notifications (in-page toasts only).
- Persistent storage (localStorage or database).
- Real telephony / emergency-services integration.
- Physical sensor integration.
- User accounts or multi-session support.
- Advanced escalation timer (escalation state exists in the type, but no automatic timer is wired).

---

## 12. How to run

```bash
npm install
npm run dev        # development server
npm test           # 39 Vitest tests
npm run build      # production build (tsc + vite)
```

---

## 13. Scope, safety, and limitations

- All patients and readings are fictional.
- Readings, baselines, and thresholds are synthetic — not clinically validated values.
- The app does not diagnose conditions or recommend treatment.
- A software event does not establish that a real emergency is occurring.
- Resolving a software event does not prove that a patient is medically safe.
- Missing readings indicate a data-freshness problem; they do not reveal the patient's condition.
- The MVP has no physical sensor integration, real emergency-service calls, or guaranteed monitoring while the browser is closed.
- A contact action does not prove that a call connected.

**UI notice displayed at all times:**

> **Prototype notice:** CarePulse uses simulated readings and demonstration-only thresholds. It is not a medical device, does not provide diagnosis, and does not contact emergency services. Do not use it for real patient monitoring or emergency decisions.

---

## 14. Definition of done

- [x] Dashboard shows two fictional patients (Eleanor Vance, Marcus Webb).
- [x] Timestamped synthetic readings update on screen.
- [x] Two separate graphs show readings, patient reference lines, and threshold lines.
- [x] Latest timestamp and data freshness are visible on card and in banner.
- [x] Stable scenario (S01) does not generate unnecessary alerts.
- [x] At least one scenario creates an explainable vital_sign event with value, rule, and explanation.
- [x] Acknowledgement updates status while retaining event history (not resolved).
- [x] Missing data (S07) produces a separate data_quality event, not a vital_sign event.
- [x] Manual assistance (S08) creates an assistance event independently of vital signs.
- [x] Pausing shows "Simulation paused", not a stale warning.
- [x] Scenarios can be reset and replayed deterministically.
- [x] Layout works on laptop widths; Tailwind responsive classes applied.
- [x] Synthetic-data and non-medical-use notice is visible on every page.
- [x] 39/39 Vitest tests pass.
- [x] Production build (`tsc -b && vite build`) succeeds with no errors.
