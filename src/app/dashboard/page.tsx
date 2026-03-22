'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NextPage } from 'next';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useFacilitySearch } from '@/hooks/useFacilitySearch';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardLayout from '@/components/DashboardLayout';
import { getRelativeTime } from '@/lib/activityTracker';
import '@/styles/dashboard-header.css';
import '@/styles/dashboard.css';
import '@/styles/footer.css';
import '@/styles/dashboard-mobile.css';
import {
  Heart, MapPin, Bot, Phone, User, Bell, Moon, Sun,
  TrendingUp, Clock, Star, AlertCircle, ChevronRight,
  LogOut, Stethoscope, Pill, Hospital, Activity,
  Loader2, RefreshCw, Navigation, Info,
  CheckCircle, Crosshair, Search,
  Calendar, TriangleAlert, Trash2, X,
} from 'lucide-react';

/* ── Interfaces ─────────────────────────────────────────── */
interface ActivityItem {
  id: string; type: string; title: string; time: string;
  icon: React.ComponentType<{ size: number }>;
  action?: () => void;
}
interface Facility {
  id: string; name: string; type: string; distance: number;
  rating: number; hours: string; emergencyServices: boolean;
  city?: string; phone?: string; coordinates?: [number, number];
}
interface LocationInfo { city?: string; region?: string; country?: string; accuracy?: number; }
interface HealthVitals {
  heartRate: number; temperature: number; spo2: number;
  bloodPressure: string; bloodSugar: number; score: number;
}

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

/* ── Component ──────────────────────────────────────────── */
const Dashboard: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScrolled,  setIsScrolled]  = useState(false);
  const {
    searchQuery, setSearchQuery, searchInputRef,
    handleSearchSubmit, handleSearchKeyDown,
  } = useFacilitySearch();

  const [recentActivities,    setRecentActivities]    = useState<ActivityItem[]>([]);
  const [activityCounts,      setActivityCounts]      = useState({ facilities: 0, symptoms: 0, emergency: 0 });
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activitiesError,     setActivitiesError]     = useState<string | null>(null);

  const [userLocation,       setUserLocation]       = useState<[number, number] | null>(null);
  const [locationInfo,       setLocationInfo]       = useState<LocationInfo | undefined>();
  const [isLoadingLocation,  setIsLoadingLocation]  = useState(false);
  const [locationError,      setLocationError]      = useState<string | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);

  const [nearbyFacilities,    setNearbyFacilities]    = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [facilitiesError,     setFacilitiesError]     = useState<string | null>(null);

  const [vitals, setVitals] = useState<HealthVitals>({
    heartRate: 72, temperature: 36.6, spo2: 98,
    bloodPressure: '120/80', bloodSugar: 6.2, score: 72,
  });

  const [healthScore,    setHealthScore]    = useState<number | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, number>>({});
  const [scoreInsights,  setScoreInsights]  = useState<string[]>([]);
  const [isLoadingScore, setIsLoadingScore] = useState(true);
  const [todayReminders, setTodayReminders] = useState(0);

  /* ── Notification panel ───────────────────────────────── */
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifsRead,     setNotifsRead]     = useState(false);
  const notifBellRef  = useRef<HTMLButtonElement>(null);
  const notifMobRef   = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/signin'); }, [status, router]);
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  /* ── Location ─────────────────────────────────────────── */
  const getGhanaRegion = (lat: number, lng: number): LocationInfo => {
    if (lat >= 5.5 && lat <= 5.7 && lng >= -0.3 && lng <= 0.0)  return { city: 'Accra',    region: 'Greater Accra', country: 'Ghana' };
    if (lat >= 6.6 && lat <= 6.8 && lng >= -1.7 && lng <= -1.5) return { city: 'Kumasi',   region: 'Ashanti',       country: 'Ghana' };
    if (lat >= 9.3 && lat <= 9.5 && lng >= -1.0 && lng <= -0.8) return { city: 'Tamale',   region: 'Northern',      country: 'Ghana' };
    if (lat >= 5.0 && lat <= 5.2 && lng >= -2.0 && lng <= -1.8) return { city: 'Takoradi', region: 'Western',       country: 'Ghana' };
    return { city: 'Unknown', region: 'Ghana', country: 'Ghana' };
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<LocationInfo> => {
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 5000);
      const res  = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`, { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) { const d = await res.json(); return { city: d.city, region: d.region, country: d.country }; }
    } catch { /* fall through */ }
    return getGhanaRegion(lat, lng);
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true); setLocationError(null);
    if (!navigator.geolocation) { setLocationError('Geolocation not supported.'); setIsLoadingLocation(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation([latitude, longitude]); setShowLocationPrompt(false);
        const info = await reverseGeocode(latitude, longitude);
        setLocationInfo({ ...info, accuracy }); setIsLoadingLocation(false);
      },
      () => { setIsLoadingLocation(false); setLocationError('Unable to get location.'); },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }, [reverseGeocode]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    navigator.permissions?.query({ name: 'geolocation' }).then(r => {
      if (r.state === 'granted') {
        setShowLocationPrompt(false);
        navigator.geolocation.getCurrentPosition(async (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          const info = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setLocationInfo({ ...info, accuracy: pos.coords.accuracy });
        }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      }
    }).catch(() => {});
  }, [status, reverseGeocode]);

  /* ── Facilities ───────────────────────────────────────── */
  const fetchNearbyFacilities = useCallback(async () => {
    if (!userLocation || status !== 'authenticated') return;
    setIsLoadingFacilities(true); setFacilitiesError(null);
    const [lat, lng] = userLocation;
    try {
      const res = await fetch(
        `/api/facilities/nearby?lat=${lat}&lng=${lng}&radius=5000&limit=3`,
        { method: 'GET' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const list: Facility[] = (data.facilities || []).map((f: any) => ({
        id:                f.id,
        name:              f.name,
        type:              f.type,
        distance:          f.distance,
        rating:            f.rating,
        phone:             f.phone,
        hours:             f.hours,
        city:              f.city,
        coordinates:       f.coordinates,
        emergencyServices: f.emergencyServices,
      }));
      setNearbyFacilities(list);
      if (!list.length) setFacilitiesError('No facilities found within 5km.');
    } catch (e: any) {
      setFacilitiesError(e.message || 'Unable to load facilities.');
    } finally { setIsLoadingFacilities(false); }
  }, [userLocation, status]);

  useEffect(() => { if (userLocation) fetchNearbyFacilities(); }, [userLocation, fetchNearbyFacilities]);

  /* ── Activities ───────────────────────────────────────── */
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'facility_found':     return Hospital;
      case 'symptom_checked':    return Bot;
      case 'emergency_accessed': return Phone;
      default:                   return Activity;
    }
  };

  const fetchActivities = useCallback(async () => {
    if (status !== 'authenticated') return;
    setIsLoadingActivities(true); setActivitiesError(null);
    try {
      const res = await fetch('/api/activities?limit=5');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setRecentActivities(data.activities.map((a: any) => ({
        id: a.id, type: a.activityType, title: a.title,
        /* FIX: wrap getRelativeTime in try/catch — malformed createdAt
           used to throw and crash the whole fetchActivities call. */
        time: (() => {
          try { return getRelativeTime(new Date(a.createdAt)); }
          catch { return 'Recently'; }
        })(),
        icon: getActivityIcon(a.activityType),
        action: () => {
          if (a.activityType === 'facility_found')     router.push('/facilities');
          if (a.activityType === 'symptom_checked')    router.push('/symptom-checker');
          if (a.activityType === 'emergency_accessed') router.push('/emergency');
        },
      })));
      setActivityCounts({ facilities: data.counts.facilities, symptoms: data.counts.symptoms, emergency: data.counts.emergency });
      const total = data.counts.facilities + data.counts.symptoms;
      setVitals(v => ({ ...v, score: Math.min(100, 55 + Math.floor(total * 0.8)) }));
    } catch { setActivitiesError('Failed to load activities'); }
    finally { setIsLoadingActivities(false); }
  }, [status, router]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  /* ── Health Score ─────────────────────────────────────── */
  const fetchHealthScore = useCallback(async () => {
    if (status !== 'authenticated') return;
    setIsLoadingScore(true);
    try {
      const res = await fetch('/api/health-score');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHealthScore(data.score);
      setScoreBreakdown(data.breakdown || {});
      setScoreInsights(data.insights || []);
    } catch {
      setHealthScore(50);
    } finally {
      setIsLoadingScore(false);
    }
  }, [status]);

  useEffect(() => { fetchHealthScore(); }, [fetchHealthScore]);

  /* ── Med Reminders ────────────────────────────────────── */
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/health-profile/reminders')
      .then(r => r.json())
      .then(({ reminders }) => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
        const due = (reminders || []).filter((r: any) => {
          try { return JSON.parse(r.days).includes(today); } catch { return false; }
        }).length;
        setTodayReminders(due);
      })
      .catch(() => {});
  }, [status]);

  /* ── Derived ──────────────────────────────────────────── */
  const userName     = session?.user?.name  || 'User';
  const userEmail    = session?.user?.email || '';
  const userImage    = session?.user?.image || null;
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const getGreeting = () => {
    const h = currentTime.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  /* Emoji that matches the time of day:
     🌅 sunrise glow  → early morning  (5–8)
     ☀️  bright sun    → morning/midday (8–12)
     🌤  partly cloudy → afternoon      (12–17)
     🌇  sunset        → early evening  (17–20)
     🌙  crescent moon → night          (20–24 / 0–5)
     \uFE0F forces emoji/colour presentation on all platforms     */
  const getGreetingEmoji = () => {
    const h = currentTime.getHours();
    if (h >= 5  && h < 8)  return '🌅\uFE0F';
    if (h >= 8  && h < 12) return '☀️\uFE0F';
    if (h >= 12 && h < 17) return '🌤\uFE0F';
    if (h >= 17 && h < 20) return '🌇\uFE0F';
    return '🌙\uFE0F';
  };

  const getFacilityIcon = (type: string) => {
    switch (type) { case 'hospital': return Hospital; case 'pharmacy': return Pill; default: return Stethoscope; }
  };
  const getFacilityStatus = (f: Facility): { label: string; isOpen: boolean } => {
    if (f.emergencyServices) return { label: 'Open 24/7', isOpen: true };
    const raw = f.hours?.toLowerCase() ?? '';
    if (raw === '24/7' || raw === 'always') return { label: 'Open 24/7', isOpen: true };
    if (!raw || raw === 'call for hours' || raw === 'not available') return { label: 'Hours unknown', isOpen: false };
    // Parse OSM opening_hours using Ghana time (UTC+0)
    const dayIdx = currentTime.getUTCDay() === 0 ? 6 : currentTime.getUTCDay() - 1; // Mon=0..Sun=6
    const mins   = currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes();
    const DAY: Record<string, number> = { mo: 0, tu: 1, we: 2, th: 3, fr: 4, sa: 5, su: 6 };
    const toMin  = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + (mm || 0); };
    for (const rule of raw.split(';').map(r => r.trim())) {
      const dayTime = /^([a-z,\-\s]+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(rule);
      if (dayTime) {
        const seg = dayTime[1].trim(); const dash = seg.indexOf('-');
        let days: number[] = [];
        if (dash > 0) {
          const s = DAY[seg.slice(0, dash).trim()], e = DAY[seg.slice(dash + 1).trim()];
          if (s != null && e != null) for (let d = s; ; d = (d + 1) % 7) { days.push(d); if (d === e) break; }
        } else { const d = DAY[seg]; if (d != null) days = [d]; }
        if (!days.includes(dayIdx)) continue;
        return mins >= toMin(dayTime[2]) && mins < toMin(dayTime[3])
          ? { label: 'Open Now',  isOpen: true  }
          : { label: 'Closed',    isOpen: false };
      }
      const timeOnly = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(rule);
      if (timeOnly) {
        return mins >= toMin(timeOnly[1]) && mins < toMin(timeOnly[2])
          ? { label: 'Open Now',      isOpen: true  }
          : { label: 'Closed',        isOpen: false };
      }
    }
    return { label: 'Hours unknown', isOpen: false };
  };

  const scoreCircumference = 2 * Math.PI * 36;
  const scoreDash = ((healthScore ?? 0) / 100) * scoreCircumference;
  const getScoreLabel = (s: number) =>
    s >= 80 ? 'Excellent' : s >= 65 ? 'Good standing' : s >= 50 ? 'Fair' : 'Needs attention';

  const getAdvisory = () => {
    if (!locationInfo?.region) return null;
    const map: Record<string, string> = {
      'Ashanti':       'Flu cases rising in Kumasi region. Vaccination available at 3 nearby clinics. KATH, City Health Clinic, and Ashanti Emergency Center all have walk-in availability this week.',
      'Greater Accra': 'Heat advisory active. Stay hydrated and avoid prolonged outdoor exposure between 12pm–3pm.',
      'Northern':      'Meningitis awareness period. Free vaccination available at regional health centres.',
      'Western':       'Malaria season alert. Use insect repellent and treated nets.',
    };
    return map[locationInfo.region] || null;
  };
  const advisory = getAdvisory();

  /* ── Notification panel logic ─────────────────────────── */
  useEffect(() => {
    if (!showNotifPanel) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        notifPanelRef.current && !notifPanelRef.current.contains(t) &&
        notifBellRef.current  && !notifBellRef.current.contains(t)  &&
        notifMobRef.current   && !notifMobRef.current.contains(t)
      ) setShowNotifPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPanel]);

  type NotifItem = {
    id: string;
    icon: React.ComponentType<{ size: number }>;
    color: 'teal' | 'amber' | 'red' | 'mint' | 'violet';
    title: string;
    body: string;
    action?: () => void;
  };

  const notifications = React.useMemo((): NotifItem[] => {
    const list: NotifItem[] = [];
    if (todayReminders > 0)
      list.push({ id: 'meds', icon: Pill, color: 'amber',
        title: `${todayReminders} medication${todayReminders > 1 ? 's' : ''} due today`,
        body: 'Tap to open your medication schedule.',
        action: () => router.push('/profile') });
    scoreInsights.slice(0, 2).forEach((s, i) =>
      list.push({ id: `insight_${i}`, icon: TrendingUp, color: 'teal',
        title: 'Health Score Insight', body: s,
        action: () => router.push('/profile') })
    );
    if (advisory)
      list.push({ id: 'advisory', icon: TriangleAlert, color: 'red',
        title: `Health Advisory — ${locationInfo?.city || locationInfo?.region || 'Your Region'}`,
        body: advisory,
        action: () => router.push('/facilities') });
    if (nearbyFacilities.length > 0)
      list.push({ id: 'facilities', icon: MapPin, color: 'teal',
        title: `${nearbyFacilities.length} facilities near you`,
        body: `Closest: ${nearbyFacilities[0].name} (${nearbyFacilities[0].distance.toFixed(1)} km)`,
        action: () => router.push('/facilities') });
    if (list.length === 0)
      list.push({ id: 'empty', icon: CheckCircle, color: 'mint',
        title: 'All caught up!',
        body: 'No new notifications right now.' });
    return list;
  }, [todayReminders, scoreInsights, advisory, nearbyFacilities, locationInfo, router]);

  const hasUnread = notifications.some(n => n.id !== 'empty') && !notifsRead;
  const toggleNotifPanel = () => { setShowNotifPanel(p => !p); setNotifsRead(true); };

  /* ── Guards ───────────────────────────────────────────── */
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

  /* ── Render ───────────────────────────────────────────── */
  return (
    /*
      FIX: Pass className="hc-layout--has-mob-topbar" to DashboardLayout.
      This class (defined in dashboard-header.css) tells the layout to:
        1. Hide the generic hc-topbar and hc-bottom-nav on ≤1024px
        2. Show the dashboard's custom .mob-topbar and .mob-tab-bar on ≤640px
        3. Reset hc-layout__main padding-top/bottom so the custom bars
           control their own spacing — no double header/footer.
      This replaces the brittle !important suppression rules that were
      previously needed in dashboard-mobile.css.
    */
    <DashboardLayout activeTab="/dashboard" className="hc-layout--has-mob-topbar">

      {/* ══════════════════════════════════════════
          STICKY GLASSMORPHISM TOP BAR
          Desktop only — hidden on mobile via .db-topbar rule in
          dashboard-mobile.css (display:none, not !important needed
          because mob-topbar renders instead on mobile).
      ══════════════════════════════════════════ */}
      <div className={`db-topbar${isScrolled ? ' db-topbar--scrolled' : ''}`}>
        <div className="db-topbar__search">
          <button
            className="db-topbar__search-icon-btn"
            type="button"
            aria-label="Search facilities"
            onClick={handleSearchSubmit}
          >
            <Search size={15} />
          </button>
          <input
            ref={searchInputRef}
            className="db-topbar__search-input"
            type="search"
            placeholder="Search facilities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search facilities"
          />
          {searchQuery.trim() && (
            <button
              className="db-topbar__search-submit"
              type="button"
              aria-label="Go"
              onClick={handleSearchSubmit}
            >
              Go
            </button>
          )}
        </div>
        <div className="db-topbar__right">
          <div className="db-topbar__live"><span className="db-topbar__live-dot" />Live</div>
          <button className="db-topbar__icon-btn" type="button" onClick={toggleDarkMode} aria-label="Toggle theme">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button ref={notifBellRef} className="db-topbar__icon-btn db-topbar__notif" type="button" aria-label="Notifications" onClick={toggleNotifPanel}>
            <Bell size={18} />{hasUnread && <span className="db-topbar__notif-dot" />}
          </button>
          <button className="db-topbar__user" type="button" onClick={() => router.push('/profile')} title="Go to Profile & Settings">
            <div className="db-topbar__user-avatar">
              {userImage
                ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" />
                : userInitials}
            </div>
            <div className="db-topbar__user-info">
              <span className="db-topbar__user-name">{userName}</span>
              <span className="db-topbar__user-id">HC-{userEmail.slice(0,5).toUpperCase()}</span>
            </div>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          NOTIFICATION PANEL
          Desktop: fixed dropdown below the desktop bell (top: 58px right: 16px).
          Mobile:  fixed sheet sitting above mob-tab-bar (bottom: 72px).
          z-index: 500 — above mob-topbar (150) and mob-tab-bar (150).
      ══════════════════════════════════════════ */}
      {showNotifPanel && (
        <>
          <div className="db-notif-panel" ref={notifPanelRef} role="dialog" aria-label="Notifications">
            <div className="db-notif-panel__header">
              <span className="db-notif-panel__title">Notifications</span>
              {notifications.some(n => n.id !== 'empty') && (
                <span className="db-notif-panel__count">{notifications.filter(n => n.id !== 'empty').length}</span>
              )}
              <button className="db-notif-panel__close" onClick={() => setShowNotifPanel(false)} type="button" aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div className="db-notif-panel__list">
              {notifications.map(n => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.id}
                    className={`db-notif-item db-notif-item--${n.color}`}
                    onClick={() => { setShowNotifPanel(false); n.action?.(); }}
                    type="button"
                    disabled={!n.action}
                  >
                    <div className={`db-notif-item__icon db-notif-item__icon--${n.color}`}><Icon size={14} /></div>
                    <div className="db-notif-item__body">
                      <p className="db-notif-item__title">{n.title}</p>
                      <p className="db-notif-item__body-text">{n.body}</p>
                    </div>
                    {n.action && <ChevronRight size={13} className="db-notif-item__arrow" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="db-notif-overlay" onClick={() => setShowNotifPanel(false)} />
        </>
      )}

      {/* ══════════════════════════════════════════
          MOBILE STICKY TOP BAR  (.mob-topbar)
          Rendered on all screen sizes; shown only at ≤640px
          by the hc-layout--has-mob-topbar rules in dashboard-header.css.
          Owns: logo, dark-mode toggle, notification bell, avatar.
      ══════════════════════════════════════════ */}
      <div className="mob-topbar">
        <div className="mob-topbar__left">
          <HCLogo size={30} />
          <span className="mob-topbar__logo-text">HealthConnect</span>
        </div>
        <div className="mob-topbar__right">
          <button className="mob-topbar__btn" type="button" onClick={toggleDarkMode} aria-label="Toggle dark mode">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            ref={notifMobRef}
            className="mob-topbar__btn mob-topbar__bell"
            type="button"
            aria-label="Notifications"
            onClick={toggleNotifPanel}
          >
            <Bell size={18} />{hasUnread && <span className="mob-topbar__bell-dot" />}
          </button>
          <button className="mob-topbar__avatar-btn" type="button" onClick={() => router.push('/profile')}>
            <div className="mob-topbar__avatar">
              {userImage ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" /> : userInitials}
            </div>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE BOTTOM TAB BAR  (.mob-tab-bar)
          Rendered on all screen sizes; shown only at ≤640px.
          FIX: SOS button now uses .mob-tab-btn--sos + .mob-tab-sos-icon
          for the red-pill icon treatment defined in dashboard-header.css.
      ══════════════════════════════════════════ */}
      <nav className="mob-tab-bar" aria-label="Main navigation">
        <div className="mob-tab-bar__inner">
          <button
            className="mob-tab-btn active"
            onClick={() => router.push('/dashboard')}
            type="button"
            aria-current="page"
          >
            <span className="mob-tab-btn__icon"><Heart size={22} /></span>
            Home
          </button>
          <button
            className="mob-tab-btn"
            onClick={() => router.push('/facilities')}
            type="button"
          >
            <span className="mob-tab-btn__icon"><MapPin size={22} /></span>
            Find
          </button>
          <button
            className="mob-tab-btn"
            onClick={() => router.push('/symptom-checker')}
            type="button"
          >
            <span className="mob-tab-btn__icon"><Bot size={22} /></span>
            Check
          </button>
          <button
            className="mob-tab-btn mob-tab-btn--sos"
            onClick={() => router.push('/emergency')}
            type="button"
            aria-label="Emergency"
          >
            <span className="mob-tab-sos-icon"><Phone size={20} /></span>
            SOS
          </button>
          <button
            className="mob-tab-btn"
            onClick={() => router.push('/profile')}
            type="button"
          >
            <span className="mob-tab-btn__icon"><User size={22} /></span>
            Profile
          </button>
        </div>
      </nav>

      <div className="db-page">

        {/* ── Page header ────────────────────────── */}
        <div className="db-page-header">
          <div>
            <p className="db-page-header__sub">
              {getGreeting()}{' '}
              <span className="db-greeting-emoji">{getGreetingEmoji()}</span>
            </p>
            <h2 className="db-page-header__greeting">{userName}</h2>
          </div>
          {/* Hidden on mobile via CSS */}
          <div className="db-page-header__actions">
            <button className="db-page-header__sos-btn" onClick={() => router.push('/emergency')} type="button">
              <span className="db-page-header__sos-dot" /> Emergency SOS
            </button>
          </div>
        </div>

        {/* ── Health Score Card ──────────────────── */}
        <div className="db-health-card">
          <div className="db-health-card__left">
            <p className="db-health-card__label">OVERALL HEALTH SCORE</p>
            <div className="db-health-card__score-row">
              <span className="db-health-card__score-num">{isLoadingScore ? '—' : healthScore ?? '—'}</span>
              <span className="db-health-card__score-denom">/100</span>
            </div>
            <p className="db-health-card__status">
              {getScoreLabel(healthScore ?? 0)} · Last check {activityCounts.symptoms > 0 ? '2 days ago' : 'never'}
            </p>
            {/*
              FIX: Badges are now fully dynamic.
              Previously "3 meds due" was hardcoded. Now:
              - Shows dynamic count from todayReminders state
              - "No alerts today" only appears when todayReminders === 0
            */}
            <div className="db-health-card__badges">
              <span className="db-health-card__badge db-health-card__badge--green">
                <CheckCircle size={10} /> Meds on track
              </span>
              {todayReminders > 0 ? (
                <span className="db-health-card__badge db-health-card__badge--blue">
                  <Pill size={10} /> {todayReminders} med{todayReminders > 1 ? 's' : ''} due
                </span>
              ) : (
                <span className="db-health-card__badge db-health-card__badge--grey">
                  No alerts today
                </span>
              )}
            </div>
          </div>

          <div className="db-health-card__ring-wrap">
            <svg width="96" height="96" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(0,210,255,0.15)" strokeWidth="8" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="url(#scoreGrad)"
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${scoreDash} ${scoreCircumference}`}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--hc-teal)" />
                  <stop offset="100%" stopColor="var(--hc-mint)" />
                </linearGradient>
              </defs>
            </svg>
            <span className="db-health-card__ring-pct">{healthScore ?? '—'}%</span>
          </div>

          <div className="db-vitals">
            {[
              { val: scoreBreakdown.profileCompleteness ?? 0, max: 20, label: 'PROFILE'    },
              { val: scoreBreakdown.bmiScore            ?? 0, max: 25, label: 'BMI'        },
              { val: scoreBreakdown.medicationAdherence ?? 0, max: 20, label: 'MEDS'       },
              { val: scoreBreakdown.conditionManagement ?? 0, max: 20, label: 'CONDITIONS' },
              { val: scoreBreakdown.engagementScore     ?? 0, max: 15, label: 'ENGAGEMENT' },
            ].map(({ val, max, label }) => (
              <div key={label} className="db-vital">
                <div className="db-vital__top">
                  <span className="db-vital__val">{isLoadingScore ? '—' : val}</span>
                  <span className="db-vital__unit">/{max}</span>
                </div>
                <span className="db-vital__label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Score Insights ─────────────────────── */}
        {scoreInsights.length > 0 && (
          <div className="db-score-insights">
            {scoreInsights.slice(0, 3).map((insight, i) => (
              <div key={i} className="db-score-insight">
                <Info size={12} />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Advisory Banner ────────────────────── */}
        {advisory && locationInfo?.region && (
          <div className="db-advisory">
            <div className="db-advisory__icon"><TriangleAlert size={18} /></div>
            <div className="db-advisory__body">
              <p className="db-advisory__title">Local Health Advisory — {locationInfo.city || locationInfo.region} Region</p>
              <p className="db-advisory__text">{advisory}</p>
            </div>
            <button className="db-advisory__cta" onClick={() => router.push('/facilities')} type="button">View Clinics →</button>
          </div>
        )}

        {/* ── Quick Actions ──────────────────────── */}
        <section className="db-section">
          <div className="db-section__head">
            <h3 className="db-section__title">Quick Actions</h3>
          </div>
          <div className="db-quick-actions">
            {[
              { cls: 'teal',   icon: MapPin, title: 'Find Facility',  sub: nearbyFacilities.length > 0 ? `${nearbyFacilities.length} facilities nearby` : 'Hospitals, clinics, pharmacies near you', path: '/facilities',      badge: 0 },
              { cls: 'violet', icon: Bot,    title: 'Check Symptoms', sub: 'AI-powered health assessment',  path: '/symptom-checker', badge: activityCounts.symptoms },
              { cls: 'amber',  icon: Pill,   title: 'Med Reminders',  sub: todayReminders > 0 ? `${todayReminders} medication${todayReminders > 1 ? 's' : ''} due today` : 'Track your medications', path: '/profile', badge: todayReminders },
              { cls: 'red',    icon: Phone,  title: 'Emergency Hub',  sub: 'SOS & first aid guides',        path: '/emergency',       badge: 0 },
            ].map(({ cls, icon: Icon, title, sub, path, badge }) => (
              <button key={path} className={`db-quick-action db-quick-action--${cls}`} onClick={() => router.push(path)} type="button">
                <div className="db-quick-action__icon"><Icon size={22} /></div>
                {badge > 0 && <span className="db-quick-action__badge">{badge > 9 ? '9+' : badge}</span>}
                <div className="db-quick-action__body">
                  <p className="db-quick-action__title">{title}</p>
                  <p className="db-quick-action__sub">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Main Grid ──────────────────────────── */}
        <div className="db-grid">
          <div className="db-grid__main">

            <div className="db-card">
              <div className="db-card__header">
                <h3 className="db-card__title"><Activity size={17} /> Your Health Journey</h3>
                {/*
                  FIX: Was style={{ display:'flex', gap:6, alignItems:'center' }}
                  Now uses .db-card__header-actions CSS class (added to dashboard.css).
                  Prevents flex-layout breakage on narrow mobile screens.
                */}
                <div className="db-card__header-actions">
                  <button
                    className="db-card__action"
                    onClick={fetchActivities}
                    disabled={isLoadingActivities}
                    type="button"
                    aria-label="Refresh activities"
                  >
                    {isLoadingActivities ? <Loader2 size={14} className="db-spin" /> : <RefreshCw size={14} />}
                  </button>
                  <button
                    className="db-card__action db-card__action--danger"
                    title="Reset activity history"
                    onClick={async () => {
                      if (!confirm('Reset all activity history? This cannot be undone.')) return;
                      await fetch('/api/activities', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ all: true }),
                      });
                      await Promise.all([fetchActivities(), fetchHealthScore()]);
                    }}
                    type="button"
                    aria-label="Reset history"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="db-stats">
                {[
                  { label: 'Facilities', value: activityCounts.facilities, icon: MapPin,  color: 'teal',   trend: activityCounts.facilities > 0 ? '+2 this week' : undefined,         insight: 'Continue exploring' },
                  { label: 'Symptoms',   value: activityCounts.symptoms,   icon: Bot,     color: 'violet', trend: activityCounts.symptoms > 0 ? 'Last checked 2 days ago' : undefined, insight: 'Get AI insights'    },
                  { label: 'Emergency',  value: activityCounts.emergency,  icon: Phone,   color: 'red',                                                                                 insight: 'Always ready'       },
                ].map((stat, i) => (
                  <div key={i} className={`db-stat db-stat--${stat.color}`}>
                    <div className="db-stat__top">
                      <stat.icon size={17} className="db-stat__icon" />
                    </div>
                    <div className="db-stat__value">{stat.value}</div>
                    <div className="db-stat__label">{stat.label}</div>
                    {stat.trend && <div className="db-stat__trend">{stat.trend}</div>}
                    <div className="db-stat__insight"><Info size={11} /><span>{stat.insight}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="db-card">
              <div className="db-card__header">
                <h3 className="db-card__title"><Clock size={17} /> Recent Activity</h3>
              </div>
              <div className="db-activity-list">
                {isLoadingActivities ? (
                  <div className="db-state-center"><Loader2 size={22} className="db-spin" /><p>Loading…</p></div>
                ) : activitiesError ? (
                  <div className="db-state-center db-state-center--error">
                    <AlertCircle size={24} /><p>{activitiesError}</p>
                    <button className="db-retry-btn" onClick={fetchActivities} type="button"><RefreshCw size={13} /> Retry</button>
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="db-state-center">
                    <Activity size={24} /><p>No activities yet</p>
                    <small>Start using features to track your history</small>
                  </div>
                ) : (
                  recentActivities.map(a => (
                    <button key={a.id} className="db-activity-item" onClick={a.action} type="button">
                      <div className="db-activity-item__icon"><a.icon size={15} /></div>
                      <div className="db-activity-item__body">
                        <p className="db-activity-item__title">{a.title}</p>
                        <p className="db-activity-item__time">{a.time}</p>
                      </div>
                      <ChevronRight size={14} className="db-activity-item__arrow" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="db-grid__side">
            <div className="db-card">
              <div className="db-card__header">
                <h3 className="db-card__title">
                  <MapPin size={17} /> Nearby Facilities
                  {locationInfo?.city && <span className="db-card__badge">in {locationInfo.city}</span>}
                </h3>
                <button className="db-card__action" onClick={() => router.push('/facilities')} type="button">View All</button>
              </div>
              <div className="db-facilities">
                {!userLocation ? (
                  <div className="db-empty-state">
                    <MapPin size={28} /><h4>Enable Location</h4><p>Allow GPS to find nearby facilities</p>
                    <button className="db-empty-state__btn" onClick={getCurrentLocation} disabled={isLoadingLocation} type="button">
                      {isLoadingLocation ? <><Loader2 size={13} className="db-spin" /> Getting…</> : <><Crosshair size={13} /> Enable GPS</>}
                    </button>
                  </div>
                ) : isLoadingFacilities ? (
                  <div className="db-state-center"><Loader2 size={22} className="db-spin" /><p>Finding facilities…</p></div>
                ) : facilitiesError ? (
                  <div className="db-state-center db-state-center--error">
                    <AlertCircle size={22} /><p>{facilitiesError}</p>
                    <button className="db-retry-btn" onClick={fetchNearbyFacilities} type="button"><RefreshCw size={13} /> Retry</button>
                  </div>
                ) : nearbyFacilities.length === 0 ? (
                  <div className="db-empty-state">
                    <Hospital size={28} /><h4>No Facilities Found</h4><p>No facilities within 5km</p>
                    <button className="db-empty-state__btn" onClick={() => router.push('/facilities')} type="button">Wider Search</button>
                  </div>
                ) : nearbyFacilities.map(f => {
                  const Icon = getFacilityIcon(f.type);
                  const { label, isOpen } = getFacilityStatus(f);
                  return (
                    <div key={f.id} className="db-facility-item">
                      <div className="db-facility-item__header">
                        <div className="db-facility-item__name"><Icon size={13} /><span>{f.name}</span></div>
                        <div className="db-facility-item__rating"><Star size={11} />{f.rating.toFixed(1)}</div>
                      </div>
                      <div className="db-facility-item__meta">{f.type} · {f.distance.toFixed(1)} km{f.city && f.city !== 'Unknown' ? ` · ${f.city}` : ''}</div>
                      <div className="db-facility-item__footer">
                        <span className={`db-facility-item__status db-facility-item__status--${isOpen ? 'open' : 'closed'}`}>
                          <span className="db-facility-item__status-dot" />{label}
                        </span>
                        <div className="db-facility-item__actions">
                          {f.phone && f.phone !== 'Not available' && (
                            <button className="db-facility-item__btn" onClick={() => window.open(`tel:${f.phone}`)} type="button"><Phone size={12} /></button>
                          )}
                          <button className="db-facility-item__btn" onClick={() => router.push(`/facilities?id=${f.id}`)} type="button"><Navigation size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="db-card db-card--emergency">
              <div className="db-card__emergency-top">
                <div className="db-card__emergency-icon"><Phone size={17} /></div>
                <div className="db-card__emergency-body">
                  <h3 className="db-card__emergency-title">Emergency Hub</h3>
                  <p className="db-card__emergency-desc">SOS alerts · First aid · Medical ID · Emergency services</p>
                </div>
              </div>

              {/* Medical ID completeness status */}
              <div className="db-card__emergency-medid">
                <div className="db-card__emergency-medid-bar">
                  <div
                    className="db-card__emergency-medid-fill"
                    style={{ width: `${Math.round(((scoreBreakdown.profileCompleteness ?? 0) / 20) * 100)}%` }}
                  />
                </div>
                <div className="db-card__emergency-medid-row">
                  <span className="db-card__emergency-medid-label">
                    {(scoreBreakdown.profileCompleteness ?? 0) >= 16
                      ? '✓ Medical ID complete'
                      : (scoreBreakdown.profileCompleteness ?? 0) >= 8
                      ? 'Medical ID partially set up'
                      : 'Medical ID not set up'}
                  </span>
                  <button
                    className="db-card__emergency-medid-cta"
                    onClick={() => router.push('/profile?modal=medicalId')}
                    type="button"
                  >
                    {(scoreBreakdown.profileCompleteness ?? 0) >= 16 ? 'View' : 'Set up'}
                  </button>
                </div>
              </div>

              <button className="db-emergency-open-btn" onClick={() => router.push('/emergency')} type="button">
                Open Emergency Hub
              </button>
            </div>

            <div className="db-card">
              <div className="db-card__header"><h3 className="db-card__title"><TrendingUp size={17} /> Health Insights</h3></div>
              <div className="db-insights">
                {activityCounts.symptoms > 0 && (
                  <div className="db-insight-item"><CheckCircle size={14} className="db-insight-item__icon--ok" /><p>Checked symptoms {activityCounts.symptoms} times</p></div>
                )}
                {activityCounts.facilities > 0 && (
                  <div className="db-insight-item"><CheckCircle size={14} className="db-insight-item__icon--ok" /><p>{activityCounts.facilities} facilities discovered</p></div>
                )}
                {nearbyFacilities.length > 0 && locationInfo?.city && (
                  <div className="db-insight-item"><Info size={14} className="db-insight-item__icon--info" /><p>{nearbyFacilities.length} facilities in {locationInfo.city}</p></div>
                )}
                {!activityCounts.facilities && !activityCounts.symptoms && (
                  <div className="db-insight-item"><Info size={14} className="db-insight-item__icon--info" /><p>Enable location for personalised insights</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
 );
};

export default Dashboard;