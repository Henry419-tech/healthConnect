'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardLayout from '@/components/DashboardLayout';
import { getRelativeTime } from '@/lib/activityTracker';
import { useFacilitySearch } from '@/hooks/useFacilitySearch';
import '@/styles/dashboard-header.css';
import '@/styles/dashboard.css';
import '@/styles/footer.css';
import '@/styles/dashboard-mobile.css';
import '@/styles/profile.css';
import {
  Heart, Camera, User, Mail, Moon, Sun, LogOut, Save, X,
  Check, AlertCircle, Edit2, Bell, Settings, Search,
  ChevronRight, Plus, Shield, Pill, Activity, Star,
  Users, BookOpen, Zap, AlertTriangle, Stethoscope,
  Phone, MapPin, Bot, Loader2, Lock, Eye, EyeOff, Navigation, BookmarkCheck,
  Droplets, Weight, Calendar, ClipboardList, TrendingUp, CheckCircle, Copy,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
interface HealthProfile {
  bloodType: string;
  age: number;
  weight: string;
  height: string;
  dob: string;
  memberSince: string;
  bmi?: number;
  gender?: string;
}

interface Allergy   { id: string; name: string; severity: 'mild' | 'moderate' | 'severe'; }
interface Medication { id: string; name: string; dose: string; frequency: string; active: boolean; }
interface Condition  { id: string; name: string; status: 'managed' | 'active' | 'resolved'; since?: string; }
interface SymptomSession { id: string; date: string; symptoms: string[]; result: string; }
interface SavedFacility {
  id: string;
  facilityId: string;
  name: string;
  type: string;
  city?: string;
  region?: string;
  phone?: string;
  hours?: string;
  emergencyServices: boolean;
  latitude: number;
  longitude: number;
  distance?: number;
  savedAt: string;
}
interface FamilyMember { id: string; name: string; relation: string; age: number; }
interface EmergencyContact {
  id: string; name: string; relationship: string; number: string;
  email?: string;
  isPrimary?: boolean; priority?: number;
}

/* ─── Default data ───────────────────────────────────────────── */
const DEFAULT_HEALTH: HealthProfile = {
  bloodType: 'Not set', age: 0, weight: 'Not set', height: 'Not set',
  dob: '', memberSince: '',
};

const SEVERITY_COLOR = { mild: 'pr-tag--green', moderate: 'pr-tag--amber', severe: 'pr-tag--red' };
const STATUS_COLOR   = { managed: 'pr-tag--teal', active: 'pr-tag--red', resolved: 'pr-tag--green' };

/* ── HCLogo — inline SVG logo, no CSS text-fill interference ── */
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

/* ─── Component ─────────────────────────────────────────────── */
const ProfileContent = () => {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /* Open modal from URL query param — e.g. /profile?modal=medicalId
     Triggered when navigating from the emergency page Medical ID button */
  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam === 'medicalId') {
      setModal('medicalId');
      // Clean the URL without triggering a navigation/re-render
      window.history.replaceState(null, '', '/profile');
    }
  }, [searchParams]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Auth/basic */
  const {
    searchQuery: facilityQuery, setSearchQuery: setFacilityQuery,
    searchInputRef: facilitySearchRef,
    handleSearchSubmit, handleSearchKeyDown,
  } = useFacilitySearch();
  const [isEditing,    setIsEditing]    = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveSuccess,  setSaveSuccess]  = useState(false);
  const [saveError,    setSaveError]    = useState('');
  const [isScrolled,   setIsScrolled]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name:  session?.user?.name  || '',
    email: session?.user?.email || '',
  });
  const [imagePreview, setImagePreview] = useState(session?.user?.image || '');

  /* Health data */
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [health,    setHealth]    = useState<HealthProfile>(DEFAULT_HEALTH);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [meds,      setMeds]      = useState<Medication[]>([]);
  const [conditions,setConditions]= useState<Condition[]>([]);
  const [sessions,  setSessions]  = useState<SymptomSession[]>([]);
  const [facilities,setFacilities]= useState<SavedFacility[]>([]);
  const [family,    setFamily]    = useState<FamilyMember[]>([]);

  /* Emergency contacts */
  const [emergencyContacts,        setEmergencyContacts]        = useState<EmergencyContact[]>([]);
  const [isLoadingContacts,        setIsLoadingContacts]        = useState(true);
  const [showAddContact,           setShowAddContact]           = useState(false);
  const [newContact,               setNewContact]               = useState({ name: '', relationship: '', number: '', email: '' });
  const [addingContact,            setAddingContact]            = useState(false);
  const [contactAddError,          setContactAddError]          = useState('');
  const [contactSaveSuccess,       setContactSaveSuccess]       = useState(false);
  const [copiedContactId,          setCopiedContactId]          = useState<string | null>(null);
  const [copiedMedId,              setCopiedMedId]              = useState(false);

  /* Edit contact state */
  const [editingEcId,  setEditingEcId]  = useState<string | null>(null);
  const [editEcForm,   setEditEcForm]   = useState({ name: '', relationship: '', number: '', email: '' });
  const [savingEc,     setSavingEc]     = useState(false);
  const [editEcError,  setEditEcError]  = useState('');

  /* Modal state */
  const [modal, setModal] = useState<null | 'medicalId' | 'allergies' | 'meds' | 'conditions' | 'sessions' | 'facilities' | 'family' | 'editHealth' | 'emergencyContacts'>(null);
  const [recentActivityCount, setRecentActivityCount] = useState(0);
  /* Inline add states */
  const [newAllergy,   setNewAllergy]   = useState({ name: '', severity: 'mild' as Allergy['severity'] });
  const [newMed,       setNewMed]       = useState({ name: '', dose: '', frequency: '' });
  const [newCondition, setNewCondition] = useState({ name: '', status: 'managed' as Condition['status'] });
  const [newFamilyMember, setNewFamilyMember] = useState({ name: '', relation: '', age: '' });
  const [editHealthForm, setEditHealthForm] = useState({ bloodType: '', age: 0, weight: '', height: '', dob: '', memberSince: '', gender: '' });

  /* ── Notification panel ───────────────────────────────────── */
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifsRead,     setNotifsRead]     = useState(false);
  const notifBellRef  = useRef<HTMLButtonElement>(null);
  const notifMobRef   = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  // ── Load profile + symptom history from API ──────────────
  useEffect(() => {
    if (status !== 'authenticated') return;
    setIsLoadingProfile(true);

    Promise.all([
      fetch('/api/health-profile').then(r => r.json()),
      fetch('/api/activities?type=symptom_checked&limit=10').then(r => r.json()),
      fetch('/api/saved-facilities').then(r => r.json()),
    ]).then(([{ profile }, actData, facData]) => {
      if (Array.isArray(facData?.facilities)) {
        setFacilities(facData.facilities);
      }
      if (profile) {
        const dob = profile.dateOfBirth;
        const age = dob
          ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : 0;
        const loaded: HealthProfile = {
          bloodType:   profile.bloodType   || 'Not set',
          age,
          weight:      profile.weightKg    ? `${profile.weightKg} kg` : 'Not set',
          height:      profile.heightCm    ? `${profile.heightCm} cm` : 'Not set',
          dob:         dob ? dob.split('T')[0] : '',
          memberSince: new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          bmi:         profile.bmi,
          gender:      profile.gender || '',
        };
        setHealth(loaded);
        setEditHealthForm({ ...loaded, gender: profile.gender || '' });
        setAllergies(profile.allergies   || []);
        setMeds(profile.medications      || []);
        setConditions(profile.conditions || []);
        setFamily(profile.familyMembers  || []);
      }
      const actList = actData.activities || [];
      setSessions(
        actList.map((a: any) => ({
          id:       a.id,
          date:     getRelativeTime(new Date(a.createdAt)),
          symptoms: a.description ? [a.description] : ['Health check'],
          result:   a.metadata?.urgencyLevel
                      ? `Risk: ${a.metadata.urgencyLevel}`
                      : 'Assessment completed',
        }))
      );
      setRecentActivityCount(actList.length);
    }).catch(() => {}).finally(() => setIsLoadingProfile(false));
  }, [status]);

  useEffect(() => {
    if (session?.user) {
      setFormData({ name: session.user.name || '', email: session.user.email || '' });
      setImagePreview(session.user.image || '');
    }
  }, [session]);

  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const userName     = session?.user?.name  || 'User';
  const userEmail    = session?.user?.email || '';
  const userImage    = session?.user?.image || null;
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const getInitials = (n: string) => n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

  /* ── Image ────────────────────────────────────────────── */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setSaveError('Image must be < 5MB'); return; }
    if (!file.type.startsWith('image/')) { setSaveError('Please select an image file'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setSaveError('');
  };

  /* ── Save profile ─────────────────────────────────────── */
  const handleSave = async () => {
    setIsSaving(true); setSaveError(''); setSaveSuccess(false);
    if (!formData.name.trim()) { setSaveError('Name is required'); setIsSaving(false); return; }
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name.trim(), image: imagePreview }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update'); }
      await update();
      setSaveSuccess(true); setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) { setSaveError(err.message); }
    finally { setIsSaving(false); }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ name: session?.user?.name || '', email: session?.user?.email || '' });
    setImagePreview(session?.user?.image || '');
    setSaveError('');
  };

  /* ── Add helpers ──────────────────────────────────────── */
  const addAllergy = async () => {
    if (!newAllergy.name.trim()) return;
    const res = await fetch('/api/health-profile/allergies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAllergy),
    });
    if (!res.ok) return;
    const { record } = await res.json();
    setAllergies(p => [...p, record]);
    setNewAllergy({ name: '', severity: 'mild' });
  };
  const removeAllergy = async (id: string) => {
    await fetch('/api/health-profile/allergies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setAllergies(p => p.filter(a => a.id !== id));
  };

  const addMed = async () => {
    if (!newMed.name.trim()) return;
    const res = await fetch('/api/health-profile/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMed, active: true }),
    });
    if (!res.ok) return;
    const { record } = await res.json();
    setMeds(p => [...p, record]);
    setNewMed({ name: '', dose: '', frequency: '' });
  };
  const removeMed = async (id: string) => {
    await fetch('/api/health-profile/medications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setMeds(p => p.filter(m => m.id !== id));
  };

  const addCondition = async () => {
    if (!newCondition.name.trim()) return;
    const res = await fetch('/api/health-profile/conditions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCondition),
    });
    if (!res.ok) return;
    const { record } = await res.json();
    setConditions(p => [...p, record]);
    setNewCondition({ name: '', status: 'managed' });
  };
  const removeCondition = async (id: string) => {
    await fetch('/api/health-profile/conditions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setConditions(p => p.filter(c => c.id !== id));
  };

  const addFamilyMember = async () => {
    if (!newFamilyMember.name.trim()) return;
    const res = await fetch('/api/health-profile/family-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newFamilyMember, age: Number(newFamilyMember.age) }),
    });
    if (!res.ok) return;
    const { record } = await res.json();
    setFamily(p => [...p, record]);
    setNewFamilyMember({ name: '', relation: '', age: '' });
  };
  const removeFamilyMember = async (id: string) => {
    await fetch('/api/health-profile/family-members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setFamily(p => p.filter(f => f.id !== id));
  };

  /* ── Emergency contacts ───────────────────────────────────── */
  useEffect(() => {
    if (status !== 'authenticated') return;
    setIsLoadingContacts(true);
    fetch('/api/emergency-contacts')
      .then(r => r.json())
      .then(({ contacts: data }) => {
        setEmergencyContacts(
          (data || []).map((c: any) => ({
            id:           c.id,
            name:         c.name,
            relationship: c.relationship,
            number:       c.number,
            email:        c.email || undefined,
            isPrimary:    c.priority === 1,
            priority:     c.priority,
          })),
        );
      })
      .catch(() => {})
      .finally(() => setIsLoadingContacts(false));
  }, [status]);

  const handleAddContact = async () => {
    setContactAddError('');
    if (!newContact.name.trim())   { setContactAddError('Name is required');         return; }
    if (!newContact.number.trim()) { setContactAddError('Phone number is required'); return; }
    setAddingContact(true);
    try {
      const res = await fetch('/api/emergency-contacts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         newContact.name.trim(),
          relationship: newContact.relationship.trim(),
          number:       newContact.number.trim(),
          email:        newContact.email.trim() || undefined,
          priority:     emergencyContacts.length + 1,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save contact');
      }
      const { contact } = await res.json();
      setEmergencyContacts(prev => [
        ...prev,
        { id: contact.id, name: contact.name, relationship: contact.relationship,
          number: contact.number, email: contact.email || undefined,
          isPrimary: contact.priority === 1, priority: contact.priority },
      ]);
      setNewContact({ name: '', relationship: '', number: '', email: '' });
      setShowAddContact(false);
      setContactSaveSuccess(true);
      setTimeout(() => setContactSaveSuccess(false), 3000);
    } catch (err: any) {
      setContactAddError(err.message || 'Failed to save contact. Please try again.');
    } finally {
      setAddingContact(false);
    }
  };

  /* ── Start editing a contact ─────────────────────────────── */
  const startEditEc = (c: EmergencyContact) => {
    setEditingEcId(c.id);
    setEditEcForm({ name: c.name, relationship: c.relationship, number: c.number, email: c.email || '' });
    setEditEcError('');
    setShowAddContact(false);
  };

  /* ── Save edited contact ─────────────────────────────────── */
  const handleSaveEc = async () => {
    setEditEcError('');
    if (!editEcForm.name.trim())   { setEditEcError('Name is required');         return; }
    if (!editEcForm.number.trim()) { setEditEcError('Phone number is required'); return; }
    setSavingEc(true);
    try {
      const res = await fetch('/api/emergency-contacts', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:           editingEcId,
          name:         editEcForm.name.trim(),
          relationship: editEcForm.relationship.trim(),
          number:       editEcForm.number.trim(),
          email:        editEcForm.email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update contact');
      }
      const { contact } = await res.json();
      setEmergencyContacts(prev => prev.map(c => c.id === editingEcId
        ? { ...c, name: contact.name, relationship: contact.relationship,
            number: contact.number, email: contact.email || undefined }
        : c,
      ));
      setEditingEcId(null);
      setContactSaveSuccess(true);
      setTimeout(() => setContactSaveSuccess(false), 3000);
    } catch (err: any) {
      setEditEcError(err.message || 'Failed to update contact.');
    } finally {
      setSavingEc(false);
    }
  };

  const removeEmergencyContact = async (id: string) => {
    // Optimistic update
    setEmergencyContacts(prev => prev.filter(c => c.id !== id));
    try {
      await fetch('/api/emergency-contacts', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      });
    } catch {
      // Re-fetch and re-map on failure to restore correct state
      fetch('/api/emergency-contacts')
        .then(r => r.json())
        .then(({ contacts: data }) => {
          setEmergencyContacts(
            (data || []).map((c: any) => ({
              id: c.id, name: c.name, relationship: c.relationship,
              number: c.number, email: c.email || undefined,
              isPrimary: c.priority === 1, priority: c.priority,
            })),
          );
        });
    }
  };

  const copyContactNumber = async (id: string, number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedContactId(id);
      setTimeout(() => setCopiedContactId(null), 2000);
    } catch { /* ignore */ }
  };

  /* ── Copy Medical ID as plain text ──────────────────────── */
  const copyMedicalId = async () => {
    const ec = emergencyContacts[0];
    const lines = [
      `=== MEDICAL ID — ${userName} ===`,
      `Blood Type:  ${health.bloodType}`,
      `Age:         ${health.age > 0 ? `${health.age} years` : '—'}`,
      `Height:      ${health.height}`,
      `Weight:      ${health.weight}`,
      `BMI:         ${health.bmi ?? '—'}`,
      `Allergies:   ${allergies.map(a => a.name).join(', ') || 'None'}`,
      `Medications: ${activeMeds.map(m => m.name).join(', ') || 'None'}`,
      `Conditions:  ${conditions.map(c => c.name).join(', ') || 'None'}`,
      ec ? `Emergency Contact: ${ec.name} — ${ec.number}` : '',
      `Generated: ${new Date().toLocaleString()}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopiedMedId(true);
      setTimeout(() => setCopiedMedId(false), 2500);
    } catch { /* ignore */ }
  };

  const removeSavedFacility = async (facilityId: string) => {
    await fetch('/api/saved-facilities', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId }),
    });
    setFacilities(prev => prev.filter(f => f.facilityId !== facilityId));
  };

  const saveHealth = async () => {
    const weightKg = editHealthForm.weight.replace(/[^0-9.]/g, '') || undefined;
    const heightCm = editHealthForm.height.replace(/[^0-9.]/g, '') || undefined;

    await fetch('/api/health-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bloodType:   editHealthForm.bloodType || undefined,
        dateOfBirth: editHealthForm.dob       || undefined,
        weightKg,
        heightCm,
        gender:      editHealthForm.gender    || undefined,
      }),
    });

    // Reload from DB to get computed BMI
    const { profile } = await fetch('/api/health-profile').then(r => r.json());
    if (profile) {
      const age = profile.dateOfBirth
        ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;
      setHealth(prev => ({
        ...prev,
        bloodType: profile.bloodType || prev.bloodType,
        age,
        weight: profile.weightKg ? `${profile.weightKg} kg` : prev.weight,
        height: profile.heightCm ? `${profile.heightCm} cm` : prev.height,
        bmi:    profile.bmi,
        gender: profile.gender || prev.gender,
      }));
    }
    setModal(null);
  };

  const activeMeds = meds.filter(m => m.active);

  /* ── Notification panel logic ─────────────────────────────── */
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

    // Profile incomplete
    if (health.bloodType === 'Not set')
      list.push({ id: 'blood', icon: Droplets, color: 'red',
        title: 'Blood type not set',
        body: 'Add your blood type — critical for emergencies and Medical ID.',
        action: () => setModal('editHealth') });

    if (!health.dob || health.age === 0)
      list.push({ id: 'dob', icon: Calendar, color: 'amber',
        title: 'Date of birth missing',
        body: 'Required to calculate your age and BMI accurately.',
        action: () => setModal('editHealth') });

    if (health.weight === 'Not set' || health.height === 'Not set')
      list.push({ id: 'biometrics', icon: Weight, color: 'amber',
        title: 'Height or weight not set',
        body: 'Needed to calculate your BMI health score.',
        action: () => setModal('editHealth') });

    if (!health.gender && !isLoadingProfile)
      list.push({ id: 'gender', icon: User, color: 'amber',
        title: 'Gender not recorded',
        body: 'Your gender helps personalise health recommendations and Medical ID accuracy.',
        action: () => setModal('editHealth') });

    // Emergency contacts
    if (!isLoadingContacts && emergencyContacts.length === 0)
      list.push({ id: 'contacts', icon: Phone, color: 'red',
        title: 'No emergency contacts',
        body: 'Add at least one contact so they can be reached in an emergency.',
        action: () => setModal('emergencyContacts') });
    else if (!isLoadingContacts && emergencyContacts.every(c => !(c as any).email))
      list.push({ id: 'contact-email', icon: Bell, color: 'amber',
        title: 'Emergency contacts have no email',
        body: 'Add email addresses so they receive SOS alerts automatically.',
        action: () => router.push('/emergency') });

    // Medical data
    if (allergies.length === 0)
      list.push({ id: 'allergies', icon: AlertTriangle, color: 'amber',
        title: 'No allergies recorded',
        body: 'Record known allergies so first responders and doctors can act safely.',
        action: () => setModal('allergies') });

    if (activeMeds.length === 0)
      list.push({ id: 'meds', icon: Pill, color: 'amber',
        title: 'No active medications',
        body: 'Add current medications to your profile for accurate health tracking.',
        action: () => setModal('meds') });

    // Active unmanaged conditions
    const activeConditions = conditions.filter(c => c.status === 'active');
    if (activeConditions.length > 0)
      list.push({ id: 'active-conditions', icon: Activity, color: 'red',
        title: `${activeConditions.length} active condition${activeConditions.length > 1 ? 's' : ''} unmanaged`,
        body: `${activeConditions.map(c => c.name).join(', ')} — consider discussing a treatment plan with your doctor.`,
        action: () => setModal('conditions') });

    // No saved facilities
    if (!isLoadingProfile && facilities.length === 0)
      list.push({ id: 'no-facilities', icon: MapPin, color: 'amber',
        title: 'No saved facilities',
        body: 'Bookmark a nearby hospital or clinic so you can find it quickly in an emergency.',
        action: () => router.push('/facilities') });

    // No symptom history
    if (!isLoadingProfile && sessions.length === 0)
      list.push({ id: 'no-sessions', icon: ClipboardList, color: 'teal',
        title: 'No symptom checks yet',
        body: 'Use the AI symptom checker to get personalised health insights and build your history.',
        action: () => router.push('/symptom-checker') });

    // All clear positive state
    if (health.bloodType !== 'Not set' && health.weight !== 'Not set' && health.height !== 'Not set'
        && emergencyContacts.length > 0 && allergies.length > 0 && activeConditions.length === 0)
      list.push({ id: 'complete', icon: CheckCircle, color: 'mint',
        title: 'Profile looks great!',
        body: 'Your health profile is well filled — keep it up to date for best results.' });

    if (list.length === 0)
      list.push({ id: 'empty', icon: CheckCircle, color: 'mint',
        title: 'All caught up!',
        body: 'No profile actions needed right now.' });

    return list;
  }, [health, emergencyContacts, isLoadingContacts, allergies, activeMeds, conditions, facilities, sessions, isLoadingProfile, router]);

  const hasUnread = notifications.some(n => n.id !== 'empty' && n.id !== 'complete') && !notifsRead;
  const toggleNotifPanel = () => { setShowNotifPanel(p => !p); setNotifsRead(true); };

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

  /* ── RENDER ─────────────────────────────────────────────── */
  return (
    <DashboardLayout activeTab="/profile" className="hc-layout--has-mob-topbar">

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

      {/* ── Notification panel ─────────────────────────────────── */}
      {showNotifPanel && (
        <>
          <div className="db-notif-panel" ref={notifPanelRef} role="dialog" aria-label="Notifications">
            <div className="db-notif-panel__header">
              <span className="db-notif-panel__title">Notifications</span>
              {notifications.some(n => n.id !== 'empty' && n.id !== 'complete') && (
                <span className="db-notif-panel__count">
                  {notifications.filter(n => n.id !== 'empty' && n.id !== 'complete').length}
                </span>
              )}
              <button className="db-notif-panel__close" onClick={() => setShowNotifPanel(false)} type="button" aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div className="db-notif-panel__list">
              {notifications.map(n => {
                const Icon = n.icon;
                return (
                  <button key={n.id} className={`db-notif-item db-notif-item--${n.color}`}
                    onClick={() => { setShowNotifPanel(false); n.action?.(); }}
                    type="button" disabled={!n.action}>
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

      {/* ── Mobile topbar ──────────────────────────────────── */}
      <div className="mob-topbar">
        <div className="mob-topbar__left">
          <HCLogo size={30} />
          <span className="mob-topbar__logo-text">HealthConnect</span>
        </div>
        <div className="mob-topbar__right">
          <button className="mob-topbar__btn" type="button" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button ref={notifMobRef} className="mob-topbar__btn mob-topbar__bell" type="button" aria-label="Notifications" onClick={toggleNotifPanel}>
            <Bell size={18} />{hasUnread && <span className="mob-topbar__bell-dot" />}
          </button>
          <button className="mob-topbar__avatar-btn" type="button">
            <div className="mob-topbar__avatar">
              {userImage ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" /> : userInitials}
            </div>
          </button>
        </div>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────── */}
      <nav className="mob-tab-bar" aria-label="Main navigation">
        <div className="mob-tab-bar__inner">
          <button className="mob-tab-btn" onClick={() => router.push('/dashboard')} type="button" aria-label="Home">
            <span className="mob-tab-btn__icon"><Heart size={20} /></span>Home
          </button>
          <button className="mob-tab-btn" onClick={() => router.push('/facilities')} type="button" aria-label="Find facilities">
            <span className="mob-tab-btn__icon"><MapPin size={20} /></span>Find
          </button>
          <button className="mob-tab-btn" onClick={() => router.push('/symptom-checker')} type="button" aria-label="Symptom Checker">
            <span className="mob-tab-btn__icon"><Bot size={20} /></span>Check
          </button>
          <button className="mob-tab-btn mob-tab-btn--sos" onClick={() => router.push('/emergency')} type="button" aria-label="Emergency">
            <span className="mob-tab-sos-icon"><Phone size={20} /></span>SOS
          </button>
          <button className="mob-tab-btn active" onClick={() => router.push('/profile')} type="button" aria-current="page" aria-label="Profile">
            <span className="mob-tab-btn__icon"><User size={20} /></span>Profile
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
          MAIN PAGE
      ══════════════════════════════════════════════════════ */}
      <div className="db-page pr-page">

        {/* ── Page header ─────────────────────────────────── */}
        <div className="pr-page-header">
          <div>
            <h1 className="pr-page-header__title">Health Profile</h1>
            <p className="pr-page-header__sub">Your complete health record — always private, always accessible</p>
          </div>
          <div className="pr-page-header__actions">
            <button className="pr-btn pr-btn--ghost" type="button" onClick={() => setModal('medicalId')}>
              <BookOpen size={14} /> Medical ID
            </button>
            <button className="pr-btn pr-btn--primary" type="button" onClick={() => setIsEditing(true)}>
              <Edit2 size={14} /> Edit Profile
            </button>
          </div>
        </div>

        {/* ── Notifications ───────────────────────────────── */}
        {saveSuccess && (
          <div className="pr-alert pr-alert--success"><Check size={16} /> Profile updated successfully!</div>
        )}
        {saveError && (
          <div className="pr-alert pr-alert--error"><AlertCircle size={16} /> {saveError}</div>
        )}

        {/* ── Identity card ───────────────────────────────── */}
        <div className={`pr-identity${isEditing ? ' pr-identity--editing' : ''}`}>
          {/* Avatar */}
          <div className="pr-identity__avatar-wrap">
            <div className="pr-identity__avatar" onClick={() => isEditing && fileInputRef.current?.click()}>
              {imagePreview
                ? <img src={imagePreview} alt={userName} referrerPolicy="no-referrer" />
                : getInitials(userName)}
              {isEditing && (
                <div className="pr-identity__avatar-overlay"><Camera size={22} /></div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            {isEditing && (
              <p className="pr-identity__avatar-hint" onClick={() => fileInputRef.current?.click()}>
                Tap or click to upload a photo
              </p>
            )}
          </div>

          {/* Info */}
          <div className="pr-identity__info">
            {isEditing ? (
              <input
                className="pr-identity__name-input"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                autoFocus
              />
            ) : (
              <h2 className="pr-identity__name">{userName}</h2>
            )}
            <p className="pr-identity__meta">HC-{userEmail.slice(0,5).toUpperCase()} · Member since {health.memberSince}</p>
            <div className="pr-identity__tags">
              <span className="pr-tag pr-tag--red">{health.bloodType} Blood Type</span>
              {conditions.map(c => (
                <span key={c.id} className={`pr-tag ${STATUS_COLOR[c.status]}`}>{c.name} — {c.status}</span>
              ))}
              {health.age > 0 && <span className="pr-tag pr-tag--amber">{health.age} years</span>}
            </div>
          </div>

          {/* Edit/Mobile action */}
          <div className="pr-identity__actions">
            {isEditing ? (
              <>
                <button className="pr-btn pr-btn--ghost pr-btn--sm" onClick={handleCancel} disabled={isSaving} type="button">
                  <X size={14} /> Cancel
                </button>
                <button className="pr-btn pr-btn--primary pr-btn--sm" onClick={handleSave} disabled={isSaving} type="button">
                  {isSaving ? <Loader2 size={14} className="pr-spin" /> : <Save size={14} />}
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button className="pr-btn pr-btn--ghost pr-btn--sm pr-mob-edit" onClick={() => setIsEditing(true)} type="button">
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────── */}
        <div className="pr-stats">
          {[
            { icon: Droplets, label: 'BLOOD TYPE', value: health.bloodType,  color: 'red'   },
            { icon: Calendar, label: 'AGE',         value: health.age > 0 ? String(health.age) : '—', color: 'teal'  },
            { icon: Weight,   label: 'WEIGHT',      value: health.weight,    color: 'violet' },
            { icon: Activity, label: 'BMI',          value: health.bmi ? String(health.bmi) : '—', color: 'teal' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={`pr-stat pr-stat--${color}`}>
              <Icon size={18} className="pr-stat__icon" />
              <div className="pr-stat__val">{value}</div>
              <div className="pr-stat__label">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Medical ID banner ───────────────────────────── */}
        <button className="pr-medid-banner" onClick={() => setModal('medicalId')} type="button">
          <div className="pr-medid-banner__icon">
            <BookOpen size={20} />
          </div>
          <div className="pr-medid-banner__body">
            <p className="pr-medid-banner__title">Medical ID — Always Accessible</p>
            <p className="pr-medid-banner__sub">Available offline · For first responders · Tap to view or share</p>
          </div>
          <ChevronRight size={18} className="pr-medid-banner__arrow" />
        </button>
        
{/* ── View Activities Banner ──────────────────────────────── */}
<button
  className="pr-activity-banner"
  onClick={() => router.push('/dashboard/activities')}
  type="button"
>
  <div className="pr-activity-banner__icon">
    <Activity size={20} />
  </div>
  <div className="pr-activity-banner__body">
    <p className="pr-activity-banner__title">Activity History</p>
    <p className="pr-activity-banner__sub">
      {recentActivityCount > 0
        ? `${recentActivityCount} recent health interactions — tap to view all`
        : 'View your full history of health interactions'}
    </p>
  </div>
  <ChevronRight size={18} className="pr-activity-banner__arrow" />
</button>
        {/* ── Health Records Grid ─────────────────────────── */}
        {isLoadingProfile ? (
          <div className="pr-loading">
            <div className="hc-loading__dots"><span /><span /><span /></div>
            <p>Loading your health profile…</p>
          </div>
        ) : (
        <div className="pr-grid">

          {/* Allergies */}
          <button className="pr-card" onClick={() => setModal('allergies')} type="button">
            <div className="pr-card__header">
              <div className="pr-card__icon pr-card__icon--amber"><AlertTriangle size={16} /></div>
              <span className="pr-card__title">Allergies</span>
              <span className="pr-card__count">{allergies.length} entries</span>
              <ChevronRight size={15} className="pr-card__arrow" />
            </div>
            <div className="pr-card__tags">
              {allergies.map(a => <span key={a.id} className={`pr-tag ${SEVERITY_COLOR[a.severity]}`}>{a.name}</span>)}
            </div>
          </button>

          {/* Medications */}
          <button className="pr-card" onClick={() => setModal('meds')} type="button">
            <div className="pr-card__header">
              <div className="pr-card__icon pr-card__icon--red"><Pill size={16} /></div>
              <span className="pr-card__title">Medications</span>
              <span className="pr-card__count">{activeMeds.length} active</span>
              <ChevronRight size={15} className="pr-card__arrow" />
            </div>
            <div className="pr-card__tags">
              {activeMeds.map(m => <span key={m.id} className="pr-tag pr-tag--teal">{m.name}</span>)}
            </div>
          </button>

          {/* Conditions */}
          <button className="pr-card" onClick={() => setModal('conditions')} type="button">
            <div className="pr-card__header">
              <div className="pr-card__icon pr-card__icon--violet"><Stethoscope size={16} /></div>
              <span className="pr-card__title">Conditions</span>
              <span className="pr-card__count">{conditions.length} {conditions.length === 1 ? 'entry' : 'entries'}</span>
              <ChevronRight size={15} className="pr-card__arrow" />
            </div>
            <div className="pr-card__tags">
              {conditions.map(c => <span key={c.id} className={`pr-tag ${STATUS_COLOR[c.status]}`}>{c.name} — {c.status}</span>)}
            </div>
          </button>

          {/* Symptom History */}
          <button className="pr-card" onClick={() => setModal('sessions')} type="button">
            <div className="pr-card__header">
              <div className="pr-card__icon pr-card__icon--teal"><ClipboardList size={16} /></div>
              <span className="pr-card__title">Symptom History</span>
              <span className="pr-card__count">{sessions.length} sessions</span>
              <ChevronRight size={15} className="pr-card__arrow" />
            </div>
            <div className="pr-card__tags">
              {sessions.slice(0, 2).map(s => (
                <span key={s.id} className="pr-tag pr-tag--ghost">{s.date}: {s.symptoms.slice(0,2).join(', ')}</span>
              ))}
            </div>
          </button>

          {/* Saved Facilities */}
          <button className="pr-card" onClick={() => setModal('facilities')} type="button">
            <div className="pr-card__header">
              <div className="pr-card__icon pr-card__icon--amber"><BookmarkCheck size={16} /></div>
              <span className="pr-card__title">Saved Facilities</span>
              <span className="pr-card__count">{facilities.length} saved</span>
              <ChevronRight size={15} className="pr-card__arrow" />
            </div>
            <div className="pr-card__tags">
              {facilities.slice(0, 3).map(f => (
                <span key={f.id} className="pr-tag pr-tag--ghost">
                  {f.name}{f.city ? ` · ${f.city}` : ''}
                </span>
              ))}
              {facilities.length === 0 && (
                <span className="pr-tag pr-tag--ghost" style={{ opacity: 0.5 }}>No saved facilities yet — tap to add</span>
              )}
            </div>
          </button>

          {/* Family Profiles */}
          <button className="pr-card" onClick={() => setModal('family')} type="button">
            <div className="pr-card__header">
              <div className="pr-card__icon pr-card__icon--green"><Users size={16} /></div>
              <span className="pr-card__title">Family Profiles</span>
              <span className="pr-card__count">Add member</span>
              <ChevronRight size={15} className="pr-card__arrow" />
            </div>
            <div className="pr-card__tags">
              {family.map(f => <span key={f.id} className="pr-tag pr-tag--ghost">{f.name} · {f.relation}</span>)}
            </div>
          </button>

          {/* Emergency Contacts */}
          <button className="pr-card pr-card--sos" onClick={() => setModal('emergencyContacts')} type="button">
            <div className="pr-card__header">
              <div className="pr-card__icon pr-card__icon--red"><Phone size={16} /></div>
              <span className="pr-card__title">Emergency Contacts</span>
              <span className="pr-card__count">
                {isLoadingContacts ? '…' : `${emergencyContacts.length} saved`}
              </span>
              <ChevronRight size={15} className="pr-card__arrow" />
            </div>
            <div className="pr-card__tags">
              {emergencyContacts.length > 0
                ? emergencyContacts.slice(0, 3).map(c => (
                    <span key={c.id} className={`pr-tag ${c.isPrimary ? 'pr-tag--red' : 'pr-tag--ghost'}`}>
                      {c.name}{c.isPrimary ? ' · Primary' : ''}
                    </span>
                  ))
                : <span className="pr-tag pr-tag--ghost" style={{ opacity: 0.5 }}>No contacts yet — tap to add</span>
              }
            </div>
          </button>
        </div>
        )} {/* end isLoadingProfile */}

        {/* ── Account Settings section ─────────────────────── */}
        <div className="pr-settings-section">
          <h3 className="pr-settings-section__title">Account</h3>
          <div className="pr-settings-list">

            {/* Email (read-only) */}
            <div className="pr-settings-item">
              <div className="pr-settings-item__icon"><Mail size={16} /></div>
              <div className="pr-settings-item__body">
                <p className="pr-settings-item__label">Email Address</p>
                <p className="pr-settings-item__val">{userEmail}</p>
              </div>
              <span className="pr-settings-item__badge">Cannot change</span>
            </div>

            {/* Dark mode */}
            <div className="pr-settings-item pr-settings-item--clickable" onClick={toggleDarkMode}>
              <div className="pr-settings-item__icon">{isDarkMode ? <Moon size={16} /> : <Sun size={16} />}</div>
              <div className="pr-settings-item__body">
                <p className="pr-settings-item__label">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</p>
                <p className="pr-settings-item__val">Tap to toggle theme</p>
              </div>
              <div className={`pr-toggle${isDarkMode ? ' pr-toggle--on' : ''}`}>
                <div className="pr-toggle__knob" />
              </div>
            </div>

            {/* Notifications */}
            <div className="pr-settings-item pr-settings-item--clickable">
              <div className="pr-settings-item__icon"><Bell size={16} /></div>
              <div className="pr-settings-item__body">
                <p className="pr-settings-item__label">Notifications</p>
                <p className="pr-settings-item__val">Health alerts, appointment reminders</p>
              </div>
              <ChevronRight size={16} className="pr-settings-item__arrow" />
            </div>

            {/* Privacy */}
            <div className="pr-settings-item pr-settings-item--clickable">
              <div className="pr-settings-item__icon"><Lock size={16} /></div>
              <div className="pr-settings-item__body">
                <p className="pr-settings-item__label">Privacy & Security</p>
                <p className="pr-settings-item__val">Data sharing, 2FA, session management</p>
              </div>
              <ChevronRight size={16} className="pr-settings-item__arrow" />
            </div>

            {/* Sign out */}
            <div className="pr-settings-item pr-settings-item--danger pr-settings-item--clickable"
              onClick={() => signOut({ callbackUrl: '/', redirect: true })}>
              <div className="pr-settings-item__icon"><LogOut size={16} /></div>
              <div className="pr-settings-item__body">
                <p className="pr-settings-item__label">Sign Out</p>
                <p className="pr-settings-item__val">Signed in as {userName}</p>
              </div>
              <ChevronRight size={16} className="pr-settings-item__arrow" />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════ */}
      {modal && (
        <div className="pr-modal-overlay" onClick={() => setModal(null)}>
          <div className="pr-modal" onClick={e => e.stopPropagation()}>

            {/* ── Medical ID ─────────────────────────────── */}
            {modal === 'medicalId' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--violet"><BookOpen size={18} /></div>
                  <div>
                    <h3 className="pr-modal__title">Medical ID</h3>
                    <p className="pr-modal__sub">Available offline · Tap copy to share</p>
                  </div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>

                {/* First-responder instruction banner */}
                <div className="pr-medid-responder-banner">
                  <span className="pr-medid-responder-banner__emoji">🚑</span>
                  <div>
                    <p className="pr-medid-responder-banner__title">For First Responders</p>
                    <p className="pr-medid-responder-banner__sub">Show this screen or tap Copy to share via message</p>
                  </div>
                </div>

                <div className="pr-modal__body">
                  <div className="pr-medid-card">
                    {[
                      { label: 'Name',        val: userName },
                      { label: 'Blood Type',  val: health.bloodType,  highlight: 'red'  },
                      { label: 'Age',         val: health.age > 0 ? `${health.age} years` : '—' },
                      { label: 'Height',      val: health.height },
                      { label: 'Weight',      val: health.weight },
                      { label: 'BMI',         val: health.bmi ? String(health.bmi) : '—' },
                      { label: 'Allergies',   val: allergies.map(a => a.name).join(', ') || 'None', highlight: 'amber' },
                      { label: 'Medications', val: activeMeds.map(m => m.name).join(', ') || 'None' },
                      { label: 'Conditions',  val: conditions.map(c => c.name).join(', ') || 'None' },
                      { label: 'Contact',     val: emergencyContacts[0] ? `${emergencyContacts[0].name} · ${emergencyContacts[0].number}` : 'Not set' },
                    ].map(({ label, val, highlight }) => (
                      <div key={label} className="pr-medid-row">
                        <span className="pr-medid-row__key">{label}</span>
                        <span className={`pr-medid-row__val${highlight ? ` pr-medid-row__val--${highlight}` : ''}`}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="pr-medid-actions">
                    <button
                      className={`pr-medid-actions__copy${copiedMedId ? ' pr-medid-actions__copy--ok' : ''}`}
                      onClick={copyMedicalId} type="button"
                    >
                      {copiedMedId
                        ? <><Check size={14} /> Copied!</>
                        : <><Copy size={14} /> Copy Card</>
                      }
                    </button>
                    <button className="pr-medid-actions__edit" type="button" onClick={() => setModal('editHealth')}>
                      <Edit2 size={14} /> Edit Info
                    </button>
                  </div>
                  <p className="pr-medid-actions__hint">
                    Copy pastes a plain-text summary — paste into WhatsApp, SMS, or any message app
                  </p>
                </div>
              </>
            )}

            {/* ── Edit Health ────────────────────────────── */}
            {modal === 'editHealth' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--teal"><Activity size={18} /></div>
                  <div><h3 className="pr-modal__title">Edit Health Info</h3><p className="pr-modal__sub">Your vitals &amp; measurements</p></div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>
                <div className="pr-modal__body">
                  <div className="pr-edit-health-grid">
                    <div className="pr-form-row">
                      <label className="pr-form-label">Blood Type</label>
                      <input className="pr-form-input" value={String(editHealthForm.bloodType)} placeholder="e.g. O+"
                        onChange={e => setEditHealthForm(p => ({ ...p, bloodType: e.target.value }))} />
                    </div>
                    <div className="pr-form-row">
                      <label className="pr-form-label">Gender</label>
                      <select className="pr-form-select pr-form-select--full" value={editHealthForm.gender}
                        onChange={e => setEditHealthForm(p => ({ ...p, gender: e.target.value }))}>
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="pr-form-row pr-form-row--full">
                      <label className="pr-form-label">Date of Birth</label>
                      <input className="pr-form-input" type="date" value={String(editHealthForm.dob)}
                        onChange={e => setEditHealthForm(p => ({ ...p, dob: e.target.value }))} />
                    </div>
                    <div className="pr-form-row">
                      <label className="pr-form-label">Weight (kg)</label>
                      <input className="pr-form-input" value={String(editHealthForm.weight)} placeholder="e.g. 62"
                        onChange={e => setEditHealthForm(p => ({ ...p, weight: e.target.value }))} />
                    </div>
                    <div className="pr-form-row">
                      <label className="pr-form-label">Height (cm)</label>
                      <input className="pr-form-input" value={String(editHealthForm.height)} placeholder="e.g. 170"
                        onChange={e => setEditHealthForm(p => ({ ...p, height: e.target.value }))} />
                    </div>
                  </div>

                  {/* Read-only linked rows for allergies, meds & conditions */}
                  <div className="pr-edit-health-info">
                    <div className="pr-edit-health-info__row" onClick={() => setModal('allergies')}>
                      <div className="pr-edit-health-info__icon pr-card__icon--amber"><AlertTriangle size={14} /></div>
                      <div className="pr-edit-health-info__body">
                        <span className="pr-edit-health-info__label">Allergies</span>
                        <span className="pr-edit-health-info__val">
                          {allergies.length > 0 ? allergies.map(a => a.name).join(', ') : 'None recorded'}
                        </span>
                      </div>
                      <ChevronRight size={14} className="pr-edit-health-info__arrow" />
                    </div>
                    <div className="pr-edit-health-info__row" onClick={() => setModal('meds')}>
                      <div className="pr-edit-health-info__icon pr-card__icon--red"><Pill size={14} /></div>
                      <div className="pr-edit-health-info__body">
                        <span className="pr-edit-health-info__label">Medications</span>
                        <span className="pr-edit-health-info__val">
                          {activeMeds.length > 0 ? `${activeMeds.length} active medication${activeMeds.length !== 1 ? 's' : ''}` : 'None recorded'}
                        </span>
                      </div>
                      <ChevronRight size={14} className="pr-edit-health-info__arrow" />
                    </div>
                    <div className="pr-edit-health-info__row" onClick={() => setModal('conditions')}>
                      <div className="pr-edit-health-info__icon pr-card__icon--violet"><Stethoscope size={14} /></div>
                      <div className="pr-edit-health-info__body">
                        <span className="pr-edit-health-info__label">Conditions</span>
                        <span className="pr-edit-health-info__val">
                          {conditions.length > 0 ? conditions.map(c => c.name).join(', ') : 'None recorded'}
                        </span>
                      </div>
                      <ChevronRight size={14} className="pr-edit-health-info__arrow" />
                    </div>
                  </div>

                  <button className="pr-modal__save" onClick={saveHealth} type="button">
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              </>
            )}

            {/* ── Allergies ──────────────────────────────── */}
            {modal === 'allergies' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--amber"><AlertTriangle size={18} /></div>
                  <div><h3 className="pr-modal__title">Allergies</h3><p className="pr-modal__sub">{allergies.length} entries</p></div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>
                <div className="pr-modal__body">
                  <div className="pr-list">
                    {allergies.map(a => (
                      <div key={a.id} className="pr-list-item">
                        <span className={`pr-tag ${SEVERITY_COLOR[a.severity]}`}>{a.name}</span>
                        <span className="pr-list-item__meta">{a.severity}</span>
                        <button className="pr-list-item__remove" onClick={() => removeAllergy(a.id)} type="button"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="pr-add-row">
                    <input className="pr-form-input" placeholder="Allergy name" value={newAllergy.name}
                      onChange={e => setNewAllergy(p => ({ ...p, name: e.target.value }))} />
                    <select className="pr-form-select" value={newAllergy.severity}
                      onChange={e => setNewAllergy(p => ({ ...p, severity: e.target.value as any }))}>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                    <button className="pr-add-btn" onClick={addAllergy} type="button"><Plus size={16} /></button>
                  </div>
                </div>
              </>
            )}

            {/* ── Medications ────────────────────────────── */}
            {modal === 'meds' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--red"><Pill size={18} /></div>
                  <div><h3 className="pr-modal__title">Medications</h3><p className="pr-modal__sub">{activeMeds.length} active</p></div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>
                <div className="pr-modal__body">
                  <div className="pr-list">
                    {meds.map(m => (
                      <div key={m.id} className="pr-list-item pr-list-item--med">
                        <div className="pr-list-item__med-info">
                          <span className="pr-list-item__med-name">{m.name}</span>
                          <span className="pr-list-item__med-meta">{m.dose} · {m.frequency}</span>
                        </div>
                        {m.active && <span className="pr-tag pr-tag--teal">Active</span>}
                        <button className="pr-list-item__remove" onClick={() => removeMed(m.id)} type="button"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="pr-add-row pr-add-row--3">
                    <input className="pr-form-input" placeholder="Medication name" value={newMed.name}
                      onChange={e => setNewMed(p => ({ ...p, name: e.target.value }))} />
                    <input className="pr-form-input" placeholder="Dose e.g. 500mg" value={newMed.dose}
                      onChange={e => setNewMed(p => ({ ...p, dose: e.target.value }))} />
                    <input className="pr-form-input" placeholder="Frequency" value={newMed.frequency}
                      onChange={e => setNewMed(p => ({ ...p, frequency: e.target.value }))} />
                    <button className="pr-add-btn" onClick={addMed} type="button"><Plus size={16} /></button>
                  </div>
                </div>
              </>
            )}

            {/* ── Conditions ─────────────────────────────── */}
            {modal === 'conditions' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--violet"><Stethoscope size={18} /></div>
                  <div><h3 className="pr-modal__title">Conditions</h3></div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>
                <div className="pr-modal__body">
                  <div className="pr-list">
                    {conditions.map(c => (
                      <div key={c.id} className="pr-list-item">
                        <span className="pr-list-item__med-name">{c.name}</span>
                        <span className={`pr-tag ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                        <button className="pr-list-item__remove" onClick={() => removeCondition(c.id)} type="button"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="pr-add-row">
                    <input className="pr-form-input" placeholder="Condition name" value={newCondition.name}
                      onChange={e => setNewCondition(p => ({ ...p, name: e.target.value }))} />
                    <select className="pr-form-select" value={newCondition.status}
                      onChange={e => setNewCondition(p => ({ ...p, status: e.target.value as any }))}>
                      <option value="managed">Managed</option>
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button className="pr-add-btn" onClick={addCondition} type="button"><Plus size={16} /></button>
                  </div>
                </div>
              </>
            )}

            {/* ── Symptom History ────────────────────────── */}
            {modal === 'sessions' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--teal"><ClipboardList size={18} /></div>
                  <div><h3 className="pr-modal__title">Symptom History</h3><p className="pr-modal__sub">{sessions.length} sessions</p></div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>
                <div className="pr-modal__body">
                  <div className="pr-list">
                    {sessions.map(s => (
                      <div key={s.id} className="pr-session-item">
                        <div className="pr-session-item__date">{s.date}</div>
                        <div className="pr-session-item__symptoms">
                          {s.symptoms.map(sym => <span key={sym} className="pr-tag pr-tag--ghost">{sym}</span>)}
                        </div>
                        <div className="pr-session-item__result">→ {s.result}</div>
                      </div>
                    ))}
                  </div>
                  <button className="pr-modal__action" onClick={() => router.push('/symptom-checker')} type="button">
                    <Zap size={14} /> Start New Check
                  </button>
                </div>
              </>
            )}

            {/* ── Saved Facilities ───────────────────────── */}
            {modal === 'facilities' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--amber"><BookmarkCheck size={18} /></div>
                  <div>
                    <h3 className="pr-modal__title">Saved Facilities</h3>
                    <p className="pr-modal__sub">{facilities.length} saved</p>
                  </div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>
                <div className="pr-modal__body">
                  {facilities.length === 0 ? (
                    <div className="pr-empty-state">
                      <MapPin size={32} className="pr-empty-state__icon" />
                      <p className="pr-empty-state__text">No saved facilities yet</p>
                      <button className="pr-modal__action" onClick={() => { setModal(null); router.push('/facilities'); }} type="button">
                        <MapPin size={14} /> Find Facilities
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="pr-fac-list">
                        {facilities.map(f => (
                          <div key={f.id} className="pr-fac-item">
                            <div className={`pr-fac-item__dot pr-fac-item__dot--${f.type}`} />
                            <div className="pr-fac-item__info">
                              <span className="pr-fac-item__name">{f.name}</span>
                              <span className="pr-fac-item__meta">
                                {f.type.replace('_', ' ')}
                                {f.city ? ` · ${f.city}` : ''}
                                {f.distance ? ` · ${f.distance.toFixed(1)} km` : ''}
                              </span>
                              {f.emergencyServices && (
                                <span className="pr-tag pr-tag--red pr-fac-item__badge">24/7 Emergency</span>
                              )}
                            </div>
                            <div className="pr-fac-item__actions">
                              <button
                                className="pr-fac-item__btn pr-fac-item__btn--dir"
                                title="Get directions"
                                type="button"
                                onClick={() => {
                                  const url = `https://www.google.com/maps/search/${f.latitude},${f.longitude}`;
                                  window.open(url, '_blank');
                                }}
                              >
                                <Navigation size={14} />
                              </button>
                              <button
                                className="pr-fac-item__btn pr-fac-item__btn--remove"
                                title="Remove"
                                type="button"
                                onClick={() => removeSavedFacility(f.facilityId)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="pr-modal__action" onClick={() => { setModal(null); router.push('/facilities'); }} type="button">
                        <MapPin size={14} /> Find More Facilities
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Family Profiles ────────────────────────── */}
            {modal === 'family' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--green"><Users size={18} /></div>
                  <div><h3 className="pr-modal__title">Family Profiles</h3></div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>
                <div className="pr-modal__body">
                  <div className="pr-list">
                    {family.map(f => (
                      <div key={f.id} className="pr-list-item">
                        <div className="pr-list-item__fam-avatar">{getInitials(f.name)}</div>
                        <div className="pr-list-item__fac-info">
                          <span className="pr-list-item__med-name">{f.name}</span>
                          <span className="pr-list-item__med-meta">{f.relation} · {f.age} yrs</span>
                        </div>
                        <button className="pr-list-item__remove" onClick={() => removeFamilyMember(f.id)} type="button"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="pr-add-row pr-add-row--3">
                    <input className="pr-form-input" placeholder="Name" value={newFamilyMember.name}
                      onChange={e => setNewFamilyMember(p => ({ ...p, name: e.target.value }))} />
                    <input className="pr-form-input" placeholder="Relation" value={newFamilyMember.relation}
                      onChange={e => setNewFamilyMember(p => ({ ...p, relation: e.target.value }))} />
                    <input className="pr-form-input" placeholder="Age" value={newFamilyMember.age}
                      onChange={e => setNewFamilyMember(p => ({ ...p, age: e.target.value }))} />
                    <button className="pr-add-btn" onClick={addFamilyMember} type="button"><Plus size={16} /></button>
                  </div>
                </div>
              </>
            )}

            {/* ── Emergency Contacts ─────────────────────── */}
            {modal === 'emergencyContacts' && (
              <>
                <div className="pr-modal__header">
                  <div className="pr-modal__header-icon pr-modal__header-icon--red"><Phone size={18} /></div>
                  <div>
                    <h3 className="pr-modal__title">Emergency Contacts</h3>
                    <p className="pr-modal__sub">
                      {isLoadingContacts ? 'Loading…' : `${emergencyContacts.length} contact${emergencyContacts.length !== 1 ? 's' : ''} saved`}
                    </p>
                  </div>
                  <button className="pr-modal__close" onClick={() => setModal(null)} type="button"><X size={18} /></button>
                </div>
                <div className="pr-modal__body">

                  {/* Success toast */}
                  {contactSaveSuccess && (
                    <div className="pr-alert pr-alert--success" style={{ margin: '0 0 14px' }}>
                      <Check size={14} /> Contact saved successfully
                    </div>
                  )}

                  {/* Loading */}
                  {isLoadingContacts ? (
                    <div className="pr-loading" style={{ padding: '32px 16px', margin: 0 }}>
                      <div className="hc-loading__dots"><span /><span /><span /></div>
                      <p>Loading contacts…</p>
                    </div>
                  ) : (
                    <>
                      {/* Contacts list */}
                      {emergencyContacts.length === 0 && !showAddContact ? (
                        <div className="pr-empty-state">
                          <Phone size={28} className="pr-empty-state__icon" />
                          <p className="pr-empty-state__text">No emergency contacts yet</p>
                          <p style={{ fontSize: 12, color: 'var(--hc-text2)', margin: '0 0 14px', textAlign: 'center' }}>
                            Add a contact so they receive SOS alerts when you need help
                          </p>
                          <button className="pr-modal__action" onClick={() => setShowAddContact(true)} type="button">
                            <Plus size={14} /> Add First Contact
                          </button>
                        </div>
                      ) : (
                        <div className="pr-list">
                          {emergencyContacts.map(c => (
                            <div key={c.id} className={`pr-ec-item${c.isPrimary ? ' pr-ec-item--primary' : ''}`}>

                              {/* Inline edit form */}
                              {editingEcId === c.id ? (
                                <div className="pr-ec-edit-form">
                                  {editEcError && (
                                    <p className="pr-ec-add__error"><AlertCircle size={12} /> {editEcError}</p>
                                  )}
                                  <div className="pr-form-row">
                                    <label className="pr-form-label">Full Name *</label>
                                    <input className="pr-form-input" placeholder="e.g. Ama Mensah"
                                      value={editEcForm.name} onChange={e => setEditEcForm(p => ({ ...p, name: e.target.value }))} />
                                  </div>
                                  <div className="pr-form-row">
                                    <label className="pr-form-label">Relationship</label>
                                    <input className="pr-form-input" placeholder="e.g. Sister, Mother"
                                      value={editEcForm.relationship} onChange={e => setEditEcForm(p => ({ ...p, relationship: e.target.value }))} />
                                  </div>
                                  <div className="pr-form-row">
                                    <label className="pr-form-label">Phone Number *</label>
                                    <input className="pr-form-input" placeholder="+233XXXXXXXXX" type="tel"
                                      value={editEcForm.number} onChange={e => setEditEcForm(p => ({ ...p, number: e.target.value }))} />
                                  </div>
                                  <div className="pr-form-row">
                                    <label className="pr-form-label">Email <span className="pr-form-label__hint">for SOS alerts</span></label>
                                    <input className="pr-form-input" placeholder="e.g. ama@gmail.com" type="email"
                                      value={editEcForm.email} onChange={e => setEditEcForm(p => ({ ...p, email: e.target.value }))} />
                                  </div>
                                  <div className="pr-ec-add__btns">
                                    <button className="pr-btn pr-btn--ghost pr-btn--sm"
                                      onClick={() => { setEditingEcId(null); setEditEcError(''); }} type="button">
                                      <X size={13} /> Cancel
                                    </button>
                                    <button className="pr-modal__save" style={{ marginTop: 0, flex: 1 }}
                                      onClick={handleSaveEc} disabled={savingEc} type="button">
                                      {savingEc ? <Loader2 size={14} className="pr-spin" /> : <Check size={14} />}
                                      {savingEc ? 'Saving…' : 'Save Changes'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="pr-ec-item__avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                                  <div className="pr-ec-item__body">
                                    <div className="pr-ec-item__name-row">
                                      <span className="pr-ec-item__name-text">{c.name}</span>
                                      {c.isPrimary && <span className="pr-ec-item__badge">Primary</span>}
                                    </div>
                                    <div className="pr-ec-item__meta">{c.relationship} · {c.number}</div>
                                    {c.email
                                      ? <div className="pr-ec-item__email pr-ec-item__email--set">✉ {c.email}</div>
                                      : <div className="pr-ec-item__email pr-ec-item__email--missing">⚠ No email — won't receive SOS alerts</div>
                                    }
                                  </div>
                                  <div className="pr-ec-item__actions">
                                    <button className="pr-ec-item__copy" title="Copy number"
                                      onClick={() => copyContactNumber(c.id, c.number)} type="button">
                                      {copiedContactId === c.id ? <Check size={13} /> : <Copy size={13} />}
                                    </button>
                                    <a href={`tel:${c.number}`} className="pr-ec-item__call">
                                      <Phone size={13} /> Call
                                    </a>
                                    <button className="pr-ec-item__edit-btn" onClick={() => startEditEc(c)}
                                      type="button" title="Edit contact">
                                      <Edit2 size={12} />
                                    </button>
                                    <button className="pr-list-item__remove" onClick={() => removeEmergencyContact(c.id)}
                                      type="button" title="Remove">
                                      <X size={13} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Nudge when any contact is missing email */}
                          {emergencyContacts.some(c => !c.email) && !editingEcId && (
                            <div className="pr-ec-email-nudge">
                              <AlertCircle size={13} />
                              <span>
                                {emergencyContacts.filter(c => !c.email).length === 1
                                  ? '1 contact is missing an email'
                                  : `${emergencyContacts.filter(c => !c.email).length} contacts are missing an email`
                                } — tap <strong>Edit</strong> to add it so they receive SOS alerts automatically.
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline add form */}
                      {showAddContact ? (
                        <div className="pr-ec-add">
                          {contactAddError && (
                            <p className="pr-ec-add__error"><AlertCircle size={12} /> {contactAddError}</p>
                          )}
                          <div className="pr-form-row">
                            <label className="pr-form-label">Full Name *</label>
                            <input className="pr-form-input" placeholder="e.g. Ama Mensah"
                              value={newContact.name}
                              onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} />
                          </div>
                          <div className="pr-form-row">
                            <label className="pr-form-label">Relationship</label>
                            <input className="pr-form-input" placeholder="e.g. Sister, Mother, Doctor"
                              value={newContact.relationship}
                              onChange={e => setNewContact(p => ({ ...p, relationship: e.target.value }))} />
                          </div>
                          <div className="pr-form-row">
                            <label className="pr-form-label">Phone Number *</label>
                            <input className="pr-form-input" placeholder="+233XXXXXXXXX or 0XXXXXXXXX" type="tel"
                              value={newContact.number}
                              onChange={e => setNewContact(p => ({ ...p, number: e.target.value }))} />
                          </div>
                          <div className="pr-form-row">
                            <label className="pr-form-label">Email <span className="pr-form-label__hint">for SOS alerts</span></label>
                            <input className="pr-form-input" placeholder="e.g. ama@gmail.com" type="email"
                              value={newContact.email}
                              onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
                          </div>
                          <div className="pr-ec-add__btns">
                            <button className="pr-btn pr-btn--ghost pr-btn--sm"
                              onClick={() => { setShowAddContact(false); setContactAddError(''); }} type="button">
                              <X size={13} /> Cancel
                            </button>
                            <button className="pr-modal__save" style={{ marginTop: 0, flex: 1 }}
                              onClick={handleAddContact} disabled={addingContact} type="button">
                              {addingContact ? <Loader2 size={14} className="pr-spin" /> : <Check size={14} />}
                              {addingContact ? 'Saving…' : 'Save Contact'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className="pr-modal__action" style={{ marginTop: emergencyContacts.length ? 12 : 0 }}
                          onClick={() => { setShowAddContact(true); setContactAddError(''); }} type="button">
                          <Plus size={14} /> Add Contact
                        </button>
                      )}

                      {/* Link to full emergency page */}
                      <button className="pr-modal__action" style={{ marginTop: 10, opacity: 0.7 }}
                        onClick={() => { setModal(null); router.push('/emergency'); }} type="button">
                        <Phone size={14} /> Open Emergency Hub
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default ProfileContent;