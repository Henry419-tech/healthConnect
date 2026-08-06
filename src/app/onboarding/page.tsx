'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Navigation, User as UserIcon,
  ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle,
} from 'lucide-react'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { HCLogo } from '@/components/HCLogo'
import '@/styles/dashboard.css'
import '@/styles/auth.css'

/* ── Types ──────────────────────────────────────────────────────────────── */
// 3 steps: Welcome, Your details, Location. Emergency Contact step was
// removed along with the app's SOS/emergency-contacts feature.
type Step = 0 | 1 | 2

const STEPS = [
  { label: 'Welcome' },
  { label: 'Your Details' },
  { label: 'Location' },
]

/* ── Utility styles ─────────────────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: 'var(--hc-card)',
  border: '1px solid var(--hc-border)',
  borderRadius: 16,
  padding: '2rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--hc-bg)',
  border: '1px solid var(--hc-border)',
  borderRadius: 8,
  padding: '0.6rem 0.85rem',
  color: 'var(--hc-text)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isDarkMode } = useDarkMode()

  const [step, setStep]     = useState<Step>(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Step 1 — Your details
  const [firstName, setFirstName] = useState('')

  // Step 2 — Location
  const [locStatus, setLocStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')

  // Pre-fill first name from session if available
  useEffect(() => {
    if (session?.user?.name && !firstName) {
      setFirstName(session.user.name.split(' ')[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // If user somehow hits this page unauthenticated, redirect
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--hc-bg)' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--hc-teal)' }} />
      </div>
    )
  }

  /* ── Navigation ──────────────────────────────────────────────────────── */
  const goNext = () => setStep(s => Math.min(s + 1, 2) as Step)
  const goPrev = () => setStep(s => Math.max(s - 1, 0) as Step)

  /* ── Save handlers ───────────────────────────────────────────────────── */
  async function saveDetails() {
    if (!firstName.trim()) { setError('Please enter your name.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: firstName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save')
      goNext()
    } catch {
      setError('Could not save. You can update this later in your profile.')
      goNext()
    } finally { setSaving(false) }
  }

  function requestLocation() {
    setLocStatus('requesting'); setError(null)
    if (!('geolocation' in navigator)) {
      setLocStatus('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocStatus('granted'),
      () => setLocStatus('denied'),
      { timeout: 10000 }
    )
  }

  function finishOnboarding() {
    // Mark onboarding complete in localStorage so dashboard knows not to redirect here again
    localStorage.setItem('hc_onboarding_done', '1')
    router.push('/dashboard')
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className={isDarkMode ? 'dark-mode' : ''} style={{ minHeight: '100vh', background: 'var(--hc-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
        <HCLogo size={28} />
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--hc-teal)' }}>HealthConnect</span>
      </div>

      {/* Progress bar — hidden on Welcome, this mirrors the step-count UX
          from the original flow but starts counting from "Your Details" */}
      {step > 0 && (
        <div style={{ width: '100%', maxWidth: 480, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--hc-text2)' }}>Step {step} of {STEPS.length - 1}</span>
            <span style={{ fontSize: 13, color: 'var(--hc-text2)' }}>{STEPS[step].label}</span>
          </div>
          <div style={{ height: 4, background: 'var(--hc-border)', borderRadius: 4 }}>
            <div style={{ height: 4, background: 'var(--hc-teal)', borderRadius: 4, width: `${(step / (STEPS.length - 1)) * 100}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      <div style={{ ...card, width: '100%', maxWidth: 480 }}>

        {/* ── Step 0: Welcome ──────────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,210,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <HCLogo size={34} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Welcome to HealthConnect</h1>
            <p style={{ color: 'var(--hc-text2)', fontSize: 15, marginBottom: '2rem', lineHeight: 1.6 }}>
              Find the right healthcare, fast.
            </p>
            <button
              onClick={goNext}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none', background: 'var(--hc-teal)', color: '#000', fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              Get Started <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 1: Your details ────────────────────────────────────── */}
        {step === 1 && (
          <>
            <StepHeader icon={<UserIcon size={28} />} title="Your Details" subtitle="Just the basics — you can fill in the rest later." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem' }}>
              <input style={inputStyle} placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <NavRow onPrev={goPrev} onNext={saveDetails} loading={saving} nextLabel="Next" />
          </>
        )}

        {/* ── Step 2: Location ─────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,210,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--hc-teal)' }}>
              {locStatus === 'granted' ? <CheckCircle size={32} /> : <MapPin size={32} />}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              {locStatus === 'granted' ? "You're all set!" : 'Enable Location'}
            </h2>
            <p style={{ color: 'var(--hc-text2)', fontSize: 14, marginBottom: '2rem', lineHeight: 1.6 }}>
              {locStatus === 'granted'
                ? 'We can now find facilities near you automatically.'
                : 'Allow location access so we can find facilities near you.'}
            </p>

            {locStatus !== 'granted' && (
              <button
                onClick={requestLocation}
                disabled={locStatus === 'requesting'}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none', background: 'var(--hc-teal)', color: '#000', fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}
              >
                {locStatus === 'requesting' ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
                {locStatus === 'requesting' ? 'Requesting…' : 'Allow Location Access'}
              </button>
            )}

            {locStatus === 'denied' && (
              <p style={{ fontSize: 12, color: 'var(--hc-text2)', marginBottom: 10 }}>
                No problem — you can enable this later, or enter your area manually on Find Care.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={finishOnboarding}
                style={{ padding: '0.75rem', borderRadius: 10, border: locStatus === 'granted' ? 'none' : '1px solid var(--hc-border)', background: locStatus === 'granted' ? 'var(--hc-teal)' : 'transparent', color: locStatus === 'granted' ? '#000' : 'var(--hc-text)', fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Go to Dashboard <ChevronRight size={16} />
              </button>
              <p style={{ fontSize: 12, color: 'var(--hc-text2)', margin: 0 }}>
                By using HealthConnect you agree to our{' '}
                <a href="/legal" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-teal)' }}>Privacy Policy &amp; Terms of Service</a>.
              </p>
            </div>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,80,80,0.1)', border: '1px solid var(--hc-red)', borderRadius: 8, padding: '0.6rem 0.85rem', marginTop: 12, fontSize: 13, color: 'var(--hc-red)' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Skip entire onboarding */}
      {step < 2 && (
        <button
          onClick={finishOnboarding}
          style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: 'var(--hc-text2)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Skip setup, go to dashboard
        </button>
      )}
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ color: 'var(--hc-teal)', marginBottom: 12 }}>{icon}</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.35rem' }}>{title}</h2>
      <p style={{ color: 'var(--hc-text2)', fontSize: 14, margin: 0 }}>{subtitle}</p>
    </div>
  )
}

function NavRow({ onNext, onPrev, onSkip, loading, nextLabel = 'Next' }: {
  onNext: () => void; onPrev?: () => void; onSkip?: () => void;
  loading?: boolean; nextLabel?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {onPrev && (
          <button onClick={onPrev} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--hc-border)', borderRadius: 8, padding: '0.55rem 0.85rem', color: 'var(--hc-text2)', cursor: 'pointer', fontSize: 14 }}>
            <ChevronLeft size={14} /> Back
          </button>
        )}
        {onSkip && (
          <button onClick={onSkip} style={{ background: 'none', border: 'none', color: 'var(--hc-text2)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
            Skip
          </button>
        )}
      </div>
      <button onClick={onNext} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--hc-teal)', border: 'none', borderRadius: 8, padding: '0.6rem 1.1rem', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
        {loading ? <Loader2 size={14} className="spin" /> : null}
        {nextLabel} {!loading && <ChevronRight size={14} />}
      </button>
    </div>
  )
}