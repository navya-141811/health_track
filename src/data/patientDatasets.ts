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

// ── Patient 1: Priya Sharma (patient-001) ───────────────────────────────────
// Thresholds: HR > 100, Temp > 37.8 °C, SpO2 < 93%
//
// Phase 1 (ticks 0–5):   Normal baseline resting vitals (~12s)
// Phase 2 (ticks 6–13):  Infection onset → Temperature rises to 38.4 °C (Alert fires at tick 11)
// Phase 3 (ticks 14–18): Antipyretic response → Temperature normalizes back to 36.6 °C
// Phase 4 (ticks 19–27): Acute respiratory distress → SpO2 drops to 85% + HR spikes to 115 BPM
//                        (SpO2 alert fires at tick 23, HR emergency fires at tick 24)
// Phase 5 (ticks 28–35): Oxygen therapy & recovery back to stable baseline
// Loops smoothly for continuous real-world demonstration
export const PATIENT_1_DATASET: ScenarioStep[] = [
  // ── Phase 1: Baseline ──────────────────────────────────────────────────
  { tick: 0,  heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
  { tick: 1,  heart_rate_bpm: 73,  temperature_c: 36.6, spo2_pct: 97 },
  { tick: 2,  heart_rate_bpm: 72,  temperature_c: 36.7, spo2_pct: 98 },
  { tick: 3,  heart_rate_bpm: 74,  temperature_c: 36.7, spo2_pct: 97 },
  { tick: 4,  heart_rate_bpm: 73,  temperature_c: 36.6, spo2_pct: 97 },
  { tick: 5,  heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },

  // ── Phase 2: Temperature Rise / Fever ──────────────────────────────────
  { tick: 6,  heart_rate_bpm: 75,  temperature_c: 37.0, spo2_pct: 97 },
  { tick: 7,  heart_rate_bpm: 77,  temperature_c: 37.4, spo2_pct: 96 },
  { tick: 8,  heart_rate_bpm: 80,  temperature_c: 37.7, spo2_pct: 96 },
  { tick: 9,  heart_rate_bpm: 83,  temperature_c: 38.0, spo2_pct: 96 }, // crosses 37.8 — tick 1
  { tick: 10, heart_rate_bpm: 85,  temperature_c: 38.2, spo2_pct: 95 }, // tick 2
  { tick: 11, heart_rate_bpm: 88,  temperature_c: 38.4, spo2_pct: 95 }, // → ABNORMAL ALERT (Temp, tick 3)
  { tick: 12, heart_rate_bpm: 86,  temperature_c: 38.3, spo2_pct: 95 },
  { tick: 13, heart_rate_bpm: 84,  temperature_c: 38.0, spo2_pct: 96 },

  // ── Phase 3: Fever Settles ─────────────────────────────────────────────
  { tick: 14, heart_rate_bpm: 80,  temperature_c: 37.6, spo2_pct: 96 }, // back below 37.8
  { tick: 15, heart_rate_bpm: 77,  temperature_c: 37.2, spo2_pct: 96 },
  { tick: 16, heart_rate_bpm: 75,  temperature_c: 36.9, spo2_pct: 97 },
  { tick: 17, heart_rate_bpm: 74,  temperature_c: 36.7, spo2_pct: 97 },
  { tick: 18, heart_rate_bpm: 73,  temperature_c: 36.6, spo2_pct: 97 },

  // ── Phase 4: Respiratory Distress (Low SpO2) + Tachycardia (High HR) ───
  { tick: 19, heart_rate_bpm: 82,  temperature_c: 36.7, spo2_pct: 95 },
  { tick: 20, heart_rate_bpm: 92,  temperature_c: 36.8, spo2_pct: 94 },
  { tick: 21, heart_rate_bpm: 98,  temperature_c: 36.8, spo2_pct: 92 }, // SpO2 crosses below 93 — tick 1
  { tick: 22, heart_rate_bpm: 104, temperature_c: 36.9, spo2_pct: 90 }, // SpO2 tick 2 | HR crosses 100 — tick 1
  { tick: 23, heart_rate_bpm: 108, temperature_c: 36.9, spo2_pct: 88 }, // → EMERGENCY ALERT (SpO2 tick 3) | HR tick 2
  { tick: 24, heart_rate_bpm: 112, temperature_c: 37.0, spo2_pct: 86 }, // → EMERGENCY ALERT (HR tick 3)
  { tick: 25, heart_rate_bpm: 115, temperature_c: 37.0, spo2_pct: 85 }, // critical peak
  { tick: 26, heart_rate_bpm: 110, temperature_c: 36.9, spo2_pct: 87 },
  { tick: 27, heart_rate_bpm: 104, temperature_c: 36.8, spo2_pct: 89 },

  // ── Phase 5: Treatment & Recovery ──────────────────────────────────────
  { tick: 28, heart_rate_bpm: 98,  temperature_c: 36.8, spo2_pct: 92 }, // HR back below 100
  { tick: 29, heart_rate_bpm: 91,  temperature_c: 36.7, spo2_pct: 94 }, // SpO2 back above 93
  { tick: 30, heart_rate_bpm: 84,  temperature_c: 36.7, spo2_pct: 96 },
  { tick: 31, heart_rate_bpm: 78,  temperature_c: 36.6, spo2_pct: 97 },
  { tick: 32, heart_rate_bpm: 75,  temperature_c: 36.6, spo2_pct: 97 },
  { tick: 33, heart_rate_bpm: 73,  temperature_c: 36.6, spo2_pct: 97 },
  { tick: 34, heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 98 },
  { tick: 35, heart_rate_bpm: 72,  temperature_c: 36.6, spo2_pct: 97 },
]

// ── Patient 2: Rajan Mehta (patient-002) ───────────────────────────────────
// Thresholds: HR > 105, Temp > 38.0 °C, SpO2 < 92%
//
// Phase 1 (ticks 0–14):  Normal (~30 seconds)
// Phase 2 (ticks 15–21): Abnormal — Temp rises above 38.0 °C → review toast at tick 19
// Phase 3 (ticks 22–27): Emergency — HR spikes above 105 + SpO2 drops below 92% → sirens at tick 25
// Phase 4 (ticks 28–34): Sustained critical monitoring
// Phase 5 (ticks 35–42): Clinical intervention & stabilization recovery
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

  // ── Phase 2: Abnormal — temperature rising ──────────────────────────────
  { tick: 15, heart_rate_bpm: 75, temperature_c: 37.5, spo2_pct: 95 },
  { tick: 16, heart_rate_bpm: 78, temperature_c: 37.8, spo2_pct: 95 },
  { tick: 17, heart_rate_bpm: 81, temperature_c: 38.1, spo2_pct: 94 }, // temp crosses 38.0 — tick 1
  { tick: 18, heart_rate_bpm: 84, temperature_c: 38.2, spo2_pct: 94 }, // tick 2
  { tick: 19, heart_rate_bpm: 87, temperature_c: 38.3, spo2_pct: 94 }, // → ABNORMAL ALERT (temp, tick 3)
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

  // ── Phase 5: Stabilization & Recovery ───────────────────────────────────
  { tick: 35, heart_rate_bpm: 102, temperature_c: 38.2, spo2_pct: 91 },
  { tick: 36, heart_rate_bpm: 95,  temperature_c: 37.8, spo2_pct: 93 },
  { tick: 37, heart_rate_bpm: 88,  temperature_c: 37.5, spo2_pct: 94 },
  { tick: 38, heart_rate_bpm: 82,  temperature_c: 37.2, spo2_pct: 95 },
  { tick: 39, heart_rate_bpm: 76,  temperature_c: 37.0, spo2_pct: 96 },
  { tick: 40, heart_rate_bpm: 71,  temperature_c: 36.9, spo2_pct: 96 },
  { tick: 41, heart_rate_bpm: 69,  temperature_c: 36.8, spo2_pct: 96 },
  { tick: 42, heart_rate_bpm: 68,  temperature_c: 36.8, spo2_pct: 96 },
]
