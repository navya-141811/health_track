/**
 * ReadingHistoryStore — per-patient ordered reading arrays.
 *
 * Each patient's history is independent; readings are never mixed.
 * The store is in-memory only for the MVP.
 */
import type { VitalReading } from '../types'

/** Maximum readings kept per patient to avoid memory growth during a long demo. */
const MAX_READINGS_PER_PATIENT = 200

export class ReadingHistoryStore {
  /** patient_id → ordered readings (oldest first) */
  private histories: Record<string, VitalReading[]> = {}

  addReading(reading: VitalReading): void {
    const { patient_id } = reading
    if (!this.histories[patient_id]) {
      this.histories[patient_id] = []
    }
    this.histories[patient_id].push(reading)

    // Trim to keep the demo snappy
    if (this.histories[patient_id].length > MAX_READINGS_PER_PATIENT) {
      this.histories[patient_id] = this.histories[patient_id].slice(-MAX_READINGS_PER_PATIENT)
    }
  }

  getHistory(patient_id: string): VitalReading[] {
    return this.histories[patient_id] ?? []
  }

  getLatestReading(patient_id: string): VitalReading | null {
    const h = this.histories[patient_id]
    if (!h || h.length === 0) return null
    return h[h.length - 1]
  }

  clearPatient(patient_id: string): void {
    this.histories[patient_id] = []
  }

  clearAll(): void {
    this.histories = {}
  }

  /** Returns a snapshot of all histories (for React state updates). */
  getAllHistories(): Record<string, VitalReading[]> {
    return { ...this.histories }
  }
}
