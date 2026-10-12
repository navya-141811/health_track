/**
 * RuleEngine — evaluates HR, Temperature, and SpO2 thresholds on every reading.
 *
 * ── How alerts are generated ──────────────────────────────────────────────────
 *
 * Step 1: Per-reading evaluation
 *   Every VitalReading that arrives from the simulator is passed to evaluate().
 *   Each metric (HR upper, HR lower, temp upper, temp lower, SpO2 lower) is
 *   checked independently against the patient's configured demo limit.
 *
 * Step 2: Persistence rule (prevents noise from single spikes)
 *   A crossing must be sustained for PERSISTENCE_TICKS = 3 consecutive readings
 *   before an event is created. At the default 2-second tick interval this means
 *   an alert fires at minimum 6 seconds after the threshold is first crossed.
 *   At 4× speed this becomes 1.5 seconds.
 *
 *   Example (HR upper, Priya threshold 100 BPM):
 *     Tick 3: 102 BPM → counter = 1  (no alert)
 *     Tick 4: 105 BPM → counter = 2  (no alert)
 *     Tick 5: 107 BPM → counter = 3  → ALERT FIRES
 *
 * Step 3: Deduplication (one open event per rule per patient)
 *   The EventStore is checked for an active (non-resolved) event with the same
 *   rule_key. If one exists, no duplicate is created. This prevents flooding
 *   the caregiver with repeated alerts for the same sustained condition.
 *
 * Step 4: Re-alerting after resolve + recovery
 *   When the condition clears (reading goes back within range), the persistence
 *   counter is DELETED. If the condition re-triggers later AND the caregiver has
 *   resolved the previous event, a new alert is created from scratch.
 *
 *   Example — rise → fall → rise again:
 *     Ticks 3-5:  HR above 100 → alert fires at tick 5
 *     Ticks 6-7:  HR drops below 100 → counter deleted, event stays open
 *     Caregiver resolves event
 *     Ticks 8-10: HR rises above 100 again → new counter, new alert fires at tick 10
 *
 *   If the caregiver has NOT resolved the first event, no second alert fires for
 *   the same rule. This is intentional — the first event is still open.
 *
 * Step 5: Recovery does NOT auto-resolve
 *   Returning to a normal reading only clears the counter. It does not resolve
 *   any open event. Only an explicit caregiver action does that.
 *
 * ── Why all three metrics get alerts ─────────────────────────────────────────
 *   All five rules (HR upper, HR lower, temp upper, temp lower, SpO2 lower) run
 *   on every tick independently. If a scenario makes temperature and SpO2 cross
 *   their limits at the same time, both alerts fire separately. Use S02 or a
 *   multi-metric scenario to demonstrate this.
 */
import type { VitalReading, PatientProfile } from '../types'
import type { EventStore } from '../store/EventStore'

/** Consecutive above-threshold readings required before an alert fires. */
export const PERSISTENCE_TICKS = 3

interface Counter {
  rule_name: string
  /** How many consecutive readings have been above the threshold. */
  count: number
}

export class RuleEngine {
  private eventStore: EventStore
  /** patient_id → active persistence counters (one per rule that is currently crossing). */
  private counters: Record<string, Counter[]> = {}

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore
  }

  /**
   * Evaluate one reading against all configured demo rules for this patient.
   * Called on every tick that produces a reading.
   */
  evaluate(reading: VitalReading, patient: PatientProfile): void {
    const { heart_rate_bpm: hr, temperature_c: temp, spo2_pct: spo2 } = reading

    this._check(reading, patient, 'hr_upper',
      hr > patient.threshold_hr_upper,
      hr, patient.threshold_hr_upper, 'urgent',
      `Heart rate of ${hr} BPM went above ${patient.threshold_hr_upper} BPM ` +
      `(${patient.name}'s usual rate is ${patient.baseline_hr_bpm} BPM). ` +
      `Simulated reading — not a medical diagnosis.`,
    )

    this._check(reading, patient, 'hr_lower',
      hr < patient.threshold_hr_lower,
      hr, patient.threshold_hr_lower, 'urgent',
      `Heart rate of ${hr} BPM dropped below ${patient.threshold_hr_lower} BPM ` +
      `(${patient.name}'s usual rate is ${patient.baseline_hr_bpm} BPM). ` +
      `Simulated reading — not a medical diagnosis.`,
    )

    this._check(reading, patient, 'temp_upper',
      temp > patient.threshold_temp_upper,
      temp, patient.threshold_temp_upper, 'review',
      `Temperature of ${temp.toFixed(1)} °C went above ${patient.threshold_temp_upper} °C ` +
      `(${patient.name}'s usual temperature is ${patient.baseline_temp_c} °C). ` +
      `Simulated reading — not a medical diagnosis.`,
    )

    this._check(reading, patient, 'temp_lower',
      temp < patient.threshold_temp_lower,
      temp, patient.threshold_temp_lower, 'review',
      `Temperature of ${temp.toFixed(1)} °C dropped below ${patient.threshold_temp_lower} °C ` +
      `(${patient.name}'s usual temperature is ${patient.baseline_temp_c} °C). ` +
      `Simulated reading — not a medical diagnosis.`,
    )

    this._check(reading, patient, 'spo2_lower',
      spo2 < patient.threshold_spo2_lower,
      spo2, patient.threshold_spo2_lower, 'urgent',
      `Oxygen saturation of ${spo2}% dropped below ${patient.threshold_spo2_lower}% ` +
      `(${patient.name}'s usual level is ${patient.baseline_spo2_pct}%). ` +
      `Simulated reading — not a medical diagnosis.`,
    )
  }

  /** Call on simulator reset to clear all counters for a patient. */
  resetPatient(patient_id: string): void {
    this.counters[patient_id] = []
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private _check(
    reading: VitalReading,
    _patient: PatientProfile,
    rule_name: string,
    condition: boolean,
    actual_value: number,
    configured_limit: number,
    priority: 'review' | 'urgent',
    explanation: string,
  ): void {
    const pid = reading.patient_id
    const rule_key = `${pid}:${rule_name}`

    if (!this.counters[pid]) this.counters[pid] = []
    let counter = this.counters[pid].find((c) => c.rule_name === rule_name)

    if (condition) {
      // ── Threshold is currently crossed ────────────────────────────────
      if (!counter) {
        counter = { rule_name, count: 0 }
        this.counters[pid].push(counter)
      }
      counter.count += 1

      if (counter.count >= PERSISTENCE_TICKS) {
        // Check EventStore: only create a new event if no UNRESOLVED event
        // with this exact rule_key already exists.
        // A RESOLVED event is ignored — so a second crossing after resolve fires fresh.
        const alreadyOpen = this.eventStore
          .getActiveVitalSignEvents(pid)
          .some((e) => e.rule_key === rule_key)

        if (!alreadyOpen) {
          this.eventStore.createVitalSignEvent({
            patient_id: pid,
            reading,
            explanation,
            priority,
            triggering_value: actual_value,
            configured_limit,
            rule_key,
          })
          // Reset counter so sustained crossing doesn't keep firing.
          // It will only fire again if condition clears and re-triggers.
          counter.count = 0
        }
      }
    } else {
      // ── Threshold is no longer crossed — remove the counter entirely ───
      // This means: if the condition comes back later, it starts fresh from 0.
      // It also means the next sustained crossing will create a NEW event,
      // provided the previous one has been resolved by the caregiver.
      const idx = this.counters[pid].findIndex((c) => c.rule_name === rule_name)
      if (idx !== -1) this.counters[pid].splice(idx, 1)
      // ← DO NOT resolve any open events. Only the caregiver does that.
    }
  }
}
