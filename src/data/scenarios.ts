/**
 * Deterministic scenario definitions for CarePulse.
 *
 * Rules for alert correctness (Priya's thresholds: HR>100, Temp>37.8, SpO2<93):
 *
 *  S01 — all readings within range → zero alerts
 *  S02 — gradual rise, HR reaches 103 at tick 8 → HR upper alert fires at tick 10
 *        (tick 8,9,10 all above 100 = 3 consecutive = persistence met)
 *  S03 — HR crosses 100 at tick 3, stays above for 3+ ticks → alert fires at tick 5
 *  S04 — HR above threshold for only 2 consecutive ticks → NO alert (persistence=3)
 *  S05 — HR above threshold from tick 3 onwards, 3 consecutive → alert fires at tick 5
 *        loop continues high → sustained event, NO duplicate
 *  S06 — starts above threshold ticks 0,1,2 → alert fires at tick 2
 *        then drops back to normal → graph recovers, event stays open
 *  S07 — gap ticks → data_quality notice (not a vital-sign alert)
 *  S08 — stable vitals, manual button creates assistance event
 *
 * All values are fabricated for demonstration only.
 */
import type { ScenarioDefinition } from '../types'

export const SCENARIOS: ScenarioDefinition[] = [

  // ── S01 Stable monitoring ────────────────────────────────────────────────
  // All three vitals stay within the safe range for every tick.
  // Expected: zero alerts.
  {
    id: 'S01',
    name: 'Stable monitoring',
    description: 'All readings stay within the safe range. No alert expected.',
    loop_length: 10,
    steps: [
      { tick: 0, heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 1, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 2, heart_rate_bpm: 72, temperature_c: 36.7, spo2_pct: 98 },
      { tick: 3, heart_rate_bpm: 74, temperature_c: 36.7, spo2_pct: 97 },
      { tick: 4, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 5, heart_rate_bpm: 71, temperature_c: 36.6, spo2_pct: 96 },
      { tick: 6, heart_rate_bpm: 72, temperature_c: 36.7, spo2_pct: 97 },
      { tick: 7, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 8, heart_rate_bpm: 74, temperature_c: 36.6, spo2_pct: 98 },
      { tick: 9, heart_rate_bpm: 72, temperature_c: 36.7, spo2_pct: 97 },
    ],
  },

  // ── S02 Gradual rise — multiple metrics cross ────────────────────────────
  // Values climb steadily. All three vitals eventually breach their limits.
  //
  // Timeline (Priya's thresholds: HR>100, Temp>37.8, SpO2<93):
  //   Ticks 0–7:  within range
  //   Ticks 8–10: HR crosses 100 → HR alert fires at tick 10
  //   Tick 10:    SpO2 drops to 92 (< 93) — has been dropping since tick 8
  //               SpO2 alert also fires at tick 10 (ticks 8,9,10 all below 93)
  //   Tick 10:    Temp reaches 37.9 (> 37.8) — temp alert fires at tick 10
  //               (ticks 8,9,10 cross temp threshold too)
  //   All three alerts fire at approximately the same time (tick 10).
  {
    id: 'S02',
    name: 'Gradual change',
    description:
      'Heart rate, temperature, and oxygen level all drift out of range gradually. ' +
      'Separate alerts fire for each metric once the sustained crossing is confirmed.',
    loop_length: 12,
    steps: [
      { tick: 0,  heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
      { tick: 1,  heart_rate_bpm: 75,  temperature_c: 36.7, spo2_pct: 97 },
      { tick: 2,  heart_rate_bpm: 79,  temperature_c: 36.8, spo2_pct: 96 },
      { tick: 3,  heart_rate_bpm: 83,  temperature_c: 36.9, spo2_pct: 96 },
      { tick: 4,  heart_rate_bpm: 87,  temperature_c: 37.1, spo2_pct: 96 },
      { tick: 5,  heart_rate_bpm: 91,  temperature_c: 37.3, spo2_pct: 95 },
      { tick: 6,  heart_rate_bpm: 95,  temperature_c: 37.5, spo2_pct: 95 },
      { tick: 7,  heart_rate_bpm: 99,  temperature_c: 37.6, spo2_pct: 94 },
      // ── All three metrics cross their limits from tick 8 onward ───────
      { tick: 8,  heart_rate_bpm: 103, temperature_c: 37.9, spo2_pct: 92 },
      { tick: 9,  heart_rate_bpm: 104, temperature_c: 38.0, spo2_pct: 91 },
      // ← All three alerts fire at tick 10 (3rd consecutive crossing each)
      { tick: 10, heart_rate_bpm: 103, temperature_c: 38.1, spo2_pct: 90 },
      { tick: 11, heart_rate_bpm: 101, temperature_c: 37.7, spo2_pct: 93 },
    ],
  },

  // ── S03 Rise — fall — rise again ─────────────────────────────────────────
  // Demonstrates re-alerting: HR spikes (alert 1), recovers to normal,
  // then spikes again (alert 2 — fires only if caregiver resolved alert 1).
  //
  // Timeline (Priya's threshold: HR > 100):
  //   Ticks 0–2:  normal (72–80 BPM)
  //   Ticks 3–5:  above 100 → alert fires at tick 5  ← FIRST ALERT
  //   Ticks 6–7:  drops back below 100 → counter resets
  //   Ticks 8–9:  above 100 again → counter starts fresh
  //   Tick 10:    above 100 (3rd consecutive) → NEW alert fires ← SECOND ALERT
  //               (only if caregiver resolved the first one)
  //   Ticks 11–12: recovery
  {
    id: 'S03',
    name: 'Reading crosses a limit',
    description:
      'Heart rate spikes, recovers, then spikes again. A new alert fires on the second ' +
      'crossing only after the caregiver closes the first one.',
    loop_length: 14,
    steps: [
      { tick: 0,  heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
      { tick: 1,  heart_rate_bpm: 78,  temperature_c: 36.7, spo2_pct: 97 },
      { tick: 2,  heart_rate_bpm: 88,  temperature_c: 36.9, spo2_pct: 97 },
      // ── First rise: above HR threshold ────────────────────────────────
      { tick: 3,  heart_rate_bpm: 102, temperature_c: 37.1, spo2_pct: 96 },
      { tick: 4,  heart_rate_bpm: 105, temperature_c: 37.3, spo2_pct: 96 },
      // ← FIRST ALERT fires here (3rd consecutive crossing)
      { tick: 5,  heart_rate_bpm: 107, temperature_c: 37.5, spo2_pct: 96 },
      // ── Recovery: drops back below 100 ────────────────────────────────
      { tick: 6,  heart_rate_bpm: 96,  temperature_c: 37.2, spo2_pct: 97 },
      { tick: 7,  heart_rate_bpm: 80,  temperature_c: 36.8, spo2_pct: 97 },
      // ── Second rise: above HR threshold again ─────────────────────────
      { tick: 8,  heart_rate_bpm: 103, temperature_c: 37.1, spo2_pct: 96 },
      { tick: 9,  heart_rate_bpm: 106, temperature_c: 37.3, spo2_pct: 96 },
      // ← SECOND ALERT fires here (if first event was resolved)
      { tick: 10, heart_rate_bpm: 108, temperature_c: 37.4, spo2_pct: 95 },
      // ── Final recovery ─────────────────────────────────────────────────
      { tick: 11, heart_rate_bpm: 94,  temperature_c: 37.0, spo2_pct: 96 },
      { tick: 12, heart_rate_bpm: 80,  temperature_c: 36.8, spo2_pct: 97 },
      { tick: 13, heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
    ],
  },

  // ── S04 Brief spike — no alert ────────────────────────────────────────────
  // HR crosses 100 for exactly 2 ticks (ticks 3, 4), then drops.
  // Persistence = 3 ticks required → NO alert fires.
  // This demonstrates the persistence rule in action.
  {
    id: 'S04',
    name: 'Brief spike, then normal',
    description:
      'A short spike above the limit, then quick recovery. No alert fires because ' +
      'the crossing does not last long enough (needs 3 readings).',
    loop_length: 10,
    steps: [
      { tick: 0, heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 1, heart_rate_bpm: 78, temperature_c: 36.7, spo2_pct: 97 },
      { tick: 2, heart_rate_bpm: 88, temperature_c: 36.9, spo2_pct: 97 },
      // ── Above threshold for exactly 2 ticks ───────────────────────────
      { tick: 3, heart_rate_bpm: 103, temperature_c: 37.0, spo2_pct: 97 },
      { tick: 4, heart_rate_bpm: 102, temperature_c: 37.0, spo2_pct: 96 },
      // ── Drops back below before persistence met ───────────────────────
      { tick: 5, heart_rate_bpm: 91,  temperature_c: 36.8, spo2_pct: 97 },
      { tick: 6, heart_rate_bpm: 80,  temperature_c: 36.7, spo2_pct: 97 },
      { tick: 7, heart_rate_bpm: 74,  temperature_c: 36.6, spo2_pct: 97 },
      { tick: 8, heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
      { tick: 9, heart_rate_bpm: 71,  temperature_c: 36.5, spo2_pct: 98 },
    ],
  },

  // ── S05 Sustained high readings ───────────────────────────────────────────
  // HR above threshold from tick 3 onward. Alert fires at tick 5.
  // Stays high through ticks 5–9 → only ONE alert (no duplicate).
  {
    id: 'S05',
    name: 'Readings stay high',
    description:
      'Heart rate stays above the limit for a sustained period. One alert is raised; no duplicates.',
    loop_length: 12,
    steps: [
      { tick: 0,  heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
      { tick: 1,  heart_rate_bpm: 80,  temperature_c: 36.8, spo2_pct: 97 },
      { tick: 2,  heart_rate_bpm: 92,  temperature_c: 37.0, spo2_pct: 96 },
      // ── Above threshold from tick 3 ────────────────────────────────────
      { tick: 3,  heart_rate_bpm: 103, temperature_c: 37.2, spo2_pct: 96 },
      { tick: 4,  heart_rate_bpm: 105, temperature_c: 37.4, spo2_pct: 95 },
      // Alert fires HERE (tick 5 = 3rd consecutive)
      { tick: 5,  heart_rate_bpm: 107, temperature_c: 37.6, spo2_pct: 95 },
      { tick: 6,  heart_rate_bpm: 108, temperature_c: 37.7, spo2_pct: 94 },
      { tick: 7,  heart_rate_bpm: 106, temperature_c: 37.6, spo2_pct: 94 },
      { tick: 8,  heart_rate_bpm: 104, temperature_c: 37.5, spo2_pct: 95 },
      { tick: 9,  heart_rate_bpm: 102, temperature_c: 37.3, spo2_pct: 96 },
      { tick: 10, heart_rate_bpm: 95,  temperature_c: 37.0, spo2_pct: 96 },
      { tick: 11, heart_rate_bpm: 82,  temperature_c: 36.7, spo2_pct: 97 },
    ],
  },

  // ── S06 Recovery ─────────────────────────────────────────────────────────
  // Starts above threshold at tick 0. Ticks 0,1,2 all above → alert fires at tick 2.
  // Then values drop back to normal. Graph recovers.
  // Existing alert stays open until caregiver explicitly closes it.
  {
    id: 'S06',
    name: 'Returning to normal',
    description:
      'Starts above the limit, then readings return to normal. The alert stays open ' +
      'until you close it — recovery in readings does not auto-close an alert.',
    loop_length: 10,
    steps: [
      // ── Above HR threshold from tick 0 ─────────────────────────────────
      { tick: 0, heart_rate_bpm: 108, temperature_c: 37.6, spo2_pct: 94 },
      { tick: 1, heart_rate_bpm: 105, temperature_c: 37.4, spo2_pct: 94 },
      // Alert fires HERE (tick 2 = 3rd consecutive above-threshold)
      { tick: 2, heart_rate_bpm: 103, temperature_c: 37.2, spo2_pct: 95 },
      // ── Drops back below threshold ────────────────────────────────────
      { tick: 3, heart_rate_bpm: 98,  temperature_c: 37.0, spo2_pct: 95 },
      { tick: 4, heart_rate_bpm: 90,  temperature_c: 36.9, spo2_pct: 96 },
      { tick: 5, heart_rate_bpm: 83,  temperature_c: 36.8, spo2_pct: 96 },
      { tick: 6, heart_rate_bpm: 78,  temperature_c: 36.7, spo2_pct: 97 },
      { tick: 7, heart_rate_bpm: 75,  temperature_c: 36.7, spo2_pct: 97 },
      { tick: 8, heart_rate_bpm: 73,  temperature_c: 36.6, spo2_pct: 97 },
      { tick: 9, heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
    ],
  },

  // ── S07 Readings stop ────────────────────────────────────────────────────
  // 3 normal readings, then a 7-tick gap (gap:true = no reading emitted).
  // FreshnessMonitor detects the gap and raises a data_quality notice.
  // Vitals were normal before the gap, so no vital-sign alert.
  // Readings resume at tick 10.
  {
    id: 'S07',
    name: 'Readings stop arriving',
    description:
      'Readings stop for several seconds, then resume. A "readings stopped" notice ' +
      'appears (this is a connection notice, not a vital-sign alert).',
    loop_length: 14,
    steps: [
      { tick: 0, heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 1, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 2, heart_rate_bpm: 72, temperature_c: 36.7, spo2_pct: 97 },
      // ── Gap: no reading emitted for ticks 3–9 ─────────────────────────
      { tick: 3,  heart_rate_bpm: 0, temperature_c: 0, spo2_pct: 0, gap: true },
      { tick: 4,  heart_rate_bpm: 0, temperature_c: 0, spo2_pct: 0, gap: true },
      { tick: 5,  heart_rate_bpm: 0, temperature_c: 0, spo2_pct: 0, gap: true },
      { tick: 6,  heart_rate_bpm: 0, temperature_c: 0, spo2_pct: 0, gap: true },
      { tick: 7,  heart_rate_bpm: 0, temperature_c: 0, spo2_pct: 0, gap: true },
      { tick: 8,  heart_rate_bpm: 0, temperature_c: 0, spo2_pct: 0, gap: true },
      { tick: 9,  heart_rate_bpm: 0, temperature_c: 0, spo2_pct: 0, gap: true },
      // ── Readings resume ────────────────────────────────────────────────
      { tick: 10, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 11, heart_rate_bpm: 72, temperature_c: 36.7, spo2_pct: 97 },
      { tick: 12, heart_rate_bpm: 74, temperature_c: 36.7, spo2_pct: 97 },
      { tick: 13, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
    ],
  },

  // ── S08 Manual assistance ────────────────────────────────────────────────
  // Vitals are completely stable throughout.
  // Use the "Request help" button to create an assistance event.
  {
    id: 'S08',
    name: 'Stable — manual help request',
    description:
      'Vitals are stable. Press the "Request help" button to create a help-request ' +
      'event that is independent of any vital-sign reading.',
    loop_length: 10,
    steps: [
      { tick: 0, heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 1, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 2, heart_rate_bpm: 72, temperature_c: 36.7, spo2_pct: 98 },
      { tick: 3, heart_rate_bpm: 74, temperature_c: 36.7, spo2_pct: 97 },
      { tick: 4, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 5, heart_rate_bpm: 71, temperature_c: 36.6, spo2_pct: 96 },
      { tick: 6, heart_rate_bpm: 72, temperature_c: 36.7, spo2_pct: 97 },
      { tick: 7, heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 8, heart_rate_bpm: 74, temperature_c: 36.6, spo2_pct: 97 },
      { tick: 9, heart_rate_bpm: 72, temperature_c: 36.7, spo2_pct: 97 },
    ],
  },
]

export const SCENARIOS_BY_ID: Record<string, ScenarioDefinition> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s]),
)
