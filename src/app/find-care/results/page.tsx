'use client'

/**
 * /find-care/results — Section 12 of the HEALTHNAV master handoff.
 *
 * Real, live Overpass API results — never a seeded/hardcoded directory.
 * Reads ?type=<slug>&lat=X&lng=Y&nhis=[bool] from /find-care (or
 * ?nhis=true alone from the dashboard's "Find NHIS facilities" link,
 * which defaults to DEFAULT_FACILITY_TYPE_SLUGS).
 *
 * This replaces an older doctor/specialist-marketplace version of this
 * page (ProviderResult, /api/providers, GHANA_DISTRICTS/GHANA_LANGUAGES
 * filters). There is no provider marketplace in v1 — see /find-care's
 * header comment for the same note.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useDarkMode } from '@/contexts/DarkModeContext'
import DashboardLayout from '@/components/DashboardLayout'
import MobTabBar from '@/components/MobTabBar'
import { FACILITY_TYPE_OPTIONS, DEFAULT_FACILITY_TYPE_SLUGS, type FacilityTypeOption } from '@/lib/constants'
import { calculateDistance, formatDistance } from '@/lib/utils'
import { trackActivity } from '@/lib/activityTracker'
import '@/styles/dashboard.css'
import '@/styles/dashboard-header.css'
import '@/styles/find-care.css'
import '@/styles/find-care-results.css'
import '@/styles/find-care-results-mobile.css'
import {
  ArrowLeft, MapPin, Filter, ChevronDown, X, Check, Loader2, AlertCircle,
  Phone, MessageCircle, Building2, Hospital, Stethoscope, Smile, Eye, Ear,
  Pill, Microscope, Baby, Brain, ExternalLink, Crosshair, Bookmark,
  List as ListIcon, Map as MapIcon, PhoneCall,
} from 'lucide-react'

const MobTopbarMenu = dynamic(() => import('@/components/MobTopbarMenu'), { ssr: false })

/* ── Icon map — mirrors /find-care ── */
const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Hospital, Stethoscope, Smile, Eye, Ear, Pill, Microscope, Baby, Brain, Building2,
}

const RADIUS_OPTIONS_KM = [5, 10, 15, 20] as const

/* ── Types ─────────────────────────────────────────────────────── */
interface Facility {
  id: string            // `osm_<element type>_<id>` — stable per OSM element
  name: string
  typeSlug: string
  typeLabel: string
  lat: number
  lng: number
  distance: number       // km, Haversine from user location
  address: string
  phone: string | null
  hours: string | null
  website: string | null
  nhis: 'confirmed' | 'likely' | 'none'
}

type LocationState =
  | { status: 'idle' | 'locating' | 'unset' }
  | { status: 'granted'; lat: number; lng: number }
  | { status: 'denied' }

/* ── Helpers ───────────────────────────────────────────────────── */
// Normalizes Ghana numbers to a wa.me-friendly international format.
function toWhatsAppLink(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('233')) return `https://wa.me/${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `https://wa.me/233${digits.slice(1)}`
  return `https://wa.me/${digits}`
}

// Builds an Overpass QL query unioning every tag matcher for the given
// facility types. `regex: true` matchers use Overpass's case-insensitive
// `~` operator against free-text tags (e.g. healthcare:speciality).
function buildOverpassQuery(types: FacilityTypeOption[], lat: number, lng: number, radiusM: number): string {
  const clauses: string[] = []
  for (const t of types) {
    for (const tag of t.tags) {
      clauses.push(
        tag.regex
          ? `node["${tag.key}"~"${tag.value}",i](around:${radiusM},${lat},${lng});`
          : `node["${tag.key}"="${tag.value}"](around:${radiusM},${lat},${lng});`
      )
    }
  }
  return `[out:json][timeout:25];(${clauses.join('')});out center body;`
}

// NHIS acceptance isn't a standard OSM key. We surface what the data can
// actually support: an explicit insurance tag naming NHIS ("confirmed"),
// or a government/public operator ("likely" — Ghana's NHIS network is
// built on public facilities) — otherwise "none". This is a signal, not
// a guarantee; the badge and copy reflect that distinction.
function detectNhis(tags: Record<string, string>): Facility['nhis'] {
  const insuranceText = [tags.insurance, tags['healthcare:insurance'], tags['payment:nhis']]
    .filter(Boolean).join(' ').toLowerCase()
  if (insuranceText.includes('nhis')) return 'confirmed'

  const operatorText = [tags.operator, tags['operator:type']].filter(Boolean).join(' ').toLowerCase()
  if (
    operatorText.includes('government') || operatorText.includes('public') ||
    operatorText.includes('ghana health service') || operatorText.includes('municipal') ||
    operatorText.includes('district assembly')
  ) {
    return 'likely'
  }
  return 'none'
}

// Which FACILITY_TYPE_OPTIONS entry does this element's tags match?
function resolveType(tags: Record<string, string>): FacilityTypeOption | null {
  for (const t of FACILITY_TYPE_OPTIONS) {
    for (const tag of t.tags) {
      const val = tags[tag.key]
      if (!val) continue
      if (tag.regex ? new RegExp(tag.value, 'i').test(val) : val === tag.value) return t
    }
  }
  return null
}

function parseElement(el: any, userLat: number, userLng: number): Facility | null {
  const tags = el?.tags
  if (!tags) return null

  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (lat == null || lng == null) return null

  const name: string | undefined = tags.name || tags['name:en'] || tags.official_name
  if (!name || name.trim().length < 2) return null

  const matchedType = resolveType(tags)
  if (!matchedType) return null

  const addressParts = [
    tags['addr:housenumber'], tags['addr:street'],
    tags['addr:suburb'] || tags['addr:city'] || tags['addr:town'],
  ].filter(Boolean)
  const address = addressParts.length > 0
    ? addressParts.join(', ')
    : (tags['addr:city'] || tags['addr:town'] || matchedType.label)

  return {
    id:        `osm_${el.type}_${el.id}`,
    name,
    typeSlug:  matchedType.slug,
    typeLabel: matchedType.label,
    lat, lng,
    distance:  calculateDistance(userLat, userLng, lat, lng),
    address,
    phone:     tags.phone || tags['contact:phone'] || null,
    hours:     tags.opening_hours || null,
    website:   tags.website || tags['contact:website'] || null,
    nhis:      detectNhis(tags),
  }
}

/* ── Facility result card ─────────────────────────────────────── */
function FacilityCard({
  facility, isSaved, onToggleSave,
}: {
  facility: Facility
  isSaved: boolean
  onToggleSave: (facility: Facility) => void
}) {
  const Icon = TYPE_ICONS[FACILITY_TYPE_OPTIONS.find(t => t.slug === facility.typeSlug)?.icon ?? ''] ?? Building2

  return (
    <div className="fcr-card">
      <div className="fcr-card__top">
        <div className="fcr-card__icon">
          <Icon size={20} />
        </div>
        <div className="fcr-card__id">
          <h3 className="fcr-card__name">{facility.name}</h3>
          <span className="fcr-card__type">{facility.typeLabel}</span>
        </div>
        <div className="fcr-card__top-actions">
          <span className="fcr-distance-chip">{formatDistance(facility.distance)}</span>
          <button
            className={`fcr-card__bookmark${isSaved ? ' fcr-card__bookmark--saved' : ''}`}
            onClick={e => { e.stopPropagation(); onToggleSave(facility) }}
            type="button"
            aria-label={isSaved ? 'Remove from saved' : 'Save facility'}
          >
            <Bookmark size={16} fill={isSaved ? 'var(--hc-teal)' : 'none'} />
          </button>
        </div>
      </div>

      <div className="fcr-card__meta">
        <span className="fcr-card__meta-item"><MapPin size={12} /> {facility.address}</span>
        {facility.hours && (
          <span className="fcr-card__meta-item">🕐 {facility.hours}</span>
        )}
      </div>

      {facility.nhis !== 'none' && (
        <div className="fcr-card__badges">
          <span className={`fcr-badge ${facility.nhis === 'confirmed' ? 'fcr-badge--nhis' : 'fcr-badge--nhis-likely'}`}>
            <Check size={11} /> {facility.nhis === 'confirmed' ? 'NHIS Accepted' : 'NHIS likely (public facility)'}
          </span>
        </div>
      )}

      <div className="fcr-card__actions">
        {facility.phone && (
          <a className="fcr-action-btn fcr-action-btn--call" href={`tel:${facility.phone}`}>
            <Phone size={14} /> Call
          </a>
        )}
        {facility.phone && (
          <a className="fcr-action-btn fcr-action-btn--whatsapp" href={toWhatsAppLink(facility.phone)}
            target="_blank" rel="noopener noreferrer">
            <MessageCircle size={14} /> WhatsApp
          </a>
        )}
        <a className="fcr-action-btn" href={`https://maps.google.com/?q=${facility.lat},${facility.lng}`}
          target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} /> Directions
        </a>
      </div>
    </div>
  )
}

/* ── Skeleton loading card ─────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="fcr-skeleton">
      <div className="fcr-skeleton__row">
        <div className="fcr-skeleton__avatar" />
        <div className="fcr-skeleton__lines">
          <div className="fcr-skeleton__line" style={{ width: '60%' }} />
          <div className="fcr-skeleton__line" style={{ width: '40%' }} />
        </div>
      </div>
      <div className="fcr-skeleton__line" style={{ width: '80%' }} />
    </div>
  )
}

/* ── Inner component — reads useSearchParams, wrapped in Suspense ── */
function FindCareResultsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isDarkMode } = useDarkMode()

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<'list' | 'map'>('list')

  // ── Search state — seeded from URL, editable via the filter panel ──
  const urlType = searchParams.get('type') || ''
  const [typeSlug, setTypeSlug] = useState(urlType) // '' = default multi-type (hospital/clinic/pharmacy)
  const [radiusKm, setRadiusKm] = useState(15)
  const [nhisOnly, setNhisOnly] = useState(searchParams.get('nhis') === 'true')
  const [districtQuery, setDistrictQuery] = useState('')

  const urlLat = searchParams.get('lat')
  const urlLng = searchParams.get('lng')
  const [location, setLocation] = useState<LocationState>(
    urlLat && urlLng ? { status: 'granted', lat: parseFloat(urlLat), lng: parseFloat(urlLng) } : { status: 'unset' }
  )
  const hasLocation = location.status === 'granted'

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode)
  }, [isDarkMode])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocation({ status: 'denied' }); return }
    setLocation({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  useEffect(() => {
    if (location.status === 'unset') requestLocation()
  }, [location.status, requestLocation])

  const activeTypes: FacilityTypeOption[] = useMemo(() => {
    if (typeSlug) {
      const t = FACILITY_TYPE_OPTIONS.find(o => o.slug === typeSlug)
      return t ? [t] : []
    }
    return FACILITY_TYPE_OPTIONS.filter(t => (DEFAULT_FACILITY_TYPE_SLUGS as readonly string[]).includes(t.slug))
  }, [typeSlug])

  // ── Facilities — live Overpass results ──
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const trackedRef = useRef(false)

  const fetchFacilities = useCallback(async () => {
    // Bail out when we can't actually fetch yet (no granted location, or
    // an unrecognised type). Previously this returned without resetting
    // `loading`, which starts true — so if location.status ends up
    // 'denied', this function runs once, does nothing, and `loading`
    // stays true forever: an infinite skeleton with no way out. Resetting
    // it here lets the location banner + explicit empty state (both
    // location-aware below) take over instead.
    if (location.status !== 'granted' || activeTypes.length === 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const query = buildOverpassQuery(activeTypes, location.lat, location.lng, radiusKm * 1000)
      const res = await fetch('/api/overpass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.elements) {
        throw new Error(data?.error || 'Overpass request failed')
      }
      const parsed: Facility[] = data.elements
        .map((el: any) => parseElement(el, location.lat, location.lng))
        .filter((f: Facility | null): f is Facility => f !== null)
        // de-dupe by name + near-identical coordinates
        .filter((f: Facility, i: number, arr: Facility[]) =>
          i === arr.findIndex(other => other.name === f.name && Math.abs(other.lat - f.lat) < 0.0005 && Math.abs(other.lng - f.lng) < 0.0005)
        )
        .filter((f: Facility) => f.distance <= radiusKm)
        .sort((a: Facility, b: Facility) => a.distance - b.distance)

      setFacilities(parsed)

      if (!trackedRef.current) {
        trackedRef.current = true
        trackActivity(
          'facility_search',
          `Searched for ${activeTypes.length === 1 ? activeTypes[0].label : 'nearby facilities'}`,
          'Near your location',
          { facilityType: typeSlug || 'default', lat: location.lat, lng: location.lng, resultCount: parsed.length },
        ).catch(() => {})
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Something went wrong loading facilities.')
      setFacilities([])
    } finally {
      setLoading(false)
    }
  }, [location, activeTypes, radiusKm, typeSlug])

  useEffect(() => { fetchFacilities() }, [fetchFacilities])
  // Re-track on a genuinely new search (type/radius change), not just a re-render
  useEffect(() => { trackedRef.current = false }, [typeSlug, radiusKm])

  // ── Saved facilities — bookmark state ──
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    fetch('/api/saved-facilities')
      .then(r => r.json())
      .then(d => { if (!cancelled) setSavedIds(new Set((d.facilities || []).map((f: any) => f.facilityId))) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleToggleSave = useCallback((facility: Facility) => {
    const alreadySaved = savedIds.has(facility.id)

    // Optimistic UI update
    setSavedIds(prev => {
      const next = new Set(prev)
      if (alreadySaved) next.delete(facility.id)
      else next.add(facility.id)
      return next
    })

    if (alreadySaved) {
      fetch('/api/saved-facilities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: facility.id }),
      }).catch(() => {
        setSavedIds(prev => new Set(prev).add(facility.id))
      })
    } else {
      fetch('/api/saved-facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId:        facility.id,
          name:              facility.name,
          type:              facility.typeSlug,
          address:           facility.address,
          phone:             facility.phone,
          hours:             facility.hours,
          website:           facility.website,
          emergencyServices: false,
          latitude:          facility.lat,
          longitude:         facility.lng,
          distance:          facility.distance,
        }),
      }).catch(() => {
        setSavedIds(prev => { const next = new Set(prev); next.delete(facility.id); return next })
      })
    }
  }, [savedIds])

  // ── Client-side district substring filter — Overpass address data
  //    doesn't map cleanly onto Ghana's official district list, so this
  //    filters the in-memory result set rather than re-querying. ──
  const visibleFacilities = useMemo(() => {
    if (!districtQuery.trim()) return facilities
    const q = districtQuery.trim().toLowerCase()
    return facilities.filter(f => f.address.toLowerCase().includes(q))
  }, [facilities, districtQuery])

  const nhisFiltered = useMemo(() => {
    if (!nhisOnly) return visibleFacilities
    return visibleFacilities.filter(f => f.nhis !== 'none')
  }, [visibleFacilities, nhisOnly])

  const clearFilters = useCallback(() => {
    setDistrictQuery(''); setNhisOnly(false); setRadiusKm(15)
  }, [])

  const activeFilterCount = (districtQuery ? 1 : 0) + (nhisOnly ? 1 : 0) + (radiusKm !== 15 ? 1 : 0)

  const pageTitle = activeTypes.length === 1
    ? `${activeTypes[0].label} near you`
    : 'Hospitals, clinics & pharmacies near you'
  const HeaderIcon = activeTypes.length === 1 ? (TYPE_ICONS[activeTypes[0].icon] ?? Building2) : Building2

  const locationLabel = hasLocation
    ? 'Near your current location'
    : location.status === 'denied'
    ? 'Location unavailable — enable it to search nearby'
    : 'Finding your location…'

  // Only the genuine "searched and found nothing nearby" case should show
  // the no-results message. Without the hasLocation guard, a denied/unset
  // location also satisfies "!loading && !error && 0 results" and shows
  // "No X found within Y km — try widening your search", which is
  // misleading when the actual problem is that we never had a location to
  // search from in the first place (the banner above already covers that).
  const isEmpty = !loading && !error && hasLocation && nhisFiltered.length === 0

  return (
    <DashboardLayout activeTab="/find-care" className="hc-layout--has-mob-topbar">
      {/* ── Mobile topbar — shared pill, with a back button prepended ── */}
      <div className="mob-topbar">
        <div className="mob-topbar__left">
          <button className="fcr-mob-back" onClick={() => router.push('/find-care')} type="button" aria-label="Back to Find Care">
            <ArrowLeft size={16} />
          </button>
          <span className="mob-topbar__logo-text">Results</span>
        </div>
        <div className="mob-topbar__right">
          <MobTopbarMenu />
        </div>
      </div>

      <div className={`fcr-page${isDarkMode ? ' dark-mode' : ''}`}>
        <div className="fcr-root">

          {/* ══ PAGE HEADER ══ */}
          <div className="fcr-page-header">
            <div className="fcr-page-header__left">
              <button className="fcr-back" onClick={() => router.push('/find-care')} type="button">
                <ArrowLeft size={14} /> <span className="fcr-back__label">Back to Find Care</span>
              </button>
              <h1 className="fcr-page-header__title">
                <span className="fcr-page-header__icon"><HeaderIcon size={22} /></span>
                {pageTitle}
              </h1>
              <p className="fcr-page-header__sub"><MapPin size={12} /> {locationLabel}</p>
            </div>

            <div className="fcr-page-header__right">
              <div className="fcr-view-toggle">
                <button
                  className={`fcr-view-btn${view === 'list' ? ' fcr-view-btn--active' : ''}`}
                  onClick={() => setView('list')}
                  type="button"
                >
                  <ListIcon size={13} /> List
                </button>
                <button
                  className={`fcr-view-btn${view === 'map' ? ' fcr-view-btn--active' : ''}`}
                  onClick={() => {
                    // BUG FIX: this previously pushed a bare '/facilities'
                    // with no params at all, so it landed in plain BROWSE
                    // STATE — dropping the matched type, the user's
                    // location, and the 15km RESULTS-mode radius default.
                    // /facilities decides RESULTS mode purely from
                    // ?type=/?lat=/?lng= (see its "RESULTS STATE
                    // detection" block), so all three need to be forwarded
                    // for the map to show the same match Find Care found.
                    const qs = new URLSearchParams()
                    if (typeSlug) qs.set('type', typeSlug)
                    if (hasLocation) {
                      qs.set('lat', String(location.lat))
                      qs.set('lng', String(location.lng))
                    }
                    qs.set('from', '/find-care/results' + window.location.search)
                    router.push(`/facilities?${qs.toString()}`)
                  }}
                  type="button"
                >
                  <MapIcon size={13} /> Map
                </button>
              </div>
              <button className="fcr-filter-toggle" onClick={() => setFiltersOpen(v => !v)} type="button" aria-expanded={filtersOpen}>
                <Filter size={14} /> Filters {activeFilterCount > 0 && <span className="fcr-filter-count">{activeFilterCount}</span>}
                <ChevronDown size={14} className={filtersOpen ? 'fcr-chev--open' : ''} />
              </button>
            </div>
          </div>

          {!hasLocation && (
            <div className="fcr-location-banner">
              <AlertCircle size={14} />
              <span>{location.status === 'locating' ? 'Finding your location…' : "We don't have your location yet — enable it to search nearby."}</span>
              <button className="fcr-location-banner__btn" onClick={requestLocation} type="button" disabled={location.status === 'locating'}>
                {location.status === 'locating' ? <Loader2 size={12} className="fcr-spin" /> : <Crosshair size={12} />}
                Use my location
              </button>
            </div>
          )}

          {/* ══ FILTERS PANEL ══ */}
          {filtersOpen && (
            <div className="fcr-filters">
              <div className="fcr-filters__row">
                <label className="fcr-filters__label">Facility type</label>
                <select className="fcr-select" value={typeSlug} onChange={e => setTypeSlug(e.target.value)}>
                  <option value="">Hospitals, clinics & pharmacies</option>
                  {FACILITY_TYPE_OPTIONS.map(t => <option key={t.slug} value={t.slug}>{t.label}</option>)}
                </select>
              </div>

              <div className="fcr-filters__row">
                <label className="fcr-filters__label">Radius</label>
                <div className="fcr-radius-chips">
                  {RADIUS_OPTIONS_KM.map(km => (
                    <button
                      key={km}
                      type="button"
                      className={`fcr-radius-chip${radiusKm === km ? ' fcr-radius-chip--active' : ''}`}
                      onClick={() => setRadiusKm(km)}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
              </div>

              <div className="fcr-filters__row">
                <label className="fcr-filters__label">Area / district</label>
                <input
                  className="fcr-select"
                  type="text"
                  placeholder="e.g. Tarkwa"
                  value={districtQuery}
                  onChange={e => setDistrictQuery(e.target.value)}
                />
              </div>

              <div className="fcr-filters__row fcr-filters__row--toggle">
                <label className="fcr-toggle-label">
                  <input type="checkbox" checked={nhisOnly} onChange={e => setNhisOnly(e.target.checked)} />
                  <span>NHIS accepted only</span>
                </label>
                {activeFilterCount > 0 && (
                  <button className="fcr-clear-filters" onClick={clearFilters} type="button">
                    <X size={12} /> Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══ RESULTS ══ */}
          {loading && (
            <div className="fcr-grid">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          )}

          {!loading && error && (
            <div className="fcr-error">
              <AlertCircle size={16} /> {error}
              <button className="fcr-clear-filters" onClick={fetchFacilities} type="button">Try again</button>
            </div>
          )}

          {!loading && !error && nhisFiltered.length > 0 && (
            <>
              <p className="fcr-results-count">{nhisFiltered.length} facilit{nhisFiltered.length === 1 ? 'y' : 'ies'} found</p>
              <div className="fcr-grid">
                {nhisFiltered.map(f => (
                  <FacilityCard key={f.id} facility={f} isSaved={savedIds.has(f.id)} onToggleSave={handleToggleSave} />
                ))}
              </div>
            </>
          )}

          {/* ══ ZERO / THIN RESULTS — designed state, not an error.
              Coverage for niche types (ENT, eye care, mental health,
              maternity) is genuinely thinner outside larger towns. ══ */}
          {isEmpty && (
            <div className="fcr-empty-state">
              <MapPin size={20} />
              <h2 className="fcr-empty-state__title">
                No {activeTypes.length === 1 ? activeTypes[0].label.toLowerCase() : 'facilities'} found within {radiusKm} km
              </h2>
              <p className="fcr-empty-state__body">
                Try widening your search, or start with a general hospital nearby — they can refer you to a specialist.
              </p>
              <div className="fcr-empty-state__actions">
                {radiusKm < 20 && (
                  <button className="fcr-empty-state__btn" onClick={() => setRadiusKm(prev => (RADIUS_OPTIONS_KM.find(k => k > prev) ?? 20))} type="button">
                    Widen to {RADIUS_OPTIONS_KM.find(k => k > radiusKm) ?? 20} km
                  </button>
                )}
                {nhisOnly && (
                  <button className="fcr-empty-state__btn" onClick={() => setNhisOnly(false)} type="button">
                    Remove NHIS filter
                  </button>
                )}
                {typeSlug !== '' && typeSlug !== 'hospital' && (
                  <button className="fcr-empty-state__btn" onClick={() => setTypeSlug('hospital')} type="button">
                    Try Hospital instead
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="fcr-emergency-footer">
            <PhoneCall size={14} />
            <span>Think this is an emergency? <Link href="/emergency">Emergency Hub</Link></span>
          </div>

          <p className="fcr-provider-note">
            Are you a healthcare provider?{' '}
            <Link href="/provider/register">Register your facility on HealthNav <ExternalLink size={11} /></Link>
          </p>

        </div>
      </div>

      <MobTabBar currentPath="/find-care" />
    </DashboardLayout>
  )
}

export default function FindCareResultsPage() {
  return (
    <Suspense fallback={null}>
      <FindCareResultsInner />
    </Suspense>
  )
}