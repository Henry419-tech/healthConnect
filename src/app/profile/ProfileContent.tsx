'use client'

// src/app/profile/ProfileContent.tsx
//
// Combined Profile + Settings — one tab, two sections. HEALTHNAV handoff
// Section 14. Replaces the old 1000+ line Medical-ID / saved-facilities /
// tabbed profile. All of that health-record machinery is still in the
// codebase (HealthProfile, NhisCard, etc.) — just not surfaced here. See
// Section 2 "What Was Cut and Why".
//
// One deliberate deviation from the literal spec: "Change password" does
// NOT link to /reset-password. That route is the *forgot-password* flow —
// it requires a token query param and shows an "invalid link" state
// without one, which would be a dead end for someone who just wants to
// change their password while already signed in. There's already a
// working POST /api/user/password for exactly that (current + new
// password, handles Google-only accounts with no password gracefully),
// so this page uses that instead via a small inline panel.

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useFontSize, type FontSize } from '@/contexts/FontSizeContext';
import { useFontStyle, type FontStyle } from '@/contexts/FontStyleContext';
import { useLanguage, useTranslation, type Language } from '@/contexts/LanguageContext';
import MobTabBar from '@/components/MobTabBar';
import DashboardLayout from '@/components/DashboardLayout';
import NotificationBell from '@/components/NotificationBell';
import { LegalModal, type LegalModalType } from '@/components/LegalModal';
import { getRelativeTime } from '@/lib/activityTracker';
import { calculateDistance, formatDistance } from '@/lib/utils';
import { getNhisExpiryInfo } from '@/lib/nhisExpiry';
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/pushClient';
import '@/styles/dashboard-header.css';
import '@/styles/dashboard.css';
import '@/styles/dashboard-mobile.css';
import '@/styles/footer.css';
import '@/styles/language.css';
// Reuses the small .dbh-topbar-brand rule from the dashboard rebuild for the
// desktop topbar logo/wordmark — not worth duplicating for two rules.
import '@/styles/dashboard-launchpad.css';
import '@/styles/profile-settings.css';
import {
  Heart, Bell, Moon, Sun, Loader2, CheckCircle2, XCircle,
  Save, Type, Palette, Globe, LogOut, Mail,
  Lock, ChevronRight, Check, Eye, EyeOff,
  Bookmark, Phone, Navigation, MapPin, Trash2, X,
  Search, Stethoscope, AlertTriangle, Building2, Clock, Camera,
  Shield, Plus, Droplet, CreditCard, ClipboardList,
} from 'lucide-react';

const MobTopbarMenu = dynamic(() => import('@/components/MobTopbarMenu'), { ssr: false });

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

/* ── Static config ────────────────────────────────────────────── */

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small',  label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large' },
  { value: 'xl',     label: 'Extra Large' },
];

const FONT_STYLE_OPTIONS: { value: FontStyle; label: string; family?: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'reading', label: 'Reading', family: 'Georgia, "Times New Roman", serif' },
  { value: 'clear',   label: 'Clear',   family: '"Atkinson Hyperlegible", -apple-system, BlinkMacSystemFont, sans-serif' },
  { value: 'bold',    label: 'Bold',    family: '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif' },
];
const FONT_PREVIEW_TEXT = 'The quick brown fox jumps.';

const PW_REQS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number',     test: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter',     test: (p: string) => /[a-zA-Z]/.test(p) },
];

interface Banner { kind: 'success' | 'error'; message: string }

interface SavedFacilityItem {
  id: string; facilityId: string; name: string; type: string;
  address?: string | null; phone?: string | null; hours?: string | null;
  latitude: number; longitude: number;
}

interface ActivityItem {
  id: string;
  activityType: string;
  title: string;
  description?: string | null;
  createdAt: string;
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  facility_found:       Building2,
  facility_search:      Search,
  symptom_search:       Stethoscope,
  symptom_text_search:  Stethoscope,
  emergency_guide:      Heart,
  // Defined in activityTracker.ts but never actually fired anywhere currently
  emergency_accessed:   AlertTriangle,
  first_aid_viewed:     Heart,
};

function activityIconFor(type: string): React.ComponentType<{ size?: number }> {
  return ACTIVITY_ICONS[type] ?? Clock;
}

export default function ProfileContent() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { fontSize, setFontSize } = useFontSize();
  const { fontStyle, setFontStyle } = useFontStyle();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    const layout = document.querySelector('.hc-layout');
    if (layout) layout.classList.add('hc-layout--has-mob-topbar');
    return () => { if (layout) layout.classList.remove('hc-layout--has-mob-topbar'); };
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  /* ── My Profile — name ──────────────────────────────────────────────── */
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileBanner, setProfileBanner] = useState<Banner | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  /* ── Avatar — uploads via /api/user/avatar (signed Cloudinary upload) ── */
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  /* ── Medical ID — blood type, allergies, conditions, NHIS card ────────
     Trimmed to what the Emergency page's Personal Card actually shows.
     No weight/height/BMI/gender/DOB and no medications here — those were
     part of the old health-record profile and are out of scope now.
     See HEALTHNAV_MASTER_HANDOFF.md "What Was Cut and Why". ────────── */
  const medicalIdRef = useRef<HTMLDivElement>(null);
  const [medIdLoaded, setMedIdLoaded] = useState(false);
  const [medIdBanner, setMedIdBanner] = useState<Banner | null>(null);
  // Collapsed by default — blood type/allergies/conditions/NHIS number are
  // sensitive, so they shouldn't render open on a page someone might glance
  // at over your shoulder. Tapping the header reveals it; deep-linking in via
  // ?modal=medicalId (below) expands it automatically.
  const [medIdExpanded, setMedIdExpanded] = useState(false);

  const [bloodType, setBloodType] = useState('');
  const [savingBloodType, setSavingBloodType] = useState(false);

  const [allergies, setAllergies] = useState<{ id: string; name: string; severity: string }[]>([]);
  const [newAllergyName, setNewAllergyName] = useState('');
  const [newAllergySeverity, setNewAllergySeverity] = useState('moderate');
  const [savingAllergy, setSavingAllergy] = useState(false);
  const [deletingAllergyId, setDeletingAllergyId] = useState<string | null>(null);

  const [conditions, setConditions] = useState<{ id: string; name: string; status: string }[]>([]);
  const [newConditionName, setNewConditionName] = useState('');
  const [newConditionStatus, setNewConditionStatus] = useState('managed');
  const [savingCondition, setSavingCondition] = useState(false);
  const [deletingConditionId, setDeletingConditionId] = useState<string | null>(null);

  const [nhisId, setNhisId] = useState('');
  const [nhisMembershipType, setNhisMembershipType] = useState('');
  const [nhisIssuingBody, setNhisIssuingBody] = useState('');
  const [nhisIssuedDate, setNhisIssuedDate] = useState('');
  const [nhisExpiryDate, setNhisExpiryDate] = useState('');
  const [nhisNotes, setNhisNotes] = useState('');
  const [savingNhis, setSavingNhis] = useState(false);

  const nhisExpiryInfo = useMemo(
    () => getNhisExpiryInfo(nhisExpiryDate, nhisIssuedDate),
    [nhisExpiryDate, nhisIssuedDate]
  );

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    fetch('/api/health-profile')
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d.profile) return;
        setBloodType(d.profile.bloodType || '');
        setAllergies(d.profile.allergies ?? []);
        setConditions(d.profile.conditions ?? []);
        const nhis = d.profile.nhisCard;
        if (nhis) {
          setNhisId(nhis.nhisId || '');
          setNhisMembershipType(nhis.membershipType || '');
          setNhisIssuingBody(nhis.issuingBody || '');
          setNhisIssuedDate(nhis.issuedDate ? nhis.issuedDate.slice(0, 10) : '');
          setNhisExpiryDate(nhis.expiryDate ? nhis.expiryDate.slice(0, 10) : '');
          setNhisNotes(nhis.notes || '');
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMedIdLoaded(true); });

    return () => { cancelled = true; };
  }, [status]);

  // Deep link from the Emergency page's "Edit Profile" / "Add blood type"
  // buttons (?modal=medicalId) — scroll to and briefly highlight the section
  // instead of the old standalone modal, which no longer exists.
  useEffect(() => {
    if (searchParams.get('modal') !== 'medicalId') return;
    setMedIdExpanded(true);
    const el = medicalIdRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('pfs-card--flash');
      setTimeout(() => el.classList.remove('pfs-card--flash'), 1800);
    }, 200);
    return () => clearTimeout(t);
  }, [searchParams, medIdLoaded]);

  async function handleSaveBloodType(value: string) {
    setBloodType(value);
    setSavingBloodType(true);
    setMedIdBanner(null);
    try {
      const res = await fetch('/api/health-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloodType: value || null }),
      });
      if (!res.ok) throw new Error('Could not save blood type.');
    } catch (err: any) {
      setMedIdBanner({ kind: 'error', message: err.message || 'Could not save blood type.' });
    } finally {
      setSavingBloodType(false);
    }
  }

  async function handleAddAllergy() {
    const name = newAllergyName.trim();
    if (!name) return;
    setSavingAllergy(true);
    setMedIdBanner(null);
    try {
      const res = await fetch('/api/allergies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, severity: newAllergySeverity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add allergy.');
      setAllergies(prev => [data.allergy, ...prev]);
      setNewAllergyName('');
      setNewAllergySeverity('moderate');
    } catch (err: any) {
      setMedIdBanner({ kind: 'error', message: err.message || 'Could not add allergy.' });
    } finally {
      setSavingAllergy(false);
    }
  }

  async function handleDeleteAllergy(id: string) {
    setDeletingAllergyId(id);
    try {
      await fetch('/api/allergies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setAllergies(prev => prev.filter(a => a.id !== id));
    } catch {
      setMedIdBanner({ kind: 'error', message: 'Could not remove allergy.' });
    } finally {
      setDeletingAllergyId(null);
    }
  }

  async function handleAddCondition() {
    const name = newConditionName.trim();
    if (!name) return;
    setSavingCondition(true);
    setMedIdBanner(null);
    try {
      const res = await fetch('/api/conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status: newConditionStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add condition.');
      setConditions(prev => [data.condition, ...prev]);
      setNewConditionName('');
      setNewConditionStatus('managed');
    } catch (err: any) {
      setMedIdBanner({ kind: 'error', message: err.message || 'Could not add condition.' });
    } finally {
      setSavingCondition(false);
    }
  }

  async function handleDeleteCondition(id: string) {
    setDeletingConditionId(id);
    try {
      await fetch('/api/conditions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setConditions(prev => prev.filter(c => c.id !== id));
    } catch {
      setMedIdBanner({ kind: 'error', message: 'Could not remove condition.' });
    } finally {
      setDeletingConditionId(null);
    }
  }

  async function handleSaveNhis() {
    setSavingNhis(true);
    setMedIdBanner(null);
    try {
      const res = await fetch('/api/nhis-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nhisId: nhisId.trim() || undefined,
          membershipType: nhisMembershipType.trim() || undefined,
          issuingBody: nhisIssuingBody.trim() || undefined,
          issuedDate: nhisIssuedDate || undefined,
          expiryDate: nhisExpiryDate || undefined,
          notes: nhisNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Could not save NHIS card.');
      setMedIdBanner({ kind: 'success', message: 'NHIS card saved.' });
    } catch (err: any) {
      setMedIdBanner({ kind: 'error', message: err.message || 'Could not save NHIS card.' });
    } finally {
      setSavingNhis(false);
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d.user) return;
        setName(d.user.name || '');
        setAvatarUrl(d.user.image || null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProfileLoaded(true); });

    return () => { cancelled = true; };
  }, [status]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so picking the same file again still fires onChange
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileBanner({ kind: 'error', message: 'Please choose an image file.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileBanner({ kind: 'error', message: 'Image is too large — please choose one under 5MB.' });
      return;
    }

    setAvatarUploading(true);
    setProfileBanner(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/user/avatar', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not upload photo.');
      setAvatarUrl(data.image);
      // Refresh the next-auth session so the new photo shows up wherever
      // session.user.image is read (mobile topbar, sidebar, etc.), not
      // just here — this page reads from avatarUrl, but nothing else does.
      updateSession?.().catch(() => {});
      setProfileBanner({ kind: 'success', message: 'Photo updated.' });
    } catch (err: any) {
      setProfileBanner({ kind: 'error', message: err.message || 'Could not upload photo. Please try again.' });
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);

    if (!name.trim()) {
      setProfileError('Name is required.');
      return;
    }

    setSavingProfile(true);
    setProfileBanner(null);
    try {
      const profileRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => ({}));
        throw new Error(err.error || 'Could not save profile.');
      }

      setProfileBanner({ kind: 'success', message: 'Profile saved.' });
    } catch (err: any) {
      setProfileBanner({ kind: 'error', message: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setSavingProfile(false);
    }
  }

  /* ── App settings — alert email prefs ─────────────────────────────── */
  const [alertEmailsEnabled, setAlertEmailsEnabled] = useState(true);
  const [alertNamePersonalization, setAlertNamePersonalization] = useState(true);
  const [hasPassword, setHasPassword] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Push notifications — separate from the alertEmailsEnabled fields above
  // because it lives inside privacyPrefs (a JSON blob) rather than as its
  // own scalar column on User, and because turning it on/off has a real
  // browser side effect (subscribing/unsubscribing via the service worker),
  // not just a PATCH — see togglePush() below.
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  useEffect(() => { setPushSupported(isPushSupported()); }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/user/settings')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (typeof d.alertEmailsEnabled === 'boolean') setAlertEmailsEnabled(d.alertEmailsEnabled);
        if (typeof d.alertNamePersonalization === 'boolean') setAlertNamePersonalization(d.alertNamePersonalization);
        if (typeof d.hasPassword === 'boolean') setHasPassword(d.hasPassword);
        if (typeof d.privacyPrefs?.pushEnabled === 'boolean') setPushEnabled(d.privacyPrefs.pushEnabled);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status]);

  async function patchSetting(key: string, value: boolean, revert: () => void) {
    setSavingKey(key);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      revert();
    } finally {
      setSavingKey(null);
    }
  }

  function toggleAlertEmails() {
    const next = !alertEmailsEnabled;
    setAlertEmailsEnabled(next);
    patchSetting('alertEmailsEnabled', next, () => setAlertEmailsEnabled(!next));
  }

  function toggleAlertPersonalization() {
    const next = !alertNamePersonalization;
    setAlertNamePersonalization(next);
    patchSetting('alertNamePersonalization', next, () => setAlertNamePersonalization(!next));
  }

  // Unlike the two toggles above, this isn't just a PATCH — pushEnabled
  // lives inside privacyPrefs (not a top-level field patchSetting() can
  // write directly), and turning it on/off has a real browser-side effect
  // via subscribeToPush()/unsubscribeFromPush() (src/lib/pushClient.ts).
  // Order matters: subscribe/unsubscribe first, PATCH only on success —
  // so the stored preference never claims "on" when there's no actual
  // subscription behind it (e.g. the user denied the permission prompt).
  async function togglePush() {
    const next = !pushEnabled;
    setSavingKey('pushEnabled');
    try {
      if (next) {
        const ok = await subscribeToPush();
        if (!ok) return; // permission denied / unsupported — leave the toggle off
        setPushEnabled(true);
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
      }
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacyPrefs: { pushEnabled: next } }),
      });
    } catch {
      setPushEnabled(!next);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleLanguageChange(next: Language) {
    setLanguage(next);
    if (session?.user?.email) {
      fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      }).catch(() => {});
    }
  }

  /* ── Change password (inline, uses the in-session endpoint) ───────── */
  const [showPwPanel, setShowPwPanel] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwBanner, setPwBanner] = useState<Banner | null>(null);

  const pwReqsMet = PW_REQS.map(r => r.test(newPw));
  const pwAllMet = pwReqsMet.every(Boolean);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw || !pwAllMet) return;
    setPwSaving(true);
    setPwBanner(null);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not change password.');
      setPwBanner({ kind: 'success', message: 'Password updated.' });
      setCurrentPw('');
      setNewPw('');
      setTimeout(() => setShowPwPanel(false), 1200);
    } catch (err: any) {
      setPwBanner({ kind: 'error', message: err.message || 'Could not change password.' });
    } finally {
      setPwSaving(false);
    }
  }

  /* ── Legal modal ──────────────────────────────────────────────────── */
  const [legalModal, setLegalModal] = useState<LegalModalType | null>(null);

  /* ── Saved Facilities ──────────────────────────────────────────────── */
  const [savedFacilities, setSavedFacilities] = useState<SavedFacilityItem[] | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/saved-facilities')
      .then(r => r.json())
      .then(d => { if (!cancelled) setSavedFacilities(d.facilities ?? []); })
      .catch(() => { if (!cancelled) setSavedFacilities([]); });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { if (!cancelled) setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    }
    return () => { cancelled = true; };
  }, [status]);

  async function removeSavedFacility(facilityId: string) {
    const prev = savedFacilities;
    setSavedFacilities(cur => (cur ?? []).filter(f => f.facilityId !== facilityId));
    try {
      const res = await fetch('/api/saved-facilities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSavedFacilities(prev); // roll back
    }
  }

  function openDirections(lat: number, lng: number) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank', 'noopener,noreferrer');
  }

  /* ── Activity History ──────────────────────────────────────────────── */
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/activities?limit=10')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setActivities(d.activities ?? []);
        setActivitiesTotal(d.total ?? (d.activities ?? []).length);
      })
      .catch(() => { if (!cancelled) setActivities([]); });
    return () => { cancelled = true; };
  }, [status]);

  async function handleClearHistory() {
    setClearingHistory(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setActivities([]);
        setActivitiesTotal(0);
      }
    } catch {
      // no-op — banner-free per spec, button just stays as-is on failure
    } finally {
      setClearingHistory(false);
      setShowClearConfirm(false);
    }
  }

  async function handleSignOut() {
    try { await signOut({ callbackUrl: '/', redirect: true }); }
    catch (e) { console.error(e); }
  }

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

  const userImage = avatarUrl || session?.user?.image || null;
  const userEmail = session?.user?.email || '';
  const userInitials = (session?.user?.name || 'HC')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DashboardLayout activeTab="/profile" className="hc-layout--has-mob-topbar">

      {/* ── Fixed background layer — pattern + tint stay pinned to the
           viewport while everything else scrolls over it. A real
           position:fixed element, not background-attachment:fixed,
           since that CSS property is unreliably ignored on iOS Safari.
           Same fix as the Emergency page's .em-bg-fixed. ── */}
      <div className="pr-bg-fixed" aria-hidden="true" />

      {/* ══ STICKY DESKTOP TOP BAR ═══════════════════════════════════ */}
      <div className="db-topbar">
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

      <MobTabBar currentPath="/profile" />

      <div className="pfs-page">
        <div className="pfs-page-head">
          <h1 className="pfs-page-title">Profile &amp; Settings</h1>
          <p className="pfs-page-sub">Your details, and how the app looks and notifies you.</p>
        </div>

        {/* ══════════════════ SECTION 1 — MY PROFILE ══════════════════ */}
        <form className="pfs-profile-form" onSubmit={handleSaveProfile}>
          <div className="pfs-card pfs-identity">
            <h2 className="pfs-card__title">My Profile</h2>
            <p className="pfs-card__sub">Your name and contact details.</p>

            <div className="pfs-identity-panel">
              <div className="pfs-identity-panel__deco" aria-hidden="true">
                <span className="pfs-identity-panel__circle pfs-identity-panel__circle--1" />
                <span className="pfs-identity-panel__circle pfs-identity-panel__circle--2" />
                <span className="pfs-identity-panel__circle pfs-identity-panel__circle--3" />
              </div>

              <span className="pfs-identity-panel__eyebrow">Signed in as</span>

              <div className="pfs-identity-panel__body">
                <div className="pfs-avatar-wrap">
                  <button
                    type="button"
                    className="pfs-avatar-btn"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    aria-label="Change profile photo"
                  >
                    <div className={`pfs-avatar${avatarUploading ? ' pfs-avatar--loading' : ''}`}>
                      {userImage ? <img src={userImage} alt={name || ''} referrerPolicy="no-referrer" /> : userInitials}
                    </div>
                    <span className="pfs-avatar-edit">
                      {avatarUploading ? <Loader2 size={12} className="pfs-spin" /> : <Camera size={12} />}
                    </span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="pfs-identity-panel__text">
                  <div className="pfs-identity-panel__name">{name || 'Your name'}</div>
                  <div className="pfs-identity-panel__email">{userEmail}</div>
                </div>
              </div>
            </div>

            <div className="pfs-field">
              <label className="pfs-label" htmlFor="pfs-name">Full name</label>
              <input
                id="pfs-name"
                className="pfs-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!profileLoaded}
                maxLength={80}
                required
              />
            </div>
          </div>

          {profileBanner && (
            <div className={`pfs-banner pfs-banner--${profileBanner.kind}`}>
              {profileBanner.kind === 'success' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              <span>{profileBanner.message}</span>
            </div>
          )}
          {profileError && (
            <div className="pfs-banner pfs-banner--error">
              <XCircle size={15} /><span>{profileError}</span>
            </div>
          )}

          <div className="pfs-form-actions">
            <button className="pfs-btn pfs-btn--primary" type="submit" disabled={savingProfile || !profileLoaded}>
              {savingProfile ? <Loader2 size={15} className="pfs-spin" /> : <Save size={15} />}
              Save changes
            </button>
          </div>
        </form>

        {/* ══════════════════ SECTION — MEDICAL ID ══════════════════ */}
        <div className={`pfs-card pfs-medid-card${medIdExpanded ? ' pfs-medid-card--expanded' : ''}`} id="medical-id" ref={medicalIdRef}>
          <button
            type="button"
            className="pfs-medid-toggle"
            onClick={() => setMedIdExpanded(v => !v)}
            aria-expanded={medIdExpanded}
            aria-controls="medical-id-body"
          >
            <span className="pfs-medid-toggle__icon"><ClipboardList size={18} /></span>
            <span className="pfs-medid-toggle__text">
              <span className="pfs-card__title pfs-card__title--as-span">Medical ID</span>
              <span className="pfs-card__sub pfs-card__sub--tight pfs-card__sub--as-span">
                {medIdExpanded
                  ? "Shown to clinics and responders. Only add things that would change how you're treated."
                  : (nhisExpiryInfo.status === 'expired' || nhisExpiryInfo.status === 'expiring')
                    ? `⚠ ${nhisExpiryInfo.estimated ? 'Your NHIS card may have' : 'Your NHIS card'} ${
                        nhisExpiryInfo.status === 'expired'
                          ? 'expired'
                          : nhisExpiryInfo.daysLeft === 0
                            ? 'renews today'
                            : nhisExpiryInfo.daysLeft === 1
                              ? 'renews tomorrow'
                              : `renews in ${nhisExpiryInfo.daysLeft} days`
                      }. Tap to renew.`
                    : "So clinics and responders know how to treat you, even if you can't speak."}
              </span>
            </span>
            <ChevronRight size={18} className="pfs-medid-toggle__chevron" />
          </button>

          {medIdExpanded && (
          <div id="medical-id-body" className="pfs-medid-body">
          {medIdBanner && (
            <div className={`pfs-banner pfs-banner--${medIdBanner.kind}`}>
              {medIdBanner.kind === 'success' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              <span>{medIdBanner.message}</span>
            </div>
          )}

          {/* Blood type */}
          <div className="pfs-medid-panel pfs-medid-panel--blood">
            <div className="pfs-medid-panel__head">
              <span className="pfs-medid-panel__icon"><Droplet size={15} /></span>
              <span className="pfs-medid-panel__text">
                <span className="pfs-medid-panel__title">Blood type</span>
                <span className="pfs-medid-panel__sub">Guides transfusion decisions if you need one urgently.</span>
              </span>
              <select
                id="pfs-blood-type"
                aria-label="Blood type"
                className="pfs-input pfs-input--select pfs-medid-panel__select"
                value={bloodType}
                disabled={!medIdLoaded || savingBloodType}
                onChange={e => handleSaveBloodType(e.target.value)}
              >
                <option value="">Not set</option>
                {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
              {savingBloodType && <Loader2 size={14} className="pfs-spin pfs-medid-panel__spinner" />}
            </div>
          </div>

          {/* Allergies */}
          <div className="pfs-medid-panel pfs-medid-panel--allergy">
            <div className="pfs-medid-panel__head">
              <span className="pfs-medid-panel__icon"><AlertTriangle size={15} /></span>
              <span className="pfs-medid-panel__text">
                <span className="pfs-medid-panel__title">Allergies</span>
                <span className="pfs-medid-panel__sub">Flags reactions before you're given medication or treatment.</span>
              </span>
            </div>

            {allergies.length === 0 && medIdLoaded && (
              <p className="pfs-medid-empty">No allergies added.</p>
            )}
            {allergies.map(a => (
              <div key={a.id} className="pfs-medid-row">
                <span className={`pfs-medid-tag pfs-medid-tag--${a.severity}`}>{a.severity}</span>
                <span className="pfs-medid-row__name">{a.name}</span>
                <button
                  type="button"
                  className="pfs-medid-row__remove"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => handleDeleteAllergy(a.id)}
                  disabled={deletingAllergyId === a.id}
                >
                  {deletingAllergyId === a.id ? <Loader2 size={13} className="pfs-spin" /> : <X size={13} />}
                </button>
              </div>
            ))}
            <div className="pfs-medid-add-row">
              <input
                className="pfs-input"
                type="text"
                placeholder="e.g. Penicillin"
                value={newAllergyName}
                onChange={e => setNewAllergyName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAllergy(); } }}
              />
              <select
                className="pfs-input pfs-input--select pfs-input--narrow"
                value={newAllergySeverity}
                onChange={e => setNewAllergySeverity(e.target.value)}
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
              <button
                type="button"
                className="pfs-btn pfs-btn--ghost pfs-medid-add-btn"
                onClick={handleAddAllergy}
                disabled={savingAllergy || !newAllergyName.trim()}
              >
                {savingAllergy ? <Loader2 size={14} className="pfs-spin" /> : <Plus size={14} />}
              </button>
            </div>
          </div>

          {/* Conditions */}
          <div className="pfs-medid-panel pfs-medid-panel--condition">
            <div className="pfs-medid-panel__head">
              <span className="pfs-medid-panel__icon"><Stethoscope size={15} /></span>
              <span className="pfs-medid-panel__text">
                <span className="pfs-medid-panel__title">Conditions</span>
                <span className="pfs-medid-panel__sub">Gives context responders need for the right care, fast.</span>
              </span>
            </div>

            {conditions.length === 0 && medIdLoaded && (
              <p className="pfs-medid-empty">No conditions added.</p>
            )}
            {conditions.map(c => (
              <div key={c.id} className="pfs-medid-row">
                <span className={`pfs-medid-tag pfs-medid-tag--status-${c.status}`}>{c.status}</span>
                <span className="pfs-medid-row__name">{c.name}</span>
                <button
                  type="button"
                  className="pfs-medid-row__remove"
                  aria-label={`Remove ${c.name}`}
                  onClick={() => handleDeleteCondition(c.id)}
                  disabled={deletingConditionId === c.id}
                >
                  {deletingConditionId === c.id ? <Loader2 size={13} className="pfs-spin" /> : <X size={13} />}
                </button>
              </div>
            ))}
            <div className="pfs-medid-add-row">
              <input
                className="pfs-input"
                type="text"
                placeholder="e.g. Asthma"
                value={newConditionName}
                onChange={e => setNewConditionName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCondition(); } }}
              />
              <select
                className="pfs-input pfs-input--select pfs-input--narrow"
                value={newConditionStatus}
                onChange={e => setNewConditionStatus(e.target.value)}
              >
                <option value="managed">Managed</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </select>
              <button
                type="button"
                className="pfs-btn pfs-btn--ghost pfs-medid-add-btn"
                onClick={handleAddCondition}
                disabled={savingCondition || !newConditionName.trim()}
              >
                {savingCondition ? <Loader2 size={14} className="pfs-spin" /> : <Plus size={14} />}
              </button>
            </div>
          </div>

          {/* NHIS card */}
          <div className="pfs-medid-panel pfs-medid-panel--nhis">
            <div className="pfs-medid-panel__head">
              <span className="pfs-medid-panel__icon"><Shield size={15} /></span>
              <span className="pfs-medid-panel__text">
                <span className="pfs-medid-panel__title">NHIS card</span>
                <span className="pfs-medid-panel__sub">Lets facilities confirm your cover without you carrying the physical card.</span>
              </span>
            </div>

            <div className="pfs-nhis-preview">
              {nhisExpiryInfo.status !== 'none' && (
                <span className={`pfs-nhis-expiry-badge pfs-nhis-expiry-badge--${nhisExpiryInfo.status}`}>
                  {nhisExpiryInfo.label}
                </span>
              )}
              <div className="pfs-nhis-preview__top">
                <span className="pfs-nhis-preview__scheme">National Health Insurance Scheme</span>
                <CreditCard size={16} className="pfs-nhis-preview__chip" />
              </div>
              <span className="pfs-nhis-preview__id">{nhisId || 'GH-•••• •••• ••'}</span>
              <div className="pfs-nhis-preview__bottom">
                <span>
                  <span className="pfs-nhis-preview__label">Member</span>
                  <span className="pfs-nhis-preview__value">{nhisMembershipType || '—'}</span>
                </span>
                <span>
                  <span className="pfs-nhis-preview__label">Expires</span>
                  <span className="pfs-nhis-preview__value">{nhisExpiryDate || '—'}</span>
                </span>
              </div>
            </div>

            <div className="pfs-field-row">
              <div className="pfs-field">
                <label className="pfs-label" htmlFor="pfs-nhis-id">NHIS ID</label>
                <input id="pfs-nhis-id" className="pfs-input" type="text" value={nhisId} onChange={e => setNhisId(e.target.value)} placeholder="e.g. GH-1234567890" />
              </div>
              <div className="pfs-field">
                <label className="pfs-label" htmlFor="pfs-nhis-type">Membership type</label>
                <input id="pfs-nhis-type" className="pfs-input" type="text" value={nhisMembershipType} onChange={e => setNhisMembershipType(e.target.value)} placeholder="e.g. Adult" />
              </div>
            </div>
            <div className="pfs-field-row">
              <div className="pfs-field">
                <label className="pfs-label" htmlFor="pfs-nhis-issued">Issued</label>
                <input id="pfs-nhis-issued" className="pfs-input" type="date" value={nhisIssuedDate} onChange={e => setNhisIssuedDate(e.target.value)} />
              </div>
              <div className="pfs-field">
                <label className="pfs-label" htmlFor="pfs-nhis-expiry">Expires</label>
                <input id="pfs-nhis-expiry" className="pfs-input" type="date" value={nhisExpiryDate} onChange={e => setNhisExpiryDate(e.target.value)} />
              </div>
            </div>
            <div className="pfs-field">
              <label className="pfs-label" htmlFor="pfs-nhis-body">Issuing body</label>
              <input id="pfs-nhis-body" className="pfs-input" type="text" value={nhisIssuingBody} onChange={e => setNhisIssuingBody(e.target.value)} placeholder="National Health Insurance Authority" />
            </div>
            <div className="pfs-form-actions">
              <button className="pfs-btn pfs-btn--primary" type="button" onClick={handleSaveNhis} disabled={savingNhis}>
                {savingNhis ? <Loader2 size={15} className="pfs-spin" /> : <Save size={15} />}
                Save NHIS card
              </button>
            </div>
          </div>
          </div>
          )}
        </div>

        {/* ══════════════════ SECTION — SAVED FACILITIES ══════════════════ */}
        <div className="pfs-card" id="saved-facilities">
          <h2 className="pfs-card__title">Saved Facilities</h2>
          <p className="pfs-card__sub">Facilities you've bookmarked for quick access.</p>

          {savedFacilities === null && (
            <div className="pfs-empty">Loading…</div>
          )}

          {savedFacilities !== null && savedFacilities.length === 0 && (
            <div className="pfs-empty">
              You haven&apos;t saved any facilities yet. Tap the bookmark icon on any facility to save it here.
            </div>
          )}

          {savedFacilities?.map((f, i) => {
            const distanceKm = userCoords
              ? calculateDistance(userCoords.lat, userCoords.lng, f.latitude, f.longitude)
              : null;
            return (
              <div key={f.id} className={`pfs-saved-row${i === 0 ? ' pfs-saved-row--first' : ''}`}>
                <div className="pfs-saved-row__top">
                  <div className="pfs-saved-row__info">
                    <span className="pfs-saved-row__name">{f.name}</span>
                    <span className="pfs-saved-row__badges">
                      <span className="pfs-saved-row__type">{f.type.replace(/_/g, ' ')}</span>
                      {distanceKm !== null && (
                        <span className="pfs-saved-row__distance"><MapPin size={11} /> {formatDistance(distanceKm)}</span>
                      )}
                    </span>
                  </div>
                  <button
                    className="pfs-saved-row__remove"
                    type="button"
                    aria-label={`Remove ${f.name} from saved`}
                    onClick={() => removeSavedFacility(f.facilityId)}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="pfs-saved-row__actions">
                  {f.phone && (
                    <a className="pfs-saved-row__btn" href={`tel:${f.phone}`}>
                      <Phone size={13} /> Call
                    </a>
                  )}
                  <button className="pfs-saved-row__btn" type="button" onClick={() => openDirections(f.latitude, f.longitude)}>
                    <Navigation size={13} /> Directions
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══════════════════ SECTION — MY ACTIVITY ══════════════════ */}
        <div className="pfs-card" id="my-activity">
          <h2 className="pfs-card__title">My Activity</h2>
          <p className="pfs-card__sub">Your recent searches, views, and emergency actions.</p>

          {activities === null && (
            <div className="pfs-empty">Loading…</div>
          )}

          {activities !== null && activities.length === 0 && (
            <div className="pfs-empty">No activity yet — your searches and views will show up here.</div>
          )}

          {activities?.map(a => {
            const Icon = activityIconFor(a.activityType);
            return (
              <div key={a.id} className="pfs-activity-row">
                <div className="pfs-activity-row__icon"><Icon size={15} /></div>
                <div className="pfs-activity-row__body">
                  <p className="pfs-activity-row__title">{a.title}</p>
                  {a.description && <p className="pfs-activity-row__desc">{a.description}</p>}
                </div>
                <span className="pfs-activity-row__time">{getRelativeTime(new Date(a.createdAt))}</span>
              </div>
            );
          })}

          {activities !== null && activities.length > 0 && (
            <div className="pfs-activity-footer">
              {activitiesTotal > activities.length && (
                <button className="pfs-btn pfs-btn--ghost" type="button" onClick={() => router.push('/dashboard/activities')}>
                  View all <ChevronRight size={14} />
                </button>
              )}
              <button className="pfs-btn pfs-btn--danger" type="button" onClick={() => setShowClearConfirm(true)}>
                <Trash2 size={14} /> Clear activity history
              </button>
            </div>
          )}

          {showClearConfirm && (
            <div className="pfs-confirm-overlay" onClick={() => setShowClearConfirm(false)}>
              <div className="pfs-confirm" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <div className="pfs-confirm__icon"><Trash2 size={18} /></div>
                <h3 className="pfs-confirm__title">Clear activity history?</h3>
                <p className="pfs-confirm__body">This removes all your activity history. This can&apos;t be undone.</p>
                <div className="pfs-confirm__actions">
                  <button className="pfs-btn pfs-btn--ghost pfs-btn--full" type="button" onClick={() => setShowClearConfirm(false)}>
                    Cancel
                  </button>
                  <button className="pfs-btn pfs-btn--danger pfs-btn--full" type="button" onClick={handleClearHistory} disabled={clearingHistory}>
                    {clearingHistory ? <Loader2 size={14} className="pfs-spin" /> : <Trash2 size={14} />}
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════ SECTION 2 — APP SETTINGS ════════════════ */}
        <div className="pfs-card" id="app-settings">
          <h2 className="pfs-card__title">App Settings</h2>
          <p className="pfs-card__sub">Display, language, notifications, and account.</p>

          {/* ── Display ─────────────────────────────────────────── */}
          <div className="pfs-group pfs-group--display">
            <h3 className="pfs-group__title"><span className="pfs-group__icon"><Palette size={14} /></span> Display</h3>

            <div className="pfs-row">
              <div className="pfs-row__text">
                <span className="pfs-row__label">Dark Mode</span>
              </div>
              <button
                className={`pfs-toggle${isDarkMode ? ' pfs-toggle--on' : ''}`}
                type="button"
                role="switch"
                aria-checked={isDarkMode}
                aria-label="Toggle dark mode"
                onClick={toggleDarkMode}
              >
                <span className="pfs-toggle__thumb" />
              </button>
            </div>

            <div className="pfs-row" style={{ display: 'block' }}>
              <div className="pfs-row__text" style={{ marginBottom: 10 }}>
                <span className="pfs-row__label">Text Size</span>
              </div>
              <div className="pfs-seg">
                {FONT_SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`pfs-seg__btn${fontSize === opt.value ? ' pfs-seg__btn--active' : ''}`}
                    onClick={() => setFontSize(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pfs-row" style={{ display: 'block' }}>
              <div className="pfs-row__text" style={{ marginBottom: 10 }}>
                <span className="pfs-row__label"><Type size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Text Style</span>
              </div>
              <div className="pfs-font-grid">
                {FONT_STYLE_OPTIONS.map(opt => {
                  const active = fontStyle === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pfs-font-card${active ? ' pfs-font-card--active' : ''}`}
                      onClick={() => setFontStyle(opt.value)}
                    >
                      <span className="pfs-font-card__top">
                        <span className="pfs-font-card__glyph" style={opt.family ? { fontFamily: opt.family } : undefined}>Aa</span>
                        <span className="pfs-font-card__label">
                          {opt.label}
                          {active && <Check size={11} className="pfs-font-card__check" />}
                        </span>
                      </span>
                      <span className="pfs-font-card__preview" style={opt.family ? { fontFamily: opt.family } : undefined}>
                        {FONT_PREVIEW_TEXT}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Language ─────────────────────────────────────────── */}
          <div className="pfs-group pfs-group--language">
            <h3 className="pfs-group__title"><span className="pfs-group__icon"><Globe size={14} /></span> Language</h3>
            <div className="pfs-seg pfs-seg--2">
              <button
                type="button"
                className={`pfs-seg__btn${language === 'en' ? ' pfs-seg__btn--active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`pfs-seg__btn${language === 'tw' ? ' pfs-seg__btn--active' : ''}`}
                onClick={() => handleLanguageChange('tw')}
              >
                Twi
              </button>
            </div>
          </div>

          {/* ── Notifications ────────────────────────────────────── */}
          <div className="pfs-group pfs-group--notifications">
            <h3 className="pfs-group__title"><span className="pfs-group__icon"><Bell size={14} /></span> Notifications</h3>

            <div className="pfs-row">
              <div className="pfs-row__text">
                <span className="pfs-row__label">Health Alert Emails</span>
                <span className="pfs-row__desc">Public health, facility, and calendar alerts by email.</span>
              </div>
              <button
                className={`pfs-toggle${alertEmailsEnabled ? ' pfs-toggle--on' : ''}`}
                type="button"
                role="switch"
                aria-checked={alertEmailsEnabled}
                aria-label="Toggle health alert emails"
                onClick={toggleAlertEmails}
                disabled={savingKey === 'alertEmailsEnabled'}
              >
                <span className="pfs-toggle__thumb" />
              </button>
            </div>

            <div className={`pfs-row${!alertEmailsEnabled ? ' pfs-row--disabled' : ''}`}>
              <div className="pfs-row__text">
                <span className="pfs-row__label">Welcome me by name in alerts</span>
                <span className="pfs-row__desc">"Hi {name.split(' ')[0] || 'there'}," instead of a generic greeting.</span>
              </div>
              <button
                className={`pfs-toggle${alertNamePersonalization ? ' pfs-toggle--on' : ''}`}
                type="button"
                role="switch"
                aria-checked={alertNamePersonalization}
                aria-label="Toggle name personalisation in alert emails"
                onClick={toggleAlertPersonalization}
                disabled={savingKey === 'alertNamePersonalization' || !alertEmailsEnabled}
              >
                <span className="pfs-toggle__thumb" />
              </button>
            </div>

            <div className={`pfs-row${!pushSupported ? ' pfs-row--disabled' : ''}`}>
              <div className="pfs-row__text">
                <span className="pfs-row__label">Push notifications</span>
                <span className="pfs-row__desc">
                  {pushSupported
                    ? 'Health alerts on this device, even when the app is closed.'
                    : "This browser doesn't support push notifications."}
                </span>
              </div>
              <button
                className={`pfs-toggle${pushEnabled ? ' pfs-toggle--on' : ''}`}
                type="button"
                role="switch"
                aria-checked={pushEnabled}
                aria-label="Toggle push notifications"
                onClick={togglePush}
                disabled={savingKey === 'pushEnabled' || !pushSupported}
              >
                <span className="pfs-toggle__thumb" />
              </button>
            </div>
          </div>

          {/* ── Account ──────────────────────────────────────────── */}
          <div className="pfs-group pfs-group--account">
            <h3 className="pfs-group__title"><span className="pfs-group__icon"><Mail size={14} /></span> Account</h3>

            <div className="pfs-row">
              <div className="pfs-row__text">
                <span className="pfs-row__label">Email</span>
              </div>
              <span className="pfs-row__value">{userEmail}</span>
            </div>

            {hasPassword ? (
              <>
                <button className="pfs-row pfs-row--link" type="button" onClick={() => setShowPwPanel(p => !p)}>
                  <span className="pfs-row__text">
                    <span className="pfs-row__label"><Lock size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Change password</span>
                  </span>
                  <ChevronRight size={16} className="pfs-row__chevron" />
                </button>

                {showPwPanel && (
                  <form className="pfs-inline-panel" onSubmit={handleChangePassword}>
                    {pwBanner && (
                      <div className={`pfs-banner pfs-banner--${pwBanner.kind}`} style={{ marginBottom: 12 }}>
                        {pwBanner.kind === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span>{pwBanner.message}</span>
                      </div>
                    )}
                    <div className="pfs-field">
                      <label className="pfs-label" htmlFor="pfs-current-pw">Current password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="pfs-current-pw"
                          className="pfs-input"
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPw}
                          onChange={e => setCurrentPw(e.target.value)}
                          style={{ paddingRight: 40 }}
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(v => !v)}
                          aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--hc-text3)', cursor: 'pointer', padding: 4 }}
                        >
                          {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="pfs-field">
                      <label className="pfs-label" htmlFor="pfs-new-pw">New password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="pfs-new-pw"
                          className="pfs-input"
                          type={showNewPw ? 'text' : 'password'}
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          style={{ paddingRight: 40 }}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(v => !v)}
                          aria-label={showNewPw ? 'Hide password' : 'Show password'}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--hc-text3)', cursor: 'pointer', padding: 4 }}
                        >
                          {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {newPw.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {PW_REQS.map((r, i) => (
                            <span key={r.label} style={{ fontSize: 11.5, color: pwReqsMet[i] ? 'var(--hc-teal)' : 'var(--hc-text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Check size={11} style={{ opacity: pwReqsMet[i] ? 1 : 0.3 }} /> {r.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="pfs-btn pfs-btn--primary pfs-btn--full" type="submit" disabled={pwSaving || !currentPw || !pwAllMet}>
                      {pwSaving ? <Loader2 size={15} className="pfs-spin" /> : <Lock size={15} />}
                      Update password
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="pfs-row">
                <span className="pfs-row__desc">Signed in with Google — no password to change.</span>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <button className="pfs-btn pfs-btn--ghost pfs-btn--full" type="button" onClick={handleSignOut}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>

          {/* ── Legal ────────────────────────────────────────────── */}
          <div className="pfs-group pfs-group--legal">
            <h3 className="pfs-group__title"><span className="pfs-group__icon"><Lock size={14} /></span> Legal</h3>
            <button className="pfs-row pfs-row--link" type="button" onClick={() => setLegalModal('privacy')}>
              <span className="pfs-row__label">Privacy Policy</span>
              <ChevronRight size={16} className="pfs-row__chevron" />
            </button>
            <button className="pfs-row pfs-row--link" type="button" onClick={() => setLegalModal('terms')}>
              <span className="pfs-row__label">Terms of Use</span>
              <ChevronRight size={16} className="pfs-row__chevron" />
            </button>
          </div>
        </div>
      </div>

      {legalModal && <LegalModal type={legalModal} isDark={isDarkMode} onClose={() => setLegalModal(null)} />}
    </DashboardLayout>
  );
}