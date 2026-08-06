'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope, Hospital } from 'lucide-react'

interface FindCareToggleProps {
  /** Which mode is currently active — determines which segment is highlighted. */
  active: 'doctor' | 'facilities'
  /** Extra class names for page-specific margin overrides. */
  className?: string
}

/**
 * FindCareToggle
 *
 * Shared segmented control shown at the top of /find-care (symptom/
 * facility-type picker) and /facilities' BROWSE STATE (map/list view) so
 * patients can switch between the two without going back through nav.
 * /facilities' RESULTS STATE swaps this for a "Back to Find Care" button
 * instead — see facility-header-morph in /app/facilities/page.tsx.
 * Styles live in find-care-toggle.css, imported by both pages.
 */
export default function FindCareToggle({ active, className = '' }: FindCareToggleProps) {
  const router = useRouter()

  return (
    <div className={`fc-toggle${className ? ` ${className}` : ''}`} role="tablist" aria-label="Find care mode">
      <button
        className={`fc-toggle__btn${active === 'doctor' ? ' fc-toggle__btn--active' : ''}`}
        role="tab"
        aria-selected={active === 'doctor'}
        type="button"
        onClick={() => { if (active !== 'doctor') router.push('/find-care') }}
      >
        <Stethoscope size={15} />
        Match Symptoms
      </button>
      <button
        className={`fc-toggle__btn${active === 'facilities' ? ' fc-toggle__btn--active' : ''}`}
        role="tab"
        aria-selected={active === 'facilities'}
        type="button"
        onClick={() => { if (active !== 'facilities') router.push('/facilities') }}
      >
        <Hospital size={15} />
        Find Facilities
      </button>
    </div>
  )
}