// app/page.tsx  ← your public root route
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { signIn, useSession } from 'next-auth/react'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDarkMode } from '@/contexts/DarkModeContext'
import {
  MapPin, Phone, User, Shield, Droplet,
  Zap, Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle,
  Sparkles, X, ChevronRight, Moon, Sun, Pause, Play
} from 'lucide-react'
import '@/styles/landing.css'
import '@/styles/landing-auth.css'
import '@/styles/landing-light.css'
import '@/styles/landing-footer.css'
import '@/styles/landing-hero.css'

/* ── Types ─────────────────────────────────────────────────────── */
type Panel = 'closed' | 'signin' | 'signup'


// Add this component — same as dashboard's HCLogo
const HCLogo = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="115 55 460 363" fill="none"
    width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
    <g fill="#00d2ff">
      <path d="M330.32 403.63 c-4.20 -1.10 -7.56 -3.15 -11.03 -6.62 -5.78 -5.72 -7.88 -11.13 -7.88 -19.96 0 -2.73 0.32 -6.14 0.74 -7.61 2 -7.56 6.88 -13.55 13.86 -16.91 3.94 -1.89 4.25 -1.94 10.87 -2.15 6.35 -0.16 9.56 0.26 12.87 1.68 0.84 0.32 6.41 -3.99 32.03 -24.79 18.17 -14.81 25.31 -20.80 38.34 -32.30 11.97 -10.61 36.87 -35.19 45.01 -44.48 11.55 -13.18 24.94 -31.04 31.77 -42.22 22.16 -36.45 28.46 -72.63 18.17 -104.77 -8.09 -25.36 -28.15 -45.37 -53.25 -53.04 -7.88 -2.42 -13.13 -3.20 -21.16 -3.20 -18.17 0 -34.56 4.94 -49 14.81 -3.05 2.05 -7.67 6.09 -12.29 10.66 -10.29 10.24 -16.96 19.54 -25.42 35.45 -2.36 4.46 -5.04 8.93 -5.93 9.87 -1.68 1.73 -1.73 1.79 -5.78 1.58 -3.99 -0.16 -4.20 -0.21 -5.78 -2.05 -0.95 -1.05 -3.94 -5.78 -6.67 -10.45 -18.49 -31.61 -42.75 -50.83 -70.63 -55.98 -8.82 -1.63 -24.10 -0.21 -34.24 3.20 -11.45 3.83 -25.05 12.76 -33.03 21.64 -24.42 27.31 -29.04 62.49 -13.08 100.62 l0.79 1.94 25.94 0 c24.26 0 25.94 -0.05 26.21 -0.89 1.16 -4.15 9.66 -36.76 13.76 -52.67 2.78 -10.82 5.30 -20.38 5.62 -21.16 0.89 -2.26 2.36 -2.99 5.93 -2.99 3.31 0 5.04 0.74 6.04 2.63 0.42 0.79 14.60 71.21 20.06 99.41 0.63 3.36 1.31 6.14 1.47 6.14 0.16 0 0.79 -1.73 1.31 -3.78 0.53 -2.10 4.10 -15.18 7.93 -29.04 8.03 -29.04 7.35 -27.57 13.23 -27.57 5.51 0 5.04 -0.63 10.87 14.44 1.89 4.94 3.99 10.35 4.67 12.08 l1.26 3.15 24.21 0.26 24.16 0.26 1.21 1.16 c0.95 0.95 1.21 1.94 1.37 4.83 0.26 4.10 -0.26 5.41 -2.68 6.88 -1.63 1 -2.89 1.05 -28.20 1.05 -16.28 0 -27.26 -0.21 -28.41 -0.53 -2.36 -0.68 -3.20 -1.89 -5.46 -8.03 -1 -2.73 -1.89 -4.46 -2.05 -4.04 -0.16 0.42 -1.37 4.83 -2.68 9.72 -1.37 4.94 -4.83 17.54 -7.72 28.10 -2.89 10.56 -5.62 20.48 -6.04 22.06 -1.58 5.78 -3.10 7.35 -7.14 7.35 -3.05 0 -5.78 -1.16 -6.56 -2.78 -1 -1.94 -2.47 -8.56 -7.46 -33.19 -2.57 -12.97 -4.99 -24.68 -5.25 -26 -0.26 -1.31 -2.31 -11.66 -4.52 -23 -2.21 -11.34 -4.10 -20.59 -4.15 -20.48 -0.16 0.21 -4.46 16.33 -8.19 30.62 -4.20 16.07 -4.67 17.49 -6.35 18.91 l-1.58 1.31 -26.73 0 c-14.70 0 -26.73 0.11 -26.73 0.26 0 1 10.24 16.12 15.44 22.84 28.62 36.92 72.84 77.41 118.89 108.97 l7.46 5.04 6.72 -3.78 c9.45 -5.36 28.41 -18.07 37.13 -24.84 24.26 -18.96 40.96 -37.13 49.84 -54.35 4.46 -8.61 7.61 -18.38 8.51 -26.31 l0.32 -2.99 -3.83 -1.21 c-15.70 -4.73 -30.25 -19.54 -37.81 -38.28 -1.68 -4.25 -2.05 -5.83 -1.94 -7.98 l0.16 -2.73 5.78 -2.26 c4.04 -1.58 6.56 -2.26 8.40 -2.31 2.63 0 2.68 0.05 3.36 2 1.47 4.20 5.88 12.71 8.93 17.28 7.88 11.82 19.43 18.75 28.31 16.96 5.62 -1.16 10.35 -3.89 15.33 -8.88 6.25 -6.30 10.35 -12.71 14.44 -22.69 l1.79 -4.41 2.57 -0.16 c1.89 -0.11 3.62 0.26 6.62 1.47 7.40 2.89 8.19 3.47 8.19 5.51 0 4.52 -6.51 18.17 -12.39 26 -7.93 10.56 -16.44 17.07 -26.73 20.48 l-4.20 1.42 -0.68 5.46 c-2.78 22.95 -14.44 44.11 -36.60 66.43 -19.59 19.69 -44.80 38.28 -75.10 55.35 -3.73 2.10 -8.40 4.73 -10.35 5.83 -5.62 3.31 -6.20 3.15 -16.33 -3.83 -46.74 -32.14 -89.85 -70.16 -118.89 -104.77 -26 -30.98 -40.49 -59.76 -45.06 -89.43 -1.16 -7.61 -1.63 -25 -0.84 -32.82 2.73 -27.26 13.13 -49.31 31.67 -67.27 14.49 -14.02 32.30 -23.05 52.88 -26.73 6.20 -1.16 23.16 -1.63 29.46 -0.84 12.87 1.58 22.32 4.36 33.87 10.03 18.07 8.82 33.40 22.11 46.74 40.54 l3.57 4.94 4.20 -6.25 c6.77 -10.19 16.28 -20.74 25.05 -27.83 11.50 -9.40 26.42 -16.54 41.85 -20.11 5.15 -1.21 7.09 -1.31 21.69 -1.63 15.07 -0.26 16.38 -0.21 22.06 0.84 20.17 3.89 39.23 14.28 53.36 29.04 14.86 15.60 23.79 33.82 27.89 56.87 1.37 7.77 1.37 34.87 0 43.06 -5.25 31.14 -18.01 57.03 -44.69 90.33 -13.60 16.96 -33.56 37.55 -56.24 58.03 -16.54 14.91 -51.73 44.64 -69.58 58.82 -5.25 4.20 -4.94 3.62 -3.99 7.46 1.21 4.83 1.10 13.08 -0.21 17.28 -2.05 6.77 -6.88 12.24 -13.81 15.70 l-4.15 2.10 -6.67 -0.05 c-3.62 0 -7.67 -0.32 -8.98 -0.68z m11.82 -14.97 c3.15 -1.42 5.30 -3.47 6.77 -6.46 1.63 -3.31 1.73 -6.14 0.26 -9.35 -1.42 -3.15 -3.36 -5.15 -6.51 -6.62 -3.36 -1.63 -5.72 -1.58 -9.09 0.11 -2.94 1.47 -4.83 3.36 -6.51 6.67 -2.84 5.62 1.05 13.18 8.24 15.96 2.31 0.89 4.46 0.79 6.83 -0.32z"/>
      <path d="M387.51 163.48 c-2.15 -5.67 -6.72 -25.78 -8.61 -37.97 -1.37 -8.51 -1.63 -23.47 -0.58 -28.62 2.68 -13.18 12.29 -22.69 25.63 -25.36 3.41 -0.68 4.99 -1.31 6.04 -2.31 2.36 -2.15 3.52 -2.52 8.30 -2.52 4.78 0 6.46 0.53 8.51 2.73 3.99 4.25 3.62 12.76 -0.68 16.80 -2.10 1.94 -3.94 2.52 -7.72 2.52 -3.73 0 -6.98 -1.26 -8.61 -3.31 -0.58 -0.74 -1.26 -1.16 -1.52 -0.95 -0.26 0.26 -1.73 0.84 -3.26 1.37 -3.57 1.16 -8.77 5.88 -10.77 9.82 -2.47 4.99 -3.15 8.82 -2.78 15.91 0.47 9.30 3.68 27.52 7.14 40.54 0.89 3.26 1.58 6.72 1.58 7.72 0 1.79 -0.05 1.84 -4.20 3.41 -5.41 2.10 -7.72 2.15 -8.45 0.21z"/>
      <path d="M482.88 163.32 c-3.31 -1.31 -3.68 -1.63 -3.83 -3.10 -0.11 -0.84 1.16 -6.83 2.73 -13.29 5.15 -20.69 7.19 -36.97 5.62 -44.64 -1.73 -8.30 -7.30 -14.65 -15.49 -17.75 -1.52 -0.53 -1.52 -0.58 -1.16 -3.78 0.16 -1.73 0.32 -4.57 0.32 -6.25 l0 -3.10 2.52 0 c2.99 0 8.67 1.94 12.55 4.31 4.04 2.42 9.66 8.51 11.66 12.55 2.84 5.83 3.73 10.61 3.73 19.85 0 13.55 -2.57 29.72 -7.61 47.74 l-2.52 9.03 -2.42 -0.05 c-1.31 -0.05 -4.04 -0.74 -6.09 -1.52z"/>
      <path d="M456.73 87.96 c-1.16 -0.37 -2.63 -1.26 -3.36 -1.94 -4.15 -3.83 -4.41 -12.45 -0.53 -16.59 2.05 -2.21 3.73 -2.73 8.77 -2.73 4.57 0 4.88 0.05 6.30 1.47 1.73 1.79 2.42 5.57 1.94 11.13 -0.58 6.88 -2.84 9.45 -8.24 9.45 -1.58 -0.05 -3.78 -0.37 -4.88 -0.79z"/>
    </g>
  </svg>
)

const PW_REQS = [
  { label: 'At least 6 characters', test: (p: string) => p.length >= 6 },
  { label: 'Contains a number',     test: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter',     test: (p: string) => /[a-zA-Z]/.test(p) },
]

const CARDS = [
  {
    id: 'emergency', color: 'red', featured: true,
    icon: Phone, badge: '24 / 7',
    title: 'Emergency Hub',
    sub: 'National Ambulance · 193',
    desc: 'One tap calls the National Ambulance Service. First-aid guides walk you through what to do while help is on the way, and your Medical ID is right there for responders.',
  },
  {
    id: 'facilities', color: 'teal',
    icon: MapPin, badge: 'GPS Live',
    title: 'Find Nearby Care',
    sub: 'Hospitals · Clinics · Pharmacies',
    desc: 'Real distances, hours, and directions — no more guessing which pharmacy is actually open right now.',
  },
  {
    id: 'symptoms', color: 'violet',
    icon: Sparkles, badge: 'Find Care',
    title: 'Not Sure Where To Go?',
    sub: 'Describe it, get matched',
    desc: 'Tell us what\'s wrong in plain language. We match you to the right kind of facility, not just the nearest one.',
  },
  {
    id: 'profile', color: 'amber',
    icon: User, badge: 'Medical ID',
    title: 'Health Profile',
    sub: 'Blood type, allergies, NHIS — one place',
    desc: 'Blood type, allergies, medical conditions, and your NHIS renewal date — ready for a responder in seconds. Share only what you\'re comfortable with.',
  },
]



const HOW_IT_WORKS = [
  { step: '01', title: 'Create your free account', desc: 'Takes about two minutes. No card, no catch.' },
  { step: '02', title: 'Add what you\'re comfortable with', desc: 'Your profile is yours. Start with a little or a lot — you can always update it later.' },
  { step: '03', title: 'Get help when you need it', desc: 'Find a clinic nearby, keep your Medical ID ready, or call 193 when seconds matter.' },
]

/* Hero carousel — the quick emotional hook, one slide per core flow.
   Shared across every breakpoint now (previously mobile-only). Chips
   mimic the app's real interface fragments rather than abstract shapes. */
const FEED = [
  {
    id: 'facilities', color: 'teal', icon: MapPin, badge: 'FIND CARE',
    title: 'Care near you, right now',
    desc: 'Live distance and hours for every hospital, clinic, and pharmacy around you.',
    chips: [{ icon: MapPin, label: 'Ridge Hospital · 1.2km' }, { icon: CheckCircle, label: 'Open now', accent: true }],
  },
  {
    id: 'symptoms', color: 'violet', icon: Sparkles, badge: 'SYMPTOM MATCH',
    title: 'Not sure where to go?',
    desc: 'Describe what\'s wrong, get matched to the right kind of care — not just the nearest one.',
    chips: [{ icon: Sparkles, label: '"Sharp stomach pain"' }, { icon: ArrowRight, label: 'Matched: Clinic', accent: true }],
  },
  {
    id: 'emergency', color: 'red', icon: Phone, badge: 'EMERGENCY',
    title: 'One tap. Real help.',
    desc: 'Calls the National Ambulance Service directly. First-aid guides while you wait.',
    chips: [{ icon: Phone, label: 'Call 193', accent: true }, { icon: Shield, label: 'Medical ID ready' }],
  },
  {
    id: 'profile', color: 'amber', icon: User, badge: 'HEALTH PROFILE',
    title: 'Everything in one place',
    desc: 'Blood type, allergies, medical conditions, NHIS card — ready for a responder in seconds.',
    chips: [{ icon: Droplet, label: 'Blood type · O+' }, { icon: Shield, label: 'NHIS · 47 days left', accent: true }],
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
  const [carouselIdx, setCarouselIdx]  = useState(0)
  const [isPaused, setIsPaused]        = useState(false)
  const [forgotOpen, setForgotOpen]    = useState(false)

  const { data: session } = useSession()
  const displayName = session?.user?.name?.split(' ')[0] ?? 'Alex Mensah'

  // Auto-advance carousel every 6s — routed through goToSlide so a manual
  // dot-click or swipe restarts the countdown instead of racing it (avoids
  // the "I just picked this slide and it immediately changed" jump), and
  // so the active dot's progress-fill animation stays in sync with the timer.
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX    = useRef<number | null>(null)

  const goToSlide = useCallback((i: number) => {
    setCarouselIdx(i)
    if (carouselTimer.current) clearInterval(carouselTimer.current)
    // A manual pick (dot click or swipe) still shouldn't resurrect the timer
    // once the user has paused it — only reschedule when actually running.
    if (!isPaused) {
      carouselTimer.current = setInterval(() => {
        setCarouselIdx(prev => (prev + 1) % FEED.length)
      }, 6000)
    }
  }, [isPaused])

  // Single source of truth for the running timer — starts/stops purely off
  // isPaused, so the WCAG 2.2.2 pause control below and the reduced-motion
  // default above both just flip this one flag instead of needing their
  // own interval-management logic.
  useEffect(() => {
    if (isPaused) return
    carouselTimer.current = setInterval(() => {
      setCarouselIdx(prev => (prev + 1) % FEED.length)
    }, 6000)
    return () => { if (carouselTimer.current) clearInterval(carouselTimer.current) }
  }, [isPaused])

  const togglePause = useCallback(() => setIsPaused(p => !p), [])

  // Swipe support — touchstart pauses the timer (so a slow swipe doesn't
  // race an auto-advance mid-gesture), touchend either commits the swipe
  // or, below the distance threshold, just restarts the countdown in place.
  const handleFeedTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    if (carouselTimer.current) clearInterval(carouselTimer.current)
  }, [])
  const handleFeedTouchEnd = useCallback((e: React.TouchEvent) => {
    const startX = touchStartX.current
    touchStartX.current = null
    if (startX === null) { goToSlide(carouselIdx); return }
    const dx = e.changedTouches[0].clientX - startX
    const SWIPE_THRESHOLD = 40
    if (dx <= -SWIPE_THRESHOLD) goToSlide((carouselIdx + 1) % FEED.length)
    else if (dx >= SWIPE_THRESHOLD) goToSlide((carouselIdx - 1 + FEED.length) % FEED.length)
    else goToSlide(carouselIdx) // tap or short drag — just restart the countdown
  }, [carouselIdx, goToSlide])

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

  // Auto-advancing content shouldn't run for people who've asked their OS
  // for reduced motion — CSS alone only strips the transition/animation,
  // the interval driving carouselIdx still fired underneath it. Default
  // to paused for that preference (and follow live OS changes to it), same
  // pattern as the light-mode listener above. Manual pause below composes
  // with this rather than fighting it.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (e: MediaQueryList | MediaQueryListEvent) => setIsPaused(e.matches)
    apply(mq)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Open the correct panel on load and clean the URL.
  // NextAuth always appends ?error=... to its error page URL — even when
  // there is no real error, it can land as ?error=undefined. We read the
  // params once, act on them, then strip them from the address bar so the
  // user never sees a dirty URL.
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    const p     = searchParams.get('panel')
    const error = searchParams.get('error')
    const isRealError = error && error !== 'undefined' && error !== 'null'

    // Open the right panel
    if (p === 'signin' || p === 'signup') setPanel(p as Panel)
    else if (isRealError)                 setPanel('signin')

    // Clean the URL — remove ?error (and ?panel when there's no callbackUrl)
    // using replaceState so there's no navigation or history entry added
    if (searchParams.has('error')) {
      const clean = new URL(window.location.href)
      clean.searchParams.delete('error')
      if (!clean.searchParams.get('callbackUrl')) {
        // No callbackUrl means the user didn't come from a protected page;
        // the panel state is already set above so we can drop it from the URL
        clean.searchParams.delete('panel')
      }
      window.history.replaceState({}, '', clean.pathname + (clean.search || ''))
    }
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

      {/* Background — contour field + the route-pulse signature lives in
          the hero itself (see .lp-signature in landing-hero.css) */}
      <div className="lp-bg" aria-hidden>
        <div className="lp-bg__field" />
        <div className="lp-bg__contours" />
      </div>

      {/* Nav — desktop / tablet. Below 640px this is hidden entirely in
          favour of .lp-mobile-mast + .lp-theme-fab: an app-style sticky
          bar reads wrong on a phone-width landing page, and Sign In /
          Get Started are already offered again in the hero CTA. */}
      <nav className="lp-nav">
        <div className="lp-brand">
          <HCLogo size={32} />
          {/* Two solid-color inline elements, not background-clip:text —
              same two-tone wordmark without the gradient-text technique. */}
          <span className="lp-brand__name"><em>Health</em>Connect</span>
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

      {/* Mobile masthead — a bold editorial wordmark, not a utility bar.
          No border, no backdrop-blur strip, nothing sticky; it sits on
          the page like the opening line of the layout. The toggle lives
          in this same row (right-aligned) rather than floating fixed in
          the corner on its own — a disconnected corner chip is the part
          that read as generic; anchoring it to the masthead composition
          reads as designed. Hidden above 640px, where .lp-nav takes over. */}
      <header className="lp-mobile-mast">
        <div className="lp-mobile-mast__brand">
          <HCLogo size={30} />
          <span className="lp-mobile-mast__name"><em>Health</em>Connect</span>
        </div>
        <button
          className="lp-theme-fab"
          onClick={toggleDarkMode}
          aria-label={mounted && isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mounted && isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero__copy">
          <div className="lp-eyebrow">
            <span className="lp-live-dot" />
            Made in Ghana &middot; Always free
          </div>
          <h1 className="lp-hero__title">
            When you need care,<br />
            <em>it shouldn&apos;t be<br />hard to find.</em>
          </h1>
          <p className="lp-hero__sub">
            Care nearby, straight answers, fast help.
          </p>

          {/* Media — the feed replaces the old phone-screenshot mockup.
              The route-pulse signature draws once behind it on load:
              "Navigator" (wayfinding) fused with vital signs into one
              line, instead of decorative blurred orbs. Lives here,
              between the sub-headline and the CTA, so it reads before
              the sign-in/up buttons on every stacked (tablet/mobile)
              layout; grid-column/grid-row placement below pulls it
              back into a second visual column on desktop regardless
              of this DOM position. */}
          <div className="lp-hero__media">
            <svg className="lp-signature" viewBox="0 0 480 480" aria-hidden focusable="false">
              <path
                className="lp-signature__path"
                d="M 10 360 Q 90 400 150 330 T 250 260 L 268 260 L 282 190 L 296 320 L 310 210 L 324 260 L 460 260"
              />
              <circle className="lp-signature__pulse" cx="460" cy="260" r="4" />
            </svg>

            <div className="lp-feed">
              <div
                className="lp-feed__stage"
                aria-live={isPaused ? 'polite' : 'off'}
                onTouchStart={handleFeedTouchStart}
                onTouchEnd={handleFeedTouchEnd}
              >
                {FEED.map((slide, i) => {
                  const Icon = slide.icon
                  return (
                    <div
                      key={slide.id}
                      className={`lp-feed__slide lp-feed__slide--${slide.color}${carouselIdx === i ? ' is-active' : ''}`}
                      aria-hidden={carouselIdx !== i}
                    >
                      <div className="lp-feed__top">
                        <div className="lp-feed__icon"><Icon size={20} /></div>
                        <span className="lp-feed__badge">{slide.badge}</span>
                      </div>
                      <div>
                        <h2 className="lp-feed__title">{slide.title}</h2>
                        <p className="lp-feed__desc">{slide.desc}</p>
                      </div>
                      <div className="lp-feed__chip-row">
                        {slide.chips.map((chip, ci) => {
                          const ChipIcon = chip.icon
                          return (
                            <span key={ci} className={`lp-feed__chip${chip.accent ? ' lp-feed__chip--accent' : ''}`}>
                              <ChipIcon size={11} />{chip.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className={`lp-feed__nav${isPaused ? ' is-paused' : ''}`}>
                {FEED.map((slide, i) => (
                  <button
                    key={slide.id}
                    className={`lp-feed__dot${carouselIdx === i ? ' is-active' : ''}`}
                    onClick={() => goToSlide(i)}
                    aria-label={`Show ${slide.title}`}
                  >
                    {/* Remounted (key=carouselIdx) every slide change — auto-advance,
                        dot-click, and swipe all route through goToSlide, so this
                        fill always restarts in step with the 6s countdown instead
                        of drifting out of sync with it. */}
                    {carouselIdx === i && (
                      <span key={carouselIdx} className={`lp-feed__dot-fill lp-feed__dot-fill--${slide.color}`} />
                    )}
                  </button>
                ))}
                {/* WCAG 2.2.2 — auto-advancing content needs a way to stop it.
                    Manual pause composes with the reduced-motion default above:
                    both just flip isPaused, so this button also reads correctly
                    (and works) for someone who arrived already paused. */}
                <button
                  type="button"
                  className="lp-feed__pause"
                  onClick={togglePause}
                  aria-pressed={isPaused}
                  aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
                >
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                </button>
              </div>
            </div>
          </div>

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
      </section>

      {/* How It Works — shared across every breakpoint now (previously
          mobile-only, desktop had no equivalent at all). A connected
          pulse-line timeline instead of blurred glass cards. */}
      <section className="lp-how" aria-label="How it works">
        <p className="lp-how__label">Getting started</p>
        <h2 className="lp-how__heading">Up and running in <em>3 steps</em></h2>
        <div className="lp-how__steps">
          {HOW_IT_WORKS.map((item, idx) => (
            <div key={item.step} className="lp-how__step">
              {idx < HOW_IT_WORKS.length - 1 && <div className="lp-how__connector" aria-hidden />}
              <div className="lp-how__num">{item.step}</div>
              <div className="lp-how__body">
                <p className="lp-how__title">{item.title}</p>
                <p className="lp-how__desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards — the "prove it" layer: more detail than the
          hero feed's quick hook, not a restatement of the same four
          one-liners. Emergency is genuinely larger here, not just a
          different border color on an identically-sized card. */}
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

      {/* Mobile closing line — emergency access is already covered by the
          hero carousel's dedicated slide, and legal/account links in the
          old footer were duplicate CTAs to the same panel the hero already
          opens. All that's left worth keeping at the bottom is enough to
          stop the page from feeling like it cuts off mid-thought. Hidden
          on tablet/desktop, where the full footer already does this job. */}
      <p className="lp-mobile-closer">© 2026 HealthConnect Navigator · Built for Ghana · Free forever</p>

      {/* Footer — desktop only */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">
                <HCLogo size={28} />
                <p className="lp-footer-logo-name">HealthConnect</p>
              </div>
              <p className="lp-footer-tagline">
                Healthcare in Ghana is hard enough. HealthConnect helps you find care, know what's wrong, and get help fast — free, always.
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
                <p className="lp-footer-nav-title">Features</p>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Find Facilities</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Symptom Match</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Emergency Hub</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Health Profile</button>
              </div>
              <div className="lp-footer-nav-group">
                <p className="lp-footer-nav-title">Account</p>
                <button className="lp-footer-nav-link" onClick={() => open('signin')} type="button">Sign In</button>
                <button className="lp-footer-nav-link" onClick={() => open('signup')} type="button">Get Started Free</button>
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
            <HCLogo size={30} />
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
              authError={(() => {
                const e = searchParams.get('error')
                if (!e || e === 'undefined' || e === 'null') return null
                // Map NextAuth error codes to friendly messages
                const map: Record<string, string> = {
                  OAuthAccountNotLinked: 'This email is already registered with a different sign-in method.',
                  OAuthSignin:           'Could not sign in with Google. Please try again.',
                  OAuthCallback:         'Google sign-in was cancelled or failed. Please try again.',
                  Signin:                'Sign-in failed. Please check your credentials.',
                  SessionRequired:       'Your session has expired. Please sign in again.',
                  AccessDenied:          'Access denied. You do not have permission to sign in.',
                  Verification:          'The sign-in link is invalid or has expired.',
                  Default:               'An authentication error occurred. Please try again.',
                }
                return map[e] ?? map['Default']
              })()}
              onForgotPassword={() => { close(); setForgotOpen(true) }}
            />
          )}
          {panel === 'signup' && (
            <SignUpForm isDark={isDarkMode} onSwitch={() => setPanel('signin')} onSuccess={onSuccess} />
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <ForgotPasswordModal
          isDark={isDarkMode}
          onClose={() => setForgotOpen(false)}
          onBackToSignIn={() => { setForgotOpen(false); open('signin') }}
        />
      )}

    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SIGN IN FORM
══════════════════════════════════════════════════════════════ */
function SignInForm({
  isDark, onSwitch, onSuccess, authError, onForgotPassword,
}: { isDark: boolean; onSwitch: () => void; onSuccess: () => void; authError?: string | null; onForgotPassword: () => void }) {
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  const handlePasskeySignIn = async () => {
    if (!email) { setError('Enter your email address first, then tap Sign in with Passkey.'); return }
    setPasskeyLoading(true); setError('')
    try {
      // 1. Get options from server
      const optRes = await fetch(`/api/auth/passkey/auth-options?email=${encodeURIComponent(email)}`)
      if (!optRes.ok) throw new Error('Failed to get passkey options')
      const options = await optRes.json()

      // 2. Prompt browser / device authenticator
      const authResponse = await startAuthentication({ optionsJSON: options })

      // 3. Verify on server
      const verRes = await fetch('/api/auth/passkey/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...authResponse, email }),
      })
      const verData = await verRes.json()
      if (!verData.verified || !verData.passkeyToken) throw new Error('Verification failed')

      // 4. Sign in via NextAuth credentials provider
      const result = await signIn('passkey', {
        redirect: false,
        passkeyToken: verData.passkeyToken,
        callbackUrl: '/dashboard',
      })
      if (result?.error) throw new Error('Sign-in failed')
      router.push(result?.url ?? '/dashboard')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Passkey sign-in failed'
      if (msg.includes('NotAllowedError') || msg.includes('cancelled')) {
        setError('Passkey sign-in was cancelled.')
      } else {
        setError(msg)
      }
    } finally {
      setPasskeyLoading(false)
    }
  }

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
      {/* Accent bar */}
      <div className="lp-form-accent-bar" aria-hidden />

      <p className="lp-form-eyebrow">Welcome back</p>
      <h2 className="lp-form-title">Sign in to your<br /><em>account</em></h2>
      <p className="lp-form-sub">Your dashboard, emergency contacts, and anything you've saved are right where you left them.</p>

      {authError && (
        <div className="lp-form-error lp-form-error--warn" role="alert">
          🔒 {authError}
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
          <div className="lp-field-label-row">
            <label className="lp-field-label">Password</label>
            <button type="button" className="lp-forgot-link" onClick={onForgotPassword}>Forgot password?</button>
          </div>
          <div className="lp-input-wrap">
            <Lock size={16} className="lp-input-icon" />
            <input type={showPw ? 'text' : 'password'} className="lp-input"
              placeholder="Enter your password" autoComplete="current-password"
              value={pw} onChange={e => setPw(e.target.value)} required />
            <button type="button" className="lp-input-toggle"
              onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
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
            : <>Sign In <ArrowRight size={16} /></>}
        </button>
      </form>

      {/* Passkey sign-in */}
      <button
        type="button"
        disabled={passkeyLoading}
        onClick={handlePasskeySignIn}
        className={`lp-passkey-btn${isDark ? ' lp-passkey-btn--dark' : ''}`}
      >
        {passkeyLoading ? (
          <span className={`lp-spinner${isDark ? ' lp-spinner--teal' : ''}`} />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M20 21a8 8 0 10-16 0"/>
            <path d="M16 11l1.5 1.5L20 10"/>
          </svg>
        )}
        {passkeyLoading ? 'Checking passkey…' : 'Sign in with Passkey'}
      </button>

      {/* Divider */}
      <div className="lp-form-divider"><span>or continue with</span></div>

      {/* Google OAuth button */}
      <button
        type="button"
        className="lp-google-btn"
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
      >
        <svg className="lp-google-btn__icon" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>

      {/* Demo credentials */}
      <div className="lp-demo">
        <div className="lp-demo__header">
          <span className="lp-demo__sparkle">✦</span>
          <p className="lp-demo__title">Demo account</p>
        </div>
        <p className="lp-demo__creds">demo@healthconnect.com · demo123</p>
        <button
          type="button"
          className="lp-demo__fill"
          onClick={() => { setEmail('demo@healthconnect.com'); setPw('demo123') }}
        >
          Fill automatically
        </button>
      </div>

      <p className="lp-switch">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch}>Create one free →</button>
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
  const [form,       setForm]       = useState({ name: '', email: '', pw: '', cpw: '', gender: '' })
  const [showPw,     setShowPw]     = useState(false)
  const [showCpw,    setShowCpw]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const [agreed,     setAgreed]     = useState(false)
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    if (error) setError('')
  }
  const reqs = PW_REQS.map(r => r.test(form.pw))

  // Passkey-first signup: no password field required at all. Still needs
  // name + email up front so the credential can be labelled and the
  // account can be found again at sign-in.
  const handlePasskeySignUp = async () => {
    if (!form.name.trim()) return setError('Please enter your full name first.')
    if (!form.email.trim()) return setError('Please enter your email address first.')
    if (!agreed) return setError('Please accept the terms to continue.')

    setPasskeyLoading(true); setError('')
    try {
      const optRes = await fetch('/api/auth/passkey/signup-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase() }),
      })
      const optData = await optRes.json()
      if (!optRes.ok) throw new Error(optData.error || 'Could not start passkey signup.')

      const regResponse = await startRegistration({ optionsJSON: optData.options })

      const verRes = await fetch('/api/auth/passkey/signup-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regResponse, signupToken: optData.signupToken }),
      })
      const verData = await verRes.json()
      if (!verRes.ok || !verData.verified || !verData.passkeyToken) {
        throw new Error(verData.error || 'Passkey signup failed.')
      }

      const result = await signIn('passkey', {
        redirect: false,
        passkeyToken: verData.passkeyToken,
        callbackUrl: '/dashboard',
      })
      if (result?.error) throw new Error('Account created, but sign-in failed. Please sign in manually.')
      setSuccess(true)
      setTimeout(onSuccess, 1600)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Passkey signup failed'
      setError(msg.includes('NotAllowedError') || msg.includes('cancelled')
        ? 'Passkey creation was cancelled.'
        : msg)
    } finally {
      setPasskeyLoading(false)
    }
  }

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
          gender:   form.gender || undefined,
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
      {/* Accent bar */}
      <div className="lp-form-accent-bar lp-form-accent-bar--signup" aria-hidden />

      <p className="lp-form-eyebrow">Get started · free</p>
      <h2 className="lp-form-title">Create your<br /><em>account</em></h2>
      <p className="lp-form-sub">Takes less than two minutes. No card, no catch — just an account.</p>

      {/* Google OAuth button */}
      <button
        type="button"
        className="lp-google-btn"
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
      >
        <svg className="lp-google-btn__icon" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign up with Google
      </button>

      {/* Divider */}
      <div className="lp-form-divider"><span>or with email</span></div>

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

        <label className="lp-terms">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>
            I agree to the{' '}
            <button
              type="button"
              onClick={e => { e.preventDefault(); setLegalModal('terms') }}
              style={{ background: 'none', border: 'none', padding: 0, color: isDark ? '#00d4ff' : '#0077aa', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline' }}
            >Terms of Service</button>
            {' '}and{' '}
            <button
              type="button"
              onClick={e => { e.preventDefault(); setLegalModal('privacy') }}
              style={{ background: 'none', border: 'none', padding: 0, color: isDark ? '#00d4ff' : '#0077aa', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline' }}
            >Privacy Policy</button>.
            My health data is encrypted and never shared.
          </span>
        </label>

        {/* Legal Modals */}
        {legalModal && (
          <LegalModal
            type={legalModal}
            isDark={isDark}
            onClose={() => setLegalModal(null)}
          />
        )}

        {/* Passkey signup — skips password entirely. Uses the name/email/
            agreement captured above; sets up its own device credential. */}
        <button
          type="button"
          disabled={passkeyLoading || !form.name.trim() || !form.email.trim() || !agreed}
          onClick={handlePasskeySignUp}
          className={`lp-passkey-btn${isDark ? ' lp-passkey-btn--dark' : ''}`}
        >
          {passkeyLoading ? (
            <span className={`lp-spinner${isDark ? ' lp-spinner--teal' : ''}`} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4"/>
              <path d="M20 21a8 8 0 10-16 0"/>
              <path d="M16 11l1.5 1.5L20 10"/>
            </svg>
          )}
          {passkeyLoading ? 'Setting up passkey…' : 'Create account with Passkey'}
        </button>
        <p className="lp-field-hint" style={{ textAlign: 'center', margin: '4px 0 16px' }}>
          No password to remember — just your device's fingerprint, face, or PIN.
        </p>

        {/* Divider */}
        <div className="lp-form-divider"><span>or set a password instead</span></div>

        {/* ── Gender selector ── */}
        <div className="lp-field">
          <label className="lp-field-label">Biological sex <span className="lp-field-label--optional">(optional)</span></label>
          <div className="lp-gender-row">
            {(['Male', 'Female', 'Other'] as const).map(g => (
              <button
                key={g}
                type="button"
                className={`lp-gender-btn${form.gender === g ? ' lp-gender-btn--active' : ''}${isDark ? ' lp-gender-btn--dark' : ''}`}
                onClick={() => setForm(p => ({ ...p, gender: p.gender === g ? '' : g }))}
              >
                {g === 'Male' ? '♂' : g === 'Female' ? '♀' : '⚥'} {g}
              </button>
            ))}
          </div>
          <p className="lp-field-hint">Used to personalise features like cycle tracking. You can change this any time in your profile.</p>
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

        {/* Trust strip above submit */}
        <div className="lp-form-trust-row">
          <span className="lp-form-trust-item"><Shield size={11} /> End-to-end encrypted</span>
          <span className="lp-form-trust-item"><CheckCircle size={11} /> Free forever</span>
        </div>

        <button
          type="submit"
          disabled={loading || !form.email || !form.name || !form.pw}
          className={`lp-submit lp-submit--signup${isDark ? ' lp-submit--dark-mode' : ''}`}
        >
          {loading
            ? <><span className={`lp-spinner${isDark ? ' lp-spinner--teal' : ' lp-spinner--dark'}`} />Creating account…</>
            : <>Create Account <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="lp-switch">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch}>Sign in →</button>
      </p>
    </>
  )
}
/* ══════════════════════════════════════════════════════════════
   LEGAL MODAL  (Terms of Service & Privacy Policy)
══════════════════════════════════════════════════════════════ */
const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using HealthConnect Navigator (the "Service"), including by creating an account, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions and our Privacy Policy, which is incorporated herein by reference.\n\nYour continued use of the Service after any modification constitutes your acceptance of the revised Terms.`,
  },
  {
    title: '2. Description of Service',
    body: `HealthConnect Navigator is a healthcare information and navigation web application designed for users in Ghana. Features include:\n\n• Healthcare facility finder (map-based hospital, clinic & pharmacy locator)\n• Health profile management (blood type, allergies, medications, conditions)\n• Medication tracking and reminders\n• Health document storage (for sharing with doctors and hospitals)\n• Emergency services hub (Ghana emergency numbers, first aid guides, one-tap calling)\n• Medical ID (shareable critical health information for first responders)\n• NHIS card storage\n• Emergency contact management\n\nThe Service is provided "as is" and may change without notice.`,
  },
  {
    title: '3. Medical Disclaimer',
    body: `IMPORTANT: HealthConnect Navigator is NOT a medical device and does NOT provide medical advice. It is NOT a substitute for professional medical diagnosis, treatment, or consultation.\n\nYou acknowledge that:\n• No doctor-patient relationship is created by your use of this Service\n• All health information is general in nature and may not apply to your circumstances\n• You should always seek qualified healthcare professional advice for any medical condition\n• You should never disregard professional medical advice because of something you read here\n• In a medical emergency, immediately call Ghana National Ambulance (193), Police (191), or go to the nearest emergency room\n\nWe expressly disclaim any liability for decisions you make based on information provided by the Service.`,
  },
  {
    title: '4. Eligibility',
    body: `To use HealthConnect Navigator, you must:\n• Be at least 13 years of age (users under 18 require parental/guardian consent)\n• Have the legal capacity to enter a binding agreement\n• Not be prohibited from using the Service under applicable laws\n• Provide accurate, current, and complete registration information`,
  },
  {
    title: '5. Account Registration & Security',
    body: `When you create an account, you agree to:\n• Provide accurate and truthful registration information\n• Keep your account credentials confidential\n• Notify us immediately at healthconnect.navigator@gmail.com if you suspect unauthorised access\n• Accept responsibility for all activities under your account\n\nPasswords are never stored in plain text — they are processed using industry-standard cryptographic hashing. You may also sign in using Google OAuth.`,
  },
  {
    title: '6. User Data & Health Information',
    body: `You may voluntarily provide health information including blood type, date of birth, weight, height, allergies, medications, medical conditions, and emergency contacts.\n\nYou retain full ownership of all health data you input. We do not claim ownership over your personal health information.\n\nYour data is used solely to provide and improve the Service. We do not sell, rent, or trade your health data to third parties for marketing or commercial purposes.\n\nYou may request deletion of your account and associated data at any time by contacting us. We will process deletion requests within 30 days.`,
  },
  {
    title: '7. Privacy & Data Protection',
    body: `Our collection, use, and protection of your personal data is governed by our Privacy Policy. Key points:\n• All data is transmitted over encrypted HTTPS connections\n• Your health data is stored in a secure database — each user can only access their own data\n• We comply with applicable data protection principles\n• We do not use your health data for advertising or profiling purposes\n\nIf you are in the EEA or UK, you may have additional rights under GDPR.`,
  },
  {
    title: '8. Emergency Services Disclaimer',
    body: `Emergency numbers, first aid guides, and emergency contact information displayed in the Service are supplementary tools only. They do NOT replace calling emergency services directly.\n\nAlways call 193 (Ambulance), 191 (Police), or 192 (Fire) in a life-threatening emergency.\n\nWe are not responsible for any harm resulting from reliance on information displayed in the Service.`,
  },
  {
    title: '9. Acceptable Use',
    body: `You agree NOT to use HealthConnect Navigator to:\n• Upload false, misleading, or fraudulent health information\n• Reverse-engineer, hack, or gain unauthorised access to the Service\n• Use automated bots or scrapers to interact with the Service\n• Violate any applicable law, regulation, or third-party rights\n• Harass, threaten, or harm other users\n• Circumvent or interfere with security or authentication features\n• Use the Service for commercial purposes without express written consent\n• Impersonate any person or healthcare professional`,
  },
  {
    title: '10. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HEALTHCONNECT NAVIGATOR AND ITS DEVELOPER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF LIFE, PERSONAL INJURY, MEDICAL COMPLICATIONS, OR LOSS OF DATA.\n\nOur total aggregate liability for all claims shall not exceed the amount you paid us in the preceding 12 months, or GHS 50, whichever is greater.`,
  },
  {
    title: '11. Governing Law',
    body: `These Terms are governed by the laws of the Republic of Ghana. The Electronic Transactions Act, 2008 (Act 772) and the Data Protection Act, 2012 (Act 843) apply where relevant.\n\nDisputes shall first be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to the jurisdiction of the courts of Ghana.`,
  },
  {
    title: '12. Contact Information',
    body: `HealthConnect Navigator\nEmail: healthconnect.navigator@gmail.com\nInstitution: University of Mines and Technology (UMaT), Tarkwa, Ghana\nProgramme: BSc Information Systems and Technology\n\nThese Terms were last updated on 21 March 2026.`,
  },
]

const PRIVACY_SECTIONS = [
  {
    title: 'Overview',
    body: `HealthConnect Navigator ("we", "us", "our") is committed to protecting your personal and health information. This Privacy Policy explains what data we collect, how we use it, how it is stored, and your rights regarding it.\n\nThis policy is effective as of 21 March 2026 and applies to all users of the HealthConnect Navigator web application.\n\nContact: healthconnect.navigator@gmail.com`,
  },
  {
    title: '1. Information We Collect',
    body: `We collect the following categories of information:\n\nAccount Information\n• Full name and email address (required for registration)\n• Profile image (optional, from Google OAuth)\n• Hashed password (we never store plain-text passwords)\n• Password reset tokens (temporary, time-limited)\n\nHealth Profile Data (all voluntary)\n• Blood type, date of birth, weight, height, gender, BMI\n• Allergies (name, severity, reaction type)\n• Medications (name, dose, frequency, start date, notes)\n• Medical conditions (name, status, diagnosed year, notes)\n• Family member health records (name, relation, age, blood type)\n• Medication reminders (time, schedule, dose)\n\nEmergency Information\n• Emergency contact details (name, relationship, phone number, email)\n\nApp Usage Data\n• Activity log (actions taken in the app, with timestamps)\n• Saved facilities (name, type, address, GPS coordinates at time of save)\n\nAuthentication Data\n• OAuth tokens (when signing in with Google)\n• Session tokens (to keep you signed in)`,
  },
  {
    title: '2. How We Use Your Information',
    body: `Your data is used exclusively to provide and improve the Service:\n\n• To create and manage your account\n• To display your health profile, Medical ID, and health score\n• To power personalised first aid guides (e.g. allergy action plans)\n• To show nearby healthcare facilities on the map\n• To log your app activity for your own review\n\nWe do NOT use your data for:\n• Advertising or marketing\n• Selling or trading with third parties\n• Profiling or behavioural tracking\n• Any purpose unrelated to the Service`,
  },
  {
    title: '3. Location Data',
    body: `Location (GPS coordinates) is only used for Facility Search — your location is used in real-time to find nearby hospitals, clinics, and pharmacies. It is not stored on our servers.\n\nWe do not track your location continuously or in the background.`,
  },
  {
    title: '4. Data Storage & Security',
    body: `All data is stored in a secure PostgreSQL database. Security measures include:\n\n• HTTPS encryption for all data in transit\n• Passwords are hashed using industry-standard cryptography — never stored in plain text\n• Database queries are filtered by user ID — you can never access another user's data\n• OAuth tokens (Google sign-in) are managed by NextAuth.js\n• The application is hosted on Vercel, which enforces HTTPS and provides infrastructure-level security\n\nOffline access: Your Medical ID and emergency numbers are cached locally on your device so that first responders can access them even without internet connectivity.`,
  },
  {
    title: '5. Data Sharing',
    body: `We do not sell, rent, or trade your personal or health data to any third party.\n\nYour data may be shared only in these limited circumstances:\n\n• With service providers strictly as necessary to operate the app\n• If required by law, court order, or government authority in Ghana\n\nWe will never share your health data with advertisers, data brokers, insurance companies, or employers.`,
  },
  {
    title: '6. Your Rights',
    body: `You have the following rights regarding your data:\n\n• Access — you can view all your stored data within the app\n• Correction — you can update your health profile at any time\n• Deletion — you can request full account and data deletion by emailing healthconnect.navigator@gmail.com. We will process requests within 30 days.\n• Portability — you may request an export of your data\n\nIf you are in the European Economic Area (EEA) or United Kingdom, you have additional rights under GDPR, including the right to object to processing and to lodge a complaint with a supervisory authority.\n\nAll Ghanaian users are protected under the Data Protection Act, 2012 (Act 843).`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your data for as long as your account is active.\n\nUpon account deletion:\n• Your health profile, medications, allergies, conditions, and family records are deleted\n• Your emergency contacts are deleted\n• Your saved facilities and activity log are deleted\n• Authentication tokens and sessions are invalidated\n\nCertain data may be retained for a limited period if required by law.`,
  },
  {
    title: '8. Children\'s Privacy',
    body: `HealthConnect Navigator is not intended for children under 13. Users aged 13–17 must have parental or guardian consent before using the Service.\n\nIf we become aware that we have collected personal data from a child under 13 without verifiable parental consent, we will delete that data promptly. Please contact us at healthconnect.navigator@gmail.com if you believe this has occurred.`,
  },
  {
    title: '9. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date and display a notice within the app.\n\nYour continued use of the Service after changes take effect constitutes your acceptance of the updated policy.`,
  },
  {
    title: '10. Contact Us',
    body: `If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact:\n\nHealthConnect Navigator\nEmail: healthconnect.navigator@gmail.com\nInstitution: University of Mines and Technology (UMaT), Tarkwa, Ghana\n\nThis Privacy Policy was last updated on 21 March 2026.`,
  },
]

function LegalModal({
  type, isDark, onClose,
}: { type: 'terms' | 'privacy'; isDark: boolean; onClose: () => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const sections  = type === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS
  const title     = type === 'terms' ? 'Terms of Service' : 'Privacy Policy'
  const subtitle  = type === 'terms'
    ? 'Effective 21 March 2026 · Version 2.0'
    : 'Effective 21 March 2026 · HealthConnect Navigator'
  const accentCol = isDark ? '#00d4ff' : '#0077aa'

  // Escape key closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Scroll to top when switching type
  useEffect(() => { bodyRef.current?.scrollTo(0, 0); setOpenIdx(null) }, [type])

  const bg        = isDark ? '#07101f'               : '#ffffff'
  const surface   = isDark ? 'rgba(255,255,255,.04)' : '#f8fafc'
  const border    = isDark ? 'rgba(255,255,255,.08)' : '#e2e8f0'
  const titleCol  = isDark ? '#eef4ff'               : '#0a1628'
  const subCol    = isDark ? 'rgba(255,255,255,.46)' : '#64748b'
  const bodyCol   = isDark ? 'rgba(255,255,255,.78)' : '#334155'
  const hdrHover  = isDark ? 'rgba(0,212,255,.07)'   : 'rgba(0,119,170,.06)'

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'lp-legal-fade .18s ease',
        }}
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9001,
          width: 'min(680px, 96vw)',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          background: bg,
          borderRadius: '20px',
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? '0 32px 80px rgba(0,0,0,.70), 0 0 0 1px rgba(0,212,255,.08)'
            : '0 32px 80px rgba(0,0,0,.22)',
          animation: 'lp-legal-in .22s cubic-bezier(.22,1,.36,1)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
          flexShrink: 0,
        }}>
          <div>
            {/* Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '2px', borderRadius: '2px', background: `linear-gradient(90deg,${accentCol},transparent)` }} />
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '2px', color: accentCol, fontFamily: "'DM Sans', sans-serif" }}>
                Legal document
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 400, color: titleCol, letterSpacing: '-.5px', fontFamily: "'DM Serif Display', serif" }}>
              {title}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: subCol, fontFamily: "'DM Sans', sans-serif" }}>
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0,
              width: '34px', height: '34px',
              borderRadius: '50%', border: `1px solid ${border}`,
              background: isDark ? 'rgba(255,255,255,.06)' : '#f1f5f9',
              color: subCol, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Intro banner ── */}
        <div style={{
          margin: '16px 20px 0',
          padding: '12px 16px',
          borderRadius: '10px',
          background: isDark ? 'rgba(0,212,255,.06)' : 'rgba(0,119,170,.06)',
          border: `1px solid ${isDark ? 'rgba(0,212,255,.14)' : 'rgba(0,119,170,.14)'}`,
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <Shield size={14} style={{ color: accentCol, flexShrink: 0, marginTop: '1px' }} />
          <p style={{ margin: 0, fontSize: '12px', color: bodyCol, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
            {type === 'terms'
              ? 'By creating an account you agree to these Terms. HealthConnect Navigator is a health information tool — not a medical device. Always consult a qualified healthcare professional for medical decisions.'
              : 'We collect only what is needed to provide the Service. Your health data is encrypted, never sold, and only visible to you. You can delete your data at any time.'
            }
          </p>
        </div>

        {/* ── Scrollable accordion body ── */}
        <div
          ref={bodyRef}
          style={{
            flex: 1, overflowY: 'auto', padding: '16px 20px 24px',
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? 'rgba(255,255,255,.12) transparent' : 'rgba(0,0,0,.12) transparent',
          }}
        >
          {sections.map((sec, i) => {
            const isOpen = openIdx === i
            return (
              <div
                key={i}
                style={{
                  marginBottom: '6px',
                  borderRadius: '12px',
                  border: `1px solid ${isOpen ? (isDark ? 'rgba(0,212,255,.20)' : 'rgba(0,119,170,.20)') : border}`,
                  overflow: 'hidden',
                  transition: 'border-color .15s',
                }}
              >
                {/* Section header / accordion trigger */}
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '13px 16px',
                    background: isOpen ? (isDark ? 'rgba(0,212,255,.07)' : 'rgba(0,119,170,.06)') : surface,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    transition: 'background .15s',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = hdrHover }}
                  onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = surface }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: isOpen ? accentCol : titleCol }}>
                    {sec.title}
                  </span>
                  <span style={{
                    flexShrink: 0, width: '18px', height: '18px',
                    borderRadius: '50%',
                    background: isOpen ? accentCol : (isDark ? 'rgba(255,255,255,.10)' : '#e2e8f0'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform .2s, background .15s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 3.5L5 6.5L8 3.5" stroke={isOpen ? (isDark ? '#050e1d' : '#fff') : subCol} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>

                {/* Section body */}
                {isOpen && (
                  <div style={{
                    padding: '14px 16px 16px',
                    background: isDark ? 'rgba(255,255,255,.02)' : '#fafbfc',
                    borderTop: `1px solid ${border}`,
                  }}>
                    {sec.body.split('\n').map((line, li) => (
                      line === '' ? (
                        <div key={li} style={{ height: '8px' }} />
                      ) : line.startsWith('•') ? (
                        <div key={li} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ color: accentCol, flexShrink: 0, fontSize: '13px', lineHeight: '20px' }}>•</span>
                          <p style={{ margin: 0, fontSize: '12.5px', color: bodyCol, lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
                            {line.slice(1).trim()}
                          </p>
                        </div>
                      ) : /^[A-Z].*\n/.test(line) || (li > 0 && sec.body.split('\n')[li - 1] === '' && !line.startsWith('•')) ? (
                        <p key={li} style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: titleCol, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' as const, letterSpacing: '.5px' }}>
                          {line}
                        </p>
                      ) : (
                        <p key={li} style={{ margin: 0, fontSize: '12.5px', color: bodyCol, lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
                          {line}
                        </p>
                      )
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 16px 16px',
          borderTop: `1px solid ${border}`,
          display: 'flex', flexDirection: 'column', gap: '10px',
          flexShrink: 0,
          background: isDark ? 'rgba(255,255,255,.02)' : '#fafbfc',
        }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: '12px', border: 'none',
              background: isDark ? 'linear-gradient(135deg,#0099cc,#00d4ff)' : '#0a1628',
              color: isDark ? '#050e1d' : '#fff',
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              letterSpacing: '-.2px',
            }}
          >
            <CheckCircle size={16} /> I understand, close
          </button>
          <p style={{ margin: 0, fontSize: '10.5px', color: subCol, fontFamily: "'DM Sans', sans-serif", textAlign: 'center' as const }}>
            © 2026 HealthConnect Navigator · All rights reserved
          </p>
        </div>
      </div>

      <style>{`
        @keyframes lp-legal-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lp-legal-in {
          from { opacity: 0; transform: translate(-50%, -47%) scale(.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>,
    document.body
  )
}

/* ══════════════════════════════════════════════════════════════
   FORGOT PASSWORD MODAL
══════════════════════════════════════════════════════════════ */
function ForgotPasswordModal({
  isDark, onClose, onBackToSignIn,
}: { isDark: boolean; onClose: () => void; onBackToSignIn: () => void }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError('Please enter your email address.')

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const dark = isDark
  const panelBg    = dark ? '#0a1525'  : '#ffffff'
  const titleColor = dark ? '#eef4ff'  : '#0a1628'
  const subColor   = dark ? 'rgba(255,255,255,.50)' : '#64748b'
  const borderColor = dark ? 'rgba(255,255,255,.10)' : '#e2e8f0'
  const inputBg    = dark ? 'rgba(255,255,255,.05)' : '#fafbfc'
  const inputColor = dark ? '#eef4ff'  : '#1e293b'
  const iconColor  = dark ? 'rgba(255,255,255,.32)' : '#94a3b8'
  const submitBg   = dark ? 'linear-gradient(135deg,#0099cc,#00d4ff)' : '#0a1628'
  const submitColor = '#ffffff'
  const backdropBg = dark ? 'rgba(3,8,20,.82)' : 'rgba(180,200,228,.60)'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: backdropBg,
          backdropFilter: 'blur(6px)',
          animation: 'lp-rise .2s ease',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reset your password"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 210,
          width: 'min(440px, calc(100vw - 32px))',
          background: panelBg,
          borderRadius: '20px',
          boxShadow: '0 32px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(0,212,255,.10)',
          overflow: 'hidden',
          animation: 'lp-modal-in .28s cubic-bezier(.32,.72,0,1)',
        }}
      >
        {/* Accent bar */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg,#0099cc,#00d4ff,rgba(0,212,255,.15))' }} />

        <div style={{ padding: '32px 36px 36px' }}>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: '18px', right: '18px',
              width: '32px', height: '32px', borderRadius: '50%',
              background: dark ? 'rgba(255,255,255,.07)' : '#f1f5f9',
              border: dark ? '1px solid rgba(255,255,255,.08)' : 'none',
              color: dark ? 'rgba(255,255,255,.50)' : '#64748b',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', lineHeight: 1,
            }}
          >
            <X size={15} />
          </button>

          {sent ? (
            /* ── Sent confirmation ── */
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(0,212,255,.08)', border: '2px solid rgba(0,212,255,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', color: '#00a8cc',
              }}>
                <CheckCircle size={28} />
              </div>
              <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 700, color: titleColor, letterSpacing: '-0.4px' }}>
                Check your inbox
              </h2>
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: subColor, lineHeight: 1.65 }}>
                If <strong style={{ color: titleColor }}>{email}</strong> has an account, a reset link is on its way. Check your spam folder too.
              </p>
              <p style={{ margin: '0 0 28px', fontSize: '12.5px', color: dark ? 'rgba(255,255,255,.30)' : '#94a3b8' }}>
                The link expires in 1 hour.
              </p>
              <button
                type="button"
                onClick={onBackToSignIn}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '12px 28px', borderRadius: '11px', border: 'none',
                  background: dark ? 'linear-gradient(135deg,#0099cc,#00d4ff)' : '#0a1628',
                  color: dark ? '#050e1d' : '#fff',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Back to Sign In <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            /* ── Email form ── */
            <>
              {/* Eyebrow */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
                <span style={{ display: 'inline-block', width: '18px', height: '2px', borderRadius: '2px', background: 'linear-gradient(90deg,#00a8cc,rgba(0,168,204,.30))' }} />
                <span style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '2px', color: '#00a8cc' }}>
                  Account recovery
                </span>
              </div>

              <h2 style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: 400, color: titleColor, letterSpacing: '-1px', lineHeight: 1.1, fontFamily: "'DM Serif Display', serif" }}>
                Forgot your<br /><em style={{ fontStyle: 'italic', color: dark ? '#00d4ff' : '#0077aa' }}>password?</em>
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: subColor, lineHeight: 1.7, borderLeft: `2px solid ${dark ? 'rgba(0,212,255,.20)' : 'rgba(0,168,204,.22)'}`, paddingLeft: '10px' }}>
                Enter your account email and we'll send you a link to reset your password.
              </p>

              {error && (
                <div style={{
                  padding: '11px 14px', background: dark ? 'rgba(255,77,109,.09)' : '#fff1f2',
                  border: `1px solid ${dark ? 'rgba(255,77,109,.28)' : 'rgba(255,77,109,.28)'}`,
                  borderLeft: '3px solid #ff4d6d',
                  borderRadius: '10px', color: dark ? '#ff8099' : '#be123c',
                  fontSize: '13px', lineHeight: 1.5, marginBottom: '18px',
                  display: 'flex', gap: '8px',
                }}>
                  ⚠ {error}
                </div>
              )}

              <form onSubmit={submit} noValidate>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: dark ? 'rgba(255,255,255,.78)' : '#1e293b' }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '13px', color: iconColor, pointerEvents: 'none', flexShrink: 0 }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); if (error) setError('') }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      required
                      style={{
                        width: '100%', padding: '12px 12px 12px 42px',
                        border: `1.5px solid ${borderColor}`,
                        borderRadius: '11px', fontSize: '13.5px',
                        fontFamily: "'DM Sans', sans-serif",
                        color: inputColor, background: inputBg,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: '12px', border: 'none',
                    fontFamily: "'DM Sans', sans-serif", fontSize: '14.5px', fontWeight: 700,
                    background: submitBg, color: submitColor,
                    cursor: (loading || !email) ? 'not-allowed' : 'pointer',
                    opacity: (loading || !email) ? 0.45 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                  }}
                >
                  {loading
                    ? <><span style={{ display: 'inline-block', width: '16px', height: '16px', border: `2px solid ${dark ? 'rgba(5,14,29,.22)' : 'rgba(255,255,255,.28)'}`, borderTopColor: dark ? '#050e1d' : '#fff', borderRadius: '50%', animation: 'lp-spin .7s linear infinite' }} />Sending…</>
                    : <>Send reset link <ArrowRight size={16} /></>
                  }
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: dark ? 'rgba(255,255,255,.38)' : '#64748b' }}>
                Remember it?{' '}
                <button
                  type="button"
                  onClick={onBackToSignIn}
                  style={{ background: 'none', border: 'none', color: dark ? '#00d4ff' : '#0a1628', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", padding: 0 }}
                >
                  Back to sign in
                </button>
              </p>
            </>
          )}

        </div>
      </div>

      <style>{`
        @keyframes lp-modal-in {
          from { opacity: 0; transform: translate(-50%, -46%) scale(.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  )
}