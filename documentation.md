# CarePulse Implementation Guide

## 1. Purpose and source of truth

CarePulse is a responsive caregiver website prototype for demonstrating synthetic vital-sign trends and a caregiver response workflow. It supports two fictional patients, deterministic scenarios, explainable threshold events, data-freshness warnings, acknowledgements, explicit resolution, and simulated assistance. It is not a medical device, does not diagnose, and does not contact emergency services.

This guide merges the product goals and implementation details into one CarePulse specification. CarePulse is a React single-page prototype using synthetic in-browser data and in-memory state. Its alert workflow uses patient-specific rules, requires persistent readings before creating an event, and keeps event acknowledgement distinct from resolution. The MVP does not use sensors, a backend, SQLite, Telegram, real phone calls, or real patient data.

## 2. Product requirements

### Core experience

- One caregiver can monitor two fictional patients: Eleanor Vance (`patient-001`) and Marcus Webb (`patient-002`).
- The caregiver can select a patient and a deterministic scenario, start, pause, resume, reset, adjust simulation speed, and configure the stale-data timeout.
- Initial patient setup includes a questionnaire that generates an editable suggested profile and explains the reasoning behind its suggestions. Caregiver or clinician-provided thresholds take precedence; questionnaire output and preset values are not clinical recommendations.
- Readings update the dashboard and two separate time-series charts: heart rate and temperature. Keep the units and axes separate.
- Per-patient thresholds and baselines appear as reference lines and are used by the rule engine.
- When a threshold rule persists for three consecutive readings, create an explainable `vital_sign` event. Two consecutive crossings alone must not create one.
- A persistent condition updates or remains represented by one active event; do not flood the event list with duplicates.
- Caregiver acknowledgement records that the event was seen. Acknowledging does not resolve it. Vital-sign events require an explicit resolve action.
- Detect stale data separately from abnormal vital signs. A stale condition creates a `data_quality` event; a deliberate simulator pause displays a paused state and does not create a stale event.
- Resumption of readings resolves the active data-quality event. Suppress duplicate active data-quality events for the same patient.
- A manual assistance action creates an `assistance` event independently of vital readings. Its contact/call UI is simulated and must not claim a call connected.
- Keep a prominent prototype and synthetic-data notice visible at all times.

### Safety copy

Use neutral, rule-based wording that names the measurement and configured limit, for example: “Heart rate 138 BPM exceeds configured limit of 100 BPM.” Do not diagnose, recommend treatment, or infer medical status from missing data. Clearly label all assistance or emergency-call interactions as simulated.

Recommended persistent notice, consistent with the overview: “Prototype notice: CarePulse uses simulated readings and demonstration-only thresholds. It is not a medical device, does not provide diagnosis, and does not contact emergency services. Do not use it for real patient monitoring or emergency decisions.”

## 3. Confirmed stack and project layout

Use the versions listed in the project record unless the actual package manifest specifies a compatible update:

- Vite 8, React 19, TypeScript 6
- Tailwind CSS 3.4.17
- Recharts 2.15.3
- Vitest 3.2.4 with jsdom
- React Context plus class-based stores; all data stays in memory

Suggested module responsibilities:

```text
src/
  types/index.ts                    Shared domain types
  data/patients.ts                  Fictional patient profiles and demo limits
  data/scenarios.ts                 Deterministic scenario definitions S01–S08
  simulator/SimulatorEngine.ts      Timer, scenario position, tick and controls
  simulator/SimulatorContext.tsx    Connect engine, stores and UI state
  simulator/nanoid.ts               ID generation with crypto.randomUUID fallback
  engine/RuleEngine.ts              Threshold checks and 3-reading persistence
  engine/FreshnessMonitor.ts        Fresh, stale, paused and no-data states
  store/EventStore.ts               Event lifecycle, categories and queries
  store/ReadingHistoryStore.ts      Per-patient reading history, max 200
  components/dashboard/             Patient cards and dashboard layout
  components/monitoring/            Freshness banner, charts and event panels
  components/controls/              Patient/scenario and simulator controls
  components/notifications/          In-page stale transition toast
  components/shared/                 Status badge and prototype notice
  test/carepulse.test.ts             Engine, store and scenario tests
  test/setup.ts                      Test setup
  App.tsx                            Page composition and selected patient
  main.tsx                           React entry point
```
Keep rules and state transitions in engine/store modules rather than embedding them in React components. Components should render state and dispatch explicit user actions.

## 4. Domain model

### Initial patient questionnaire

During initial setup, collect the questionnaire responses needed to propose a patient profile and explain how the answers informed the suggested starting values. Keep the generated profile editable. Explicit caregiver- or clinician-provided thresholds override questionnaire suggestions. Label all generated and preset values as demonstration settings, not clinical recommendations. The questionnaire's exact questions, scoring method, and supported profile fields remain implementation decisions; do not imply clinical validation.

The exact TypeScript names can follow the existing codebase, but the model should express these concepts:

```ts
type PatientId = string;
type EventCategory = 'vital_sign' | 'data_quality' | 'assistance';
type EventStatus = 'new' | 'acknowledged' | 'resolved';
type FreshnessState = 'no_data' | 'fresh' | 'stale' | 'paused';

type PatientProfile = {
  id: PatientId;
  name: string;
  baselineHeartRateBpm: number;
  baselineTemperatureC: number;
  thresholds: {
    heartRateLowBpm: number;
    heartRateHighBpm: number;
    temperatureLowC: number;
    temperatureHighC: number;
    consecutiveReadings: number; // MVP default: 3
  };
};

type VitalReading = {
  id: string;
  patientId: PatientId;
  timestamp: number;
  heartRateBpm: number;
  temperatureC: number;
  source: 'synthetic';
};

type CareEvent = {
  id: string;
  patientId: PatientId;
  category: EventCategory;
  status: EventStatus;
  createdAt: number;
  updatedAt: number;
  title: string;
  explanation: string;
  readingId?: string;
  acknowledgedAt?: number;
  resolvedAt?: number;
  caregiverNote?: string;
  // Optional fields for the simulated assistance/escalation presentation.
  simulated?: boolean;
};
```

Keep timestamps consistent (epoch milliseconds are convenient for charting and elapsed-time calculations). An event's category is stable for its lifetime. Do not mix categories in event queries or dashboard sections. The overview specifies no server persistence, so a page reload may reset the MVP session.

### Patient demo profiles

| Patient | ID | Baseline HR | Baseline temp | HR lower / upper | Temp lower / upper |
|---|---|---:|---:|---:|---:|
| Eleanor Vance | `patient-001` | 72 BPM | 36.6 °C | 55 / 100 BPM | 36.0 / 37.8 °C |
| Marcus Webb | `patient-002` | 68 BPM | 36.8 °C | 50 / 105 BPM | 36.1 / 38.0 °C |

These are fictional demonstration values, not clinical recommendations. Keep limits in one patient data source so charts and rule evaluation cannot drift apart.

## 5. Simulator and scenario behavior

The simulator must be deterministic: the same scenario and tick index produce the same output. Use a single timer owned by `SimulatorEngine`; do not create component-specific tick intervals.

### Engine controls

- `start()` starts only if no timer is active; repeated calls are harmless.
- `pause()` clears the timer and sets status to `paused`.
- `resume()` clears any existing timer before starting one, then continues at the same scenario position.
- `reset()` clears the timer, resets position to tick zero, and sets status to `idle`. The context/caller clears that patient's readings and scenario events as part of reset.
- Effective interval is `tick_interval_ms / speed_multiplier`, clamped to at least 100 ms.
- Default freshness timeout is 5 seconds. Demo control range is 3–15 seconds.
- A tick advances the scenario position. Gap ticks call the tick callback but emit no reading.
- Only the simulator engine owns the simulation interval. The freshness monitor has a separate 500 ms check loop.

### Required scenarios

| ID | Scenario | Length | Expected behavior |
|---|---|---:|---|
| S01 | Stable monitoring | 10 | Stable values; no event |
| S02 | Gradual change | 12 | Visible trend; rule event only if persistence reaches 3 |
| S03 | Threshold crossing | 10 | At least one threshold event after 3 consecutive crossings |
| S04 | Temporary fluctuation | 10 | Two over-threshold readings only; no event |
| S05 | Sustained crossing | 12 | Event created once; no duplicate while condition persists |
| S06 | Recovery | 10 | Values return toward baseline; existing vital-sign event remains unresolved |
| S07 | Missing readings | 14 | Gap on ticks 3–9; data-quality warning, not vital-sign alert |
| S08 | Manual assistance | 10 | Stable vital values; assistance event only when caregiver presses control |

The overview does not publish every sample value or base tick interval. Define and store the exact sequence data in `data/scenarios.ts`; do not generate randomness at runtime. Include tests for the documented expected behavior. S07 gap ticks call `onTick` with a gap indication, but not `onReading`.

## 6. Reading processing and rule evaluation

Recommended processing order for each emitted reading:

1. Create a timestamped synthetic reading for the active patient.
2. Validate the reading before storing it. Reject impossible/non-finite values as sensor/data errors. Do not discard plausible out-of-threshold values.
3. Append valid reading to that patient's history and cap the list at 200, oldest first.
4. Update the freshness monitor's last-reading timestamp/state.
5. Evaluate the reading against the patient's low/high threshold rules.
6. Update per-patient consecutive counters and create/update events as needed.
7. Publish the resulting state to React subscribers.

The record defines threshold persistence as three consecutive readings and provides upper and lower limits. Treat equality as crossing (`<= low` or `>= high`) for a predictable implementation unless the existing implementation/product owner has specified otherwise. Reset the counter for a rule when that rule is no longer met. Track the four measurement directions independently (HR low/high, temperature low/high), or use an equivalent representation that prevents one metric from incorrectly continuing another metric's streak.

When a rule reaches the persistence threshold, create an event with the observed value, violated configured limit, measurement/unit, patient, and neutral explanation. If an active matching vital-sign event already exists, update its latest-reading/explanation metadata rather than creating another event. Recovery clears the counter but must not resolve an existing event automatically. Event resolution is a caregiver action.

Boundary semantics and plausible sensor ranges are not specified in the source material. Centralize validation bounds, document them in code, and treat them as demo input-quality checks rather than medical limits.

## 7. Freshness monitoring

Freshness state is per patient and should have an explicit `lastReadingAt` value. Before any reading, show `no_data`. A reading within the configured timeout means `fresh`. If the simulator is running and elapsed time is at least the timeout, transition to `stale`. If it is intentionally paused, show `paused` even after the timeout.

On the transition from fresh/no-data to stale:

- Display the stale badge/banner with elapsed time and last-reading timestamp.
- Create one active `data_quality` event for that patient if one does not already exist.
- Show one in-page toast for that transition; do not emit a toast on every 500 ms check.

When a reading arrives again, return to `fresh` and resolve the active data-quality event. A pause is an intentional state, so it must not create a data-quality event. If a scenario's finite sequence completes, define a clear terminal simulator state or pause it; do not accidentally report stale because a completed scenario silently stopped while status still says running.

## 8. Event lifecycle and caregiver actions

Event categories are:

- `vital_sign`: created by `RuleEngine`.
- `data_quality`: created by `FreshnessMonitor` for an unexpected gap while running.
- `assistance`: created by the caregiver's manual assistance action.

Lifecycle:

```text
new → acknowledged → resolved
```

An event may also be resolved directly from `new` if the UI allows it. Acknowledgement sets status and timestamp, and can store an optional caregiver note. It is not resolution. Resolution sets status and timestamp and leaves the event in history. Do not auto-resolve vital-sign events on recovery. Data-quality events are the specified exception: new readings resolve the active gap warning. Assistance events and contact actions remain simulated.

EventStore should expose explicit operations such as:

- `createVitalSignEvent(...)`, deduplicated against active matching vital-sign events.
- `createDataQualityEvent(patientId, ...)`, returning `null` if an active data-quality event exists.
- `createAssistanceEvent(patientId, ...)`.
- `acknowledgeEvent(eventId, note?)`.
- `resolveEvent(eventId)`.
- Category- and patient-filtered active/history queries.
- `clearByPatient(patientId)` for scenario reset, with clear behavior visible in UI.

Whether reset should clear all historical events for that patient or only events generated during the current scenario should be kept consistent and documented. The current record says the calling layer clears readings and events on reset.

## 9. Escalation and assistance scope

CarePulse demonstrates caregiver response without connecting to a notification service or emergency contact. Automatic escalation timers, browser push, backend delivery, and real telephony are outside this MVP. For this MVP:

- Implement the manual assistance event and simulated call panel as the primary contact demonstration.
- A `tel:` link may be a secondary user-initiated option if the UI has a designated demo contact, but it must never be presented as an emergency-service integration or as a completed call.
- Do not display fabricated Telegram delivery receipts, SMS status, or real emergency contact.
- If an escalation state is shown in the domain type, label it as simulated/manual and do not imply a timer is running.

Any later addition of real notifications or escalation needs its own architecture, security, consent, reliability, and safety decisions and is outside this prototype specification.

## 10. Dashboard and interaction design

Use a responsive two-panel layout: patient list and demo controls in the sidebar; monitoring and event history in the main area. At narrow widths, stack these sections without hiding key response actions.

### Dashboard components

- **PrototypeNotice:** persistent safety copy on every app view.
- **PatientCard:** patient name, latest HR and temperature, freshness badge, count of open events. Clicking selects the patient.
- **DemoControls:** patient/scenario selection, start/pause/resume/reset, speed control, stale timeout control, manual assistance action.
- **MonitoringBanner:** last reading time, elapsed time, and fresh/stale/paused/no-data message.
- **VitalCharts:** separate heart-rate and temperature charts; each shows readings, baseline, and patient low/high limits.
- **EventPanel:** separate sections for vital-sign alerts, data-quality warnings, and assistance requests. Show status, time, explanation and available acknowledgement/note/resolve actions.
- **StaleNotification:** one in-page toast on fresh-to-stale transition, auto-dismiss after six seconds.
- **FreshnessStatusBadge:** distinct presentation for fresh, stale, paused and no data.

Selecting a patient should consistently switch cards, charts, and event details to that patient's data while retaining both patients' independent histories. Controls should make the active patient obvious. Charts should have accessible text summaries or labels in addition to color and provide readable units.

## 11. State ownership and React integration

`SimulatorContext` is the coordination boundary between engine/store classes and React. It should:

- Instantiate or receive one simulator engine, rule engine, freshness monitor, reading store and event store.
- Subscribe to engine and store changes and expose immutable snapshots to components.
- Keep per-patient histories, counters, freshness state and active events isolated.
- Start/stop timers in a lifecycle-safe way; dispose timers/subscriptions on provider unmount.
- Avoid duplicate interval creation during React development/Strict Mode remounts.
- Route UI actions to explicit methods rather than allowing components to mutate stores directly.

A full application reset may clear all in-memory state; a scenario reset is scoped to its patient. Define the behavior in the controls and test it.

## 12. Testing and acceptance criteria

The project record lists 39 passing Vitest tests. Preserve or recreate coverage for the following behaviors; test pure engines/stores without relying on long wall-clock waits by using fake timers where appropriate.

### Required behavior checks

- Scenario values are repeatable for the same scenario/tick; S07 gap positions match the definition.
- Start is idempotent; pause stops ticks; resume continues the same position without a second timer; reset returns to tick zero and stops emission.
- Speed changes effective interval while respecting the 100 ms minimum.
- Reading histories are isolated by patient, ordered oldest first, and capped at 200.
- S04's two crossings do not create an event; the third consecutive crossing does.
- Recovery clears the persistence streak but does not auto-resolve a vital-sign event.
- Sustained crossings do not create duplicate active events.
- Event category queries stay isolated; acknowledgement is not resolution; notes and timestamps are retained.
- Fresh readings stay fresh; timeout while running creates exactly one data-quality event; pause does not create one; a new reading restores fresh and resolves the gap event.
- Stale toast fires once per transition.
- Manual assistance creates an assistance event regardless of vital signs.
- Patient-specific thresholds and histories do not leak across selected patients.
- The persistent safety notice and simulated-call labeling are visible.

The source record says tests and production build passed, but rerun them against the implementation when one exists. Typical commands are `npm test` and `npm run build`. This guide itself does not assert that commands pass in the current workspace.

## 13. Implementation sequence

1. Initialize the Vite React TypeScript application and install the confirmed dependencies.
2. Define shared types and fictional patient profiles.
3. Define all deterministic scenario sequences and expected tick behavior.
4. Implement reading history and event stores with patient/category isolation.
5. Implement and unit-test RuleEngine persistence, matching, deduplication and recovery behavior.
6. Implement SimulatorEngine controls and deterministic ticking with fake-timer tests.
7. Implement FreshnessMonitor and test stale, paused, no-data and recovery transitions.
8. Wire engines/stores through SimulatorContext with timer cleanup and immutable UI snapshots.
9. Build the persistent notice, patient cards, controls, freshness banner and independent charts.
10. Add categorized event history and acknowledgement, note, resolve, and simulated assistance actions.
11. Check responsive layout and accessible chart/event summaries.
12. Run the acceptance tests and production build, then verify every scenario from the UI.

## 14. Out of scope for this MVP

- Physical sensors, hardware integration, WebSockets, polling, or external data input.
- Live readings and SpO₂ monitoring; this prototype demonstrates heart rate and temperature only.
- Backend services, accounts, multi-caregiver sessions, or database persistence.
- Browser push notifications, Telegram, SMS, or notification delivery guarantees.
- Automatic escalation timers and real emergency-service calls.
- Notification retries and an SOS escalation chain.
- Clinical recommendations, diagnosis, validated medical thresholds, or real patient monitoring.
- PWA installation/service worker.

These exclusions define the CarePulse MVP; they are not implemented or required capabilities.

## 15. Open implementation decisions

The project record leaves some details open. Set these explicitly in code/config and document the selected values:

- Base tick interval and exact samples for each scenario.
- What happens when a finite scenario completes (stop, pause, or loop).
- Whether switching patient while the simulator runs changes the simulated patient or only the viewed patient.
- Whether selecting a new scenario requires reset and how its history is handled.
- Whether scenario reset clears all patient events or only events from that run.
- Validation bounds for impossible synthetic readings.
- Boundary comparison behavior (this guide recommends inclusive low/high crossings).
- Whether acknowledgement is allowed after resolution and whether repeat acknowledgement is idempotent.
- Whether an event can be resolved directly without acknowledgement.
- Exact wording and contact details shown in the simulated call panel.
- Keyboard and screen-reader behavior for charts, toast, controls and event actions.

Do not resolve these by adding clinical claims or implying integrations that the project does not have.
