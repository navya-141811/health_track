# VitalCare

## Product documentation

VitalCare is a caregiver-focused monitoring prototype. It accepts live or simulated heart-rate and temperature readings, evaluates them against patient-specific rules, and guides an alert through caregiver notification, acknowledgment, and escalation.

The app is designed around the response to an abnormal reading. It does not diagnose conditions, use machine learning, or contact emergency services.

## At a glance

| Area | Defined behavior |
|---|---|
| Measurements | Heart rate and temperature and SPO2|
| Monitoring inputs | Live readings or deterministic simulated readings |
| Alert decision | Configured patient thresholds plus a consecutive-reading persistence count |
| Alert states | New, Acknowledged, Resolved |
| Escalation | Caregiver notification, re-notification, then a simulated emergency-services step |
| Notifications | Telegram with a mock fallback; delivery status is recorded |
| Persistence | SQLite records readings and alert-related history |

## End-to-end reading and alert flow

1. **A reading arrives.** It may come from a live source or the simulator.
2. **The reading is validated.** Impossible values are rejected as sensor errors. Plausible readings are retained, including readings that are outside configured limits.
3. **The rule check runs.** Heart rate and temperature are compared with that patient’s configured limits.
4. **Persistence is applied.** The condition must be abnormal for the configured number of consecutive readings before an alert fires. This reduces alerts caused by a single transient reading.
5. **The caregiver is notified.** A notification attempt is recorded. Successful delivery is not equivalent to caregiver acknowledgment.
6. **The caregiver responds.** The caregiver can acknowledge an alert and add a note. The lifecycle is **New → Acknowledged → Resolved**.
7. **Unanswered alerts escalate.** The caregiver is notified again. If the alert remains unanswered, the flow reaches an emergency-services step that is simulated.
8. **The event remains in history.** Readings, alerts, notes, notification attempts, escalation events, and threshold changes are stored in SQLite.

When an abnormal condition continues after an alert has fired, VitalCare updates that alert rather than creating a new alert for every abnormal reading.

## Patient thresholds and onboarding

Threshold settings are per patient and include:

- Heart-rate limits
- Temperature limits
- Number of consecutive abnormal readings required to trigger an alert
- Timeout before escalation

An onboarding questionnaire generates an editable starting profile and displays the reasoning behind it. The generated values are suggestions only. Clinician-provided limits override questionnaire-generated values. Preset thresholds are placeholders, not clinical recommendations.

The overview does not specify the threshold units, inclusive/exclusive boundary behavior, allowed ranges, or the questionnaire’s questions and calculation method; these should be defined by the implementation or product owner.

## Alert wording and lifecycle

Alert copy should state the measurement and configured limit without diagnosing the person. Example:

> Heart rate 138 BPM exceeds configured limit of 120.

The alert lifecycle and escalation progress are distinct:

- **New:** the alert has fired and needs caregiver attention.
- **Acknowledged:** the caregiver has responded, optionally with a note.
- **Resolved:** the alert has been closed.
- **Escalation:** separately records re-notification and the simulated emergency-services step.

A notification delivery receipt does not move an alert to Acknowledged.

## Caregiver dashboard

The single-caregiver dashboard places the main monitoring and response controls on one screen:

- Current heart rate and temperature
- A trend chart
- Active alerts
- Alert history
- Patient settings
- SOS control

The overview does not define the chart time range, refresh interval, patient switching behavior, or the exact fields shown for each historical event.

## Notifications, inactivity, and SOS

The app is used for new alerts, SOS, escalations, and device inactivity. Notification delivery status is recorded. Caregiver acknowledgment is a separate action and must not be inferred from a sent or delivered message.

The app detects when the device stops sending data, presents **NO DATA**, and notifies the caregiver. The inactivity timeout and notification retry policy are not specified in the overview.

SOS creates an immediate critical alert and sends it directly into the escalation chain, bypassing the normal consecutive-abnormal-reading trigger. The subsequent escalation steps remain simulated.

## Simulator

The deterministic simulator has four repeatable scenarios:

| Scenario | Purpose stated in overview |
|---|---|
| Normal | Demonstrate ordinary readings |
| Spike HR | Demonstrate a heart-rate spike |
| Fever | Demonstrate elevated temperature |
| Disconnect | Demonstrate stopped readings and stale-data handling |

Exact sample values, cadence, scenario duration, and reset behavior are not specified in the overview.

## Stored information

SQLite is used to store:

- Vital-sign readings
- Alerts
- Caregiver notes
- Notification attempts and delivery status
- Escalation events
- Threshold change history

The overview does not define retention, deletion, backup, or access-control policies.

## Safety and prototype limitations

- The interface must permanently show: **“Prototype, simulated data, not a medical diagnosis.”**
- Some readings are simulated. Hardware measurements, including optical pulse and skin temperature compared with core temperature, need validation before real-world use.
- Preset threshold values are placeholders and are not clinical recommendations.
- VitalCare is not a medical device.
- The emergency-services step is simulated. No real emergency service is contacted.

## Details to confirm for implementation-level documentation

The product overview does not define exact thresholds or units, input protocols, alert deduplication keys, timeout/retry intervals, escalation recipients, simulator values and cadence, database schema, authentication, or deployment steps. Those details should be documented from the implementation once available; they are intentionally not invented here.
