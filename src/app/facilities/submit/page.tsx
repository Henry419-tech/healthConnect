'use client'

// src/app/facilities/submit/page.tsx
//
// Public "report a missing facility" form — the Facility counterpart to
// /provider/register. Reached from a link on /facilities ("Don't see a
// place? Add it").
//
// UNLIKE /provider/register, this page is NOT in middleware.ts's public
// prefix list. /facilities itself already requires a logged-in patient
// session, so this inherits the same requirement rather than being opened
// up separately — see the comment in api/facilities/submit/route.ts.

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, Loader2, Crosshair, MapPin, AlertCircle,
} from 'lucide-react'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { FACILITY_TYPE_OPTIONS } from '@/lib/constants'
import '@/styles/provider-register.css'

type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'granted'; lat: number; lng: number }
  | { status: 'denied' }

const initialForm = {
  name: '',
  type: '',
  phone: '',
  whatsapp: '',
  website: '',
  address: '',
  city: '',
  district: '',
  region: '',
  hours: '',
  nhis: 'none' as 'confirmed' | 'likely' | 'none',
  emergencyServices: false,
}

export default function FacilitySubmitPage() {
  const router = useRouter()
  const { isDarkMode } = useDarkMode()

  const [form, setForm] = useState(initialForm)
  const [location, setLocation] = useState<LocationState>({ status: 'idle' })
  const [geocoding, setGeocoding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  // Same rationale as /provider/register: device GPS gives an exact pin
  // for someone standing at the facility, which Ghanaian street addresses
  // alone often can't provide reliably (same lesson the seed script's
  // Nominatim geocoding ran into for small/rural facilities).
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocation({ status: 'denied' }); return }
    setLocation({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLocation({ status: 'granted', lat, lng })

        setGeocoding(true)
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`)
          if (res.ok) {
            const data = await res.json()
            setForm(p => ({
              ...p,
              region: p.region || data.region || '',
              city: p.city || data.city || data.town || '',
            }))
          }
        } catch {
          // silent — fields just stay whatever the user types
        } finally {
          setGeocoding(false)
        }
      },
      () => setLocation({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim())             return setError('Please enter a facility name.')
    if (!form.type)                    return setError('Please select a facility type.')
    if (!form.address.trim())          return setError('Please enter an address.')
    if (location.status !== 'granted') return setError('Please set your location using the button above.')

    setSubmitting(true)
    try {
      const res = await fetch('/api/facilities/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          phone: form.phone.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          website: form.website.trim() || undefined,
          address: form.address.trim(),
          city: form.city.trim() || undefined,
          district: form.district.trim() || undefined,
          region: form.region.trim() || undefined,
          lat: location.lat,
          lng: location.lng,
          hours: form.hours.trim() || undefined,
          nhis: form.nhis,
          emergencyServices: form.emergencyServices,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed. Please try again.')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`prov-page${isDarkMode ? ' dark-mode' : ''}`}>
      <div className="prov-topbar">
        <button className="prov-back" type="button" onClick={() => router.push('/facilities')}>
          <ArrowLeft size={15} /> Back to Facilities
        </button>
      </div>

      <div className="prov-card">
        {success ? (
          <div className="prov-success">
            <div className="prov-success__icon"><CheckCircle2 size={28} /></div>
            <h1 className="prov-success__title">Submission received</h1>
            <p className="prov-success__sub">
              Thanks — {form.name} has been submitted for review. Once our team verifies the
              details, it'll appear in Facilities search results for everyone nearby.
            </p>
          </div>
        ) : (
          <>
            <p className="prov-eyebrow">Report a Facility</p>
            <h1 className="prov-title">Don't see a place on the map?</h1>
            <p className="prov-sub">
              Add a hospital, clinic, pharmacy, lab, or other health facility that's missing.
              Submissions are reviewed before they go live for other patients.
            </p>

            {error && (
              <div className="prov-error">
                <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <div className="prov-field">
                <label className="prov-label">Facility name</label>
                <input
                  name="name" className="prov-input" value={form.name} onChange={change}
                  placeholder="e.g. Tarkwa Eye Care Centre"
                  required
                />
              </div>

              <div className="prov-field">
                <label className="prov-label">Facility type</label>
                <select name="type" className="prov-select" value={form.type} onChange={change} required>
                  <option value="">Select a type…</option>
                  {FACILITY_TYPE_OPTIONS.map(t => (
                    <option key={t.slug} value={t.slug}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="prov-row-2">
                <div className="prov-field">
                  <label className="prov-label">Phone <span className="prov-label--optional">(optional)</span></label>
                  <input name="phone" className="prov-input" value={form.phone} onChange={change} placeholder="024 000 0000" />
                </div>
                <div className="prov-field">
                  <label className="prov-label">WhatsApp <span className="prov-label--optional">(optional)</span></label>
                  <input name="whatsapp" className="prov-input" value={form.whatsapp} onChange={change} placeholder="024 000 0000" />
                </div>
              </div>

              <div className="prov-field">
                <label className="prov-label">Website <span className="prov-label--optional">(optional)</span></label>
                <input name="website" className="prov-input" value={form.website} onChange={change} placeholder="https://example.com" />
              </div>

              <div className="prov-field">
                <label className="prov-label">Street address</label>
                <input name="address" className="prov-input" value={form.address} onChange={change} placeholder="e.g. Behind the market, Main Street" required />
              </div>

              <div className="prov-row-2">
                <div className="prov-field">
                  <label className="prov-label">Town / city <span className="prov-label--optional">(auto-filled)</span></label>
                  <input name="city" className="prov-input" value={form.city} onChange={change} placeholder="e.g. Tarkwa" />
                </div>
                <div className="prov-field">
                  <label className="prov-label">Region <span className="prov-label--optional">(auto-filled)</span></label>
                  <input name="region" className="prov-input" value={form.region} onChange={change} placeholder="e.g. Western Region" />
                </div>
              </div>

              <div className="prov-field">
                <label className="prov-label">District <span className="prov-label--optional">(optional)</span></label>
                <input name="district" className="prov-input" value={form.district} onChange={change} placeholder="e.g. Tarkwa-Nsuaem Municipal" />
              </div>

              <div className="prov-field">
                <label className="prov-label">Location</label>
                <div className="prov-location-box">
                  {location.status === 'granted' ? (
                    <span className="prov-location-status prov-location-status--ok">
                      <MapPin size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                      Location set{geocoding ? ' — looking up town/region…' : ''}
                    </span>
                  ) : location.status === 'denied' ? (
                    <span className="prov-location-status">Location access denied — please allow it and try again.</span>
                  ) : (
                    <span className="prov-location-status">Stand at the facility and tap the button for an exact pin.</span>
                  )}
                  <button
                    type="button"
                    className="prov-btn-secondary"
                    onClick={useMyLocation}
                    disabled={location.status === 'locating'}
                  >
                    {location.status === 'locating'
                      ? <Loader2 size={14} style={{ animation: 'prov-spin .8s linear infinite' }} />
                      : <Crosshair size={14} />}
                    {location.status === 'granted' ? 'Update location' : 'Set my location'}
                  </button>
                </div>
              </div>

              <div className="prov-field">
                <label className="prov-label">Opening hours <span className="prov-label--optional">(optional)</span></label>
                <input name="hours" className="prov-input" value={form.hours} onChange={change} placeholder="e.g. Mon–Sat 8am–6pm" />
              </div>

              <div className="prov-field">
                <label className="prov-label">NHIS acceptance</label>
                <select name="nhis" className="prov-select" value={form.nhis} onChange={change}>
                  <option value="none">Not sure / not accepted</option>
                  <option value="likely">Likely (public/government facility)</option>
                  <option value="confirmed">Confirmed — they accept NHIS</option>
                </select>
              </div>

              <div className="prov-field">
                <label className="prov-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={form.emergencyServices}
                    onChange={e => setForm(p => ({ ...p, emergencyServices: e.target.checked }))}
                    style={{ margin: 0 }}
                  />
                  Offers emergency services
                </label>
              </div>

              <button type="submit" className="prov-submit" disabled={submitting}>
                {submitting ? <span className="prov-spinner" /> : <CheckCircle2 size={16} />}
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}