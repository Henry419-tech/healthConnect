'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useTranslation } from '@/contexts/LanguageContext';
import MobTabBar from '@/components/MobTabBar';
import dynamic from 'next/dynamic';
const MobTopbarMenu = dynamic(() => import('@/components/MobTopbarMenu'), { ssr: false });
import DashboardLayout from '@/components/DashboardLayout';
import NotificationBell from '@/components/NotificationBell';
import { useRegisterNotifications } from '@/contexts/NotificationsContext';
import type { AppNotification } from '@/lib/notifications/types';
import { HCLogo } from '@/components/HCLogo';
import { trackActivity, activityTypes } from '@/lib/activityTracker';
import { useFacilitySearch } from '@/hooks/useFacilitySearch';
import {
  FIRST_AID_GUIDES,
  GHANA_SERVICES,
  BLOOD_COMPATIBILITY,
  BREATH_PHASES,
  buildPersonalisedGuides,
  type FirstAidGuide,
  type FirstAidStep,
  type GhanaService,
} from '@/constants/emergency';
import type {
  HealthProfileData,
  NearbyFacility,
  NhisCardData,
} from '@/types/health';
import '@/styles/dashboard-header.css';
import '@/styles/dashboard.css';
import '@/styles/footer.css';
import '@/styles/dashboard-mobile.css';
import '@/styles/emergency.css';
import {
  Phone, MapPin, Heart, Moon, Sun, Grid2X2 as _Grid2X2,
  Bot as _Bot, Shield, AlertTriangle, Copy, Check,
  Navigation, ChevronRight, ChevronLeft, RotateCcw, Search,
  Loader2, X, Activity, Zap,
  Wind, Droplets, Thermometer, Eye, Flame,
  Plus, BookOpen, ExternalLink, AlertCircle, Info,
  Pill, HeartPulse, ClipboardList, Clock, Edit2,
  FileText, Printer, Stethoscope, QrCode, RefreshCw, Trash2,
  Siren, ShieldCheck, Building2, CreditCard, Droplet,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { MedicalIdPdfData } from '@/lib/generateMedicalIdPdf';

/* ─── Types (local-only — shared types imported from @/types/health) ─────── */


const EmergencyPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t, language } = useTranslation();
  // First-aid translations are draft until reviewed — see TWIFIRSTAID_REVIEW.md
  const FIRST_AID_APPROVED = process.env.NEXT_PUBLIC_TWI_EMERGENCY_APPROVED === 'true';
  const tGuide = (key: string, fallback: string) =>
    language === 'tw' && !FIRST_AID_APPROVED ? fallback : t(key, fallback);

  /* Location */
  const [location,          setLocation]          = useState<{ lat: number; lng: number; city?: string; accuracy?: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError,     setLocationError]     = useState<string | null>(null);
  const [locationShared,    setLocationShared]    = useState(false);

  /* Nearest ER */
  const [nearestER,    setNearestER]    = useState<NearbyFacility | null>(null);
  const [nearbyERs,    setNearbyERs]    = useState<NearbyFacility[]>([]);  // top 3 options
  const [selectedER,   setSelectedER]   = useState<NearbyFacility | null>(null);
  const [showERPicker, setShowERPicker] = useState(false);
  const [isLoadingER,  setIsLoadingER]  = useState(false);

  /* Location preview modal */
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [pendingLocation,     setPendingLocation]     = useState<{ lat: number; lng: number; city: string; accuracy?: number } | null>(null);

  /* UI */
  const [copiedId,    setCopiedId]    = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const guidePanelRef = useRef<HTMLDivElement | null>(null);
  const locPreviewRef = useRef<HTMLDivElement | null>(null);
  const erPickerRef = useRef<HTMLDivElement | null>(null);
  const poisonModalRef = useRef<HTMLDivElement | null>(null);
  const bystanderModalRef = useRef<HTMLDivElement | null>(null);

  /* Focus the guide modal on open, and let Escape close it instantly */
  useEffect(() => {
    if (!activeGuide) return;
    if (guidePanelRef.current) guidePanelRef.current.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveGuide(null); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeGuide]);


  /* Breathing guide (for panic/anxiety) */
  const [showBreathing,   setShowBreathing]   = useState(false);
  const [breathPhase,     setBreathPhase]     = useState<'inhale'|'hold'|'exhale'|'rest'>('inhale');
  const [breathCount,     setBreathCount]     = useState(0);
  const breathTimerRef                        = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Poison & Overdose modal */
  const [showPoison,      setShowPoison]      = useState(false);
  const [poisonStep,      setPoisonStep]      = useState<'triage'|'swallowed'|'inhaled'|'skin'|'eye'>('triage');

  /* Bystander Dispatch modal */
  const [showBystander,   setShowBystander]   = useState(false);
  const [bystanderStep,   setBystanderStep]   = useState(0);

  /* CPR Metronome */
  const [cprActive,       setCprActive]       = useState(false);
  const [cprCount,        setCprCount]        = useState(0);
  const [cprPhase,        setCprPhase]        = useState<'compress'|'release'>('compress');
  const cprTimerRef                           = useRef<ReturnType<typeof setInterval> | null>(null);
  const cprAudioRef                           = useRef<AudioContext | null>(null);

  /* Personal Emergency Card share */
  const [showPersonalCard, setShowPersonalCard] = useState(false);

  // Top-bar facility search — navigates to /facilities?q=<term>
  const {
    searchQuery: facilityQuery, setSearchQuery: setFacilityQuery,
    searchInputRef: facilitySearchRef,
    handleSearchSubmit, handleSearchKeyDown,
  } = useFacilitySearch();
  const [isScrolled,  setIsScrolled]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<'services' | 'firstaid' | 'qr'>('services');

  /* Jump-to-First-Aid — used by the "View First Aid Guides" button on the
     Nearest ER card. Switches tab, then scrolls once the section is visible. */
  const [pendingScrollToFirstAid, setPendingScrollToFirstAid] = useState(false);
  const firstAidSectionRef = useRef<HTMLElement | null>(null);
  const goToFirstAid = useCallback(() => {
    setPendingScrollToFirstAid(true);
    setActiveTab('firstaid');
  }, []);
  useEffect(() => {
    if (pendingScrollToFirstAid && activeTab === 'firstaid') {
      firstAidSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingScrollToFirstAid(false);
    }
  }, [pendingScrollToFirstAid, activeTab]);

  /* Health profile — loaded from DB for Medical ID */
  const [healthProfile,       setHealthProfile]       = useState<HealthProfileData | null>(null);
  const [isLoadingProfile,    setIsLoadingProfile]    = useState(true);

  /* NHIS card */
  const [nhisCard,        setNhisCard]        = useState<NhisCardData | null>(null);

  /* PDF generation */
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  /* QR Code — Emergency Brief */
  const [qrDataUrl,      setQrDataUrl]      = useState<string | null>(null);
  const [qrBriefUrl,     setQrBriefUrl]     = useState<string | null>(null);
  const [qrExpiresAt,    setQrExpiresAt]    = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrError,        setQrError]        = useState('');

  const userName     = session?.user?.name  || 'User';
  const userImage    = session?.user?.image || null;
  const userEmail    = session?.user?.email || '';
  const isFemale     = (session?.user as any)?.gender?.toLowerCase() === 'female';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  /* ── Auth guard ───────────────────────────────────────────── */
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  /* ── Scroll to #qr anchor if navigated from profile ──────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#qr') {
      setActiveTab('qr');
      setTimeout(() => {
        document.getElementById('em-qr-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 600);
    }
  }, []);

  /* ── Scroll shadow ────────────────────────────────────────── */
  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);



  /* ── Load health profile for Medical ID ──────────────────── */
  useEffect(() => {
    if (status !== 'authenticated') return;
    setIsLoadingProfile(true);
    // Serve cached version instantly if offline or slow
    try {
      const cached = localStorage.getItem('hc_em_profile');
      if (cached) setHealthProfile(JSON.parse(cached));
    } catch { /* ignore */ }
    fetch('/api/health-profile')
      .then(r => r.json())
      .then(({ profile }) => {
        setHealthProfile(profile ?? null);
        try { localStorage.setItem('hc_em_profile', JSON.stringify(profile ?? null)); } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setIsLoadingProfile(false));
  }, [status]);

  /* ── Load NHIS card ───────────────────────────────────────── */
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/nhis-card')
      .then(r => r.json())
      .then(({ nhisCard: card }) => {
        if (card) {
          setNhisCard({
            nhisId:         card.nhisId        || undefined,
            membershipType: card.membershipType || undefined,
            issuedDate:     card.issuedDate ? card.issuedDate.split('T')[0] : undefined,
            expiryDate:     card.expiryDate ? card.expiryDate.split('T')[0] : undefined,
            issuingBody:    card.issuingBody   || undefined,
            notes:          card.notes         || undefined,
          });
        }
      })
      .catch(() => {});
  }, [status]);

  /* ── Auto-detect location on mount ───────────────────────── */
  /* If the browser already granted geolocation permission, silently
     get coordinates and start loading the nearest ER immediately —
     no user action required. This is the core fix:
     "Nearest ER" should appear as soon as the page loads if GPS
     permission is already on, not only after "Share Location" is clicked. */
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!navigator.geolocation) return;
    // Use permissions API to check without triggering the browser prompt
    navigator.permissions?.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') {
        // Permission already granted — get location silently
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            // Run geocode + ER lookup in parallel for speed
            const [city] = await Promise.all([
              reverseGeocode(lat, lng),
              findNearestER(lat, lng),
            ]);
            setLocation({ lat, lng, city, accuracy });
            setLocationShared(true);
          },
          () => { /* silently fail — user can still click Share Location */ },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
      }
      // If 'prompt' or 'denied' — do nothing, wait for user to click Share Location
    }).catch(() => {
      // Permissions API not supported — try anyway with a short timeout
      // maximumAge:30000 so we use a cached position if available (no prompt)
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          const [city] = await Promise.all([
            reverseGeocode(lat, lng),
            findNearestER(lat, lng),
          ]);
          setLocation({ lat, lng, city, accuracy });
          setLocationShared(true);
        },
        () => { /* silently fail */ },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /* ── Reverse geocode via our API route ───────────────────── */
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      const city    = d.city    || '';
      const country = d.country || '';
      return city ? `${city}, ${country}` : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, []);

  /* ── Find nearest ERs via Overpass proxy ──────────────────── */
  const findNearestER = useCallback(async (lat: number, lng: number): Promise<NearbyFacility | null> => {
    setIsLoadingER(true);
    try {
      const query = `[out:json][timeout:10];(
        node["amenity"="hospital"](around:8000,${lat},${lng});
        way["amenity"="hospital"](around:8000,${lat},${lng});
      );out center body;`;

      const res = await fetch('/api/overpass', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      const calcDist = (la1: number, lo1: number, la2: number, lo2: number) => {
        const R = 6371;
        const dLat = (la2 - la1) * Math.PI / 180;
        const dLng = (lo2 - lo1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2
                + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const sorted = (data.elements || [])
        .map((el: any) => {
          const eLat = el.lat ?? el.center?.lat;
          const eLng = el.lon ?? el.center?.lon;
          if (!eLat || !eLng) return null;
          // Carry coordinates forward so top3 builder can use them
          return { name: el.tags?.name || 'Hospital', dist: calcDist(lat, lng, eLat, eLng), eLat, eLng };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.dist - b.dist);

      if (!sorted.length) {
        const fallback: NearbyFacility = { name: 'KATH', distance: 'See Facilities' };
        setNearestER(fallback);
        setNearbyERs([fallback]);
        setSelectedER(fallback);
        return fallback;
      }

      // Store top 3 as options — use eLat/eLng (the carried-forward coordinates)
      const top3: NearbyFacility[] = (sorted.slice(0, 3) as any[]).map(er => ({
        name: er.name,
        distance: `${er.dist.toFixed(1)} km`,
        lat: er.eLat,
        lng: er.eLng,
      }));
      setNearbyERs(top3);
      setNearestER(top3[0]);
      setSelectedER(top3[0]);
      return top3[0];
    } catch {
      const fallback: NearbyFacility = { name: 'KATH', distance: 'See Facilities' };
      setNearestER(fallback);
      setNearbyERs([fallback]);
      setSelectedER(fallback);
      return fallback;
    } finally {
      setIsLoadingER(false);
    }
  }, []);

  /* ── Share Location — preview first, then confirm ────────── */
  const shareLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported on this device.');
      return;
    }
    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        // Run geocode + ER lookup in parallel so neither blocks the other
        const [city] = await Promise.all([
          reverseGeocode(lat, lng),
          findNearestER(lat, lng),   // ER loads while geocode resolves
        ]);
        const pending = { lat, lng, city, accuracy };
        setPendingLocation(pending);
        setIsLoadingLocation(false);
        setShowLocationPreview(true);   // show preview modal — user confirms
      },
      (err) => {
        setIsLoadingLocation(false);
        if      (err.code === 1) setLocationError('Location permission denied. Enable GPS in browser settings.');
        else if (err.code === 2) setLocationError('Location signal unavailable. Check your GPS.');
        else                     setLocationError('Location request timed out. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [reverseGeocode, findNearestER]);

  /* ── Confirm share — called when user taps Share in preview ── */
  const confirmShareLocation = useCallback(async () => {
    if (!pendingLocation) return;
    const { lat, lng, city, accuracy } = pendingLocation;
    setLocation({ lat, lng, city, accuracy });
    setLocationShared(true);
    setShowLocationPreview(false);
    setPendingLocation(null);
    const shareText = `Emergency location: https://maps.google.com/?q=${lat},${lng}`;
    // Try native share sheet first (mobile-first)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'My Emergency Location', text: shareText, url: `https://maps.google.com/?q=${lat},${lng}` });
        return;
      } catch { /* user dismissed or browser denied — fall through to clipboard */ }
    }
    // Fallback to clipboard
    try { await navigator.clipboard.writeText(shareText); } catch { /* ignore */ }
  }, [pendingLocation]);

  /* ── Breathing guide (box breathing 4-4-4-4 pattern) ────────── */
  const startBreathing = useCallback(() => {
    setShowBreathing(true);
    setBreathPhase('inhale');
    setBreathCount(0);
    let phaseIdx = 0;
    let phaseElapsed = 0;
    if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    breathTimerRef.current = setInterval(() => {
      phaseElapsed++;
      if (phaseElapsed >= BREATH_PHASES[phaseIdx].secs) {
        phaseElapsed = 0;
        phaseIdx = (phaseIdx + 1) % BREATH_PHASES.length;
        setBreathPhase(BREATH_PHASES[phaseIdx].phase);
        if (phaseIdx === 0) setBreathCount(c => c + 1);
      }
    }, 1000);
  }, []);
  const stopBreathing = useCallback(() => {
    if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    setShowBreathing(false);
    setBreathPhase('inhale');
    setBreathCount(0);
  }, []);
  useEffect(() => () => { if (breathTimerRef.current) clearInterval(breathTimerRef.current); }, []);

  /* ── CPR Metronome — 100 bpm (600ms per beat, 300ms compress / 300ms release) ── */
  const startCpr = useCallback(() => {
    setCprActive(true);
    setCprCount(0);
    setCprPhase('compress');
    let tick = 0;
    if (cprTimerRef.current) clearInterval(cprTimerRef.current);
    cprTimerRef.current = setInterval(() => {
      tick++;
      setCprPhase(tick % 2 === 0 ? 'release' : 'compress');
      if (tick % 2 === 1) {
        setCprCount(c => c + 1);
        // Web Audio API tick — brief click at 100 bpm
        try {
          if (!cprAudioRef.current) cprAudioRef.current = new AudioContext();
          const ctx = cprAudioRef.current;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.35, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
          osc.start();
          osc.stop(ctx.currentTime + 0.07);
        } catch { /* AudioContext not available */ }
      }
    }, 300); // 300ms half-cycle = 600ms per beat = 100 bpm
  }, []);

  const stopCpr = useCallback(() => {
    if (cprTimerRef.current) clearInterval(cprTimerRef.current);
    setCprActive(false);
    setCprCount(0);
    setCprPhase('compress');
    if (cprAudioRef.current) {
      cprAudioRef.current.close().catch(() => {});
      cprAudioRef.current = null;
    }
  }, []);

  /* Focus whichever of these modals just opened, and let Escape close it —
     Location Preview, ER Picker, Poison, and Bystander previously had no
     focus management or keyboard-close path at all (only overlay click / X button). */
  useEffect(() => {
    if (!showLocationPreview && !showERPicker && !showPoison && !showBystander) return;
    if (showLocationPreview) locPreviewRef.current?.focus();
    else if (showERPicker) erPickerRef.current?.focus();
    else if (showPoison) poisonModalRef.current?.focus();
    else if (showBystander) bystanderModalRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showLocationPreview) { setShowLocationPreview(false); setPendingLocation(null); }
      else if (showERPicker) setShowERPicker(false);
      else if (showPoison) setShowPoison(false);
      else if (showBystander) { setShowBystander(false); stopCpr(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showLocationPreview, showERPicker, showPoison, showBystander, stopCpr]);

  useEffect(() => () => {
    if (cprTimerRef.current) clearInterval(cprTimerRef.current);
    if (cprAudioRef.current) cprAudioRef.current.close().catch(() => {});
  }, []);

  /* ── Personalised guides derived from Medical ID ─────────── */
  const personalisedGuides = React.useMemo(
    () => buildPersonalisedGuides(healthProfile?.allergies, healthProfile?.conditions, healthProfile?.medications),
    [healthProfile],
  );
  const allFirstAidGuides = [...personalisedGuides, ...FIRST_AID_GUIDES];

  /* ── Copy personal emergency card ─────────────────────────── */
  const copyPersonalCard = async () => {
    const lines = [
      `=== EMERGENCY MEDICAL ID: ${userName} ===`,
      `Blood Type: ${medIdBloodType}`,
      `Allergies: ${medIdAllergies}`,
      `Conditions: ${medIdConditions}`,
      `Medications: ${medIdMedications}`,
      location ? `Location: https://maps.google.com/?q=${location.lat},${location.lng}` : '',
      `Generated: ${new Date().toLocaleString()}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopiedId('card');
      setTimeout(() => setCopiedId(null), 3000);
    } catch { /* ignore */ }
  };

  /* ── Copy a first-aid guide as plain text ─────────────────── */
  const copyGuide = async (guide: FirstAidGuide) => {
    const lines = [
      `=== ${guide.title.replace(/^[^\w]+/, '').trim()}: FIRST AID ===`,
      guide.warning ? `⚠ ${guide.warning}` : '',
      '',
      ...guide.steps.map((s, i) => `${i + 1}. ${s.label ? s.label + ': ' : ''}${s.instruction}${s.tip ? `\n   Tip: ${s.tip}` : ''}`),
      '',
      'Call 193 (National Ambulance) for emergencies.',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopiedId(`guide-${guide.id}`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch { /* ignore */ }
  };

  /* ── Build PDF data — mirrors exactly what the Medical ID modal
         shows, since the modal is now the PDF's on-screen preview ── */
  const buildEmergencyPdfData = (): MedicalIdPdfData => ({
    userName,
    userEmail,
    bloodType:   medIdBloodType,
    allergies:   (healthProfile?.allergies ?? []).map(a => ({ name: a.name, severity: a.severity })),
    medications: (healthProfile?.medications ?? []).filter(m => m.active).map(m => ({ name: m.name, dose: m.dose })),
    conditions:  (healthProfile?.conditions ?? []).filter(c => c.status !== 'resolved').map(c => ({ name: c.name, status: c.status })),
    nhis: nhisCard ?? null,
  });

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generateMedicalIdPdf } = await import('@/lib/generateMedicalIdPdf');
      generateMedicalIdPdf(buildEmergencyPdfData());
    } catch (e) { console.error('PDF error:', e); }
    finally { setIsGeneratingPdf(false); }
  };

  const handlePrintPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { printMedicalIdPdf } = await import('@/lib/generateMedicalIdPdf');
      printMedicalIdPdf(buildEmergencyPdfData());
    } catch (e) { console.error('Print error:', e); }
    finally { setIsGeneratingPdf(false); }
  };

  /* ── QR Code — generate 30-day emergency brief link ────────── */
  const generateQr = async () => {
    setIsGeneratingQr(true);
    setQrError('');
    try {
      const res = await fetch('/api/emergency-brief/generate', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate');
      const { url, expiresAt } = await res.json();
      const dataUrl = await QRCode.toDataURL(url, {
        width: 240, margin: 2,
        color: { dark: '#111827', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
      setQrBriefUrl(url);
      setQrExpiresAt(expiresAt);
    } catch {
      setQrError('Could not generate QR code. Please try again.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const removeQr = async () => {
    await fetch('/api/emergency-brief/generate', { method: 'DELETE' });
    setQrDataUrl(null);
    setQrBriefUrl(null);
    setQrExpiresAt(null);
    setQrError('');
  };

  /* ── Load existing QR on mount ────────────────────────────── */
  useEffect(() => {
    if (status !== 'authenticated') return;
    // Fetch existing brief token (GET) — only renders if one already exists
    fetch('/api/emergency-brief/status')
      .then(r => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data?.url) return;
        const dataUrl = await QRCode.toDataURL(data.url, {
          width: 240, margin: 2,
          color: { dark: '#111827', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
        setQrBriefUrl(data.url);
        setQrExpiresAt(data.expiresAt);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /* ── Copy to clipboard ────────────────────────────────────── */
  const copyPhone = async (id: string, number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  /* ── Derived Medical ID values ────────────────────────────── */
  const medIdBloodType = healthProfile?.bloodType || 'Not set';
  const medIdAllergies = healthProfile?.allergies?.length
    ? healthProfile.allergies.map(a => a.name).join(', ')
    : 'None listed';
  const medIdConditions = healthProfile?.conditions?.filter(c => c.status !== 'resolved').length
    ? healthProfile.conditions!.filter(c => c.status !== 'resolved').map(c => `${c.name} (${c.status})`).join(', ')
    : 'None listed';
  const medIdMedications = healthProfile?.medications?.filter(m => m.active).length
    ? healthProfile.medications!.filter(m => m.active).map(m => m.dose ? `${m.name} ${m.dose}` : m.name).join(', ')
    : 'None listed';

  // ── Notifications ────────────────────────────────────────────
  // Same three contextual tips as before (nearest ER, location shared,
  // Medical ID gaps) — now contributed into the single shared bell feed
  // instead of driving this page's own panel. See NotificationsContext.tsx.
  const emNotifications = React.useMemo<AppNotification[]>(() => {
    const nowIso = new Date().toISOString();
    const list: AppNotification[] = [];
    if (location && nearestER)
      list.push({
        id: 'er', icon: Navigation, color: 'red', scope: 'contextual', createdAt: nowIso,
        title: `Nearest ER: ${nearestER.name}`,
        body: `${nearestER.distance} away. Tap to open in Maps.`,
        onSelect: () => window.open(`https://maps.google.com/maps/search/hospital/@${location.lat},${location.lng},14z`, '_blank'),
      });
    if (locationShared && location)
      list.push({
        id: 'loc', icon: MapPin, color: 'teal', scope: 'contextual', createdAt: nowIso,
        title: `Location shared: ${location.city || 'GPS acquired'}`,
        body: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}${location.accuracy ? `, ±${Math.round(location.accuracy)}m` : ''}`,
        onSelect: () => window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank'),
      });
    if (medIdBloodType === 'Not set')
      list.push({
        id: 'medid', icon: BookOpen, color: 'amber', scope: 'contextual', createdAt: nowIso,
        title: 'Your Medical ID needs a few things',
        body: 'Add your blood type and allergies so first responders know what to do.',
        onSelect: () => router.push('/profile?modal=medicalId'),
      });
    return list;
  }, [location, nearestER, locationShared, medIdBloodType, router]);

  useRegisterNotifications('emergency', emNotifications);

  const filteredGuides = allFirstAidGuides.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      (g.tags ?? []).some((t: string) => t.toLowerCase().includes(q)) ||
      g.steps.some((s: FirstAidStep) => s.instruction.toLowerCase().includes(q)) ||
      (g.warning ?? '').toLowerCase().includes(q)
    );
  });

  const severityLabel = (s: FirstAidGuide['severity']) =>
    s === 'critical'
      ? `🔴 ${t('emergency.critical', 'Critical')}`
      : s === 'high'
      ? `🟠 ${t('emergency.high', 'High Priority')}`
      : `🟡 ${t('emergency.medium', 'Medium')}`;
  const severityColor = (s: FirstAidGuide['severity']) =>
    s === 'critical' ? 'em-guide--critical' : s === 'high' ? 'em-guide--high' : 'em-guide--medium';

  /* ── Guards ───────────────────────────────────────────────── */
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

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <DashboardLayout activeTab="/emergency" className="hc-layout--has-mob-topbar">

      {/* ── Fixed background layer — pattern + tint stay pinned to the
           viewport while everything else scrolls over it. A real
           position:fixed element, not background-attachment:fixed,
           since that CSS property is unreliably ignored on iOS Safari. ── */}
      <div className="em-bg-fixed" aria-hidden="true" />

      {/* ── Desktop topbar ─────────────────────────────────── */}
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
    ref={facilitySearchRef}
    className="db-topbar__search-input"
    type="search"
    placeholder="Search facilities..."
    value={facilityQuery}
    onChange={e => setFacilityQuery(e.target.value)}
    onKeyDown={handleSearchKeyDown}
    aria-label="Search facilities"
  />
  {facilityQuery.trim() && (
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
                  <NotificationBell
                    className="db-topbar__icon-btn db-topbar__notif"
                    dotClassName="db-topbar__notif-dot"
                    aria-label="Notifications"
                  />
                  <Link href="/profile" className="db-topbar__user" title="Go to Profile & Settings" style={{ textDecoration: 'none' }}>
                    <div className="db-topbar__user-avatar">
                        {userImage
                          ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" />
                          : userInitials}
                      </div>
                    <div className="db-topbar__user-info">
                      <span className="db-topbar__user-name">{userName}</span>
                      <span className="db-topbar__user-id">HC-{userEmail.slice(0,5).toUpperCase()}</span>
                    </div>
                  </Link>
                </div>
      </div>

      {/* ── Mobile topbar ──────────────────────────────────── */}
      <div className="mob-topbar">
        <div className="mob-topbar__left">
          <HCLogo size={30} />
          <span className="mob-topbar__logo-text">HealthConnect</span>
        </div>
        <div className="mob-topbar__right">
          <MobTopbarMenu />
        </div>
      </div>

      {/* Notifications panel is now the single shared one — see
          NotificationPanel.tsx, mounted once by DashboardLayout. This
          page just registers its tips into the feed above (emNotifications
          + useRegisterNotifications). */}

      {/* ── Mobile bottom nav ──────────────────────────────── */}
      <MobTabBar currentPath="/emergency" />

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════ */}
      <div className="db-page em-page">

        {/* ── PAGE HEADER ──────────────────────────────────── */}
        <div className="em-page-header">
          <div>
            <h1 className="em-page-header__title">{t('emergency.title', 'Emergency Hub')}</h1>
            <p className="em-page-header__sub">{t('emergency.subtitle', 'Call for help, share your location, or get first aid guidance in one tap')}</p>
          </div>
        </div>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div className="em-hero">
          <div className="em-hero__content">

            {/* Left — quick action cards */}
            <div className="em-hero__left">
              {locationError && (
                <div className="em-loc-error"><AlertCircle size={13} /> {locationError}</div>
              )}
              <div className="em-action-grid">

                {/* ── Situation actions — hazard-panel treatment: caution-stripe
                     rail, dispatcher-style urgency tags, glow-ring icons. This
                     is the "act now" tier, second only to the Call 193 hero
                     action on the right. ── */}
                <div className="em-section-head em-section-head--urgent">
                  <span className="em-section-head__icon"><Siren size={13} /></span>
                  <span className="em-section-head__label">Urgent situations</span>
                  <span className="em-section-head__hint">Act now</span>
                </div>
                <button className="em-urgent-jump" onClick={goToFirstAid} type="button">
                  <span>Don't see your situation? See all {allFirstAidGuides.length} guides</span>
                  <ChevronRight size={12} />
                </button>
                <div className="em-urgent-panel">
                  <button className="em-action em-action--amber em-action--featured" onClick={() => { setShowPoison(true); setPoisonStep('triage'); }} type="button">
                    <span className="em-action__scene" style={{ backgroundImage: `url('/images/emergency/poison-overdose-${isDarkMode ? 'dark' : 'light'}.webp')`, backgroundColor: isDarkMode ? '#0c0c0c' : '#d1cbc6' }} aria-hidden="true" />
                    <span className="em-action__icon"><AlertTriangle size={18} /></span>
                    <span className="em-action__body">
                      <span className="em-action__title-row">
                        <span className="em-action__title">Poison or Overdose</span>
                        <span className="em-action__tag em-action__tag--amber">Call 193 first</span>
                      </span>
                      <span className="em-action__meta">What to do in the first few minutes, step by step</span>
                    </span>
                    <ChevronRight size={15} className="em-action__arrow" />
                  </button>
                  <button className="em-action em-action--red em-action--featured" onClick={() => { setShowBystander(true); setBystanderStep(0); }} type="button">
                    <span className="em-action__scene em-action__scene--photo" style={{ backgroundImage: `url('/images/emergency/collapse-photo-${isDarkMode ? 'dark' : 'light'}.webp')` }} aria-hidden="true" />
                    <span className="em-action__icon"><HeartPulse size={18} /></span>
                    <span className="em-action__body">
                      <span className="em-action__title-row">
                        <span className="em-action__title">Someone Collapsed</span>
                        <span className="em-action__tag em-action__tag--red">First 60 sec</span>
                      </span>
                      <span className="em-action__meta">CPR guide that talks you through it in real time</span>
                    </span>
                    <ChevronRight size={15} className="em-action__arrow" />
                  </button>
                  <div className="em-er-card">
                    <button
                      className="em-action em-action--safe em-action--featured em-action--card-top"
                      onClick={() => {
                        if (nearbyERs.length > 1) { setShowERPicker(true); return; }
                        if (selectedER?.lat && selectedER?.lng) {
                          window.open(`https://maps.google.com/?q=${selectedER.lat},${selectedER.lng}`, '_blank');
                        } else if (location) {
                          window.open(`https://maps.google.com/maps/search/${encodeURIComponent(selectedER?.name || 'hospital')}/@${location.lat},${location.lng},14z`, '_blank');
                        } else {
                          shareLocation();
                        }
                      }}
                      type="button"
                    >
                      {nearbyERs.length > 1 && (
                        <span className="em-action__badge">{nearbyERs.length}</span>
                      )}
                      <span className="em-action__scene em-action__scene--photo" style={{ backgroundImage: `url('/images/emergency/er-photo-${isDarkMode ? 'dark' : 'light'}.webp')`, backgroundPosition: 'center' }} aria-hidden="true" />
                      <span className="em-action__icon">
                        {isLoadingER ? <Loader2 size={18} className="em-spin" /> : <Navigation size={18} />}
                      </span>
                      <span className="em-action__body">
                        <span className="em-action__title">Nearest Emergency Room</span>
                        <span className="em-action__meta">
                          {isLoadingER ? 'Locating the closest ER…' : selectedER ? `${selectedER.distance} away · opens driving directions` : 'Turn on location to see distance'}
                        </span>
                      </span>
                      <ChevronRight size={15} className="em-action__arrow" />
                    </button>
                    <button className="em-er-card__footer" onClick={goToFirstAid} type="button">
                      <Plus size={14} />
                      <span>Still not it? Browse all first aid guides</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* ── Support tools — one consolidated, calmer panel instead
                     of a fourth row of red/amber cards, so the eye reads
                     "urgent" vs "everything else" at a glance. ── */}
                <div className="em-section-head em-section-head--calm">
                  <span className="em-section-head__icon"><ShieldCheck size={13} /></span>
                  <span className="em-section-head__label">Support tools</span>
                </div>
                <div className="em-toolkit">
                  <button className="em-toolkit__row" onClick={locationShared && location ? () => setShowLocationPreview(true) : shareLocation} type="button">
                    <span className="em-toolkit__icon">
                      {isLoadingLocation ? <Loader2 size={17} className="em-spin" /> : <MapPin size={17} />}
                    </span>
                    <span className="em-toolkit__body">
                      <span className="em-toolkit__title">{locationShared ? 'Location Shared' : 'Share Your Location'}</span>
                      <span className="em-toolkit__meta">
                        {locationShared ? (location?.city ? `Live, visible from ${location.city}` : 'Live, visible to your contacts') : 'Send your exact GPS position over WhatsApp'}
                      </span>
                    </span>
                    {locationShared && <span className="em-toolkit__status" aria-hidden="true" />}
                    <ChevronRight size={14} className="em-toolkit__arrow" />
                  </button>
                  <button className="em-toolkit__row" onClick={() => setShowPersonalCard(true)} type="button">
                    <span className="em-toolkit__icon"><ClipboardList size={17} /></span>
                    <span className="em-toolkit__body">
                      <span className="em-toolkit__title">My Medical ID</span>
                      <span className="em-toolkit__meta">Blood type & allergies, ready to show paramedics</span>
                    </span>
                    <ChevronRight size={14} className="em-toolkit__arrow" />
                  </button>
                  <button className="em-toolkit__row" onClick={startBreathing} type="button">
                    <span className="em-toolkit__icon em-toolkit__icon--safe"><Wind size={17} /></span>
                    <span className="em-toolkit__body">
                      <span className="em-toolkit__title">Calm Breathing</span>
                      <span className="em-toolkit__meta">Guided 4-4-4-4 box breathing to steady yourself</span>
                    </span>
                    <ChevronRight size={14} className="em-toolkit__arrow" />
                  </button>
                  <Link href="/facilities" className="em-toolkit__row">
                    <span className="em-toolkit__icon"><Building2 size={17} /></span>
                    <span className="em-toolkit__body">
                      <span className="em-toolkit__title">Find a Hospital</span>
                      <span className="em-toolkit__meta">Browse hospitals, clinics & pharmacies near you</span>
                    </span>
                    <ChevronRight size={14} className="em-toolkit__arrow" />
                  </Link>
                </div>

              </div>
            </div>

            {/* Right — Call 193, the main action on this page */}
            <div className="em-call193-wrap">
              <a href="tel:193" className="em-call193-card" aria-label="Call 193, National Ambulance Service, free, available 24 hours">
                <div className="em-call193-card__ring em-call193-card__ring--1" />
                <div className="em-call193-card__ring em-call193-card__ring--2" />
                <div className="em-call193-card__ring em-call193-card__ring--3" />
                <div className="em-call193-card__icon"><Phone size={28} /></div>
                <div className="em-call193-card__body">
                  <span className="em-call193-card__title">Call 193</span>
                  <span className="em-call193-card__meta">National Ambulance Service</span>
                  <span className="em-call193-card__tag">24/7 · Free · No airtime needed</span>
                </div>
              </a>
              <span className="em-hero__badge em-call193-calm-badge"><span className="em-hero__badge-dot" />Stay calm. Help is on the way.</span>
            </div>
          </div>
        </div>

        {/* ── LOCATION PREVIEW MODAL ───────────────────────────── */}
        {(showLocationPreview && (pendingLocation || location)) && (() => {
          const loc = pendingLocation || location!;
          const confirmed = !pendingLocation && locationShared;
          return createPortal(
            <div className="em-loc-preview-overlay" onClick={() => { setShowLocationPreview(false); setPendingLocation(null); }}>
              <div className="em-loc-preview" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="em-loc-preview-title" ref={locPreviewRef} tabIndex={-1}>
                <div className="em-loc-preview__header">
                  <div className="em-loc-preview__header-icon">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="em-loc-preview__title" id="em-loc-preview-title">Your Location</p>
                    <p className="em-loc-preview__subtitle">{confirmed ? 'Shared. Link copied to clipboard' : 'Confirm before sharing'}</p>
                  </div>
                  <button className="em-loc-preview__close" onClick={() => { setShowLocationPreview(false); setPendingLocation(null); }} type="button"><X size={16} /></button>
                </div>

                <div className="em-loc-preview__body">
                  <div className="em-loc-preview__map-stub">
                    <MapPin size={28} style={{ color: '#ff4d6d' }} />
                    <span className="em-loc-preview__map-city">{loc.city || 'Detecting city…'}</span>
                  </div>
                  <div className="em-loc-preview__coords">
                    <span className="em-loc-preview__coord-label">Latitude</span>
                    <span className="em-loc-preview__coord-val">{loc.lat.toFixed(5)}°</span>
                    <span className="em-loc-preview__coord-label">Longitude</span>
                    <span className="em-loc-preview__coord-val">{loc.lng.toFixed(5)}°</span>
                    {loc.accuracy && (
                      <>
                        <span className="em-loc-preview__coord-label">Accuracy</span>
                        <span className="em-loc-preview__coord-val">±{Math.round(loc.accuracy)}m</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="em-loc-preview__actions">
                  <a
                    href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="em-loc-preview__btn em-loc-preview__btn--ghost"
                  >
                    <ExternalLink size={14} /> Open in Maps
                  </a>
                  {!confirmed ? (
                    <>
                      <button className="em-loc-preview__btn em-loc-preview__btn--primary" onClick={confirmShareLocation} type="button">
                        {typeof navigator.share === 'function'
                          ? <><Navigation size={14} /> Share Location</>
                          : <><Copy size={14} /> Copy Link</>
                        }
                      </button>
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🆘 Emergency location: https://maps.google.com/?q=${loc.lat},${loc.lng}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="em-loc-preview__btn em-loc-preview__btn--whatsapp"
                      >
                        <Phone size={14} /> WhatsApp
                      </a>
                    </>
                  ) : (
                    <button className="em-loc-preview__btn em-loc-preview__btn--primary" onClick={() => { navigator.clipboard.writeText(`Emergency location: https://maps.google.com/?q=${loc.lat},${loc.lng}`); }} type="button">
                      <Check size={14} /> Copy Again
                    </button>
                  )}
                </div>
              </div>
            </div>,
            document.body
          );
        })()}

        {/* ── NEAREST ER PICKER ────────────────────────────────── */}
        {showERPicker && createPortal(
          <div className="em-er-picker-overlay" onClick={() => setShowERPicker(false)}>
            <div className="em-er-picker" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="em-er-picker-title" ref={erPickerRef} tabIndex={-1}>
              <div className="em-er-picker__header">
                <div className="em-er-picker__header-icon"><Navigation size={16} /></div>
                <div>
                  <p className="em-er-picker__title" id="em-er-picker-title">Nearby Emergency Rooms</p>
                  <p className="em-er-picker__sub">Choose the one you want to head to</p>
                </div>
                <button className="em-loc-preview__close" onClick={() => setShowERPicker(false)} type="button"><X size={16} /></button>
              </div>
              <div className="em-er-picker__list">
                {nearbyERs.map((er, idx) => (
                  <button
                    key={er.name + idx}
                    className={`em-er-picker__item${selectedER?.name === er.name ? ' em-er-picker__item--active' : ''}`}
                    onClick={() => {
                      setSelectedER(er);
                      setNearestER(er);
                      setShowERPicker(false);
                      // Open Maps to the specific ER if we have coordinates, else search nearby
                      if (er.lat && er.lng) {
                        window.open(`https://maps.google.com/?q=${er.lat},${er.lng}`, '_blank');
                      } else if (location) {
                        window.open(`https://maps.google.com/maps/search/${encodeURIComponent(er.name)}/@${location.lat},${location.lng},14z`, '_blank');
                      }
                    }}
                    type="button"
                  >
                    <div className="em-er-picker__item-icon">
                      {idx === 0 ? <Navigation size={15} /> : <MapPin size={15} />}
                    </div>
                    <div className="em-er-picker__item-body">
                      <span className="em-er-picker__item-name">{er.name}</span>
                      <span className="em-er-picker__item-dist">{er.distance} away</span>
                    </div>
                    {idx === 0 && <span className="em-er-picker__item-nearest">Nearest</span>}
                    {selectedER?.name === er.name && <Check size={15} style={{ color: 'var(--hc-teal)', flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
              {location && (
                <a
                  onClick={() => router.push('/facilities?type=hospital&from=/emergency')}
                  className="em-er-picker__map-link"
                >
                  <MapPin size={13} /> See all hospitals on map
                </a>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* ── BREATHING GUIDE MODAL ────────────────────────────── */}
        {showBreathing && (() => {
          const current = BREATH_PHASES.find(p => p.phase === breathPhase)!;
          return (
            <div className="em-breathing-overlay" onClick={stopBreathing}>
              <div className="em-breathing-modal" onClick={e => e.stopPropagation()}>
                <button className="em-breathing-close" onClick={stopBreathing} type="button"><X size={18}/></button>
                <p className="em-breathing-title">{t('emergency.breathing', 'Box Breathing')}</p>
                <p className="em-breathing-cycle">Cycle {breathCount + 1}</p>
                <div className="em-breathing-circle" style={{ '--breath-color': current.color } as React.CSSProperties}>
                  <div className={`em-breathing-ring em-breathing-ring--${breathPhase}`} />
                  <div className="em-breathing-core">
                    <span className="em-breathing-phase">
                      {current.phase === 'inhale'  ? t('emergency.breatheIn',  current.label)
                     : current.phase === 'hold'    ? t('emergency.hold',       current.label)
                     : current.phase === 'exhale'  ? t('emergency.breatheOut', current.label)
                                                   : t('emergency.rest',       current.label)}
                    </span>
                    <span className="em-breathing-secs">{current.secs}s</span>
                  </div>
                </div>
                <p className="em-breathing-hint">Box breathing 4-4-4-4 · Tap anywhere to stop</p>
              </div>
            </div>
          );
        })()}

        {/* ── POISON & OVERDOSE MODAL ─────────────────────────── */}
        {showPoison && createPortal(
          <div className="em-poison-overlay" onClick={() => setShowPoison(false)}>
            <div className="em-poison-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="em-poison-modal-title" ref={poisonModalRef} tabIndex={-1}>
              <div className="em-poison-modal__header">
                <div className="em-poison-modal__header-icon">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="em-poison-modal__title" id="em-poison-modal-title">Poison / Overdose</p>
                  <p className="em-poison-modal__sub">Select what happened first</p>
                </div>
                <button className="em-loc-preview__close" onClick={() => setShowPoison(false)} type="button"><X size={16} /></button>
              </div>

              {/* ── Critical warning banner ── */}
              <div className="em-poison-modal__warn">
                <AlertCircle size={14} />
                <span>Call <strong>Poison Control: 0800-111-222</strong> or <strong>193</strong> immediately. Do NOT wait for symptoms.</span>
              </div>

              {/* ── Triage: what type of exposure? ── */}
              {poisonStep === 'triage' && (
                <div className="em-poison-triage">
                  <p className="em-poison-triage__label">How did the exposure happen?</p>
                  <div className="em-poison-triage__grid">
                    <button className="em-poison-triage__btn em-poison-triage__btn--orange" onClick={() => setPoisonStep('swallowed')} type="button">
                      <span className="em-poison-triage__emoji">🤢</span>
                      <span className="em-poison-triage__name">Swallowed / Ingested</span>
                      <span className="em-poison-triage__hint">Pills, chemicals, household products, plants</span>
                    </button>
                    <button className="em-poison-triage__btn em-poison-triage__btn--purple" onClick={() => setPoisonStep('inhaled')} type="button">
                      <span className="em-poison-triage__emoji">💨</span>
                      <span className="em-poison-triage__name">Inhaled / Breathed in</span>
                      <span className="em-poison-triage__hint">Fumes, gas, smoke, sprays</span>
                    </button>
                    <button className="em-poison-triage__btn em-poison-triage__btn--teal" onClick={() => setPoisonStep('skin')} type="button">
                      <span className="em-poison-triage__emoji">🖐️</span>
                      <span className="em-poison-triage__name">Skin / Body Contact</span>
                      <span className="em-poison-triage__hint">Chemical splash, pesticide on skin</span>
                    </button>
                    <button className="em-poison-triage__btn em-poison-triage__btn--blue" onClick={() => setPoisonStep('eye')} type="button">
                      <span className="em-poison-triage__emoji">👁️</span>
                      <span className="em-poison-triage__name">Eye Contact</span>
                      <span className="em-poison-triage__hint">Chemical or substance in eye</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Swallowed / Ingested ── */}
              {poisonStep === 'swallowed' && (
                <div className="em-poison-steps">
                  <button className="em-poison-back" onClick={() => setPoisonStep('triage')} type="button">← Back</button>
                  <div className="em-poison-critical-rule">
                    <span className="em-poison-critical-rule__icon">🚫</span>
                    <span><strong>Do NOT induce vomiting</strong> unless told to by a medical professional. It can cause more harm with certain chemicals.</span>
                  </div>
                  {[
                    { n: 1, t: 'Call for help immediately', d: 'Call 193 (ambulance) or Poison Control 0800-111-222. Stay on the line.', tip: 'Tell them: what was swallowed, how much, the person\'s age and weight, and when it happened.' },
                    { n: 2, t: 'Keep the container or packaging', d: 'Do not throw it away. Read the label for the substance name, the responder will need this.', tip: null },
                    { n: 3, t: 'Keep the person still and upright', d: 'Sit them up if conscious. Do not give food, water, or milk unless instructed by Poison Control.', tip: 'If they are unconscious but breathing, put them in the recovery position on their side.' },
                    { n: 4, t: 'Watch for warning signs', d: 'Vomiting, seizures, difficulty breathing, loss of consciousness, burns around the mouth. Report these to the dispatcher.', tip: null },
                    { n: 5, t: 'If they stop breathing', d: 'Begin CPR immediately. 30 chest compressions, then 2 rescue breaths. Continue until help arrives.', tip: 'Use the "Someone Collapsed" card for a step-by-step CPR guide.' },
                  ].map(s => (
                    <div key={s.n} className="em-poison-step">
                      <div className="em-poison-step__num">{s.n}</div>
                      <div className="em-poison-step__body">
                        <p className="em-poison-step__title">{s.t}</p>
                        <p className="em-poison-step__desc">{s.d}</p>
                        {s.tip && <div className="em-poison-step__tip"><Info size={11} /> {s.tip}</div>}
                      </div>
                    </div>
                  ))}
                  <div className="em-poison-actions">
                    <a href="tel:193" className="em-poison-cta em-poison-cta--red"><Phone size={14} /> Call 193 Now</a>
                    <button className="em-poison-cta em-poison-cta--ghost" onClick={() => { setShowPoison(false); setShowBystander(true); setBystanderStep(0); }} type="button"><Activity size={14} /> CPR Guide</button>
                  </div>
                </div>
              )}

              {/* ── Inhaled ── */}
              {poisonStep === 'inhaled' && (
                <div className="em-poison-steps">
                  <button className="em-poison-back" onClick={() => setPoisonStep('triage')} type="button">← Back</button>
                  <div className="em-poison-critical-rule">
                    <span className="em-poison-critical-rule__icon">⚠️</span>
                    <span><strong>Do NOT enter the area</strong> if you can smell fumes strongly. Call 192 (Fire / Hazmat) before entering.</span>
                  </div>
                  {[
                    { n: 1, t: 'Move to fresh air immediately', d: 'Get the person away from the source. Move to an open area outdoors or a well-ventilated room.', tip: 'Hold your breath if entering briefly. Do not stay in a fume-filled space.' },
                    { n: 2, t: 'Call 193 or Fire/Hazmat (192)', d: 'Inhaled poisons can cause delayed lung damage even if the person feels okay now.', tip: null },
                    { n: 3, t: 'Loosen restrictive clothing', d: 'Loosen collar, belt, or anything that restricts breathing. Keep the person calm and still.', tip: null },
                    { n: 4, t: 'Do not give anything by mouth', d: 'No water, no food, no medication unless instructed by emergency services.', tip: null },
                    { n: 5, t: 'Monitor breathing closely', d: 'If the person stops breathing, begin CPR. If unconscious but breathing, put them on their side.', tip: null },
                  ].map(s => (
                    <div key={s.n} className="em-poison-step">
                      <div className="em-poison-step__num">{s.n}</div>
                      <div className="em-poison-step__body">
                        <p className="em-poison-step__title">{s.t}</p>
                        <p className="em-poison-step__desc">{s.d}</p>
                        {s.tip && <div className="em-poison-step__tip"><Info size={11} /> {s.tip}</div>}
                      </div>
                    </div>
                  ))}
                  <div className="em-poison-actions">
                    <a href="tel:193" className="em-poison-cta em-poison-cta--red"><Phone size={14} /> Call 193</a>
                    <a href="tel:192" className="em-poison-cta em-poison-cta--orange"><Flame size={14} /> Call 192 (Fire)</a>
                  </div>
                </div>
              )}

              {/* ── Skin contact ── */}
              {poisonStep === 'skin' && (
                <div className="em-poison-steps">
                  <button className="em-poison-back" onClick={() => setPoisonStep('triage')} type="button">← Back</button>
                  {[
                    { n: 1, t: 'Remove contaminated clothing', d: 'Take off any clothing or jewellery that has the substance on it. Use gloves if possible, avoid direct contact yourself.', tip: 'Place contaminated clothing in a plastic bag.' },
                    { n: 2, t: 'Rinse with large amounts of water', d: 'Flush the affected skin with clean running water for at least 15 to 20 minutes. Do not scrub.', tip: 'Avoid hot water: it opens pores and can increase absorption.' },
                    { n: 3, t: 'Do not apply creams or home remedies', d: 'Do not use butter, toothpaste, or any home remedy. These can trap the chemical against the skin.', tip: null },
                    { n: 4, t: 'Call Poison Control', d: 'Call 0800-111-222 with the name of the chemical. Even if the skin looks okay, some chemicals absorb through the skin into the bloodstream.', tip: null },
                  ].map(s => (
                    <div key={s.n} className="em-poison-step">
                      <div className="em-poison-step__num">{s.n}</div>
                      <div className="em-poison-step__body">
                        <p className="em-poison-step__title">{s.t}</p>
                        <p className="em-poison-step__desc">{s.d}</p>
                        {s.tip && <div className="em-poison-step__tip"><Info size={11} /> {s.tip}</div>}
                      </div>
                    </div>
                  ))}
                  <div className="em-poison-actions">
                    <a href="tel:193" className="em-poison-cta em-poison-cta--red"><Phone size={14} /> Call 193</a>
                  </div>
                </div>
              )}

              {/* ── Eye contact ── */}
              {poisonStep === 'eye' && (
                <div className="em-poison-steps">
                  <button className="em-poison-back" onClick={() => setPoisonStep('triage')} type="button">← Back</button>
                  <div className="em-poison-critical-rule">
                    <span className="em-poison-critical-rule__icon">⏱️</span>
                    <span><strong>Time is critical for the eye.</strong> Flush immediately. Every second reduces damage.</span>
                  </div>
                  {[
                    { n: 1, t: 'Flush the eye immediately', d: 'Use clean running water or an eye-wash station. Hold the eyelid open and let water run from the inner corner outward for 15 to 20 minutes.', tip: 'Tilt the head so the affected eye is lower: this prevents chemical washing into the other eye.' },
                    { n: 2, t: 'Remove contact lenses first', d: 'If the person wears contact lenses, remove them before flushing if possible.', tip: null },
                    { n: 3, t: 'Do not rub the eye', d: 'Rubbing spreads the substance and can cause abrasions to the cornea.', tip: null },
                    { n: 4, t: 'Call Poison Control or go to A&E', d: 'Eye exposure from chemicals always needs medical evaluation even if the eye looks fine after flushing.', tip: null },
                  ].map(s => (
                    <div key={s.n} className="em-poison-step">
                      <div className="em-poison-step__num">{s.n}</div>
                      <div className="em-poison-step__body">
                        <p className="em-poison-step__title">{s.t}</p>
                        <p className="em-poison-step__desc">{s.d}</p>
                        {s.tip && <div className="em-poison-step__tip"><Info size={11} /> {s.tip}</div>}
                      </div>
                    </div>
                  ))}
                  <div className="em-poison-actions">
                    <a href="tel:193" className="em-poison-cta em-poison-cta--red"><Phone size={14} /> Call 193</a>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* ── BYSTANDER DISPATCH MODAL ─────────────────────────── */}
        {showBystander && (() => {
          const BYSTANDER_STEPS = [
            {
              icon: '👋',
              label: 'Check responsiveness',
              instruction: 'Tap their shoulders firmly and shout: "Are you okay? Can you hear me?"',
              detail: 'Look for eye movement, groaning, or any response. If they respond, keep them still and call 193.',
              urgent: false,
            },
            {
              icon: '📞',
              label: 'Call 193 immediately',
              instruction: 'Do this NOW even if you are not sure. Put the phone on speaker so you can keep helping.',
              detail: 'Tell the dispatcher: location, number of people affected, whether they are breathing. Stay on the line.',
              urgent: true,
            },
            {
              icon: '🫁',
              label: 'Check for breathing',
              instruction: 'Tilt their head back gently. Look for chest rise. Listen and feel for breath for up to 10 seconds.',
              detail: 'Occasional gasping (agonal breathing) is NOT normal breathing. Treat it as if they are not breathing.',
              urgent: false,
            },
            {
              icon: '🤲',
              label: 'Start chest compressions',
              instruction: 'Place both hands on the centre of their chest. Push hard and fast: at least 5 cm deep, 100 to 120 times per minute.',
              detail: 'Let the chest fully rise between compressions. Keep going until help arrives or the person starts breathing normally.',
              urgent: true,
            },
            {
              icon: '💨',
              label: 'Give rescue breaths (if trained)',
              instruction: 'After every 30 compressions, give 2 rescue breaths. Tilt the head, lift the chin, seal your mouth over theirs, and breathe in for 1 second.',
              detail: 'If you are not trained or uncomfortable, do compression-only CPR. It is still very effective.',
              urgent: false,
            },
            {
              icon: '🔁',
              label: 'Keep going until help arrives',
              instruction: 'Continue the 30:2 cycle (30 compressions, 2 breaths) without stopping. Swap with another bystander if possible to avoid fatigue.',
              detail: 'If an AED (defibrillator) is nearby, use it as soon as it arrives. Turn it on and follow the voice instructions.',
              urgent: false,
            },
          ];
          const step = BYSTANDER_STEPS[bystanderStep];
          const isFirst = bystanderStep === 0;
          const isLast = bystanderStep === BYSTANDER_STEPS.length - 1;
          return createPortal(
            <div className="em-bystander-overlay" onClick={() => { setShowBystander(false); stopCpr(); }}>
              <div className="em-bystander-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="em-bystander-modal-title" ref={bystanderModalRef} tabIndex={-1}>
                {/* Header */}
                <div className="em-bystander-modal__header">
                  <div className="em-bystander-modal__header-icon">
                    <Activity size={18} />
                  </div>
                  <div>
                    <p className="em-bystander-modal__title" id="em-bystander-modal-title">Someone Collapsed</p>
                    <p className="em-bystander-modal__sub">Step {bystanderStep + 1} of {BYSTANDER_STEPS.length}</p>
                  </div>
                  <button className="em-loc-preview__close" onClick={() => { setShowBystander(false); stopCpr(); }} type="button"><X size={16} /></button>
                </div>

                {/* Scrollable region — progress, dots, step content. Header above and
                    nav below stay pinned so Back / 193 / Next are always reachable. */}
                <div className="em-bystander-modal__body">
                  {/* Progress bar */}
                  <div className="em-bystander-progress">
                    <div
                      className="em-bystander-progress__fill"
                      style={{ width: `${((bystanderStep + 1) / BYSTANDER_STEPS.length) * 100}%` }}
                    />
                  </div>

                  {/* Step dots */}
                  <div className="em-bystander-dots">
                    {BYSTANDER_STEPS.map((_, i) => (
                      <button
                        key={i}
                        className={`em-bystander-dot${i === bystanderStep ? ' em-bystander-dot--active' : i < bystanderStep ? ' em-bystander-dot--done' : ''}`}
                        onClick={() => { if (i !== 3) stopCpr(); setBystanderStep(i); }}
                        type="button"
                        aria-label={`Go to step ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Step content */}
                  <div className="em-bystander-step">
                    <div className={`em-bystander-step__emoji${step.urgent ? ' em-bystander-step__emoji--urgent' : ''}`}>
                      {step.icon}
                    </div>
                    <p className="em-bystander-step__label">{step.label}</p>
                    <p className={`em-bystander-step__instruction${step.urgent ? ' em-bystander-step__instruction--urgent' : ''}`}>
                      {step.instruction}
                    </p>
                    <div className="em-bystander-step__detail">
                      <Info size={12} />
                      <span>{step.detail}</span>
                    </div>

                    {/* CPR Metronome — shown only on the compressions step (index 3) */}
                    {bystanderStep === 3 && (
                      <div className="em-cpr-metro">
                        <div className={`em-cpr-metro__beat${cprActive ? ` em-cpr-metro__beat--${cprPhase}` : ''}`}>
                          <span className="em-cpr-metro__icon">🤲</span>
                          {cprActive && (
                            <span className="em-cpr-metro__phase-label">
                              {cprPhase === 'compress' ? 'PUSH' : 'RELEASE'}
                            </span>
                          )}
                        </div>
                        <div className="em-cpr-metro__info">
                          <span className="em-cpr-metro__bpm">100 bpm</span>
                          {cprActive && (() => {
                            const posInSet = cprCount % 30 === 0 ? 30 : cprCount % 30;
                            const cycleNum = Math.floor((cprCount - 1) / 30) + 1;
                            const breathCue = cprCount > 0 && cprCount % 30 === 0;
                            return (
                              <span className="em-cpr-metro__count">
                                {breathCue
                                  ? <span className="em-cpr-metro__breath-cue">→ 2 rescue breaths now!</span>
                                  : <>{posInSet} / 30 · cycle {cycleNum}</>
                                }
                              </span>
                            );
                          })()}
                        </div>
                        <button
                          className={`em-cpr-metro__btn${cprActive ? ' em-cpr-metro__btn--stop' : ''}`}
                          onClick={cprActive ? stopCpr : startCpr}
                          type="button"
                        >
                          {cprActive ? '■ Stop' : '▶ Start CPR Beat'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation */}
                <div className="em-bystander-nav">
                  <button
                    className="em-bystander-nav__btn em-bystander-nav__btn--back"
                    onClick={() => { stopCpr(); setBystanderStep(s => Math.max(0, s - 1)); }}
                    disabled={isFirst}
                    type="button"
                    aria-label="Previous step"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                    <span className="em-bystander-nav__btn-label">Back</span>
                  </button>
                  <a href="tel:193" className="em-bystander-nav__call" aria-label="Call 193">
                    <span className="em-bystander-nav__call-icon"><Phone size={14} strokeWidth={2.5} /></span>
                    <span>193</span>
                  </a>
                  {!isLast ? (
                    <button
                      className="em-bystander-nav__btn em-bystander-nav__btn--next"
                      onClick={() => { stopCpr(); setBystanderStep(s => Math.min(BYSTANDER_STEPS.length - 1, s + 1)); }}
                      type="button"
                      aria-label="Next step"
                    >
                      <span className="em-bystander-nav__btn-label">Next</span>
                      <ChevronRight size={16} strokeWidth={2.5} />
                    </button>
                  ) : (
                    <button
                      className="em-bystander-nav__btn em-bystander-nav__btn--restart"
                      onClick={() => { stopCpr(); setBystanderStep(0); }}
                      type="button"
                      aria-label="Restart guide"
                    >
                      <RotateCcw size={15} strokeWidth={2.5} />
                      <span className="em-bystander-nav__btn-label">Restart</span>
                    </button>
                  )}
                </div>
              </div>
            </div>,
            document.body
          );
        })()}

        {/* ── FIRST AID GUIDE MODAL — full step detail, severity-themed,
               consistent bottom-sheet shell shared with Poison/Bystander ── */}
        {activeGuide && (() => {
          const guide = allFirstAidGuides.find(g => g.id === activeGuide);
          if (!guide) return null;
          return createPortal(
            <div className="em-faguide-overlay" onClick={() => setActiveGuide(null)}>
              <div
                className={`em-faguide-modal em-faguide-modal--${guide.severity}`}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="em-faguide-title"
                ref={guidePanelRef}
                tabIndex={-1}
              >
                <div className="em-faguide-modal__handle" aria-hidden="true" />

                <div className="em-faguide-modal__header">
                  <div className="em-faguide-modal__header-icon"><guide.icon size={18} /></div>
                  <div className="em-faguide-modal__header-text">
                    <p className="em-faguide-modal__title" id="em-faguide-title">
                      {tGuide(`emergency.guides.${guide.id}.title`, guide.title)}
                    </p>
                    <p className="em-faguide-modal__sub">{guide.steps.length} steps · {severityLabel(guide.severity)}</p>
                  </div>
                  <button
                    className="em-faguide-modal__icon-btn"
                    onClick={() => copyGuide(guide)}
                    type="button"
                    aria-label="Copy guide as text"
                  >
                    {copiedId === `guide-${guide.id}` ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <button
                    className="em-faguide-modal__icon-btn em-faguide-modal__close"
                    onClick={() => setActiveGuide(null)}
                    type="button"
                    aria-label="Close guide"
                  >
                    <X size={16} />
                  </button>
                </div>

                {guide.warning && (
                  <div className="em-faguide-modal__warning" role="alert">
                    <AlertTriangle size={14} />
                    <p>{guide.warning ? tGuide(`emergency.guides.${guide.id}.warning`, guide.warning) : ''}</p>
                  </div>
                )}

                {guide.steps.length > 1 && (
                  <div className="em-faguide-modal__dots" role="tablist" aria-label="Jump to a step">
                    {guide.steps.map((_, i) => (
                      <button
                        key={i}
                        className="em-faguide-modal__dot"
                        onClick={() => document.getElementById(`em-fa-step-${guide.id}-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        type="button"
                        aria-label={`Jump to step ${i + 1}`}
                      />
                    ))}
                  </div>
                )}

                <div className="em-faguide-modal__body">
                  {guide.steps.map((step, idx) => (
                    <div
                      key={idx}
                      id={`em-fa-step-${guide.id}-${idx}`}
                      className={`em-faguide-step${step.urgent ? ' em-faguide-step--urgent' : ''}`}
                    >
                      <div className="em-faguide-step__visual" aria-hidden="true">
                        <span className="em-faguide-step__emoji">{step.emoji || '•'}</span>
                        <span className="em-faguide-step__num">{idx + 1}</span>
                      </div>
                      <div className="em-faguide-step__content">
                        {step.label && (
                          <p className="em-faguide-step__label">
                            {step.label ? tGuide(`emergency.guides.${guide.id}.steps.${idx}.label`, step.label) : ''}
                          </p>
                        )}
                        <p className="em-faguide-step__text">
                          {tGuide(`emergency.guides.${guide.id}.steps.${idx}.instruction`, step.instruction)}
                        </p>
                        {step.tip && (
                          <div className="em-faguide-step__tip">
                            <Info size={12} aria-hidden="true" />
                            <span>{step.tip ? tGuide(`emergency.guides.${guide.id}.steps.${idx}.tip`, step.tip) : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="em-faguide-modal__footer">
                  <a href="tel:193" className="em-faguide-modal__call"><Phone size={14} /> Call 193</a>
                  <button className="em-faguide-modal__done" onClick={() => setActiveGuide(null)} type="button">
                    <Check size={14} /> Done
                  </button>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}

        {/* ── MEDICAL ID MODAL — a single formal medical-record view (no
               tabs): everything a responder needs, plus copy / edit /
               download-as-PDF actions. Opens and closes exactly like every
               other modal on this page (bottom sheet on mobile, centered
               dialog on desktop, round icon close button). ── */}
        {showPersonalCard && createPortal(
          <div className="em-card-overlay" onClick={() => setShowPersonalCard(false)}>
            <div className="em-personal-card em-medid2" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="em-medid2-title">

              {/* Header */}
              <div className="em-medid2__header">
                <span className="em-medid2__header-icon"><ClipboardList size={18} /></span>
                <span className="em-medid2__header-text">
                  <span className="em-medid2__header-title" id="em-medid2-title">Medical ID</span>
                  <span className="em-medid2__header-sub">For first responders — key details at a glance.</span>
                </span>
                <button className="em-loc-preview__close" onClick={() => setShowPersonalCard(false)} type="button" aria-label="Close">
                  <X size={16}/>
                </button>
              </div>

              {/* ════════════════════════════════════
                  SINGLE VIEW — everything at a glance
              ════════════════════════════════════ */}
              <div className="em-medid2-body">

                  {/* Patient identification — formal document field group */}
                  <div className="em-medid2-identity">
                    <div className="em-medid2-identity__info">
                      <span className="em-medid2-identity__label">Patient</span>
                      <span className="em-medid2-identity__name">{userName}</span>
                    </div>
                    <div className="em-medid2-identity__divider" />
                    <div className="em-medid2-identity__field">
                      <span className="em-medid2-identity__label">Blood Type</span>
                      <span className="em-medid2-identity__blood">
                        {medIdBloodType !== 'Not set' ? medIdBloodType : '—'}
                      </span>
                    </div>
                  </div>
                  {(!healthProfile?.bloodType || healthProfile.bloodType === 'Not set') && (
                    <p className="em-medid2-identity__notice">Blood type not added yet</p>
                  )}

                  {/* Allergies */}
                  <div className="em-medid2-panel em-medid2-panel--allergy">
                    <div className="em-medid2-panel__head">
                      <span className="em-medid2-panel__icon"><AlertTriangle size={15} /></span>
                      <span className="em-medid2-panel__text">
                        <span className="em-medid2-panel__title">Allergies</span>
                        <span className="em-medid2-panel__sub">Flags reactions before you're given medication or treatment.</span>
                      </span>
                      <span className="em-medid2-panel__count">{healthProfile?.allergies?.length ?? 0}</span>
                    </div>
                    <div className="em-medid2-panel__body">
                      {(healthProfile?.allergies?.length ?? 0) > 0 ? (
                        <div className="em-medid2-tags">
                          {healthProfile!.allergies!.map((a, i) => (
                            <span key={i} className={`em-medid2-tag em-medid2-tag--${a.severity === 'severe' ? 'red' : a.severity === 'moderate' ? 'amber' : 'green'}`}>
                              {a.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="em-medid2-empty">None listed</span>
                      )}
                    </div>
                  </div>

                  {/* Medications */}
                  <div className="em-medid2-panel em-medid2-panel--med">
                    <div className="em-medid2-panel__head">
                      <span className="em-medid2-panel__icon"><Pill size={15} /></span>
                      <span className="em-medid2-panel__text">
                        <span className="em-medid2-panel__title">Active Medications</span>
                        <span className="em-medid2-panel__sub">Prevents dangerous drug interactions during treatment.</span>
                      </span>
                      <span className="em-medid2-panel__count">
                        {healthProfile?.medications?.filter(m => m.active).length ?? 0}
                      </span>
                    </div>
                    <div className="em-medid2-panel__body">
                      {(healthProfile?.medications?.filter(m => m.active).length ?? 0) > 0 ? (
                        <div className="em-medid2-list">
                          {healthProfile!.medications!.filter(m => m.active).map((m, i) => (
                            <div key={i} className="em-medid2-list-row">
                              <span className="em-medid2-list-row__name">{m.name}</span>
                              {m.dose && <span className="em-medid2-list-row__meta">{m.dose}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="em-medid2-empty">None listed</span>
                      )}
                    </div>
                  </div>

                  {/* Conditions */}
                  <div className="em-medid2-panel em-medid2-panel--condition">
                    <div className="em-medid2-panel__head">
                      <span className="em-medid2-panel__icon"><Stethoscope size={15} /></span>
                      <span className="em-medid2-panel__text">
                        <span className="em-medid2-panel__title">Conditions</span>
                        <span className="em-medid2-panel__sub">Gives context responders need for the right care, fast.</span>
                      </span>
                      <span className="em-medid2-panel__count">
                        {healthProfile?.conditions?.filter(c => c.status !== 'resolved').length ?? 0}
                      </span>
                    </div>
                    <div className="em-medid2-panel__body">
                      {(healthProfile?.conditions?.filter(c => c.status !== 'resolved').length ?? 0) > 0 ? (
                        <div className="em-medid2-list">
                          {healthProfile!.conditions!.filter(c => c.status !== 'resolved').map((c, i) => (
                            <div key={i} className="em-medid2-list-row">
                              <span className="em-medid2-list-row__name">{c.name}</span>
                              <span className={`em-medid2-tag em-medid2-tag--${c.status === 'active' ? 'red' : 'teal'}`}>
                                {c.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="em-medid2-empty">None listed</span>
                      )}
                    </div>
                  </div>

                  {/* Location (if available) */}
                  {location && (
                    <div className="em-medid2-panel em-medid2-panel--location">
                      <div className="em-medid2-panel__head">
                        <span className="em-medid2-panel__icon"><MapPin size={15} /></span>
                        <span className="em-medid2-panel__text">
                          <span className="em-medid2-panel__title">Current Location</span>
                          <span className="em-medid2-panel__sub">Shared live so help can find you.</span>
                        </span>
                        <span className="em-medid2-live">● Live</span>
                      </div>
                      <div className="em-medid2-panel__body">
                        <div className="em-medid2-list-row">
                          <span className="em-medid2-list-row__name">
                            {location.city || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                          </span>
                          <a
                            href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="em-medid2-link"
                            onClick={e => e.stopPropagation()}
                          >
                            Maps →
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Blood type compatibility */}
                  {BLOOD_COMPATIBILITY[medIdBloodType] && (
                    <div className="em-medid2-panel em-medid2-panel--blood">
                      <div className="em-medid2-panel__head">
                        <span className="em-medid2-panel__icon"><Droplet size={15} /></span>
                        <span className="em-medid2-panel__text">
                          <span className="em-medid2-panel__title">{t('emergency.bloodCompatibility', 'Blood Compatibility')}</span>
                          <span className="em-medid2-panel__sub">Who this blood type can give to and receive from.</span>
                        </span>
                      </div>
                      <div className="em-medid2-panel__body em-medid2-compat">
                        <div className="em-medid2-compat-row">
                          <span className="em-medid2-compat-label">{t('emergency.canReceiveFrom', 'Can receive from')}</span>
                          <div className="em-medid2-tags">
                            {BLOOD_COMPATIBILITY[medIdBloodType].canReceiveFrom.map(bt => (
                              <span key={bt} className={`em-medid2-tag em-medid2-tag--blood${bt === medIdBloodType ? ' em-medid2-tag--self' : ''}`}>{bt}</span>
                            ))}
                          </div>
                        </div>
                        <div className="em-medid2-compat-row">
                          <span className="em-medid2-compat-label">{t('emergency.canDonateTo', 'Can donate to')}</span>
                          <div className="em-medid2-tags">
                            {BLOOD_COMPATIBILITY[medIdBloodType].canDonateTo.map(bt => (
                              <span key={bt} className={`em-medid2-tag em-medid2-tag--blood${bt === medIdBloodType ? ' em-medid2-tag--self' : ''}`}>{bt}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NHIS Card — full card, shown inline (no separate tab) */}
                  <div className="em-medid2-panel em-medid2-panel--nhis">
                    <div className="em-medid2-panel__head">
                      <span className="em-medid2-panel__icon"><Shield size={15} /></span>
                      <span className="em-medid2-panel__text">
                        <span className="em-medid2-panel__title">NHIS Card</span>
                        <span className="em-medid2-panel__sub">Confirms your cover without the physical card.</span>
                      </span>
                    </div>
                    <div className="em-medid2-panel__body">
                      {nhisCard?.nhisId ? (
                        <>
                          {/* Card visual — same physical-card treatment as the profile page */}
                          <div className="em-medid2-nhis-preview">
                            <div className="em-medid2-nhis-preview__top">
                              <span className="em-medid2-nhis-preview__scheme">
                                {nhisCard.issuingBody || 'National Health Insurance Scheme'}
                              </span>
                              <CreditCard size={16} className="em-medid2-nhis-preview__chip" />
                            </div>
                            <span className="em-medid2-nhis-preview__id">{nhisCard.nhisId}</span>
                            <div className="em-medid2-nhis-preview__bottom">
                              <span>
                                <span className="em-medid2-nhis-preview__label">Member</span>
                                <span className="em-medid2-nhis-preview__value">{nhisCard.membershipType || '—'}</span>
                              </span>
                              <span>
                                <span className="em-medid2-nhis-preview__label">Expires</span>
                                <span className="em-medid2-nhis-preview__value">{nhisCard.expiryDate || '—'}</span>
                              </span>
                              <span>
                                <span className="em-medid2-nhis-preview__label">Holder</span>
                                <span className="em-medid2-nhis-preview__value">{userName}</span>
                              </span>
                            </div>
                          </div>

                          {/* Extra detail rows not already on the card face */}
                          {(nhisCard.issuedDate || nhisCard.notes) && (
                            <div className="em-medid2-detail-rows">
                              {[
                                { label: 'Date Issued', val: nhisCard.issuedDate },
                                { label: 'Notes',       val: nhisCard.notes },
                              ].filter(r => r.val).map(({ label, val }) => (
                                <div key={label} className="em-medid2-detail-row">
                                  <span className="em-medid2-detail-row__key">{label}</span>
                                  <span className="em-medid2-detail-row__val">{val}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="em-medid2-empty em-medid2-empty--warn">⚠ No NHIS card added — add it from your Health Profile</span>
                      )}
                    </div>
                  </div>

                  {/* Actions — copy, edit, download or print, all in one place */}
                  <div className="em-medid2-actions">
                    <button className="em-medid2-btn em-medid2-btn--ghost" onClick={copyPersonalCard} type="button">
                      {copiedId === 'card' ? <><Check size={14}/>Copied!</> : <><Copy size={14}/>Copy Text</>}
                    </button>
                    <button
                      className="em-medid2-btn em-medid2-btn--ghost"
                      onClick={() => { setShowPersonalCard(false); router.push('/profile?modal=medicalId'); }}
                      type="button"
                    >
                      <Edit2 size={14}/>Edit
                    </button>
                  </div>
                  <div className="em-medid2-actions">
                    <button
                      className="em-medid2-btn em-medid2-btn--primary"
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      type="button"
                    >
                      {isGeneratingPdf ? <Loader2 size={15} className="em-spin" /> : <FileText size={15} />}
                      {isGeneratingPdf ? 'Generating…' : 'Download PDF'}
                    </button>
                    <button
                      className="em-medid2-btn em-medid2-btn--ghost"
                      onClick={handlePrintPdf}
                      disabled={isGeneratingPdf}
                      type="button"
                    >
                      <Printer size={15} /> Print
                    </button>
                  </div>
                  <p className="em-medid2-ts">Generated {new Date().toLocaleTimeString()}</p>
                </div>

            </div>
          </div>,
          document.body
        )}

        {/* ── MOBILE TABS ──────────────────────────────────── */}
        {/* ── Mobile section tab bar ── */}
        <div className="em-mob-tabs">
          <button
            className={`em-mob-tab${activeTab === 'services' ? ' em-mob-tab--active' : ''}`}
            onClick={() => setActiveTab('services')} type="button" aria-label="Emergency services"
          >
            <span className="em-mob-tab__icon"><Phone size={15} /></span>
            <span className="em-mob-tab__label">{t('emergency.tabs.services', 'Emergency')}</span>
          </button>
          <button
            className={`em-mob-tab${activeTab === 'firstaid' ? ' em-mob-tab--active' : ''}`}
            onClick={() => setActiveTab('firstaid')} type="button" aria-label="First aid guides"
          >
            <span className="em-mob-tab__icon"><Heart size={15} /></span>
            <span className="em-mob-tab__label">{t('emergency.tabs.firstAid', 'First Aid')}</span>
          </button>
          <button
            className={`em-mob-tab${activeTab === 'qr' ? ' em-mob-tab--active' : ''}`}
            onClick={() => setActiveTab('qr')} type="button" aria-label="QR code"
          >
            <span className="em-mob-tab__icon"><QrCode size={15} /></span>
            <span className="em-mob-tab__label">{t('emergency.tabs.qrCode', 'QR Code')}</span>
            {qrDataUrl && <span className="em-mob-tab__dot" />}
          </button>
        </div>

        {/* ── MAIN GRID ────────────────────────────────────── */}
        <div className="em-grid">

          {/* LEFT: Services + First Aid */}
          <div className={`em-grid__main${activeTab === 'qr' ? ' em-mob-hidden' : ''}`}>

            {/* Ghana Emergency Services */}
            <section className={`em-section em-section--red${activeTab === 'firstaid' ? ' em-mob-hidden' : ''}`}>
              <div className="em-section__head">
                <h2 className="em-section__title"><Shield size={18} />{t('emergency.services', 'Ghana Emergency Services')}</h2>
                <span className="em-section__badge">24/7</span>
              </div>
              <p className="em-section__sub">Tap the phone icon to call directly. The copy icon saves the number to your clipboard.</p>
              <div className="em-services-list">
                {GHANA_SERVICES.map(svc => (
                  <div key={svc.id} className={`em-service em-service--${svc.color}`}>
                    <div className="em-service__icon"><svc.icon size={20} /></div>
                    <div className="em-service__body">
                      <p className="em-service__name">{t(`emergency.services.${svc.id}.name`, svc.name)}</p>
                      <p className="em-service__desc">{t(`emergency.services.${svc.id}.description`, svc.description)}</p>
                    </div>
                    <div className="em-service__actions">
                      <span className="em-service__num">{svc.number}</span>
                      <button className="em-service__copy" onClick={() => copyPhone(svc.id, svc.number)} type="button">
                        {copiedId === svc.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <a href={`tel:${svc.number}`} className="em-service__call"><Phone size={14} /></a>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* First Aid Guides */}
            <section ref={firstAidSectionRef} className={`em-section em-section--teal${activeTab === 'services' ? ' em-mob-hidden' : ''}`}>
              <div className="em-section__head">
                <h2 className="em-section__title"><Plus size={18} />{t('emergency.firstAid', 'First Aid Guides')}</h2>
                <span className="em-badge-offline"><Zap size={11} />{t('emergency.offlineAvailable', 'Works Offline')}</span>
              </div>
              <p className="em-section__sub">Tap any guide to open clear, step-by-step instructions.</p>

              <div className="em-guides-list">
                {filteredGuides.map(guide => (
                  <div key={guide.id} className={`em-guide-wrap${activeGuide === guide.id ? ' em-guide-wrap--open' : ''}`}>
                    <button
                      className={`em-guide ${severityColor(guide.severity)} ${guide.id}`}
                      onClick={() => {
                        setActiveGuide(guide.id)
                        trackActivity(
                          'emergency_guide',
                          guide.title,
                          `Opened ${guide.title} guide`,
                          { guideId: guide.id, severity: guide.severity },
                        ).catch(() => {})
                      }}
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`Open ${guide.title}, a ${guide.steps.length} step first aid guide`}
                    >
                      <div className="em-guide__icon"><guide.icon size={20} /></div>
                      <div className="em-guide__body">
                        <p className="em-guide__title">{tGuide(`emergency.guides.${guide.id}.title`, guide.title)}</p>
                        <p className="em-guide__steps">{guide.steps.length} steps · {severityLabel(guide.severity)}</p>
                      </div>
                      <div className="em-guide__open" aria-hidden="true">
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  </div>
                ))}

                {filteredGuides.length === 0 && searchQuery && (
                  <div className="em-guides-empty">
                    <Search size={22} />
                    <p>{t('emergency.noResults', 'No guides found for')} "<strong>{searchQuery}</strong>"</p>
                    <button onClick={() => setSearchQuery('')} type="button">{t('common.close', 'Clear search')}</button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT: Medical ID + Location */}
          <div className={`em-grid__side${activeTab === 'services' || activeTab === 'firstaid' ? ' em-mob-hidden' : ''}`}>

            {/* Medical ID — desktop sidebar, shown on the mobile QR tab */}
            <section className={`em-section em-med-id em-med-id--sidebar${activeTab === 'qr' ? ' em-mob-hidden' : ''}`}>
              <div className="em-med-id__header">
                <ClipboardList size={16} />
                <h3>Medical ID</h3>
                <span className="em-badge-offline"><Zap size={11} />Offline</span>
              </div>

              {isLoadingProfile ? (
                <div className="em-med-id__loading">
                  <Loader2 size={16} className="em-spin" /> Loading…
                </div>
              ) : (
                <>
                  {/* Identity strip */}
                  <div className="em-med-id__identity">
                    <div className="em-med-id__identity-info">
                      <p className="em-med-id__name">{userName}</p>
                      <p className="em-med-id__meta">
                        {medIdBloodType !== 'Not set'
                          ? <><span className="em-med-id__blood-badge">{medIdBloodType}</span> {t('emergency.bloodType', 'Blood Type')}</>
                          : <span className="em-med-id__unset">Blood type not added yet</span>
                        }
                      </p>
                    </div>
                    {medIdBloodType !== 'Not set' && (
                      <div className="em-med-id__blood-circle">
                        <span className="em-med-id__blood-circle-type">{medIdBloodType}</span>
                      </div>
                    )}
                  </div>

                  {/* Compact sections */}
                  <div className="em-med-id__sections">
                    <div className="em-med-id__section">
                      <span className="em-med-id__section-label">
                        <AlertTriangle size={10} style={{ color: 'var(--hc-amber)' }} /> Allergies
                      </span>
                      <span className={`em-med-id__section-val${medIdAllergies !== 'None listed' ? ' em-med-id__section-val--warn' : ''}`}>
                        {medIdAllergies}
                      </span>
                    </div>
                    <div className="em-med-id__section">
                      <span className="em-med-id__section-label">
                        <Pill size={10} style={{ color: 'var(--hc-teal)' }} /> Medications
                      </span>
                      <span className="em-med-id__section-val">{medIdMedications}</span>
                    </div>
                    <div className="em-med-id__section">
                      <span className="em-med-id__section-label">
                        <Stethoscope size={10} style={{ color: 'var(--hc-violet)' }} /> Conditions
                      </span>
                      <span className="em-med-id__section-val">{medIdConditions}</span>
                    </div>
                    {nhisCard?.nhisId && (
                      <div className="em-med-id__section em-med-id__section--nhis">
                        <span className="em-med-id__section-label">
                          <Shield size={10} style={{ color: 'var(--hc-teal)' }} /> NHIS ID
                        </span>
                        <span className="em-med-id__section-val em-med-id__section-val--nhis">
                          {nhisCard.nhisId}
                          {nhisCard.expiryDate && <span className="em-med-id__nhis-exp">Exp: {nhisCard.expiryDate}</span>}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="em-med-id__actions">
                <button className="em-med-id__show-btn"
                  onClick={() => setShowPersonalCard(true)}
                  type="button">
                  <BookOpen size={14} /> Full Card
                </button>
                <button className="em-med-id__edit"
                  onClick={() => router.push('/profile?modal=medicalId')}
                  type="button">
                  <Edit2 size={13} /> Edit
                </button>
              </div>
            </section>

            {/* ── Emergency QR Code ──────────────────────── */}
            <section className={`em-section em-section--violet-deep em-qr-section${activeTab !== 'qr' ? ' em-mob-hidden' : ''}`} id="em-qr-section">
              <div className="em-section__head">
                <h2 className="em-section__title"><QrCode size={18} />Emergency QR Code</h2>
                <span className="em-badge-offline">30-day link</span>
              </div>
              <p className="em-section__sub">
                Generate a scannable QR for first responders. Save it to your lock screen or print it out.
              </p>

              {qrError && (
                <div className="em-qr-error">
                  <AlertCircle size={13} /> {qrError}
                </div>
              )}

              {qrDataUrl ? (
                <div className="em-qr-card">
                  {/* QR image */}
                  <div className="em-qr-card__image-wrap">
                    <img
                      src={qrDataUrl}
                      alt="Emergency QR Code"
                      width={200} height={200}
                      className="em-qr-card__image"
                    />
                    <div className="em-qr-card__overlay-badge">
                      <Shield size={10} /> Emergency Brief
                    </div>
                  </div>

                  {/* Expiry */}
                  {qrExpiresAt && (
                    <p className="em-qr-card__expiry">
                      <Clock size={11} /> Valid until {new Date(qrExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}

                  {/* URL */}
                  {qrBriefUrl && (
                    <p className="em-qr-card__url">{qrBriefUrl}</p>
                  )}

                  {/* Actions */}
                  <div className="em-qr-card__actions">
                    <button
                      className="em-section__add em-qr-card__regen"
                      onClick={generateQr}
                      disabled={isGeneratingQr}
                      type="button"
                    >
                      <RefreshCw size={13} className={isGeneratingQr ? 'em-spin' : ''} />
                      {isGeneratingQr ? 'Regenerating…' : 'Regenerate'}
                    </button>
                    <button
                      className="em-qr-card__remove"
                      onClick={removeQr}
                      type="button"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="em-qr-generate-btn"
                  onClick={generateQr}
                  disabled={isGeneratingQr}
                  type="button"
                >
                  {isGeneratingQr
                    ? <><Loader2 size={15} className="em-spin" /> Generating…</>
                    : <><QrCode size={15} /> Generate QR Code</>
                  }
                </button>
              )}
            </section>

            {/* Live Location Card */}
            {location && (
              <section className="em-section em-location-card">
                <div className="em-location-card__header">
                  <MapPin size={16} />
                  <h3>Your Location</h3>
                  <span className="em-location-card__live">● Live</span>
                </div>
                <p className="em-location-card__city">{location.city}</p>
                <p className="em-location-card__coords">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
                {location.accuracy && (
                  <p className="em-location-card__acc">±{Math.round(location.accuracy)}m GPS accuracy</p>
                )}
                <div className="em-location-card__actions">
                  <a
                    href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                    target="_blank" rel="noopener noreferrer" className="em-location-card__btn"
                  >
                    <ExternalLink size={13} /> Open Maps
                  </a>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🆘 Emergency location: https://maps.google.com/?q=${location.lat},${location.lng}`)}`}
                    target="_blank" rel="noopener noreferrer" className="em-location-card__btn em-location-card__btn--whatsapp"
                  >
                    <Phone size={13} /> WhatsApp
                  </a>
                  <button
                    className="em-location-card__btn"
                    onClick={() => copyPhone('loc', `Emergency location: https://maps.google.com/?q=${location.lat},${location.lng}`)}
                    type="button"
                  >
                    {copiedId === 'loc' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedId === 'loc' ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
                {nearestER && (
                  <div className="em-location-card__er">
                    <span aria-hidden="true">🏥</span>
                    <span>Nearest ER:</span>
                    <button
                      onClick={() => {
                        if (nearestER?.lat && nearestER?.lng) {
                          window.open(`https://maps.google.com/?q=${nearestER.lat},${nearestER.lng}`, '_blank');
                        } else {
                          window.open(`https://maps.google.com/maps/search/${encodeURIComponent(nearestER?.name || 'hospital')}/@${location.lat},${location.lng},14z`, '_blank');
                        }
                      }}
                      type="button"
                    >
                      {nearestER.name}, {nearestER.distance} away
                    </button>
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmergencyPage;