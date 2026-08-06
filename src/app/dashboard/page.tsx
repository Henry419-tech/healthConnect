'use client'

// src/app/dashboard/page.tsx
//
// Dashboard — focused launchpad. HEALTHNAV handoff Section 10.
//
// This replaces the old vitals/health-score/adherence-heavy dashboard.
// Everything cut here (health score ring, risk assessment, medication
// adherence) was removed from the codebase — see Section 2 "What Was
// Cut and Why" in the handoff doc. The activity feed lives on, just not
// here: it's reachable via Profile → My Activity → "View all" (/dashboard/activities).
// See Section 2 "What Was Cut and Why".

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { getTimeBasedGreeting } from '@/lib/utils';
import MobTabBar from '@/components/MobTabBar';
import DashboardLayout from '@/components/DashboardLayout';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/contexts/NotificationsContext';
import type { HealthAlert } from '@/lib/notifications/types';
import { HEALTH_TIPS, pickHealthTip } from '@/lib/healthTips';
import '@/styles/dashboard-header.css';
import '@/styles/dashboard.css';
import '@/styles/dashboard-mobile.css';
import '@/styles/footer.css';
import '@/styles/language.css';
import '@/styles/dashboard-launchpad.css';
import {
  Heart, MapPin, Bell, Moon, Sun, Lightbulb, Stethoscope, ShieldAlert,
  ShieldCheck, ChevronRight, Phone, Navigation as NavigationIcon,
  AlertTriangle, Building2, Calendar, X, ArrowRight,
  HeartPulse, Flame, Siren, Clock,
  Hospital, Smile, Eye, Ear, Pill, Microscope, Baby, Brain, CreditCard,
} from 'lucide-react';

const MobTopbarMenu = dynamic(() => import('@/components/MobTopbarMenu'), { ssr: false });

/* ── HC logo (matches DashboardHeader / old dashboard mark) ─────── */
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
);

/* ── Static fallbacks ─────────────────────────────────────────────── */

// NHIS rotating tip — one per day, cycling through this list. Static,
// no API — see Section 10 "NHIS card".
const NHIS_TIPS = [
  'Your NHIS card must be presented before treatment at any accredited facility, so always carry it or know your ID number.',
  'Normal delivery and maternal care are free for pregnant women registered with NHIS.',
  'Children under 18 registered under a parent or guardian are covered automatically.',
  'NHIS must be renewed every year, since an expired card means paying full cost at the point of care.',
  'Most prescribed medicines on the NHIS Medicines List are covered, so ask the pharmacy if a drug is on the list.',
  'Persons aged 70 and above are exempt from paying NHIS premiums.',
  'Emergency care is covered at any NHIS accredited facility nationwide, not just your registered one.',
  'Not every facility is NHIS accredited, so check before you travel there if avoiding extra cost at the point of care matters to you.',
];

const NHIS_HOTLINE = '0544446447'; // NHIA call centre, per nhis.gov.gh/contact

interface LocationInfo { city?: string; region?: string; }
interface SavedFacility {
  id: string; facilityId: string; name: string; type: string;
  phone?: string | null; latitude: number; longitude: number;
  city?: string | null; region?: string | null;
}
interface RecentlyViewedFacility {
  id: string; title: string; createdAt: string;
  metadata?: { facilityId?: string; lat?: number; lng?: number; type?: string } | null;
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

// ── Health tip rotation ──────────────────────────────────────────────
// Static pool (src/lib/healthTips.ts), no API call. Rotates on:
//   - every new login/session (sessionStorage empty)
//   - after TIP_ROTATE_MS has passed since the current tip was picked,
//     even mid-session, so a tab left open for a long stretch still
//     sees the tip change (checked on an interval — see the effect).

const TIP_STORAGE_KEY   = 'hc-health-tip';
const TIP_HISTORY_KEY   = 'hc-health-tip-history';
const TIP_SESSION_KEY   = 'hc-health-tip-session';
const TIP_ROTATE_MS     = 12 * 60 * 60 * 1000; // 12h
const TIP_CHECK_MS      = 15 * 60 * 1000;      // re-check every 15 min while mounted

interface StoredTip { id: string; text: string; shownAt: number; }

function readStoredTip(): StoredTip | null {
  try {
    const raw = localStorage.getItem(TIP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTip;
  } catch { return null; }
}

function writeStoredTip(tip: StoredTip) {
  try { localStorage.setItem(TIP_STORAGE_KEY, JSON.stringify(tip)); } catch { /* localStorage blocked */ }
}

// Ids of tips already shown in the current cycle, so pickHealthTip can
// draw only from the ones the user hasn't seen yet. Reset once the
// whole pool has had a turn (see rotateIfDue below).
function readTipHistory(): string[] {
  try {
    const raw = localStorage.getItem(TIP_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeTipHistory(ids: string[]) {
  try { localStorage.setItem(TIP_HISTORY_KEY, JSON.stringify(ids)); } catch { /* localStorage blocked */ }
}

const TYPE_ICON = { public_health: AlertTriangle, facility: Building2, calendar: Calendar, nhis_expiry: CreditCard } as const;

function alertColor(alert: HealthAlert): 'red' | 'amber' | 'teal' | 'violet' {
  if (alert.type === 'facility') return 'teal';
  if (alert.type === 'calendar') return 'violet';
  if (alert.severity === 'critical') return 'red';
  if (alert.severity === 'warning') return 'amber';
  return 'teal';
}

/* ── Hero card icon rotation — cycles through the facility types
   /facilities searches for, using the same icon + accent color per
   type already established in facilities.css's saved-chip dots, so
   the dashboard stays visually consistent with the rest of the app. */
const HERO_ICON_ROTATION = [
  { Icon: Stethoscope, color: 'var(--hc-teal)' },   // clinic
  { Icon: Hospital,    color: 'var(--hc-red)' },     // hospital
  { Icon: Eye,         color: '#a78bfa' },           // eye care
  { Icon: Microscope,  color: '#818cf8' },           // lab
  { Icon: Pill,        color: 'var(--hc-mint)' },    // pharmacy
  { Icon: Smile,       color: '#fbbf24' },           // dental
  { Icon: Ear,         color: '#f472b6' },           // ENT
  { Icon: Baby,        color: '#fda4af' },           // maternity
  { Icon: Brain,       color: '#2dd4bf' },           // mental health
];

const Dashboard: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t } = useTranslation();
  const { open: openNotifications } = useNotifications();

  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // ── Hero card icon rotation — cycles the "Find a Facility" icon/color
  // through the facility types below, so the card hints at the variety
  // of places it searches rather than implying "stethoscope = clinics only".
  const [heroIconIndex, setHeroIconIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setHeroIconIndex(i => (i + 1) % HERO_ICON_ROTATION.length);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  /* ── Location (GPS → reverse geocode, silent fallback) ──────────── */
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [locationReady, setLocationReady] = useState(false); // true once we've tried, success or not

  useEffect(() => {
    if (!('geolocation' in navigator)) { setLocationReady(true); return; }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          if (!res.ok) throw new Error('geocode failed');
          const data = await res.json();
          if (!cancelled) setLocationInfo({ city: data.city, region: data.region });
        } catch {
          /* silent — greeting just omits the location line */
        } finally {
          if (!cancelled) setLocationReady(true);
        }
      },
      () => { if (!cancelled) setLocationReady(true); }, // permission denied / unavailable
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
    return () => { cancelled = true; };
  }, []);

  /* ── Health tip (static pool, Section 3.1's old "AI Health Insight" slot) ─
     No network call. Rotates on a new login/session, and again every
     TIP_CHECK_MS while the tab stays open past TIP_ROTATE_MS. */
  const [healthTip, setHealthTip] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    function rotateIfDue(forceNew: boolean) {
      const stored  = readStoredTip();
      const expired = !stored || (Date.now() - stored.shownAt > TIP_ROTATE_MS);

      if (!forceNew && stored && !expired) {
        setHealthTip(stored.text);
        return;
      }

      const history = readTipHistory();
      const next = pickHealthTip(history);

      // Once every tip in the pool has been shown, start a fresh cycle
      // instead of growing the history list forever.
      const cycleComplete = history.length + 1 >= HEALTH_TIPS.length;
      writeTipHistory(cycleComplete ? [next.id] : [...history, next.id]);

      setHealthTip(next.text);
      writeStoredTip({ id: next.id, text: next.text, shownAt: Date.now() });
    }

    const isNewSession = !sessionStorage.getItem(TIP_SESSION_KEY);
    if (isNewSession) sessionStorage.setItem(TIP_SESSION_KEY, '1');
    rotateIfDue(isNewSession);

    const interval = setInterval(() => rotateIfDue(false), TIP_CHECK_MS);
    return () => clearInterval(interval);
  }, [status]);

  /* ── Most recent active alert (top lane of Health Updates card) ──── */
  const [latestAlert, setLatestAlert] = useState<HealthAlert | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/health-alerts')
      .then(r => r.json())
      .then(d => { if (!cancelled) setLatestAlert(d.alerts?.[0] ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* ── Saved & recent facilities ────────────────────────────────────── */
  const [savedFacilities, setSavedFacilities] = useState<SavedFacility[] | null>(null);
  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/saved-facilities')
      .then(r => r.json())
      .then(d => { if (!cancelled) setSavedFacilities(d.facilities ?? []); })
      .catch(() => { if (!cancelled) setSavedFacilities([]); });
    return () => { cancelled = true; };
  }, [status]);

  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedFacility[] | null>(null);
  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/activities?type=facility_found&limit=5')
      .then(r => r.json())
      .then(d => { if (!cancelled) setRecentlyViewed(d.activities ?? []); })
      .catch(() => { if (!cancelled) setRecentlyViewed([]); });
    return () => { cancelled = true; };
  }, [status]);

  const savedFacilitiesTop3 = (savedFacilities ?? []).slice(0, 3);
  const savedFacilityIds = new Set(savedFacilitiesTop3.map(f => f.facilityId));
  // Recently viewed, excluding anything already shown in the saved list — up to 2.
  const recentlyViewedTop2 = (recentlyViewed ?? [])
    .filter(a => !savedFacilityIds.has(a.metadata?.facilityId || ''))
    .slice(0, 2);
  const savedAndRecentLoading = savedFacilities === null || recentlyViewed === null;
  const hasSavedOrRecent = savedFacilitiesTop3.length > 0 || recentlyViewedTop2.length > 0;

  /* ── NHIS modal ───────────────────────────────────────────────────── */
  const [showNhisModal, setShowNhisModal] = useState(false);

  const openDirections = useCallback((lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/${lat},${lng}`, '_blank');
  }, []);

  if (status === 'loading') return (
    <div className="hc-loading">
      <div className="hc-loading__mark"><Heart size={26} /></div>
      <div className="hc-loading__brand">
        <span className="hc-loading__name">HealthConnect</span>
        <span className="hc-loading__sub">Navigator</span>
      </div>
      <div className="hc-loading__dots"><span /><span /><span /></div>
    </div>
  );
  if (status === 'unauthenticated') return null;

  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || null;
  // getTimeBasedGreeting() gives the English default; t() swaps in the Twi
  // translation when available (tw.json already has greetingMorning/
  // Afternoon/Evening — see LanguageContext).
  const now = new Date();
  const hourNow = now.getHours();
  const greetingKey = hourNow < 12 ? 'greetingMorning'
    : hourNow < 17 ? 'greetingAfternoon' : 'greetingEvening';
  const greeting = t(`dashboard.${greetingKey}`, getTimeBasedGreeting());
  // Grounding date line above the greeting — "Thursday, 16 July".
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const userImage = session?.user?.image || null;
  const userInitials = (session?.user?.name || 'HC')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const nhisTip = NHIS_TIPS[dayOfYear() % NHIS_TIPS.length];

  return (
    <DashboardLayout activeTab="/dashboard" className="hc-layout--has-mob-topbar">

      {/* ── Fixed background layer — pattern + tint stay pinned to the
           viewport while everything else scrolls over it. A real
           position:fixed element, not background-attachment:fixed
           (unreliable on iOS Safari) and not the old body:has(.db-page)
           pseudo-elements either — those turned out to be sitting behind
           .hc-layout's own opaque background the whole time and were
           never actually visible. Same fix as Emergency's .em-bg-fixed
           and Profile's .pr-bg-fixed. ── */}
      <div className="db-bg-fixed" aria-hidden="true" />

      {/* ══ STICKY DESKTOP TOP BAR ══════════════════════════════════ */}
      <div className={`db-topbar${isScrolled ? ' db-topbar--scrolled' : ''}`}>
        <div className="dbh-topbar-brand">
          <HCLogo size={26} />
          <span className="dbh-topbar-brand__text">HealthConnect</span>
        </div>
        <div className="db-topbar__right">
          <button className="db-topbar__icon-btn" type="button" onClick={toggleDarkMode} aria-label="Toggle theme">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationBell
            className="db-topbar__icon-btn db-topbar__notif"
            dotClassName="db-topbar__notif-dot"
            aria-label="Notifications"
          />
          <button className="db-topbar__user" type="button" onClick={() => router.push('/profile')} title="Go to Profile & Settings">
            <div className="db-topbar__user-avatar">
              {userImage ? <img src={userImage} alt={session?.user?.name || ''} referrerPolicy="no-referrer" /> : userInitials}
            </div>
            <div className="db-topbar__user-info">
              <span className="db-topbar__user-name">{session?.user?.name || 'Profile'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* ══ MOBILE TOP BAR ═══════════════════════════════════════════ */}
      <div className="mob-topbar">
        <div className="mob-topbar__left">
          <HCLogo size={30} />
          <span className="mob-topbar__logo-text">HealthConnect</span>
        </div>
        <div className="mob-topbar__right">
          <MobTopbarMenu />
        </div>
      </div>

      <MobTabBar currentPath="/dashboard" />

      <div className="db-page dbh-page">

        {/* ── Greeting ─────────────────────────────────────────────── */}
        <div className="db-page-header dbh-greeting-row">
          <button
            className="dbh-greeting-avatar-btn"
            type="button"
            onClick={() => router.push('/profile')}
            aria-label="Go to Profile"
          >
            <span className="dbh-greeting-avatar">
              {userImage ? <img src={userImage} alt={session?.user?.name || ''} referrerPolicy="no-referrer" /> : userInitials}
            </span>
            <span
              className="dbh-greeting-avatar__badge"
              role="button"
              tabIndex={0}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={(e) => { e.stopPropagation(); toggleDarkMode(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleDarkMode(); } }}
              suppressHydrationWarning
            >
              {isDarkMode ? <Moon size={11} suppressHydrationWarning /> : <Sun size={11} suppressHydrationWarning />}
            </span>
          </button>
          <div className="dbh-greeting-text">
            <p className="dbh-greeting-date">{dateLabel}</p>
            <h1 className="db-page-header__greeting">
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </h1>
            {locationInfo?.city && (
              <p className="db-page-header__context">
                <MapPin size={12} />
                {locationInfo.city}{locationInfo.region ? `, ${locationInfo.region}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* ── Quick actions: Find Care is the primary hero action,
             Emergency is a persistent but quieter rail underneath ── */}
        <div className="dbh-quick-actions">
          <button
            className="dbh-hero-card"
            type="button"
            onClick={() => router.push('/find-care')}
          >
            <span className="dbh-hero-card__rings" aria-hidden="true"><span /><span /></span>
            <span
              className="dbh-hero-card__icon"
              style={{ '--hero-icon-color': HERO_ICON_ROTATION[heroIconIndex].color } as React.CSSProperties}
            >
              <span key={heroIconIndex} className="dbh-hero-card__icon-swap">
                {React.createElement(HERO_ICON_ROTATION[heroIconIndex].Icon, { size: 24 })}
              </span>
            </span>
            <span className="dbh-hero-card__body">
              <span className="dbh-hero-card__label">{t('dashboard.findFacility', 'Find Care')}</span>
              <span className="dbh-hero-card__sub">{t('dashboard.findFacilitySub', 'Clinics, hospitals, pharmacies & more near you')}</span>
            </span>
            <span className="dbh-hero-card__arrow"><ArrowRight size={18} /></span>
          </button>
          <button
            className="dbh-emergency-rail"
            type="button"
            onClick={() => router.push('/emergency')}
          >
            <span className="dbh-emergency-rail__icon"><ShieldAlert size={19} /></span>
            <span className="dbh-emergency-rail__body">
              <span className="dbh-emergency-rail__label">{t('dashboard.emergency', 'Emergency')}</span>
              <span className="dbh-emergency-rail__sub">{t('dashboard.emergencySub', 'Call emergency services, first aid & your emergency brief')}</span>
            </span>
            <span className="dbh-emergency-rail__dot" aria-hidden="true" />
            <span className="dbh-emergency-rail__arrow"><ArrowRight size={16} /></span>
          </button>
        </div>

        {/* ── Health Updates card (alerts lane + daily tip lane, ONE card) ─ */}
        <div>
        <p className="dbh-eyebrow">{t('dashboard.healthUpdates', 'Health updates')}</p>
        <div className="dbh-updates-card">
          {latestAlert && (
            <>
              <button
                className={`dbh-updates-card__alert dbh-updates-card__alert--${alertColor(latestAlert)}`}
                type="button"
                onClick={openNotifications}
              >
                <span className="dbh-updates-card__alert-icon">
                  {(() => { const Icon = TYPE_ICON[latestAlert.type]; return <Icon size={15} />; })()}
                </span>
                <span className="dbh-updates-card__alert-text">
                  <span className="dbh-updates-card__alert-title">{latestAlert.title}</span>
                  <span className="dbh-updates-card__alert-body">{latestAlert.body}</span>
                </span>
                <span className="dbh-updates-card__alert-cta">
                  View all <ChevronRight size={13} />
                </span>
              </button>
              <div className="dbh-updates-card__divider" />
            </>
          )}

          <div className="dbh-updates-card__tip">
            <span className="dbh-updates-card__tip-badge">
              <Lightbulb size={12} /> {t('dashboard.aiHealthTip', 'Daily Health Tips')}
            </span>
            <p className="dbh-updates-card__tip-text">
              {healthTip ?? HEALTH_TIPS[dayOfYear() % HEALTH_TIPS.length].text}
            </p>
          </div>
        </div>
        </div>

        {/* ── NHIS card ────────────────────────────────────────────── */}
        <div>
        <p className="dbh-eyebrow">{t('dashboard.nhisCoverage', 'NHIS coverage')}</p>
        <div className="dbh-nhis-card">
          <div className="dbh-nhis-card__head">
            <span className="dbh-nhis-card__icon"><ShieldCheck size={17} /></span>
            <span className="dbh-nhis-card__title">NHIS Tip of the Day</span>
          </div>
          <p className="dbh-nhis-card__tip">{nhisTip}</p>
          <div className="dbh-nhis-card__links">
            <button
              className="dbh-nhis-card__link"
              type="button"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    pos => router.push(`/facilities?nhis=true&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`),
                    () => router.push('/facilities?nhis=true'),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                  );
                } else {
                  router.push('/facilities?nhis=true');
                }
              }}
            >
              {t('dashboard.findNhisFacilities', 'Find NHIS facilities')} <ChevronRight size={13} />
            </button>
            <button className="dbh-nhis-card__link" type="button" onClick={() => setShowNhisModal(true)}>
              {t('dashboard.learnAboutNhis', 'Learn about NHIS')} <ChevronRight size={13} />
            </button>
          </div>
        </div>
        </div>

        {/* ── Emergency numbers strip — always visible ────────────────── */}
        <div>
        <p className="dbh-eyebrow">{t('dashboard.emergencyNumbers', 'Emergency numbers')}</p>
        <div className="dbh-emergency-strip">
          <a className="dbh-emergency-strip__item" href="tel:193">
            <span className="dbh-emergency-strip__icon"><HeartPulse size={16} /></span>
            <span className="dbh-emergency-strip__label">{t('dashboard.ambulance', 'Ambulance')}</span>
            <span className="dbh-emergency-strip__number">193</span>
          </a>
          <a className="dbh-emergency-strip__item" href="tel:192">
            <span className="dbh-emergency-strip__icon"><Flame size={16} /></span>
            <span className="dbh-emergency-strip__label">{t('dashboard.fire', 'Fire')}</span>
            <span className="dbh-emergency-strip__number">192</span>
          </a>
          <a className="dbh-emergency-strip__item" href="tel:191">
            <span className="dbh-emergency-strip__icon"><Siren size={16} /></span>
            <span className="dbh-emergency-strip__label">{t('dashboard.police', 'Police')}</span>
            <span className="dbh-emergency-strip__number">191</span>
          </a>
        </div>
        </div>

        {/* ── Saved & Recent facilities ────────────────────────────── */}
        <div className="dbh-recent">
          <div className="dbh-recent__head">
            <h2 className="dbh-eyebrow dbh-recent__title">{t('dashboard.savedAndRecent', 'Saved & Recent')}</h2>
            {(savedFacilities?.length ?? 0) > 3 && (
              <button className="dbh-recent__seeall" type="button" onClick={() => router.push('/profile#saved-facilities')}>
                {t('dashboard.seeAll', 'See all')} <ArrowRight size={12} />
              </button>
            )}
          </div>

          {savedAndRecentLoading && (
            <div className="dbh-recent__empty">Loading…</div>
          )}

          {!savedAndRecentLoading && !hasSavedOrRecent && (
            <button className="dbh-recent__empty dbh-recent__empty--link" type="button" onClick={() => router.push('/find-care')}>
              {t('dashboard.noSavedFacilities', 'No saved facilities yet — find one nearby')} <ArrowRight size={13} />
            </button>
          )}

          {savedFacilitiesTop3.map(f => (
            <div key={f.id} className="dbh-recent__row">
              <div className="dbh-recent__row-info">
                <span className="dbh-recent__row-badge" aria-hidden="true" />
                <div className="dbh-recent__row-text">
                  <span className="dbh-recent__row-name">{f.name}</span>
                  <span className="dbh-recent__row-type">{f.type.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <div className="dbh-recent__row-actions">
                {f.phone && (
                  <a className="dbh-recent__row-btn" href={`tel:${f.phone}`} aria-label={`Call ${f.name}`}>
                    <Phone size={14} />
                  </a>
                )}
                <button
                  className="dbh-recent__row-btn"
                  type="button"
                  aria-label={`Directions to ${f.name}`}
                  onClick={() => openDirections(f.latitude, f.longitude)}
                >
                  <NavigationIcon size={14} />
                </button>
              </div>
            </div>
          ))}

          {recentlyViewedTop2.map(a => (
            <div key={a.id} className="dbh-recent__row">
              <div className="dbh-recent__row-info">
                <span className="dbh-recent__row-badge dbh-recent__row-badge--recent" aria-hidden="true">
                  <Clock size={11} />
                </span>
                <div className="dbh-recent__row-text">
                  <span className="dbh-recent__row-name">{a.title}</span>
                  <span className="dbh-recent__row-type">{a.metadata?.type?.replace(/_/g, ' ') || 'Recently viewed'}</span>
                </div>
              </div>
              <div className="dbh-recent__row-actions">
                {a.metadata?.lat != null && a.metadata?.lng != null && (
                  <button
                    className="dbh-recent__row-btn"
                    type="button"
                    aria-label={`Directions to ${a.title}`}
                    onClick={() => openDirections(a.metadata!.lat!, a.metadata!.lng!)}
                  >
                    <NavigationIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ NHIS BOTTOM SHEET MODAL ═══════════════════════════════════ */}
      {showNhisModal && (
        <>
          <div className="dbh-modal-overlay" onClick={() => setShowNhisModal(false)} />
          <div className="dbh-modal" role="dialog" aria-modal="true" aria-label="About NHIS">
            <div className="dbh-modal__handle" />
            <div className="dbh-modal__header">
              <h2 className="dbh-modal__title">About NHIS</h2>
              <button className="dbh-modal__close" type="button" onClick={() => setShowNhisModal(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="dbh-modal__body">
              <div className="dbh-modal__section">
                <h3>What NHIS covers</h3>
                <p>Outpatient (OPD) consultations, inpatient (IPD) admissions, maternity care, emergency treatment, and medicines on the NHIS Medicines List, at any accredited facility.</p>
              </div>
              <div className="dbh-modal__section">
                <h3>What NHIS does not cover</h3>
                <p>Some specialist surgeries, dental care beyond pain relief and extraction, optical care beyond a basic eye exam, and private ward upgrades.</p>
              </div>
              <div className="dbh-modal__section">
                <h3>How to register</h3>
                <p>Visit your district NHIA office with a valid Ghana Card. Registration and biometric capture are done on the spot.</p>
              </div>
              <div className="dbh-modal__section">
                <h3>How to renew</h3>
                <p>Renew annually at any district NHIA office, or via the NHIS mobile renewal channel where available, before your card expires.</p>
              </div>
              <div className="dbh-modal__section">
                <h3>Using your card</h3>
                <p>Present your NHIS card or ID number at the facility before treatment begins — not at checkout.</p>
              </div>
              <div className="dbh-modal__section">
                <h3>NHIS hotline</h3>
                <a className="dbh-modal__hotline" href={`tel:${NHIS_HOTLINE}`}>
                  <Phone size={14} /> 0544 446 447 (NHIS Call Centre)
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;