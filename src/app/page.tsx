// app/page.tsx  ← your public root route
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDarkMode } from '@/contexts/DarkModeContext'
import {
  Heart, MapPin, Bot, Phone, User, Shield,
  Zap, Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle,
  Sparkles, X, ChevronRight, Moon, Sun,
} from 'lucide-react'
import '@/styles/landing.css'
import '@/styles/landing-light.css'

/* ── Types ─────────────────────────────────────────────────────── */
type Panel = 'closed' | 'signin' | 'signup'

const PW_REQS = [
  { label: 'At least 6 characters', test: (p: string) => p.length >= 6 },
  { label: 'Contains a number',     test: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter',     test: (p: string) => /[a-zA-Z]/.test(p) },
]

const CARDS = [
  {
    id: 'facilities', color: 'teal',
    icon: MapPin, badge: 'GPS Live',
    title: 'Find Nearby Care', sub: 'Accra, Kumasi & beyond',
    desc: 'Live GPS search for hospitals, clinics and pharmacies near you — with distance, hours and directions.',
  },
  {
    id: 'symptom', color: 'violet', featured: true,
    icon: Bot, badge: 'AI Powered',
    title: 'AI Health Check', sub: 'Get instant assessment',
    desc: 'Describe your symptoms and our AI gives you a triage assessment and recommends next steps.',
  },
  {
    id: 'emergency', color: 'red',
    icon: Phone, badge: '24 / 7',
    title: 'Emergency: 193', sub: 'Quick access 24/7',
    desc: 'One-tap call to National Ambulance, plus first-aid guides, SOS button, and your emergency contacts.',
  },
  {
    id: 'profile', color: 'amber',
    icon: User, badge: 'Offline',
    title: 'Health Profile', sub: 'Your full medical ID',
    desc: 'Blood type, allergies, medications and health score — shown to first responders when it matters most.',
  },
]

/* ══════════════════════════════════════════════════════════════ */
import { Suspense } from 'react'

// useSearchParams() requires a Suspense boundary in Next.js App Router
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  )
}

function LandingPage() {
  const [panel, setPanel]              = useState<Panel>('closed')
  const [mounted, setMounted]          = useState(false)
  const [systemIsLight, setSystemIsLight] = useState(false)
  const router                         = useRouter()
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const searchParams   = useSearchParams()!  // non-null: Suspense boundary guarantees resolution
  const initialised    = useRef(false)   // run panel-open logic only once

  const panelOpen = panel !== 'closed'
  const open      = (p: Panel) => setPanel(p)
  const close     = useCallback(() => setPanel('closed'), [])

  // Prevent SSR/client hydration mismatch: dark mode class only applied after mount
  useEffect(() => { setMounted(true) }, [])

  // Detect system light mode preference and keep in sync with OS changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const apply = (e: MediaQueryList | MediaQueryListEvent) => setSystemIsLight(e.matches)
    apply(mq)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Open the correct panel when navigated from /auth/signin or /auth/signup
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    const p = searchParams.get('panel')
    if (p === 'signin' || p === 'signup') setPanel(p as Panel)
  }, [searchParams])

  // Escape key + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = panelOpen ? 'hidden' : ''
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [panelOpen, close])

  // After sign-in, honour callbackUrl set by middleware (e.g. from a protected route)
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const onSuccess   = () => { router.push(callbackUrl); router.refresh() }

  // Only apply dark/light classes after mount — server always renders 'lp-root--light'
  // so server and initial client HTML match, then React updates after hydration.
  //
  // Class logic:
  //   lp-root--light-mode  → system is light AND user hasn't forced dark
  //   lp-root--force-dark  → user explicitly toggled dark (overrides system light)
  //   lp-root--dark / lp-root--light → existing app-wide dark mode context classes
  const rootCls = [
    'lp-root',
    mounted && systemIsLight && !isDarkMode ? 'lp-root--light-mode' : '',
    mounted && isDarkMode && systemIsLight  ? 'lp-root--force-dark'  : '',
    mounted ? (isDarkMode ? 'lp-root--dark' : 'lp-root--light') : 'lp-root--light',
    mounted && panelOpen ? 'lp-root--panel-open' : '',
  ].filter(Boolean).join(' ')

  const panelCls = [
    'lp-auth-panel',
    panelOpen               ? 'lp-auth-panel--open' : '',
    mounted && isDarkMode   ? 'lp-auth-panel--dark'  : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rootCls}>

      {/* Background */}
      <div className="lp-bg" aria-hidden>
        <div className="lp-bg__mesh" />
        <div className="lp-bg__grid" />
        <div className="lp-bg__orb lp-bg__orb--1" />
        <div className="lp-bg__orb lp-bg__orb--2" />
        <div className="lp-bg__orb lp-bg__orb--3" />
      </div>

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-brand">
          <div className="lp-brand__icon"><Heart size={18} /></div>
          <span className="lp-brand__name">HealthConnect</span>
          <span className="lp-brand__tag">Navigator</span>
        </div>
        <div className="lp-nav__actions">
          {/* Dark mode toggle — consistent with the rest of the app */}
          <button
            className="lp-btn lp-btn--ghost lp-btn--icon"
            onClick={toggleDarkMode}
            aria-label={mounted && isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {mounted && isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="lp-btn lp-btn--ghost"  onClick={() => open('signin')}>Sign In</button>
          <button className="lp-btn lp-btn--primary" onClick={() => open('signup')}>
            Get Started <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-eyebrow">
          <span className="lp-live-dot" />
          Ghana's Health Navigation Platform
        </div>
        <h1 className="lp-hero__title">
          Your health,<br />
          <em>always within<br />reach.</em>
        </h1>
        <p className="lp-hero__sub">
          Emergency services, AI symptom checking, nearby facilities and your complete medical ID — designed for Ghana.
        </p>
        <div className="lp-hero__cta">
          <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={() => open('signup')}>
            Create Free Account <Sparkles size={16} />
          </button>
          <button className="lp-btn lp-btn--outline lp-btn--lg" onClick={() => open('signin')}>
            Sign In
          </button>
        </div>
        <div className="lp-trust-row">
          <span className="lp-trust-pill"><Shield size={12} />End-to-end encrypted</span>
          <span className="lp-trust-pill"><CheckCircle size={12} />Free forever</span>
          <span className="lp-trust-pill"><Zap size={12} />Works offline</span>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="lp-cards">
        <p className="lp-cards__label">Everything you need</p>
        <div className="lp-cards__grid">
          {CARDS.map(card => {
            const Icon = card.icon
            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                className={`lp-card lp-card--${card.color}${card.featured ? ' lp-card--featured' : ''}`}
                onClick={() => open('signup')}
                onKeyDown={e => e.key === 'Enter' && open('signup')}
              >
                <div className="lp-card__top">
                  <div className="lp-card__icon"><Icon size={20} /></div>
                  <span className="lp-card__badge">{card.badge}</span>
                </div>
                <div className="lp-card__body">
                  <h3 className="lp-card__title">{card.title}</h3>
                  <p className="lp-card__sub">{card.sub}</p>
                  <p className="lp-card__desc">{card.desc}</p>
                </div>
                <div className="lp-card__arrow"><ChevronRight size={15} /></div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Stats */}
      <div className="lp-stats">
        {[
          { n: '193',  l: 'Ambulance Service' },
          { n: '192',  l: 'Fire Service' },
          { n: '24/7', l: 'Emergency Access' },
          { n: '100%', l: 'Private & Secure' },
        ].map(s => (
          <div key={s.n} className="lp-stat">
            <span className="lp-stat__n">{s.n}</span>
            <span className="lp-stat__l">{s.l}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer__brand">
          <Heart size={14} style={{ color: 'var(--lp-red)' }} />
          HealthConnect Navigator
        </div>
        <p className="lp-footer__copy">
          Built for Ghana · Emergency: <a href="tel:193">193</a>
        </p>
      </footer>

      {/* Backdrop */}
      <div
        className={`lp-backdrop${panelOpen ? ' lp-backdrop--open' : ''}`}
        onClick={close}
        aria-hidden
      />

      {/* Auth slide panel */}
      <div
        className={panelCls}
        role="dialog"
        aria-modal="true"
        aria-label={panel === 'signin' ? 'Sign in' : 'Create account'}
      >
        <div className="lp-panel-close">
          <button className="lp-close-btn" onClick={close} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="lp-panel-inner">
          {/* Brand strip */}
          <div className="lp-panel-brand">
            <div className="lp-panel-brand__icon"><Heart size={15} /></div>
            <span className="lp-panel-brand__name">HealthConnect Navigator</span>
          </div>

          {panel === 'signin' && (
            <SignInForm
              isDark={isDarkMode}
              onSwitch={() => setPanel('signup')}
              onSuccess={onSuccess}
              sessionError={searchParams.get('error') === 'SessionRequired'}
            />
          )}
          {panel === 'signup' && (
            <SignUpForm isDark={isDarkMode} onSwitch={() => setPanel('signin')} onSuccess={onSuccess} />
          )}
        </div>
      </div>

    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SIGN IN FORM
══════════════════════════════════════════════════════════════ */
function SignInForm({
  isDark, onSwitch, onSuccess, sessionError = false,
}: { isDark: boolean; onSwitch: () => void; onSuccess: () => void; sessionError?: boolean }) {
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(), password: pw, redirect: false,
      })
      result?.error ? setError('Invalid email or password. Please try again.') : onSuccess()
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <p className="lp-form-eyebrow">Welcome back</p>
      <h2 className="lp-form-title">Sign in to your<br />account</h2>
      <p className="lp-form-sub">Access your dashboard, emergency contacts and medical ID.</p>

      {sessionError && (
        <div className="lp-form-error lp-form-error--warn" role="alert">
          🔒 Your session has expired. Please sign in again.
        </div>
      )}

      <form onSubmit={submit} noValidate>
        {error && <div className="lp-form-error" role="alert">{error}</div>}

        <div className="lp-field">
          <label className="lp-field-label">Email address</label>
          <div className="lp-input-wrap">
            <Mail size={16} className="lp-input-icon" />
            <input type="email" className="lp-input" placeholder="you@example.com"
              autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        </div>

        <div className="lp-field">
          <label className="lp-field-label">Password</label>
          <div className="lp-input-wrap">
            <Lock size={16} className="lp-input-icon" />
            <input type={showPw ? 'text' : 'password'} className="lp-input"
              placeholder="Enter your password" autoComplete="current-password"
              value={pw} onChange={e => setPw(e.target.value)} required />
            <button type="button" className="lp-input-toggle"
              onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide' : 'Show'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !pw}
          className={`lp-submit${isDark ? ' lp-submit--dark-mode' : ''}`}
        >
          {loading
            ? <><span className={`lp-spinner${isDark ? ' lp-spinner--teal' : ''}`} />Signing in…</>
            : <>Sign In <Sparkles size={16} /></>}
        </button>
      </form>

      <div className="lp-demo">
        <p className="lp-demo__title">✨ Demo credentials</p>
        <p className="lp-demo__creds">demo@healthconnect.com<br />demo123</p>
      </div>

      <p className="lp-switch">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch}>Create one free</button>
      </p>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   SIGN UP FORM
══════════════════════════════════════════════════════════════ */
function SignUpForm({
  isDark, onSwitch, onSuccess,
}: { isDark: boolean; onSwitch: () => void; onSuccess: () => void }) {
  const [form,    setForm]    = useState({ name: '', email: '', pw: '', cpw: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [showCpw, setShowCpw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [agreed,  setAgreed]  = useState(false)

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    if (error) setError('')
  }
  const reqs = PW_REQS.map(r => r.test(form.pw))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!form.name.trim())    return setError('Please enter your full name.')
    if (!reqs.every(Boolean)) return setError('Please meet all password requirements.')
    if (form.pw !== form.cpw) return setError('Passwords do not match.')
    if (!agreed)              return setError('Please accept the terms to continue.')

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     form.name.trim(),
          email:    form.email.trim().toLowerCase(),
          password: form.pw,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setSuccess(true)
      setTimeout(async () => {
        await signIn('credentials', {
          email:    form.email.trim().toLowerCase(),
          password: form.pw,
          redirect: false,
        })
        onSuccess()
      }, 1600)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="lp-auth-success">
        <div className="lp-auth-success__icon"><CheckCircle size={34} /></div>
        <h2 className="lp-auth-success__title">Account created!</h2>
        <p className="lp-auth-success__sub">
          Welcome to HealthConnect Navigator.<br />Setting up your dashboard…
        </p>
        <div className="lp-auth-success__loader">
          <span className="lp-spinner" />Signing you in
        </div>
      </div>
    )
  }

  return (
    <>
      <p className="lp-form-eyebrow">Get started · free</p>
      <h2 className="lp-form-title">Create your<br />account</h2>
      <p className="lp-form-sub">Takes less than 2 minutes. No credit card required.</p>

      <form onSubmit={submit} noValidate>
        {error && <div className="lp-form-error" role="alert">{error}</div>}

        <div className="lp-field">
          <label className="lp-field-label">Full name</label>
          <div className="lp-input-wrap">
            <User size={16} className="lp-input-icon" />
            <input name="name" type="text" className="lp-input" placeholder="Kofi Asante"
              autoComplete="name" value={form.name} onChange={change} required />
          </div>
        </div>

        <div className="lp-field">
          <label className="lp-field-label">Email address</label>
          <div className="lp-input-wrap">
            <Mail size={16} className="lp-input-icon" />
            <input name="email" type="email" className="lp-input" placeholder="you@example.com"
              autoComplete="email" value={form.email} onChange={change} required />
          </div>
        </div>

        <div className="lp-field">
          <label className="lp-field-label">Password</label>
          <div className="lp-input-wrap">
            <Lock size={16} className="lp-input-icon" />
            <input name="pw" type={showPw ? 'text' : 'password'} className="lp-input"
              placeholder="Create a strong password" autoComplete="new-password"
              value={form.pw} onChange={change} required />
            <button type="button" className="lp-input-toggle"
              onClick={() => setShowPw(v => !v)}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.pw && (
            <div className="lp-pw-reqs">
              {PW_REQS.map((r, i) => (
                <div key={i} className={`lp-pw-req${reqs[i] ? ' met' : ''}`}>
                  <div className="lp-req-dot"><div className="lp-req-check" /></div>
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lp-field">
          <label className="lp-field-label">Confirm password</label>
          <div className="lp-input-wrap">
            <Shield size={16} className="lp-input-icon" />
            <input name="cpw" type={showCpw ? 'text' : 'password'} className="lp-input"
              placeholder="Re-enter your password" autoComplete="new-password"
              value={form.cpw} onChange={change} required />
            <button type="button" className="lp-input-toggle"
              onClick={() => setShowCpw(v => !v)}>
              {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <label className="lp-terms">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>
            I agree to the <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a> and{' '}
            <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>.
            My health data is encrypted and never shared.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !form.email || !form.name || !form.pw}
          className={`lp-submit lp-submit--signup${isDark ? ' lp-submit--dark-mode' : ''}`}
        >
          {loading
            ? <><span className={`lp-spinner${isDark ? ' lp-spinner--teal' : ' lp-spinner--dark'}`} />Creating account…</>
            : <>Create Account <Sparkles size={16} /></>}
        </button>
      </form>

      <p className="lp-switch">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch}>Sign in</button>
      </p>
    </>
  )
}