/**
 * PrototypeNotice — session-dismissible banner, light theme.
 */
import { useState } from 'react'

export function PrototypeNotice() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('prototype_notice_dismissed') === '1',
  )
  if (dismissed) return null
  const dismiss = () => { sessionStorage.setItem('prototype_notice_dismissed', '1'); setDismissed(true) }

  return (
    <div role="note" aria-label="Prototype notice"
      className="relative bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 text-center">
      <strong>Prototype notice:</strong> CarePulse uses <em>simulated readings</em> and
      demonstration-only thresholds. It is not a medical device, does not provide diagnosis,
      and does not contact emergency services. Do not use for real patient monitoring.
      <button onClick={dismiss} aria-label="Dismiss prototype notice"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-900 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-amber-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
