/**
 * EventStore — manages CareEvents for all patients.
 *
 * Rules:
 *  - Three separate categories: vital_sign, data_quality, assistance.
 *  - One active data_quality gap event per patient at a time (no duplicates).
 *  - Acknowledging does not resolve.
 *  - Resolution only happens via an explicit call to resolveEvent().
 *  - Query helpers return read-only arrays filtered by category.
 */
import { nanoid } from '../simulator/nanoid'
import type {
  CareEvent,
  SoftwarePriority,
  VitalReading,
} from '../types'

export interface CreateVitalSignEventParams {
  patient_id: string
  reading: VitalReading
  explanation: string
  priority: SoftwarePriority
  triggering_value: number
  configured_limit: number
  rule_key: string
}

export interface CreateDataQualityEventParams {
  patient_id: string
  explanation: string
}

export interface CreateAssistanceEventParams {
  patient_id: string
  explanation: string
}

export class EventStore {
  private events: CareEvent[] = []

  // ── Queries ────────────────────────────────────────────────────────────────

  /** All events for a patient, oldest first. */
  getByPatient(patient_id: string): CareEvent[] {
    return this.events.filter((e) => e.patient_id === patient_id)
  }

  /** Vital-sign events only (never contains data_quality or assistance). */
  getVitalSignEvents(patient_id: string): CareEvent[] {
    return this.events.filter(
      (e) => e.patient_id === patient_id && e.category === 'vital_sign',
    )
  }

  /** Data-quality events only. */
  getDataQualityEvents(patient_id: string): CareEvent[] {
    return this.events.filter(
      (e) => e.patient_id === patient_id && e.category === 'data_quality',
    )
  }

  /** Assistance events only. */
  getAssistanceEvents(patient_id: string): CareEvent[] {
    return this.events.filter(
      (e) => e.patient_id === patient_id && e.category === 'assistance',
    )
  }

  /** Returns the single open (non-resolved) data_quality event for a patient, or null. */
  getActiveDataQualityEvent(patient_id: string): CareEvent | null {
    return (
      this.events.find(
        (e) =>
          e.patient_id === patient_id &&
          e.category === 'data_quality' &&
          e.status !== 'resolved',
      ) ?? null
    )
  }

  /** Returns all open vital_sign events for a patient (used by rule engine dedup). */
  getActiveVitalSignEvents(patient_id: string): CareEvent[] {
    return this.events.filter(
      (e) =>
        e.patient_id === patient_id &&
        e.category === 'vital_sign' &&
        e.status !== 'resolved',
    )
  }

  getAll(): CareEvent[] {
    return [...this.events]
  }

  getById(event_id: string): CareEvent | null {
    return this.events.find((e) => e.event_id === event_id) ?? null
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  createVitalSignEvent(params: CreateVitalSignEventParams): CareEvent {
    const now = new Date().toISOString()
    const event: CareEvent = {
      event_id: `evt-${nanoid()}`,
      patient_id: params.patient_id,
      category: 'vital_sign',
      priority: params.priority,
      status: 'new',
      created_at: now,
      updated_at: now,
      explanation: params.explanation,
      rule_key: params.rule_key,
      triggering_reading_id: params.reading.reading_id,
      triggering_value: params.triggering_value,
      configured_limit: params.configured_limit,
    }
    this.events.push(event)
    return event
  }

  /**
   * Creates a data_quality event only if no active gap event exists for this patient.
   * Returns null if suppressed (deduplication).
   */
  createDataQualityEvent(params: CreateDataQualityEventParams): CareEvent | null {
    const existing = this.getActiveDataQualityEvent(params.patient_id)
    if (existing) return null // Deduplicate: one active gap event per patient

    const now = new Date().toISOString()
    const event: CareEvent = {
      event_id: `evt-${nanoid()}`,
      patient_id: params.patient_id,
      category: 'data_quality',
      priority: 'review',
      status: 'new',
      created_at: now,
      updated_at: now,
      explanation: params.explanation,
    }
    this.events.push(event)
    return event
  }

  createAssistanceEvent(params: CreateAssistanceEventParams): CareEvent {
    const now = new Date().toISOString()
    const event: CareEvent = {
      event_id: `evt-${nanoid()}`,
      patient_id: params.patient_id,
      category: 'assistance',
      priority: 'urgent',
      status: 'new',
      created_at: now,
      updated_at: now,
      explanation: params.explanation,
    }
    this.events.push(event)
    return event
  }

  /**
   * Marks an event as acknowledged.
   * Acknowledgement is separate from resolution — the event remains open.
   */
  acknowledgeEvent(event_id: string): boolean {
    const event = this.events.find((e) => e.event_id === event_id)
    if (!event || event.status === 'resolved') return false
    event.status = 'acknowledged'
    event.acknowledged_at = new Date().toISOString()
    event.updated_at = event.acknowledged_at
    return true
  }

  /**
   * Resolves an event. Only explicit caregiver action or a data-freshness
   * recovery should call this. Never called automatically on scenario recovery.
   */
  resolveEvent(event_id: string): boolean {
    const event = this.events.find((e) => e.event_id === event_id)
    if (!event || event.status === 'resolved') return false
    event.status = 'resolved'
    event.resolved_at = new Date().toISOString()
    event.updated_at = event.resolved_at
    return true
  }

  escalateEvent(event_id: string): boolean {
    const event = this.events.find((e) => e.event_id === event_id)
    if (!event || event.status === 'resolved') return false
    event.status = 'escalated'
    event.updated_at = new Date().toISOString()
    return true
  }

  /** Hard reset — clears all events. Called on simulator reset. */
  clearAll(): void {
    this.events = []
  }

  /** Clear events for a specific patient only. */
  clearByPatient(patient_id: string): void {
    this.events = this.events.filter((e) => e.patient_id !== patient_id)
  }
}
