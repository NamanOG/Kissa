import React from 'react'

/** A turntable seen from above (plinth, record, tonearm), drawn like the lucide icons beside it. */
export const TurntableIcon = ({ className, strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }): React.JSX.Element => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <circle cx="10.5" cy="12" r="5.5" />
    <circle cx="10.5" cy="12" r="1" />
    <path d="M18.5 6.5v6.5l-3 3" />
  </svg>
)
