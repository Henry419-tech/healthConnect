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
import '@/styles/landing-footer.css'
import '@/styles/landing-mobile-hero.css'

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
    title: 'Find Nearby Care',
    sub: 'Hospitals · Clinics · Pharmacies',
    desc: 'Real-time GPS search across Ghana — see distance, opening hours, ratings and get directions instantly.',
  },
  {
    id: 'symptom', color: 'violet', featured: true,
    icon: Bot, badge: 'AI Powered',
    title: 'AI Symptom Checker',
    sub: 'Instant triage assessment',
    desc: 'Describe your symptoms in plain language. Our AI assesses severity, suggests causes and recommends your next step.',
  },
  {
    id: 'emergency', color: 'red',
    icon: Phone, badge: '24 / 7',
    title: 'Emergency Hub',
    sub: 'National Ambulance · 193',
    desc: 'One-tap call to emergency services, SOS alerts, first-aid guides and your pre-filled emergency contacts.',
  },
  {
    id: 'profile', color: 'amber',
    icon: User, badge: 'Medical ID',
    title: 'Health Profile',
    sub: 'Your complete medical record',
    desc: 'Blood type, allergies, medications, conditions and your health score — always available, even offline.',
  },
]



const HOW_IT_WORKS = [
  { step: '01', title: 'Create your free account', desc: 'Sign up in under 2 minutes. No credit card, no subscriptions.' },
  { step: '02', title: 'Build your Health Profile', desc: 'Add your blood type, allergies, medications and emergency contacts.' },
  { step: '03', title: 'Access care anywhere', desc: 'Find facilities, check symptoms and reach emergency services — all in one place.' },
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

      {/* ── Mobile Splash Hero (visible only ≤640px) ─────────────── */}
      <section className="lp-mobile-splash" aria-label="Welcome">
        {/* Ambient layers */}
        <div className="lp-splash-bg" aria-hidden />
        <div className="lp-splash-streaks" aria-hidden />

        {/* Status bar mimic */}
        <div className="lp-splash-statusbar" aria-hidden>
          <span className="lp-splash-statusbar__time">
            {mounted
              ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </span>
          <div className="lp-splash-statusbar__icons">
            <span className="lp-splash-statusbar__dot" />
            <span>●●●</span>
          </div>
        </div>

        {/* Logo */}
        <div className="lp-splash-logo-wrap">
          <div className="lp-splash-logo-ring">
            {/* Use the uploaded landing.png as the logo image */}
            <img
              src="/landing.png"
              alt="HealthConnect Navigator"
              className="lp-splash-logo-img"
              onError={(e) => {
                /* Fallback: render the Heart icon in a styled circle */
                const target = e.currentTarget as HTMLImageElement
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            {/* Fallback icon shown only if image fails to load */}
            <div
              aria-hidden
              style={{
                display: 'none',
                width: 148, height: 148,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#050e1d 0%,#0a1a30 100%)',
                alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 1,
              }}
            >
              <Heart size={56} color="#00d4ff" />
            </div>
          </div>

          <h1 className="lp-splash-app-name">
            <span>HealthConnect</span>
            <br />
            <span>Navigator</span>
          </h1>

          <p className="lp-splash-tagline">Your health, always within reach.</p>
        </div>

        {/* Trust pills */}
        <div className="lp-splash-pills">
          <span className="lp-splash-pill lp-splash-pill--teal">
            <Shield size={10} /> Encrypted
          </span>
          <span className="lp-splash-pill">
            <CheckCircle size={10} /> Free forever
          </span>
          <span className="lp-splash-pill">
            <Zap size={10} /> Works offline
          </span>
        </div>

        <div className="lp-splash-spacer" />

        {/* CTA buttons */}
        <div className="lp-splash-cta">
          <button
            className="lp-splash-btn-primary"
            onClick={() => open('signup')}
          >
            <Sparkles size={16} />
            Create Free Account
            <ArrowRight size={15} />
          </button>
          <button
            className="lp-splash-btn-secondary"
            onClick={() => open('signin')}
          >
            Sign In
          </button>
        </div>

        <div className="lp-splash-bottom-hint">Built for Ghana</div>
      </section>

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
          <button className="lp-btn lp-btn--ghost lp-btn--signin" onClick={() => open('signin')}>Sign In</button>
          <button className="lp-btn lp-btn--primary" onClick={() => open('signup')}>
            Get Started <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero__left">
          <div className="lp-eyebrow">
            <span className="lp-live-dot" />
             Built for Ghana · Free forever
          </div>
          <h1 className="lp-hero__title">
            Your health,<br />
            <em>always within<br />reach.</em>
          </h1>
          <p className="lp-hero__sub">
            Find hospitals and pharmacies near you, check your symptoms with AI, access emergency services instantly — and carry your complete medical ID wherever you go.
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
        </div>

        {/* App preview mock */}
        <div className="lp-hero__preview" aria-hidden>
          <div className="lp-preview-phone">
            <div className="lp-preview-topbar">
              <div className="lp-preview-logo">
                <Heart size={11} />
                <span>HealthConnect</span>
              </div>
              <div className="lp-preview-avatar">HC</div>
            </div>
            <div className="lp-preview-greeting">
              <p className="lp-preview-sub">Good morning ☀️</p>
              <p className="lp-preview-name">Henry Carl</p>
            </div>
            <div className="lp-preview-score-card">
              <p className="lp-preview-score-label">OVERALL HEALTH SCORE</p>
              <div className="lp-preview-score-row">
                <span className="lp-preview-score-num">67</span>
                <span className="lp-preview-score-denom">/100</span>
                <div className="lp-preview-ring">
                  <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(0,212,255,.12)" strokeWidth="3.5"/><circle cx="22" cy="22" r="18" fill="none" stroke="#00d4ff" strokeWidth="3.5" strokeDasharray="75 113" strokeLinecap="round" transform="rotate(-90 22 22)"/></svg>
                  <span>67%</span>
                </div>
              </div>
              <p className="lp-preview-status">Good standing · Last check today</p>
              <div className="lp-preview-badges">
                <span className="lp-preview-badge lp-preview-badge--teal">✓ Meds on track</span>
                <span className="lp-preview-badge">No alerts</span>
              </div>
            </div>
            <div className="lp-preview-actions">
              {[
                { icon: '🗺', label: 'Facilities' },
                { icon: '🤖', label: 'AI Check' },
                { icon: '🚨', label: 'Emergency' },
                { icon: '👤', label: 'Profile' },
              ].map(a => (
                <div key={a.label} className="lp-preview-action">
                  <div className="lp-preview-action-icon">{a.icon}</div>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
            <div className="lp-preview-nav">
              {['Home','Find','Check','SOS','Profile'].map((t, i) => (
                <div key={t} className={`lp-preview-nav-item${i === 0 ? ' active' : ''}${t === 'SOS' ? ' sos' : ''}`}>
                  <div className="lp-preview-nav-dot" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Floating stat pills */}
          <div className="lp-preview-pill lp-preview-pill--1">
            <MapPin size={11} /> 3 hospitals nearby
          </div>
          <div className="lp-preview-pill lp-preview-pill--2">
            <Phone size={11} /> Emergency: 193
          </div>
          <div className="lp-preview-pill lp-preview-pill--3">
            <Shield size={11} /> Medical ID ready
          </div>
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

      {/* Footer — desktop only */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">
                <div className="lp-footer-logo-icon"><Heart size={17} /></div>
                <p className="lp-footer-logo-name">HealthConnect Navigator</p>
              </div>
              <p className="lp-footer-tagline">
                Ghana's health navigation platform — find care, check symptoms and access emergency services instantly.
              </p>
              <div className="lp-footer-emergency">
                <span className="lp-footer-emergency-label">Emergency Numbers</span>
                <div className="lp-footer-emergency-numbers">
                  <a href="tel:193" className="lp-footer-emergency-pill lp-footer-emergency-pill--red">
                    <Phone size={10} /> 193 · Ambulance
                  </a>
                  <a href="tel:192" className="lp-footer-emergency-pill lp-footer-emergency-pill--teal">
                    <Phone size={10} /> 192 · Fire
                  </a>
                  <a href="tel:191" className="lp-footer-emergency-pill lp-footer-emergency-pill--teal">
                    <Phone size={10} /> 191 · Police
                  </a>
                </div>
              </div>
            </div>
            <nav className="lp-footer-nav" aria-label="Footer navigation">
              <div className="lp-footer-nav-group">
                <p className="lp-footer-nav-title">Services</p>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Find Facilities</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">AI Symptom Checker</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Emergency Hub</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Health Profile</button>
              </div>
              <div className="lp-footer-nav-group">
                <p className="lp-footer-nav-title">Account</p>
                <button className="lp-footer-nav-link" onClick={() => open('signin')} type="button">Sign In</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Create Account</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Dashboard</button>
              </div>
              <div className="lp-footer-nav-group">
                <p className="lp-footer-nav-title">Legal</p>
                <span className="lp-footer-nav-link">Privacy Policy</span>
                <span className="lp-footer-nav-link">Terms of Service</span>
                <span className="lp-footer-nav-link">Medical Disclaimer</span>
              </div>
            </nav>
          </div>
        </div>
        <hr className="lp-footer-divider" />
        <div className="lp-footer-bottom">
          <p className="lp-footer-copy">
            © {new Date().getFullYear()} HealthConnect Navigator · Built for Ghana · Free forever
          </p>
          <div className="lp-footer-badges">
            <span className="lp-footer-badge"><Shield size={10} /> Encrypted</span>
            <span className="lp-footer-badge"><CheckCircle size={10} /> Free forever</span>
            <span className="lp-footer-badge"><Zap size={10} /> Works offline</span>
            <span className="lp-footer-version">v2.0</span>
          </div>
        </div>
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
            <div className="lp-panel-brand__text">
              <span className="lp-panel-brand__name">HealthConnect</span>
              <span className="lp-panel-brand__sub">Navigator</span>
            </div>
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