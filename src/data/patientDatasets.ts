/**
 * Hardcoded datasets per patient for the CarePulse demo.
 *
 * Patient 1 (Priya Sharma — patient-001):
 *   Mostly normal readings with one brief spike above HR threshold,
 *   then recovery. Shows the system handles transient events calmly.
 *
 * Patient 2 (Rajan Mehta — patient-002):
 *   Starts normal → drifts into abnormal (temp rises) → escalates to
 *   emergency (HR spikes, SpO2 drops). Perfect for judge showcase.
 *
 * Format: array of steps, plays in order, then loops from beginning.
 * Each step fires every 2 seconds at default speed.
 */
import type { ScenarioStep } from '../types'

// ── Patient 1: Priya — mostly normal, one spike ──────────────────────────────
// Ticks 0–9:  all normal (HR ~72, Temp ~36.6, SpO2 ~97)
// Ticks 10–12: HR spikes above 100 for exactly 3 ticks → alert fires
// Ticks 13–19: full recovery back to normal
// Loops: stays normal forever after
export const PATIENT_1_DATASET: ScenarioStep[] = [
  { tick: 0,  heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97 },
  { tick: 1,  heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
  { tick: 2,  heart_rate_bpm: 74, temperature_c: 36.7, spo2_pct: 98 },
  { tick: 3,  heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 97 },
  { tick: 4,  heart_rate_bpm: 72, temperature_c: 36.6, spo2_pct: 97 },
  { tick: 5,  heart_rate_bpm: 71, temperature_c: 36.5, spo2_pct: 97 },
  { tick: 6,  heart_rate_bpm: 73, temperature_c: 36.6, spo2_pct: 98 },
  { tick: 7,  heart_rate_bpm: 74, temperature_c: 36.7, spo2_pct: 97 },
  { tick: 8,  heart_rate_bpm: 78, temperature_c: 36.8, spo2_pct: 97 },
  { tick: 9,  heart_rate_bpm: 85, temperature_c: 36.9, spo2_pct: 96 },
  // ── Spike: HR crosses upper limit (100 BPM) for 3 ticks → alert fires ──
  { tick: 10, heart_rate_bpm: 104, temperature_c: 37.1, spo2_pct: 96 },
  { tick: 11, heart_rate_bpm: 107, temperature_c: 37.2, spo2_pct: 96 },
  { tick: 12, heart_rate_bpm: 109, temperature_c: 37.3, spo2_pct: 95 },
  // ── Recovery ────────────────────────────────────────────────────────────
  { tick: 13, heart_rate_bpm: 98,  temperature_c: 37.1, spo2_pct: 96 },
  { tick: 14, heart_rate_bpm: 89,  temperature_c: 36.9, spo2_pct: 97 },
  { tick: 15, heart_rate_bpm: 80,  temperature_c: 36.8, spo2_pct: 97 },
  { tick: 16, heart_rate_bpm: 75,  temperature_c: 36.7, spo2_pct: 97 },
  { tick: 17, heart_rate_bpm: 73,  temperature_c: 36.6, spo2_pct: 97 },
  { tick: 18, heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 98 },
  { tick: 19, heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
]

// ── Patient 2: Rajan — normal → abnormal → emergency ────────────────────────
// Thresholds: HR>105, Temp>38.0, SpO2<92
//
// Phase 1 — Normal (ticks 0–14, ~30 seconds): all within safe range
// Phase 2 — Abnormal (ticks 15–21): Temp rises above 38.0 → review alert fires
// Phase 3 — Emergency (ticks 22–29): HR spikes above 105, SpO2 drops below 92 → urgent alarms
// Phase 4 — Sustained critical (ticks 30–35): values stay critical for judges to see
export const PATIENT_2_DATASET: ScenarioStep[] = [
  // ── Phase 1: Normal (~30 seconds) ───────────────────────────────────────
  { tick: 0,  heart_rate_bpm: 68, temperature_c: 36.8, spo2_pct: 96 },
  { tick: 1,  heart_rate_bpm: 69, temperature_c: 36.8, spo2_pct: 96 },
  { tick: 2,  heart_rate_bpm: 70, temperature_c: 36.9, spo2_pct: 97 },
  { tick: 3,  heart_rate_bpm: 68, temperature_c: 36.8, spo2_pct: 96 },
  { tick: 4,  heart_rate_bpm: 71, temperature_c: 36.9, spo2_pct: 96 },
  { tick: 5,  heart_rate_bpm: 69, temperature_c: 36.8, spo2_pct: 97 },
  { tick: 6,  heart_rate_bpm: 70, temperature_c: 36.9, spo2_pct: 96 },
  { tick: 7,  heart_rate_bpm: 68, temperature_c: 36.8, spo2_pct: 96 },
  { tick: 8,  heart_rate_bpm: 71, temperature_c: 36.9, spo2_pct: 97 },
  { tick: 9,  heart_rate_bpm: 69, temperature_c: 36.8, spo2_pct: 96 },
  { tick: 10, heart_rate_bpm: 70, temperature_c: 37.0, spo2_pct: 96 },
  { tick: 11, heart_rate_bpm: 72, temperature_c: 37.0, spo2_pct: 96 },
  { tick: 12, heart_rate_bpm: 71, temperature_c: 37.1, spo2_pct: 95 },
  { tick: 13, heart_rate_bpm: 70, temperature_c: 37.1, spo2_pct: 96 },
  { tick: 14, heart_rate_bpm: 72, temperature_c: 37.2, spo2_pct: 95 },
  // ── Phase 2: Abnormal — temperature rising (alert fires at tick 17) ──────
  { tick: 15, heart_rate_bpm: 75, temperature_c: 37.5, spo2_pct: 95 },
  { tick: 16, heart_rate_bpm: 78, temperature_c: 37.8, spo2_pct: 95 },
  { tick: 17, heart_rate_bpm: 81, temperature_c: 38.1, spo2_pct: 94 }, // temp crosses 38.0 — tick 1
  { tick: 18, heart_rate_bpm: 84, temperature_c: 38.2, spo2_pct: 94 }, // tick 2
  { tick: 19, heart_rate_bpm: 87, temperature_c: 38.3, spo2_pct: 94 }, // → ABNORMAL ALERT fires (temp, tick 3)
  { tick: 20, heart_rate_bpm: 90, temperature_c: 38.4, spo2_pct: 93 },
  { tick: 21, heart_rate_bpm: 93, temperature_c: 38.5, spo2_pct: 93 },
  // ── Phase 3: Emergency — HR spikes + SpO2 drops ──────────────────────────
  { tick: 22, heart_rate_bpm: 98,  temperature_c: 38.6, spo2_pct: 92 },
  { tick: 23, heart_rate_bpm: 106, temperature_c: 38.7, spo2_pct: 91 }, // HR crosses 105 — tick 1 | SpO2 crosses 92 — tick 1
  { tick: 24, heart_rate_bpm: 112, temperature_c: 38.8, spo2_pct: 89 }, // tick 2 each
  { tick: 25, heart_rate_bpm: 119, temperature_c: 38.9, spo2_pct: 87 }, // → EMERGENCY ALERTS fire (HR + SpO2, tick 3)
  { tick: 26, heart_rate_bpm: 123, temperature_c: 39.0, spo2_pct: 86 },
  { tick: 27, heart_rate_bpm: 125, temperature_c: 39.1, spo2_pct: 85 },
  // ── Phase 4: Sustained critical ─────────────────────────────────────────
  { tick: 28, heart_rate_bpm: 122, temperature_c: 39.0, spo2_pct: 85 },
  { tick: 29, heart_rate_bpm: 120, temperature_c: 38.9, spo2_pct: 86 },
  { tick: 30, heart_rate_bpm: 118, temperature_c: 38.8, spo2_pct: 87 },
  { tick: 31, heart_rate_bpm: 116, temperature_c: 38.8, spo2_pct: 87 },
  { tick: 32, heart_rate_bpm: 114, temperature_c: 38.7, spo2_pct: 88 },
  { tick: 33, heart_rate_bpm: 112, temperature_c: 38.6, spo2_pct: 88 },
  { tick: 34, heart_rate_bpm: 110, temperature_c: 38.5, spo2_pct: 89 },
  { tick: 35, heart_rate_bpm: 108, temperature_c: 38.4, spo2_pct: 90 },
]
