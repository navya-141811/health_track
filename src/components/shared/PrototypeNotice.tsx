/**
 * PrototypeNotice — must be visible on every page.
 *
 * CarePulse is not a medical device and does not contact emergency services.
 */
export function PrototypeNotice() {
  return (
    <div
      role="note"
      aria-label="Prototype notice"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 text-center"
    >
      <strong>Prototype notice:</strong> CarePulse uses <em>simulated readings</em> and
      demonstration-only thresholds. It is not a medical device, does not provide diagnosis,
      and does not contact emergency services. Do not use for real patient monitoring.
    </div>
  )
}
