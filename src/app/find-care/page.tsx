'use client'

/**
 * /find-care — Section 11 of the HEALTHNAV master handoff.
 *
 * Two ways to get to the same destination — /facilities?type=<slug> (its
 * RESULTS STATE, which fully absorbed the old /find-care/results page):
 *   Mode A: tap a facility type chip directly (Hospital, Clinic, Dental...)
 *   Mode B: select symptoms (or describe them in free text via Gemini) and
 *           get routed to the matching facility type
 *
 * This replaces an older doctor/specialist-marketplace build of this page
 * (a "Find a Doctor" / "Find Facilities" toggle, symptom → specialty
 * matching, /api/providers). There is no provider marketplace in v1 —
 * everything here routes to /facilities' Overpass-backed RESULTS STATE
 * using the FACILITY_TYPE_OPTIONS taxonomy in lib/constants.ts.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useDarkMode } from '@/contexts/DarkModeContext'
import DashboardLayout from '@/components/DashboardLayout'
import MobTabBar from '@/components/MobTabBar'
import { HCLogo } from '@/components/HCLogo'
import FindCareToggle from '@/components/FindCareToggle'
import { COMMON_SYMPTOMS, FACILITY_TYPE_OPTIONS, type SymptomOption } from '@/lib/constants'
import { matchSymptoms, SYMPTOM_FACILITY_MAP, type FacilityMatch } from '@/lib/symptomSpecialtyMap'
import { trackActivity } from '@/lib/activityTracker'
import '@/styles/dashboard.css'
import '@/styles/dashboard-header.css'
import '@/styles/find-care.css'
import '@/styles/find-care-mobile.css'
import '@/styles/find-care-toggle.css'
import {
  Search, X, Check, Crosshair, Loader2, AlertCircle, ArrowRight, ChevronDown,
  Sparkles, Hospital, Stethoscope, Smile, Eye, Ear, Pill, Microscope, Baby,
  Brain, Building2, SendHorizontal, MessageCircleQuestion, ShieldAlert,
  CheckCircle2, ShieldCheck,
} from 'lucide-react'

const MobTopbarMenu = dynamic(() => import('@/components/MobTopbarMenu'), { ssr: false })

/* ── Icon resolution — shared with /facilities' RESULTS STATE ── */
const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Hospital, Stethoscope, Smile, Eye, Ear, Pill, Microscope, Baby, Brain, Building2,
}

const CATEGORY_ORDER: SymptomOption['category'][] = [
  'Head & Neck', 'Chest', 'Stomach', 'Skin', 'Mental Health', 'General',
]

const NHIS_SESSION_KEY = 'hc_find_care_nhis_only'

type LocationState =
  | { status: 'idle' | 'locating' }
  | { status: 'granted'; lat: number; lng: number; accuracy: number }
  | { status: 'denied' }

export default function FindCarePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { isDarkMode } = useDarkMode()

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [location, setLocation] = useState<LocationState>({ status: 'idle' })
  const [nhisOnly, setNhisOnly] = useState(false)

  // Lets the user dismiss the floating mobile match bar with an X, without
  // losing their symptom selections. Resets whenever the matched type
  // changes (new topMatch.slug) so a genuinely new match isn't hidden by
  // an earlier dismissal.
  const [matchBarDismissed, setMatchBarDismissed] = useState(false)

  // ── Free-text Gemini symptom bar — Section 11, "Can't find your
  //    symptom above?". Routing only, never a diagnosis. ──
  const [freeText, setFreeText] = useState('')
  const [freeTextStatus, setFreeTextStatus] = useState<'idle' | 'loading' | 'error' | 'matched'>('idle')
  const [freeTextError, setFreeTextError] = useState('')
  const [freeTextMatch, setFreeTextMatch] = useState<{ slug: string; name: string; icon: string; reason: string } | null>(null)

  // The full match card is hidden on phones now (see .fc-side in
  // find-care-mobile.css) — the floating mobile match bar is the only
  // match UI there. This ref just anchors the card for tablet/desktop,
  // where it renders normally and needs no scroll assistance.
  const matchSectionRef = useRef<HTMLDivElement>(null)

  // Sync dark mode class (matches pattern used across all pages)
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode)
  }, [isDarkMode])

  // NHIS toggle persists for the session (Section 11)
  useEffect(() => {
    const stored = sessionStorage.getItem(NHIS_SESSION_KEY)
    if (stored === 'true') setNhisOnly(true)
  }, [])
  useEffect(() => {
    sessionStorage.setItem(NHIS_SESSION_KEY, String(nhisOnly))
  }, [nhisOnly])

  // GPS requested on page load, falls back to a retry banner if denied —
  // /facilities' RESULTS STATE also requests GPS itself when it doesn't
  // get coordinates via the URL, but gating here avoids a dead-end tap
  // that goes nowhere.
  // hasMountRequestedRef guards against React 18 StrictMode's dev-only
  // double-invoke of the mount effect firing getCurrentPosition() twice —
  // low-stakes (production doesn't double-invoke, and /facilities' own
  // accuracy refinement already compensates for whichever fix wins), but
  // free to close and it's the same class of issue fixed on /facilities.
  const hasMountRequestedRef = useRef(false)
  useEffect(() => {
    if (hasMountRequestedRef.current) return
    hasMountRequestedRef.current = true
    if (!navigator.geolocation) {
      setLocation({ status: 'denied' })
      return
    }
    setLocation({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setLocation({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  const retryLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocation({ status: 'denied' }); return }
    setLocation({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setLocation({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  const hasLocation = location.status === 'granted'

  const goToResultsForType = useCallback((typeSlug: string) => {
    const params = new URLSearchParams({ type: typeSlug, from: '/find-care' })
    if (location.status === 'granted') {
      params.set('lat', String(location.lat))
      params.set('lng', String(location.lng))
      params.set('acc', String(location.accuracy))
    }
    if (nhisOnly) params.set('nhis', 'true')
    router.push(`/facilities?${params.toString()}`)
  }, [location, nhisOnly, router])

  // Mode A — direct facility-type chip tap
  const selectFacilityType = useCallback((opt: { slug: string; label: string }) => {
    trackActivity(
      'facility_search',
      `Searched for ${opt.label}`,
      location.status === 'granted' ? 'Near your location' : 'Location not set',
      { facilityType: opt.slug, lat: location.status === 'granted' ? location.lat : null, lng: location.status === 'granted' ? location.lng : null },
    ).catch(() => {})
    goToResultsForType(opt.slug)
  }, [location, goToResultsForType])

  const toggleSymptom = useCallback((slug: string) => {
    setSelectedSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }, [])

  const clearAll = useCallback(() => setSelectedSlugs([]), [])

  // Group symptom chips by body-area category, preserving declared order
  const symptomsByCategory = useMemo(() => {
    const groups = new Map<SymptomOption['category'], SymptomOption[]>()
    for (const cat of CATEGORY_ORDER) groups.set(cat, [])
    for (const symptom of COMMON_SYMPTOMS) {
      groups.get(symptom.category)?.push(symptom)
    }
    return groups
  }, [])

  // Live facility-type match — client-side, no API call
  const matches: FacilityMatch[] = useMemo(
    () => matchSymptoms(selectedSlugs),
    [selectedSlugs]
  )
  const topMatch = matches[0]

  // Lets the mobile bar handle ties/multiple plausible matches: instead
  // of silently acting on whichever facility type happens to be first in
  // `matches`, the user can tap an alternate to make IT the active one —
  // the bar's label, reasoning, and CTA all follow the override. Resets
  // whenever the underlying match set actually changes (new symptom
  // added/removed changes the ranking) so a stale override never sticks
  // to a match that's no longer the most relevant.
  const [activeMatchSlug, setActiveMatchSlug] = useState<string | null>(null)
  const activeMatch = useMemo(
    () => matches.find(m => m.slug === activeMatchSlug) ?? topMatch,
    [matches, activeMatchSlug, topMatch]
  )

  // The reasoning/alternates detail (added so the bar could fully replace
  // the old match card) made the bar 4-5 rows tall when always shown —
  // too much of the screen for a floating overlay sitting on top of the
  // symptom grid the user is still working in. Collapsed by default: just
  // the match row + CTA. Tapping the match row reveals the rest. The CTA
  // itself is never hidden behind this — it's the one thing that should
  // always be one tap away regardless of expand state.
  const [detailExpanded, setDetailExpanded] = useState(false)

  // First-time-only attention hint for the expand toggle above. Safe SSR
  // default is "already discovered" (true) — same value the server
  // renders — so returning users (the common case) never see a flash of
  // a hint that immediately disappears. Only flips to false, post-hydration,
  // for genuine first-timers who've never expanded it before. Mirrors the
  // same read-after-mount pattern used in DarkModeContext/FontSizeContext.
  const [hasDiscoveredExpand, setHasDiscoveredExpand] = useState(true)
  useEffect(() => {
    try {
      if (!localStorage.getItem('hc-find-care-match-expand-seen')) {
        setHasDiscoveredExpand(false)
      }
    } catch { /* localStorage blocked (private mode etc.) */ }
  }, [])
  const markExpandDiscovered = useCallback(() => {
    setHasDiscoveredExpand(true)
    try { localStorage.setItem('hc-find-care-match-expand-seen', '1') } catch {}
  }, [])

  // Other candidates besides whichever is currently active — tappable in
  // the bar to switch. Genuine ties (equal score) are common here since
  // several symptoms can point at more than one facility type equally
  // strongly, so this is deliberately not just "everything below rank 1".
  const alternateMatches = useMemo(
    () => matches.filter(m => m.slug !== activeMatch?.slug),
    [matches, activeMatch]
  )

  // "Why matched" — which of the selected symptoms actually contributed
  // to the ACTIVE match, so the bar can show a reason instead of just a
  // bare label + confidence badge. Falls back to nothing if the match
  // list is empty (no symptoms recognised).
  const matchedSymptomLabels = useMemo(() => {
    if (!activeMatch) return []
    return selectedSlugs
      .filter(slug => SYMPTOM_FACILITY_MAP[slug]?.some(e => e.typeSlug === activeMatch.slug))
      .map(slug => COMMON_SYMPTOMS.find(s => s.slug === slug)?.label)
      .filter((l): l is string => !!l)
  }, [selectedSlugs, activeMatch])

  // Re-surface the mobile match bar whenever the actual matched type
  // changes — a dismissal should only suppress the match the user saw,
  // not every future match in the session. Also clears any manual
  // active-match override for the same reason: it belonged to the old
  // match set, not the new one.
  useEffect(() => {
    setMatchBarDismissed(false)
    setActiveMatchSlug(null)
    setDetailExpanded(false)
  }, [topMatch?.slug, matches.length])

  const canSearch = !!topMatch && hasLocation
  const canSearchActive = !!activeMatch && hasLocation

  // Mode B — symptom-based CTA ("Find [type] near me"). Takes the target
  // match explicitly so both the desktop CTA (always topMatch) and the
  // mobile bar (topMatch, or whichever alternate the user tapped) can
  // share it.
  const handleSelectMatch = useCallback((match: FacilityMatch) => {
    const symptomLabels = selectedSlugs
      .map(slug => COMMON_SYMPTOMS.find(s => s.slug === slug)?.label)
      .filter(Boolean)
    trackActivity(
      'symptom_search',
      'Symptom search',
      symptomLabels.join(', '),
      { symptoms: symptomLabels, matchedType: match.slug },
    ).catch(() => {})
    goToResultsForType(match.slug)
  }, [selectedSlugs, goToResultsForType])

  const submitFreeText = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = freeText.trim()

    if (trimmed.length < 3) {
      setFreeTextStatus('error')
      setFreeTextError("Please describe what you're feeling in a bit more detail.")
      return
    }
    if (!hasLocation) {
      setFreeTextStatus('error')
      setFreeTextError('Enable your location above so we can find facilities near you.')
      return
    }

    setFreeTextStatus('loading')
    setFreeTextError('')
    setFreeTextMatch(null)

    try {
      const res = await fetch('/api/symptom-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data || data.error || !data.facility?.slug) {
        setFreeTextStatus('error')
        setFreeTextError(
          data?.error || "We couldn't process that — try selecting a symptom above, or call 193 for emergencies."
        )
        return
      }

      setFreeTextStatus('matched')
      setFreeTextMatch({
        slug: data.facility.slug,
        name: data.facility.name,
        icon: data.facility.icon,
        reason: data.reason || '',
      })

      trackActivity(
        'symptom_text_search',
        'Described symptoms',
        trimmed.slice(0, 60),
        { matchedType: data.facility.slug },
      ).catch(() => {})

      // Brief confirmation beat before handing off, so the match feels
      // read rather than instant-teleported — then route to results.
      window.setTimeout(() => goToResultsForType(data.facility.slug), 900)
    } catch {
      setFreeTextStatus('error')
      setFreeTextError("We couldn't process that — try selecting a symptom above, or call 193 for emergencies.")
    }
  }, [freeText, hasLocation, goToResultsForType])

  // Only renders something when there's actually a reason to: location
  // still resolving, or genuinely unavailable and blocking the page from
  // working. A "granted" success chip was here before, but it wasn't
  // telling the user anything they could act on — the facility chips
  // below already go from disabled to tappable the moment location
  // resolves, which communicates "it worked" more directly than a
  // separate line of text ever could. Removing it also gets that space
  // back on a page that's tight for room on phones.
  const locationStatus =
    location.status === 'granted' ? null : (
      <div className="fc-location">
        {(location.status === 'locating' || location.status === 'idle') && (
          <div className="fc-location__chip">
            <Loader2 size={13} className="fc-spin" />
            Getting your location — needed to show facilities near you…
          </div>
        )}
        {location.status === 'denied' && (
          <div className="fc-location__fallback">
            <div className="fc-location__fallback-row">
              <AlertCircle size={13} />
              <span>Location access is needed to find facilities near you — enable it to continue</span>
              <button className="fc-location__retry" onClick={retryLocation} type="button">
                <Crosshair size={12} /> Allow location
              </button>
            </div>
          </div>
        )}
      </div>
    )

  return (
    <DashboardLayout activeTab="/find-care" className="hc-layout--has-mob-topbar">
      {/* ── Fixed background layer — pattern + tint stay pinned to the
           viewport while everything else scrolls over it. A real
           position:fixed element, not background-attachment:fixed,
           since that CSS property is unreliably ignored on iOS Safari.
           Same technique as Dashboard's .db-bg-fixed / Emergency's
           .em-bg-fixed / Profile's .pr-bg-fixed. ── */}
      <div className="fc-bg-fixed" aria-hidden="true" />

      {/* ── Mobile topbar — pill style, matches rest of app ── */}
      <div className="mob-topbar">
        <div className="mob-topbar__left">
          <HCLogo size={26} />
          <span className="mob-topbar__logo-text">HealthConnect</span>
        </div>
        <div className="mob-topbar__right">
          <MobTopbarMenu />
        </div>
      </div>

      <div className="fc-page">
        <div className="fc-root">

          {/* ══ PAGE HEADER ══════════════════════════════════════ */}
          <div className="fc-page-header">
            <div className="fc-page-header__left">
              <h1 className="fc-page-header__title">Find Care</h1>
              <p className="fc-page-header__sub">
                <Stethoscope size={11} />
                Search by facility type, or match your symptoms to the right care near you
              </p>
              <div className="fc-page-header__stats">
                <span><strong>{FACILITY_TYPE_OPTIONS.length}</strong> facility types</span>
                <span className="fc-page-header__dot" aria-hidden="true">•</span>
                <span><strong>{COMMON_SYMPTOMS.length}+</strong> symptoms mapped</span>
              </div>
            </div>
          </div>

          {/* Mode toggle — switch to the map/facility list without going
               back through nav. Shared with /facilities' BROWSE STATE;
               its RESULTS STATE swaps this for a "Back to Find Care" button. */}
          <div className="fc-page-toggle">
            <FindCareToggle active="doctor" />
          </div>

          {/* ══ LOCATION STATUS ══════════════════════════════════
              Only takes up space while location is resolving or denied —
              once granted, this renders nothing at all. */}
          {locationStatus && <div className="fc-location--inline">{locationStatus}</div>}

          {/* ══ MOBILE FLOATING MATCH BAR ═════════════════════════
              The full match card (.fc-side) is hidden on phones (see
              find-care-mobile.css) — this bar is the only match UI
              there, so it carries everything that card used to show:
              matched type + confidence, which selected symptoms drove
              the match, the generalFirst safety note, and a compact
              list of secondary matches — but collapsed behind a tap by
              default (see detailExpanded) so the bar itself stays to
              2 rows instead of permanently occupying 4-5. Floats above
              mob-tab-bar (68px clearance) the instant a symptom is
              selected. Desktop hides this entirely — the sticky sidebar
              does the job there since it's always in view. */}
          {selectedSlugs.length > 0 && !matchBarDismissed && (() => {
            const hasDetail = matchedSymptomLabels.length > 0 || !!activeMatch?.generalFirst || alternateMatches.length > 0
            return (
            <div className="fc-mobile-match-bar" role="status" aria-live="polite">
              <div className="fc-mobile-match-bar__row">
                {/* Now the only match UI on phones (the full card below
                    is hidden at this breakpoint — see fc-side in
                    find-care-mobile.css). Doubles as the expand/collapse
                    toggle for the reasoning/alternates below when there's
                    any (hasDetail) — plain, non-interactive text otherwise
                    (e.g. the "no match" case has nothing to expand into). */}
                {matches.length === 0 ? (
                  <div className="fc-mobile-match-bar__text">
                    <AlertCircle size={15} />
                    <span>No direct match — a general clinic is a safe first step.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="fc-mobile-match-bar__text"
                    onClick={() => {
                      setDetailExpanded(v => !v)
                      if (hasDetail) markExpandDiscovered()
                    }}
                    disabled={!hasDetail}
                    aria-expanded={hasDetail ? detailExpanded : undefined}
                    aria-haspopup={hasDetail ? true : undefined}
                    aria-controls={hasDetail ? 'fc-mobile-match-detail' : undefined}
                    title={hasDetail ? 'Tap to see why this was matched, and other possible facility types' : undefined}
                    data-first-time-hint={hasDetail && !hasDiscoveredExpand ? true : undefined}
                    aria-label={hasDetail ? (detailExpanded ? 'Hide match details' : 'Show why this was matched') : undefined}
                  >
                    {React.createElement(TYPE_ICONS[activeMatch!.icon] ?? Building2, { size: 16 })}
                    <span>
                      Matched: <strong>{activeMatch!.label}</strong>
                      <span className={`fc-confidence-badge fc-confidence-badge--${activeMatch!.confidence}`}>
                        {activeMatch!.confidence === 'high' ? 'Strong match'
                          : activeMatch!.confidence === 'moderate' ? 'Possible match'
                          : 'Weak match'}
                      </span>
                    </span>
                    {hasDetail && (
                      <ChevronDown size={14} className={`fc-mobile-match-bar__chevron${detailExpanded ? ' is-open' : ''}`} />
                    )}
                  </button>
                )}
                <button
                  className="fc-mobile-match-bar__close"
                  onClick={() => setMatchBarDismissed(true)}
                  aria-label="Dismiss matched facility bar"
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
              {detailExpanded && hasDetail && (
                <div id="fc-mobile-match-detail" className="fc-mobile-match-bar__detail">
                  {matchedSymptomLabels.length > 0 && (
                    <p className="fc-mobile-match-bar__reason">
                      Based on: {matchedSymptomLabels.join(', ')}
                    </p>
                  )}
                  {activeMatch?.generalFirst && (
                    <p className="fc-mobile-match-bar__note">
                      <Stethoscope size={11} />
                      A general clinic is a safe first step — they can refer you onward if needed.
                    </p>
                  )}
                  {/* Other candidates are tappable, not just listed —
                      several symptoms often point at more than one
                      facility type with genuinely equal confidence, so
                      silently acting on whichever happened to rank first
                      would be a guess dressed up as an answer. Tapping
                      one makes IT active: the row above, the reasoning,
                      and the CTA all switch to match. */}
                  {alternateMatches.length > 0 && (
                    <div className="fc-mobile-match-bar__alt">
                      <span className="fc-mobile-match-bar__alt-label">Also possible:</span>
                      {alternateMatches.map(m => (
                        <button
                          key={m.slug}
                          type="button"
                          className="fc-mobile-match-bar__alt-chip"
                          onClick={() => setActiveMatchSlug(m.slug)}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeMatch && (
                <button
                  className="fc-mobile-match-bar__btn"
                  onClick={() => handleSelectMatch(activeMatch)}
                  disabled={!canSearchActive}
                  type="button"
                >
                  {location.status === 'locating' || location.status === 'idle' ? (
                    <><Loader2 size={14} className="fc-spin" /> Finding location…</>
                  ) : (
                    <>Find {activeMatch.label} <ArrowRight size={14} /></>
                  )}
                </button>
              )}
            </div>
            )
          })()}

          {/* ══ MODE A — Find by facility type ══════════════════════ */}
          <div className="fc-main fc-mode-a">
            <div className="fc-section">
              <div className="fc-section__header">
                <h2 className="fc-section__title">What kind of facility are you looking for?</h2>
              </div>

              <div className="fc-chip-grid">
                {FACILITY_TYPE_OPTIONS.map(opt => {
                  const Icon = TYPE_ICONS[opt.icon] ?? Building2
                  return (
                    <button
                      key={opt.slug}
                      className="fc-chip"
                      onClick={() => selectFacilityType(opt)}
                      type="button"
                      disabled={!hasLocation}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              <label className="fc-nhis-toggle">
                <input type="checkbox" checked={nhisOnly} onChange={e => setNhisOnly(e.target.checked)} />
                <ShieldCheck size={13} />
                <span>NHIS accepted only</span>
              </label>
            </div>
          </div>

          {/* ══ MODE DIVIDER ══════════════════════════════════════ */}
          <div className="fc-freetext-divider fc-mode-divider" role="separator">
            <span>or find care by symptom instead</span>
          </div>

          {/* ══ TWO-COLUMN LAYOUT — symptom picker (main) + live
              match panel (sticky sidebar on desktop, stacks below on
              mobile/tablet). ══ */}
          <div className="fc-layout">

            {/* ── MAIN — Mode B: symptom selector ── */}
            <div className="fc-main">
              <div className="fc-section">
                <div className="fc-section__header">
                  <h2 className="fc-section__title">What symptoms are you experiencing?</h2>
                  {selectedSlugs.length > 0 && (
                    <button className="fc-clear-btn" onClick={clearAll} type="button">
                      <X size={12} /> Clear all
                    </button>
                  )}
                </div>

                {Array.from(symptomsByCategory.entries()).map(([category, symptoms]) => (
                  symptoms.length === 0 ? null : (
                    <div className="fc-symptom-group" key={category}>
                      <h3 className="fc-symptom-group__title">{category}</h3>
                      <div className="fc-chip-grid">
                        {symptoms.map(symptom => {
                          const selected = selectedSlugs.includes(symptom.slug)
                          return (
                            <button
                              key={symptom.slug}
                              className={`fc-chip${selected ? ' fc-chip--selected' : ''}`}
                              onClick={() => toggleSymptom(symptom.slug)}
                              type="button"
                              aria-pressed={selected}
                            >
                              {selected && <Check size={12} className="fc-chip__check" />}
                              {symptom.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* ── Gemini free-text symptom bar — below the fold on
                  purpose. Routing only, never a diagnosis. ── */}
              <div className="fc-freetext-divider" role="separator">
                <span>or describe it in your own words</span>
              </div>

              <div className="fc-freetext-section">
                <div className="fc-section__header">
                  <h2 className="fc-section__title">
                    <MessageCircleQuestion size={15} />
                    Can&apos;t find your symptom above?
                  </h2>
                </div>

                <form className="fc-freetext-form" onSubmit={submitFreeText}>
                  <div className="fc-freetext-input-wrap">
                    <Sparkles size={14} className="fc-freetext-sparkle" />
                    <textarea
                      className="fc-freetext-input"
                      placeholder='e.g. "burning pain when I urinate"'
                      value={freeText}
                      onChange={e => {
                        setFreeText(e.target.value.slice(0, 300))
                        if (freeTextStatus === 'error') setFreeTextStatus('idle')
                      }}
                      rows={2}
                      maxLength={300}
                      disabled={freeTextStatus === 'loading' || freeTextStatus === 'matched'}
                      aria-label="Describe your symptoms in your own words"
                    />
                  </div>

                  <div className="fc-freetext-row">
                    <span className="fc-freetext-count">{freeText.length}/300</span>
                    <button
                      className="fc-freetext-submit"
                      type="submit"
                      disabled={freeTextStatus === 'loading' || freeTextStatus === 'matched' || freeText.trim().length < 3}
                    >
                      {freeTextStatus === 'loading' ? (
                        <><Loader2 size={14} className="fc-spin" /> Finding the right facility for you…</>
                      ) : freeTextStatus === 'matched' ? (
                        <><CheckCircle2 size={14} /> Match found</>
                      ) : (
                        <><SendHorizontal size={14} /> Find facilities</>
                      )}
                    </button>
                  </div>
                </form>

                {freeTextStatus === 'error' && (
                  <div className="fc-freetext-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{freeTextError}</span>
                  </div>
                )}

                {freeTextStatus === 'matched' && freeTextMatch && (
                  <div className="fc-freetext-matched" role="status" aria-live="polite">
                    <div className="fc-freetext-matched__icon">
                      {React.createElement(TYPE_ICONS[freeTextMatch.icon] ?? Building2, { size: 18 })}
                    </div>
                    <div className="fc-freetext-matched__body">
                      <p className="fc-freetext-matched__title">Matched to {freeTextMatch.name}</p>
                      {freeTextMatch.reason && (
                        <p className="fc-freetext-matched__reason">{freeTextMatch.reason}</p>
                      )}
                    </div>
                  </div>
                )}

                <p className="fc-freetext-disclaimer">
                  <ShieldAlert size={11} />
                  <span>
                    This helps route you to the right type of care — it doesn&apos;t diagnose you. If this feels urgent, open the{' '}
                    <Link href="/emergency">Emergency Hub</Link>.
                  </span>
                </p>
              </div>
            </div>

            {/* ── SIDE — live match panel + CTA.
                Sticky on desktop; on mobile/tablet the grid collapses to
                a single column so this simply stacks below fc-main. ── */}
            <div className="fc-side">
              <div className="fc-side__sticky">

                {/* Desktop-only location status — hidden on mobile since
                    fc-location--inline above already renders it there.
                    Renders nothing once granted (see locationStatus). */}
                {locationStatus && <div className="fc-location--side">{locationStatus}</div>}

                <div className="fc-match-section" ref={matchSectionRef}>
                  <div className="fc-section__header">
                    <h2 className="fc-section__title">
                      <Search size={15} />
                      Matched facility type
                    </h2>
                  </div>

                  {selectedSlugs.length === 0 ? (
                    <div className="fc-match-placeholder">
                      <Sparkles size={18} />
                      <p>Select symptoms to see your matched facility type appear here instantly.</p>
                    </div>
                  ) : matches.length === 0 ? (
                    <div className="fc-match-empty">
                      <AlertCircle size={16} />
                      <span>We couldn&apos;t match those symptoms directly — a general clinic is always a safe first step.</span>
                    </div>
                  ) : (
                    <div className="fc-match-list">
                      {matches.map((match, i) => {
                        const Icon = TYPE_ICONS[match.icon] ?? Building2
                        return (
                          <div
                            key={match.slug}
                            className={`fc-match-card${i === 0 ? ' fc-match-card--primary' : ''}`}
                          >
                            <div className="fc-match-card__icon">
                              <Icon size={22} />
                            </div>
                            <div className="fc-match-card__body">
                              <div className="fc-match-card__top">
                                <h3 className="fc-match-card__name">{match.label}</h3>
                                <span className={`fc-confidence-badge fc-confidence-badge--${match.confidence}`}>
                                  {match.confidence === 'high' ? 'Strong match'
                                    : match.confidence === 'moderate' ? 'Possible match'
                                    : 'Weak match'}
                                </span>
                              </div>
                              {match.generalFirst && (
                                <p className="fc-match-card__note">
                                  <Stethoscope size={11} />
                                  A general clinic is a safe first step — they can refer you onward if needed.
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ── CTA ── */}
                {topMatch && (
                  <div className="fc-cta-wrap">
                    <button
                      className="fc-cta-btn"
                      onClick={() => topMatch && handleSelectMatch(topMatch)}
                      disabled={!canSearch}
                      type="button"
                    >
                      {location.status === 'locating' || location.status === 'idle' ? (
                        <><Loader2 size={16} className="fc-spin" /> Finding your location…</>
                      ) : (
                        <>Find {topMatch.label} near me <ArrowRight size={16} /></>
                      )}
                    </button>
                    {!canSearch && location.status === 'denied' && (
                      <p className="fc-cta-hint">Enable your location above to continue</p>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>{/* end fc-layout */}

        </div>{/* end fc-root */}
      </div>{/* end fc-page */}

      <MobTabBar currentPath="/find-care" />
    </DashboardLayout>
  )
}