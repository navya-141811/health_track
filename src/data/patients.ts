/**
 * Fictional patient profiles for the CarePulse demo.
 * All names, ages, readings, baselines, and thresholds are fabricated.
 * NOT real patients. NOT clinically validated values.
 *
 * Threshold rationale explains WHY each limit is set where it is,
 * so a caregiver can understand the context rather than seeing a bare number.
 */
import type { PatientProfile } from '../types'

export const PATIENTS: PatientProfile[] = [
  {
    patient_id: 'patient-001',
    name: 'Priya Sharma',
    age: 67,

    // ── Baselines (this patient's typical resting values) ─────────────────
    baseline_hr_bpm: 72,
    baseline_temp_c: 36.6,
    baseline_spo2_pct: 97,

    // ── Heart rate thresholds ─────────────────────────────────────────────
    // Priya's resting HR is 72 BPM. The upper limit of 100 is set to catch
    // a sustained elevated rate that is meaningfully above her normal range.
    // The lower limit of 55 flags an unusually slow rate for someone her age.
    threshold_hr_upper: 100,
    threshold_hr_lower: 55,
    threshold_hr_rationale:
      'Priya\'s usual resting rate is 72 BPM. Alerts above 100 BPM flag a ' +
      'sustained rise well above her normal. Below 55 BPM flags an unusually slow rate.',

    // ── Temperature thresholds ────────────────────────────────────────────
    // Her normal temperature is 36.6 °C. 37.8 °C is chosen as the upper limit
    // because it is meaningfully elevated above her individual baseline.
    // 36.0 °C flags an unusually low reading for her.
    threshold_temp_upper: 37.8,
    threshold_temp_lower: 36.0,
    threshold_temp_rationale:
      'Priya\'s usual temperature is 36.6 °C. Above 37.8 °C is a notable rise ' +
      'above her individual baseline. Below 36.0 °C is an unusually low reading.',

    // ── SpO2 thresholds ───────────────────────────────────────────────────
    // Her baseline SpO2 is 97%. A drop to 93% or below is a significant fall
    // from her normal and warrants attention. (Demo value — not medical advice.)
    threshold_spo2_lower: 93,
    threshold_spo2_rationale:
      'Priya\'s usual oxygen saturation is 97%. A reading at or below 93% is ' +
      'a significant drop from her individual baseline.',

    designated_contact_name: 'Dr. Anand Krishnan (Demo)',
    designated_contact_phone: '+91-00000-00001',
  },

  {
    patient_id: 'patient-002',
    name: 'Rajan Mehta',
    age: 74,

    baseline_hr_bpm: 68,
    baseline_temp_c: 36.8,
    baseline_spo2_pct: 96,

    // Rajan's resting HR is 68 BPM. Upper limit 105 is set higher than Priya's
    // because his baseline is slightly lower and he has a wider individual range.
    threshold_hr_upper: 105,
    threshold_hr_lower: 50,
    threshold_hr_rationale:
      'Rajan\'s usual resting rate is 68 BPM. Alerts above 105 BPM reflect a ' +
      'sustained rise above his personal range. Below 50 BPM flags an unusually slow rate.',

    threshold_temp_upper: 38.0,
    threshold_temp_lower: 36.1,
    threshold_temp_rationale:
      'Rajan\'s usual temperature is 36.8 °C. Above 38.0 °C is a significant ' +
      'rise above his individual baseline. Below 36.1 °C is unusually low for him.',

    threshold_spo2_lower: 92,
    threshold_spo2_rationale:
      'Rajan\'s usual oxygen saturation is 96%. A reading at or below 92% is ' +
      'a significant drop from his individual baseline.',

    designated_contact_name: 'Nurse Sunita Rao (Demo)',
    designated_contact_phone: '+91-00000-00002',
  },
]

export const PATIENTS_BY_ID: Record<string, PatientProfile> = Object.fromEntries(
  PATIENTS.map((p) => [p.patient_id, p]),
)
