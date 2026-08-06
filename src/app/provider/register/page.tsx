'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Stethoscope, Building2, CheckCircle2, Loader2,
  Crosshair, MapPin, AlertCircle,
} from 'lucide-react'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { SPECIALTIES } from '@/lib/symptomSpecialtyMap'
import { GHANA_DISTRICTS, GHANA_LANGUAGES } from '@/lib/constants'
import '@/styles/provider-register.css'

type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'granted'; lat: number; lng: number }
  | { status: 'denied' }

const initialForm = {
  type: 'CLINIC' as 'CLINIC' | 'DOCTOR',
  name: '',
  specialtySlug: '',
  phone: '',
  whatsapp: '',
  email: '',
  bio: '',
  licenceNumber: '',
  address: '',
  district: '',
  region: '',
  languages: ['English'] as string[],
  nhis: true,
}

export default function ProviderRegisterPage() {
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

  const toggleLanguage = useCallback((lang: string) => {
    setForm(p => ({
      ...p,
      languages: p.languages.includes(lang)
        ? p.languages.filter(l => l !== lang)
        : [...p.languages, lang],
    }))
  }, [])

  // Device GPS, not address geocoding, is the primary path — Ghanaian
  // street addresses are often informal/hard to geocode accurately, but a
  // clinic owner standing at their own front desk gets an exact pin.
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocation({ status: 'denied' }); return }
    setLocation({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLocation({ status: 'granted', lat, lng })

        // Best-effort auto-fill of the region field via the existing
        // reverse-geocode endpoint. Non-fatal if it fails — region stays
        // editable either way.
        setGeocoding(true)
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`)
          if (res.ok) {
            const data = await res.json()
            if (data.region) setForm(p => ({ ...p, region: p.region || data.region }))
          }
        } catch {
          // silent — region just stays whatever the user types
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

    if (!form.name.trim())            return setError('Please enter a name.')
    if (!form.specialtySlug)          return setError('Please select a specialty.')
    if (!form.phone.trim())           return setError('Please enter a phone number.')
    if (!form.address.trim())         return setError('Please enter an address.')
    if (!form.district)               return setError('Please select a district.')
    if (location.status !== 'granted') return setError('Please set your location using the button above.')

    setSubmitting(true)
    try {
      const res = await fetch('/api/providers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          name: form.name.trim(),
          specialtySlug: form.specialtySlug,
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim() || undefined,
          email: form.email.trim() || undefined,
          bio: form.bio.trim() || undefined,
          licenceNumber: form.licenceNumber.trim() || undefined,
          address: form.address.trim(),
          district: form.district,
          region: form.region.trim() || undefined,
          lat: location.lat,
          lng: location.lng,
          languages: form.languages,
          insuranceAccepted: form.nhis ? ['NHIS'] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed. Please try again.')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`prov-page${isDarkMode ? ' dark-mode' : ''}`}>
      <div className="prov-topbar">
        <button className="prov-back" type="button" onClick={() => router.push('/find-care')}>
          <ArrowLeft size={15} /> Back to Find Care
        </button>
      </div>

      <div className="prov-card">
        {success ? (
          <div className="prov-success">
            <div className="prov-success__icon"><CheckCircle2 size={28} /></div>
            <h1 className="prov-success__title">Registration received</h1>
            <p className="prov-success__sub">
              Thanks — {form.name} has been submitted for review. Once our team verifies the
              details, your listing will appear in HealthNav's Find Care results. This usually
              takes a few days.
            </p>
          </div>
        ) : (
          <>
            <p className="prov-eyebrow">Provider Registration</p>
            <h1 className="prov-title">Register your clinic or practice</h1>
            <p className="prov-sub">
              Get listed on HealthNav so patients nearby can find you. Submissions are reviewed
              before going live.
            </p>

            {error && (
              <div className="prov-error">
                <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <div className="prov-type-row">
                <button
                  type="button"
                  className={`prov-type-btn${form.type === 'CLINIC' ? ' prov-type-btn--active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, type: 'CLINIC' }))}
                >
                  <Building2 size={16} /> Clinic / Facility
                </button>
                <button
                  type="button"
                  className={`prov-type-btn${form.type === 'DOCTOR' ? ' prov-type-btn--active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, type: 'DOCTOR' }))}
                >
                  <Stethoscope size={16} /> Individual Doctor
                </button>
              </div>

              <div className="prov-field">
                <label className="prov-label">{form.type === 'CLINIC' ? 'Clinic name' : 'Doctor name'}</label>
                <input
                  name="name" className="prov-input" value={form.name} onChange={change}
                  placeholder={form.type === 'CLINIC' ? 'e.g. Tarkwa Family Clinic' : 'e.g. Dr. Ama Owusu'}
                  required
                />
              </div>

              <div className="prov-field">
                <label className="prov-label">Specialty</label>
                <select name="specialtySlug" className="prov-select" value={form.specialtySlug} onChange={change} required>
                  <option value="">Select a specialty…</option>
                  {SPECIALTIES.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
              </div>

              <div className="prov-row-2">
                <div className="prov-field">
                  <label className="prov-label">Phone number</label>
                  <input name="phone" className="prov-input" value={form.phone} onChange={change} placeholder="024 000 0000" required />
                </div>
                <div className="prov-field">
                  <label className="prov-label">WhatsApp <span className="prov-label--optional">(optional)</span></label>
                  <input name="whatsapp" className="prov-input" value={form.whatsapp} onChange={change} placeholder="024 000 0000" />
                </div>
              </div>

              <div className="prov-field">
                <label className="prov-label">Email <span className="prov-label--optional">(optional)</span></label>
                <input name="email" type="email" className="prov-input" value={form.email} onChange={change} placeholder="contact@example.com" />
              </div>

              <div className="prov-field">
                <label className="prov-label">Street address</label>
                <input name="address" className="prov-input" value={form.address} onChange={change} placeholder="e.g. Behind the market, Main Street" required />
              </div>

              <div className="prov-row-2">
                <div className="prov-field">
                  <label className="prov-label">District</label>
                  <select name="district" className="prov-select" value={form.district} onChange={change} required>
                    <option value="">Select a district…</option>
                    {GHANA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="prov-field">
                  <label className="prov-label">Region <span className="prov-label--optional">(auto-filled)</span></label>
                  <input name="region" className="prov-input" value={form.region} onChange={change} placeholder="e.g. Western Region" />
                </div>
              </div>

              <div className="prov-field">
                <label className="prov-label">Location</label>
                <div className="prov-location-box">
                  {location.status === 'granted' ? (
                    <span className="prov-location-status prov-location-status--ok">
                      <MapPin size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                      Location set{geocoding ? ' — looking up region…' : ''}
                    </span>
                  ) : location.status === 'denied' ? (
                    <span className="prov-location-status">Location access denied — please allow it and try again.</span>
                  ) : (
                    <span className="prov-location-status">Stand at your clinic and tap the button for an exact pin.</span>
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
                <label className="prov-label">Languages spoken</label>
                <div className="prov-chip-row">
                  {GHANA_LANGUAGES.map(lang => (
                    <button
                      key={lang} type="button"
                      className={`prov-chip${form.languages.includes(lang) ? ' prov-chip--active' : ''}`}
                      onClick={() => toggleLanguage(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="prov-field">
                <label className="prov-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={form.nhis}
                    onChange={e => setForm(p => ({ ...p, nhis: e.target.checked }))}
                    style={{ margin: 0 }}
                  />
                  Accepts NHIS
                </label>
              </div>

              <div className="prov-field">
                <label className="prov-label">Licence number <span className="prov-label--optional">(optional, speeds up verification)</span></label>
                <input name="licenceNumber" className="prov-input" value={form.licenceNumber} onChange={change} placeholder="e.g. Ghana Health Service registration no." />
              </div>

              <div className="prov-field">
                <label className="prov-label">Short bio <span className="prov-label--optional">(optional)</span></label>
                <textarea name="bio" className="prov-textarea" value={form.bio} onChange={change} placeholder="A sentence or two about the practice." />
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
