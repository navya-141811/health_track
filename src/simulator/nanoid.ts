/**
 * Minimal ID generator. Uses crypto.randomUUID when available (browser/Node ≥ 14.17),
 * falls back to a Math.random-based string. Sufficient for in-memory demo IDs.
 */
export function nanoid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}
