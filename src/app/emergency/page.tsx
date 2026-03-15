'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardLayout from '@/components/DashboardLayout';
import { trackActivity, activityTypes } from '@/lib/activityTracker';
import { useFacilitySearch } from '@/hooks/useFacilitySearch';
import '@/styles/dashboard-header.css';
import '@/styles/dashboard.css';
import '@/styles/dashboard-mobile.css';
import '@/styles/emergency.css';
import {
  Phone, MapPin, Heart, User, Bell, Moon, Sun,
  Bot, Shield, AlertTriangle, Copy, Check,
  Navigation, ChevronRight, ChevronDown, Search,
  Loader2, X, Activity, Zap,
  Wind, Droplets, Thermometer, Eye, Flame,
  Plus, BookOpen, ExternalLink, AlertCircle, Info,
  Pill, HeartPulse, ClipboardList, Clock, Edit2,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  number: string;
  email?: string;
  isPrimary?: boolean;
  priority?: number;
}

interface FirstAidStep { instruction: string; tip?: string; }
interface FirstAidGuide {
  id: string; title: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  severity: 'critical' | 'high' | 'medium';
  offline: boolean; warning?: string; steps: FirstAidStep[];
}
interface GhanaService {
  id: string; name: string; description: string; number: string;
  icon: React.ComponentType<{ size: number }>; color: string;
}
interface NearbyFacility { name: string; distance: string; }
interface HealthProfileData {
  bloodType?: string;
  allergies?: { name: string; severity: string }[];
  medications?: { name: string; dose?: string; active: boolean }[];
  conditions?: { name: string; status: string }[];
}

/* ─── First Aid Guide Data ───────────────────────────────────── */
const FIRST_AID_GUIDES: FirstAidGuide[] = [
  {
    id: 'cpr', title: 'CPR — Adult', icon: Heart, severity: 'critical', offline: true,
    warning: 'Call 193 FIRST. Only perform CPR if the person is unresponsive and not breathing normally.',
    steps: [
      { instruction: 'Check the scene is safe, then check the person. Tap their shoulders firmly and shout "Are you okay?"' },
      { instruction: 'Call 193 (National Ambulance) immediately or ask a bystander to call. Put on speaker.' },
      { instruction: 'Lay the person on their back on a firm, flat surface. Tilt head back gently and lift chin to open the airway.' },
      { instruction: 'Check for normal breathing for no more than 10 seconds. Look for chest rise, listen, and feel for breath.', tip: 'Occasional gasps are NOT normal breathing — begin CPR.' },
      { instruction: 'Place the heel of one hand on the centre of the chest (lower half of breastbone). Place other hand on top, interlock fingers, and keep arms straight.' },
      { instruction: 'Push hard and fast — compress at least 5 cm (2 inches) deep at 100–120 compressions per minute.', tip: "Think of the beat of \"Stayin' Alive\" — that's the right pace." },
      { instruction: 'After 30 compressions, give 2 rescue breaths: pinch the nose, seal mouth over theirs, breathe until chest rises. Continue 30:2 cycle until help arrives.', tip: 'If uncomfortable with rescue breaths, continuous chest compressions alone are still effective.' },
    ],
  },
  {
    id: 'choking', title: 'Choking — Heimlich', icon: Wind, severity: 'critical', offline: true,
    warning: 'If the person can still cough forcefully, encourage them to keep coughing. Only intervene if they cannot cough, speak, or breathe.',
    steps: [
      { instruction: 'Ask clearly "Are you choking?" If they cannot speak, cough, or breathe — act immediately.' },
      { instruction: 'Stand behind them, lean them forward slightly, and give up to 5 sharp back blows between the shoulder blades with the heel of your hand. Check mouth after each blow.' },
      { instruction: 'If back blows do not work, stand behind them and wrap your arms around their waist.' },
      { instruction: 'Make a fist with one hand and place it — thumb side in — just above the belly button, well below the breastbone.' },
      { instruction: 'Grasp your fist with your other hand. Pull sharply inward and upward — up to 5 times.', tip: 'Each thrust must be a sharp, distinct movement aimed to dislodge the blockage.' },
      { instruction: 'Alternate 5 back blows with 5 abdominal thrusts until the object clears or the person becomes unconscious.' },
      { instruction: 'If they become unconscious, lower them carefully to the floor and start CPR. Call 193 immediately.' },
    ],
  },
  {
    id: 'bleeding', title: 'Severe Bleeding', icon: Droplets, severity: 'high', offline: true,
    warning: 'Call 193 for severe or uncontrolled bleeding. Do NOT remove objects embedded in a wound.',
    steps: [
      { instruction: 'Protect yourself — use gloves if available, otherwise a plastic bag or thick cloth as a barrier.' },
      { instruction: 'Apply firm, direct pressure to the wound using a clean cloth, dressing, or clothing. Press hard and hold continuously.' },
      { instruction: 'Do NOT lift the cloth to check — this disrupts clotting. If blood soaks through, add more cloth on top and press harder.', tip: 'Maintain pressure for at least 10–15 minutes without releasing.' },
      { instruction: 'If the wound is on a limb and bleeding is life-threatening, apply a tourniquet 5–7 cm above the wound. Tighten until bleeding stops. Write down the time applied.' },
      { instruction: 'Keep the person still and warm. Lay them down and raise their legs (unless head/neck injury suspected) to reduce shock risk.' },
    ],
  },
  {
    id: 'burns', title: 'Burns Treatment', icon: Thermometer, severity: 'high', offline: true,
    warning: "Call 193 for burns larger than the person's palm, burns on face/hands/genitals, or any chemical/electrical burn.",
    steps: [
      { instruction: 'Remove the person from danger. For chemical burns, brush off dry chemicals first before removing clothing (cut if necessary, do not pull over head).' },
      { instruction: 'Cool the burn under cool (not cold or iced) running water for at least 20 minutes.', tip: 'Start within 3 hours. This single step reduces tissue damage more than anything else.' },
      { instruction: 'While cooling, remove jewellery, watches, and clothing near the burn — but NOT if stuck to the skin.' },
      { instruction: 'Do NOT apply butter, toothpaste, oil, ice, or any home remedies. Do NOT burst blisters.' },
      { instruction: 'Cover loosely with a clean non-fluffy material — cling film (plastic wrap) is ideal. Layer it rather than wrapping tightly.' },
      { instruction: 'Keep the person warm with a blanket (avoiding the burn area) to prevent hypothermia from prolonged cooling.' },
    ],
  },
  {
    id: 'seizure', title: 'Seizure Response', icon: Zap, severity: 'high', offline: true,
    warning: "Call 193 if: first seizure, lasts more than 5 minutes, they don't regain consciousness, or they are injured.",
    steps: [
      { instruction: 'Stay calm. Note the exact time the seizure started. Most seizures end on their own within 1–3 minutes.' },
      { instruction: 'Protect the person — cushion their head with something soft. Clear hard or sharp objects away from them.' },
      { instruction: 'Do NOT hold them down or restrain their movements. Do NOT put anything in their mouth.', tip: 'People cannot swallow their tongue. Putting something in the mouth is dangerous and wrong.' },
      { instruction: 'If possible, gently turn them onto their side (recovery position) to keep the airway clear, especially if vomiting.' },
      { instruction: 'Stay with them until full consciousness returns. Speak calmly and reassuringly — they may be confused and frightened for several minutes after.' },
    ],
  },
  {
    id: 'eye', title: 'Eye Injury', icon: Eye, severity: 'medium', offline: true,
    warning: 'Seek immediate care for any penetrating eye injury, chemical splash, or sudden vision loss.',
    steps: [
      { instruction: 'Do NOT rub the eye — this can worsen any injury. Keep the person as still and calm as possible.' },
      { instruction: 'For chemical splash: immediately flush the eye with clean water for at least 15–20 minutes, holding the eyelid open. Tilt head so water runs away from the other eye.' },
      { instruction: 'For a foreign object: try blinking rapidly or flushing with clean water. Do NOT try to remove anything embedded in the eye.' },
      { instruction: 'Cover the injured eye loosely with a clean cloth — do not apply pressure. Cover both eyes for penetrating injuries to reduce movement.' },
      { instruction: 'Get to a hospital or eye clinic as soon as possible, even if pain seems mild initially.' },
    ],
  },
  {
    id: 'fracture', title: 'Suspected Fracture', icon: Activity, severity: 'medium', offline: true,
    steps: [
      { instruction: 'Keep the injured area completely still. Do NOT try to straighten the limb. Support it in the position found using your hands or rolled clothing.' },
      { instruction: 'Check circulation below the injury: feel for a pulse, check skin colour, and ask if they feel tingling or numbness.', tip: 'Pale, cold, or bluish skin below the injury means circulation is compromised — this is urgent.' },
      { instruction: 'For an open fracture (bone visible): cover loosely with a clean cloth — do NOT press on the bone. Treat bleeding by pressing around the wound, not on it.' },
      { instruction: 'Splint if moving is necessary: use a rigid item (board, rolled newspaper) padded with cloth. Secure above and below the fracture — never directly over it.' },
      { instruction: 'Apply a cold pack (wrapped in cloth) to reduce swelling. Keep the person warm, treat for shock, and monitor until help arrives.' },
    ],
  },
  {
    id: 'poisoning', title: 'Poisoning / Overdose', icon: AlertTriangle, severity: 'critical', offline: true,
    warning: 'Call 193 immediately. Do NOT induce vomiting unless specifically directed by medical staff — it can cause further harm.',
    steps: [
      { instruction: 'Call 193 immediately or take the person to the nearest emergency department. Give the substance name, amount, and time taken if known.' },
      { instruction: 'If conscious and alert, ask what they took. Save and show the container, packaging, or substance to medical staff.' },
      { instruction: 'Do NOT give anything to eat or drink. Do NOT induce vomiting unless explicitly told by a doctor.' },
      { instruction: 'If unconscious but breathing, place in the recovery position (on their side) to prevent choking on vomit.' },
      { instruction: 'If they stop breathing, begin CPR. Check breathing and consciousness continuously until help arrives.' },
      { instruction: 'For skin/eye chemical contact: remove contaminated clothing and flush the area with large amounts of clean water for at least 20 minutes.' },
    ],
  },
];

const GHANA_SERVICES: GhanaService[] = [
  { id: 'ambulance', name: 'National Ambulance Service', description: 'Emergency ambulance across Ghana',    number: '193',        icon: Plus,          color: 'red'    },
  { id: 'fire',      name: 'National Fire Service',      description: 'Fire emergencies and rescue',        number: '192',        icon: Flame,         color: 'orange' },
  { id: 'police',    name: 'Police Emergency',           description: 'Law enforcement emergency hotline',  number: '191',        icon: Shield,        color: 'blue'   },
  { id: 'disaster',  name: 'NADMO',                      description: 'Natural disaster & relief',          number: '0302773634', icon: AlertTriangle, color: 'amber'  },
  { id: 'kath',      name: 'KATH Emergency',             description: 'Komfo Anokye Teaching Hospital',     number: '0322022301', icon: Plus,          color: 'teal'   },
  { id: 'korle',     name: 'Korle Bu Hospital',          description: 'Teaching Hospital — Accra',          number: '0302674201', icon: Plus,          color: 'teal'   },
];

/* ─── Blood type compatibility ───────────────────────────────── */
const BLOOD_COMPATIBILITY: Record<string, { canReceiveFrom: string[]; canDonateTo: string[] }> = {
  'A+':  { canReceiveFrom: ['A+','A-','O+','O-'],                    canDonateTo: ['A+','AB+'] },
  'A-':  { canReceiveFrom: ['A-','O-'],                              canDonateTo: ['A+','A-','AB+','AB-'] },
  'B+':  { canReceiveFrom: ['B+','B-','O+','O-'],                    canDonateTo: ['B+','AB+'] },
  'B-':  { canReceiveFrom: ['B-','O-'],                              canDonateTo: ['B+','B-','AB+','AB-'] },
  'AB+': { canReceiveFrom: ['A+','A-','B+','B-','AB+','AB-','O+','O-'], canDonateTo: ['AB+'] },
  'AB-': { canReceiveFrom: ['A-','B-','AB-','O-'],                   canDonateTo: ['AB+','AB-'] },
  'O+':  { canReceiveFrom: ['O+','O-'],                              canDonateTo: ['A+','B+','AB+','O+'] },
  'O-':  { canReceiveFrom: ['O-'],                                   canDonateTo: ['A+','A-','B+','B-','AB+','AB-','O+','O-'] },
};

/* ─── Personalised guides from Medical ID ────────────────────── */
// Keywords that map to first aid guide IDs
const CONDITION_GUIDE_MAP: { keywords: string[]; guideId: string; label: string }[] = [
  { keywords: ['epilep','seizure','convuls'],        guideId: 'seizure',   label: 'Epilepsy' },
  { keywords: ['heart','cardiac','coronary','angina'], guideId: 'cpr',     label: 'Heart Condition' },
  { keywords: ['diabet','hypoglycemi'],              guideId: 'diabetic',  label: 'Diabetes' },
  { keywords: ['asthm','bronch'],                   guideId: 'asthma',    label: 'Asthma' },
];
const ALLERGY_GUIDE_TRIGGERS = ['peanut','nut','bee','wasp','venom','penicill','latex','shellfish','fish','egg','milk','wheat','soy','sesame'];

function buildPersonalisedGuides(
  allergies: HealthProfileData['allergies'],
  conditions: HealthProfileData['conditions'],
  medications: HealthProfileData['medications'],
): FirstAidGuide[] {
  const guides: FirstAidGuide[] = [];

  /* Allergy action guide — only if user has severe/critical allergies */
  const severeAllergies = (allergies || []).filter(a => a.severity === 'severe' || ALLERGY_GUIDE_TRIGGERS.some(t => a.name.toLowerCase().includes(t)));
  if (severeAllergies.length > 0) {
    const allergyList = severeAllergies.map(a => a.name).join(', ');
    const hasEpipen = (medications || []).some(m => m.active && /epipen|epinephrine|adrenaline/i.test(m.name));
    guides.push({
      id: 'personal-allergy',
      title: `⚠️ Your Allergy Alert: ${allergyList}`,
      icon: AlertTriangle,
      severity: 'critical',
      offline: true,
      warning: `This guide is personalised from your Medical ID. You have recorded severe allergies to: ${allergyList}.`,
      steps: [
        { instruction: `You have recorded severe allergies to: ${allergyList}. If you are having a reaction: stay calm, stop contact with the trigger immediately.` },
        ...(hasEpipen ? [
          { instruction: 'Use your EpiPen / epinephrine auto-injector immediately — outer thigh, through clothing if needed. Hold for 10 seconds.', tip: 'EpiPen buys time — it does NOT replace emergency care. Call 193 even after using it.' },
        ] : [
          { instruction: 'If you have an EpiPen prescribed, use it now. If not, call 193 immediately — anaphylaxis can progress rapidly.', tip: 'Inform the 193 operator of your known allergies so they can prepare the right treatment.' },
        ]),
        { instruction: 'Call 193 immediately. State: "I am having an allergic reaction to [trigger]". Lie flat with legs raised unless breathing is difficult — then sit up.' },
        { instruction: 'Do NOT take antihistamines as a substitute for epinephrine in a severe reaction — they work too slowly for anaphylaxis.' },
        { instruction: 'If breathing stops or consciousness is lost, begin CPR. A second EpiPen dose can be given after 5–15 minutes if symptoms return.' },
        { instruction: 'Even if symptoms improve after EpiPen, go to hospital immediately — biphasic reactions can occur hours later.', tip: 'Always seek emergency care after any severe allergic reaction, even if you feel better.' },
      ],
    });
  }

  /* Condition-specific pinned guides */
  for (const cond of (conditions || []).filter(c => c.status !== 'resolved')) {
    const match = CONDITION_GUIDE_MAP.find(m => m.keywords.some(kw => cond.name.toLowerCase().includes(kw)));
    if (match?.guideId === 'diabetic' && !guides.find(g => g.id === 'personal-diabetic')) {
      guides.push({
        id: 'personal-diabetic',
        title: '🩸 Your Diabetes — Emergency',
        icon: Droplets,
        severity: 'high',
        offline: true,
        warning: 'Personalised from your Medical ID. For diabetic emergencies: low blood sugar (hypoglycaemia) is more immediately dangerous than high blood sugar.',
        steps: [
          { instruction: 'LOW blood sugar signs: shaking, sweating, confusion, pale skin, rapid heartbeat, hunger. HIGH blood sugar: extreme thirst, frequent urination, fruity breath, fatigue.' },
          { instruction: 'If conscious and can swallow — give 15–20g fast-acting sugar: 4 glucose tablets, 150ml fruit juice, or 3–4 teaspoons of sugar in water.', tip: 'Do NOT give food or drink to anyone who is unconscious or unable to swallow safely.' },
          { instruction: 'Recheck in 15 minutes. If no improvement, give another 15–20g sugar. If still not improving after two doses, call 193.' },
          { instruction: 'If unconscious, call 193 immediately. Place in recovery position. Do NOT attempt to give anything by mouth.', tip: 'Tell 193 dispatcher the person has diabetes — they can send glucagon.' },
          { instruction: 'For HIGH blood sugar emergency (diabetic ketoacidosis): drink water, take prescribed insulin if available and conscious, call 193 or go to hospital.' },
        ],
      });
    }
    if (match?.guideId === 'asthma' && !guides.find(g => g.id === 'personal-asthma')) {
      const hasInhaler = (medications || []).some(m => m.active && /inhaler|salbutamol|ventolin|albuterol|becotide|symbicort/i.test(m.name));
      guides.push({
        id: 'personal-asthma',
        title: '💨 Your Asthma — Emergency',
        icon: Wind,
        severity: 'high',
        offline: true,
        warning: 'Personalised from your Medical ID. A severe asthma attack can be life-threatening. Do not delay seeking help.',
        steps: [
          { instruction: 'Sit upright — leaning slightly forward with hands on knees. Do NOT lie down. Loosen any tight clothing around the neck and chest.' },
          ...(hasInhaler ? [
            { instruction: 'Use your reliever inhaler (usually blue) immediately: shake, exhale fully, seal lips around mouthpiece, press and inhale slowly, hold 10 seconds. Repeat every 30–60 seconds, up to 10 puffs.', tip: 'Using a spacer doubles the amount of medication that reaches your lungs.' },
          ] : [
            { instruction: 'If you have a reliever inhaler (blue/Ventolin), use it now — 1 puff every 30–60 seconds, up to 10 puffs. If no inhaler is available, call 193 immediately.' },
          ]),
          { instruction: 'If no improvement after 10 puffs, or symptoms are severe (can\'t speak in sentences, lips turning blue), call 193 immediately.' },
          { instruction: 'Stay calm and encourage slow, controlled breathing. Panic worsens bronchospasm. Try breathing in through the nose and out through pursed lips.' },
          { instruction: 'Continue giving reliever inhaler every 15 minutes while waiting for emergency services. Note the time and number of puffs given for the paramedics.' },
        ],
      });
    }
  }

  return guides;
}

/* ─── Breathing guide phases — outside component to prevent stale
       closure inside startBreathing useCallback([])            ── */
const BREATH_PHASES: { phase: 'inhale'|'hold'|'exhale'|'rest'; label: string; secs: number; color: string }[] = [
  { phase: 'inhale', label: 'Breathe In',  secs: 4, color: '#00D2FF' },
  { phase: 'hold',   label: 'Hold',        secs: 7, color: '#a78bfa' },
  { phase: 'exhale', label: 'Breathe Out', secs: 8, color: '#34d399' },
  { phase: 'rest',   label: 'Rest',        secs: 1, color: '#64748b' },
];

const EmergencyPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /* SOS */
  const [sosActive,    setSosActive]    = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [sosSent,      setSosSent]      = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef   = useRef<number>(0);
  // Touch start position — used to cancel hold if user is scrolling
  const touchStartYRef = useRef<number>(0);

  /* SOS send status */
  const [sosSending,      setSosSending]      = useState(false);
  const [sosSendResult,   setSosSendResult]   = useState<{
    success: boolean;
    sent: number; total: number; failed: number;
    emailedCount?: number;
    smtpMissing?: boolean;
    noContacts?: boolean;
    noEmails?: boolean;
    withoutEmail?: { name: string; number: string }[];
    contacts?: { name: string; number: string; hasEmail: boolean }[];
  } | null>(null);

  /* Location */
  const [location,          setLocation]          = useState<{ lat: number; lng: number; city?: string; accuracy?: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError,     setLocationError]     = useState<string | null>(null);
  const [locationShared,    setLocationShared]    = useState(false);

  /* Nearest ER */
  const [nearestER,   setNearestER]   = useState<NearbyFacility | null>(null);
  const [isLoadingER, setIsLoadingER] = useState(false);

  /* UI */
  const [copiedId,    setCopiedId]    = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  /* SOS elapsed timer */
  const [sosElapsed,      setSosElapsed]      = useState(0);
  const sosTimerRef                           = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Breathing guide (for panic/anxiety) */
  const [showBreathing,   setShowBreathing]   = useState(false);
  const [breathPhase,     setBreathPhase]     = useState<'inhale'|'hold'|'exhale'|'rest'>('inhale');
  const [breathCount,     setBreathCount]     = useState(0);
  const breathTimerRef                        = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Personal Emergency Card share */
  const [showPersonalCard, setShowPersonalCard] = useState(false);
  // Notification panel
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifsRead,     setNotifsRead]     = useState(false);
  const notifBellRef   = useRef<HTMLButtonElement>(null);
  const notifMobRef    = useRef<HTMLButtonElement>(null);
  const notifPanelRef  = useRef<HTMLDivElement>(null);

  // Top-bar facility search — navigates to /facilities?q=<term>
  const {
    searchQuery: facilityQuery, setSearchQuery: setFacilityQuery,
    searchInputRef: facilitySearchRef,
    handleSearchSubmit, handleSearchKeyDown,
  } = useFacilitySearch();
  const [isScrolled,  setIsScrolled]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<'services' | 'firstaid' | 'contacts'>('services');

  /* Contacts — loaded from DB */
  const [contacts,       setContacts]       = useState<EmergencyContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact,     setNewContact]     = useState({ name: '', relationship: '', number: '', email: '' });
  const [addingContact,  setAddingContact]  = useState(false);
  const [addError,       setAddError]       = useState('');
  const [contactSaveSuccess, setContactSaveSuccess] = useState(false);

  /* Health profile — loaded from DB for Medical ID */
  const [healthProfile,       setHealthProfile]       = useState<HealthProfileData | null>(null);
  const [isLoadingProfile,    setIsLoadingProfile]    = useState(true);

  const userName     = session?.user?.name  || 'User';
  const userImage    = session?.user?.image || null;
  const userEmail    = session?.user?.email || '';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  /* ── Auth guard ───────────────────────────────────────────── */
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  /* ── Scroll shadow ────────────────────────────────────────── */
  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);



  /* ── Load emergency contacts from DB ─────────────────────── */
  useEffect(() => {
    if (status !== 'authenticated') return;
    setIsLoadingContacts(true);
    fetch('/api/emergency-contacts')
      .then(r => r.json())
      .then(({ contacts: data }) => {
        setContacts(
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
      .catch(() => {}) // silently fail — don't block the page
      .finally(() => setIsLoadingContacts(false));
  }, [status]);

  /* ── Load health profile for Medical ID ──────────────────── */
  useEffect(() => {
    if (status !== 'authenticated') return;
    setIsLoadingProfile(true);
    fetch('/api/health-profile')
      .then(r => r.json())
      .then(({ profile }) => setHealthProfile(profile ?? null))
      .catch(() => {})
      .finally(() => setIsLoadingProfile(false));
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

  /* ── Find nearest ER via Overpass proxy ───────────────────── */
  const findNearestER = useCallback(async (lat: number, lng: number): Promise<NearbyFacility | null> => {
    setIsLoadingER(true);
    try {
      const query = `[out:json][timeout:10];(
        node["amenity"="hospital"](around:8000,${lat},${lng});
        way["amenity"="hospital"](around:8000,${lat},${lng});
      );out center body;`;

      // Use our server-side proxy — avoids CORS and browser rate-limiting
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
          return { name: el.tags?.name || 'Hospital', dist: calcDist(lat, lng, eLat, eLng) };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.dist - b.dist);

      if (!sorted.length) {
        const fallback: NearbyFacility = { name: 'KATH', distance: 'See Facilities' };
        setNearestER(fallback);
        return fallback;
      }
      const top = sorted[0] as any;
      const result: NearbyFacility = { name: top.name, distance: `${top.dist.toFixed(1)} km` };
      setNearestER(result);
      return result;
    } catch {
      const fallback: NearbyFacility = { name: 'KATH', distance: 'See Facilities' };
      setNearestER(fallback);
      return fallback;
    } finally {
      setIsLoadingER(false);
    }
  }, []);

  /* ── Share Location ───────────────────────────────────────── */
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
        const city = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, city, accuracy });
        setLocationShared(true);
        setIsLoadingLocation(false);
        findNearestER(lat, lng);
        try {
          await navigator.clipboard.writeText(
            `Emergency location: https://maps.google.com/?q=${lat},${lng}`,
          );
        } catch { /* clipboard may be unavailable */ }
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

  /* ── Send SOS to contacts via API ────────────────────────────── */
  const sendSosAlert = useCallback(async (lat?: number, lng?: number, city?: string, nearestERName?: string) => {
    setSosSending(true);
    try {
      const res = await fetch('/api/sos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat, lng, city,
          nearestER: nearestERName,
        }),
      });
      const data = await res.json();
      setSosSendResult(data);
    } catch {
      setSosSendResult({ success: false, sent: 0, total: 0, failed: 0 });
    } finally {
      setSosSending(false);
    }
  }, []);

  /* ── SOS Hold ─────────────────────────────────────────────── */
  const startHold = useCallback(() => {
    if (sosSent) return;
    holdStartRef.current = Date.now();
    setSosActive(true);
    setSosCountdown(3);
    setHoldProgress(0);

    holdTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - holdStartRef.current) / 3000;
      setHoldProgress(Math.min(elapsed * 100, 100));
      setSosCountdown(Math.max(Math.ceil(3 - (Date.now() - holdStartRef.current) / 1000), 0));

      if (elapsed >= 1) {
        clearInterval(holdTimerRef.current!);
        setSosSent(true);
        setSosActive(false);
        setHoldProgress(100);

        // Track SOS activation
        trackActivity(
          activityTypes.EMERGENCY_ACCESSED,
          'SOS Alert Activated',
          'Emergency SOS button activated',
          { sosActivated: true },
        ).catch(() => {});

        // Get location, find nearest ER, then email contacts — all in sequence
        // so the email includes the ER name rather than sending before it resolves
        navigator.geolocation?.getCurrentPosition(
          async (pos) => {
            const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, city });
            // Find nearest ER and capture the result before sending the email
            const er = await findNearestER(pos.coords.latitude, pos.coords.longitude);
            const erName = er ? `${er.name} · ${er.distance}` : undefined;
            await sendSosAlert(pos.coords.latitude, pos.coords.longitude, city, erName);
          },
          async () => {
            // GPS unavailable — still notify contacts immediately without location
            await sendSosAlert(undefined, undefined, undefined, undefined);
          },
        );
      }
    }, 50);
  }, [sosSent, reverseGeocode, findNearestER, sendSosAlert]);

  const endHold = useCallback(() => {
    if (sosSent) return;
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setSosActive(false);
    setHoldProgress(0);
    setSosCountdown(3);
  }, [sosSent]);

  const resetSOS = () => {
    setSosSent(false);
    setSosActive(false);
    setHoldProgress(0);
    setSosCountdown(3);
    setSosSendResult(null);
    setSosSending(false);
    setSosElapsed(0);
    if (sosTimerRef.current) clearInterval(sosTimerRef.current);
  };

  /* ── SOS elapsed timer — starts when SOS is sent ─────────── */
  useEffect(() => {
    if (sosSent) {
      setSosElapsed(0);
      sosTimerRef.current = setInterval(() => setSosElapsed(s => s + 1), 1000);
    } else {
      if (sosTimerRef.current) clearInterval(sosTimerRef.current);
    }
    return () => { if (sosTimerRef.current) clearInterval(sosTimerRef.current); };
  }, [sosSent]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  /* ── Breathing guide (4-7-8 calming pattern) ─────────────── */
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

  /* ── Personalised guides derived from Medical ID ─────────── */
  const personalisedGuides = React.useMemo(
    () => buildPersonalisedGuides(healthProfile?.allergies, healthProfile?.conditions, healthProfile?.medications),
    [healthProfile],
  );
  const allFirstAidGuides = [...personalisedGuides, ...FIRST_AID_GUIDES];

  /* ── Copy personal emergency card ─────────────────────────── */
  const copyPersonalCard = async () => {
    const lines = [
      `=== EMERGENCY MEDICAL ID — ${userName} ===`,
      `Blood Type: ${medIdBloodType}`,
      `Allergies: ${medIdAllergies}`,
      `Conditions: ${medIdConditions}`,
      `Medications: ${medIdMedications}`,
      `Emergency Contact: ${medIdContact}`,
      location ? `Location: https://maps.google.com/?q=${location.lat},${location.lng}` : '',
      `Generated: ${new Date().toLocaleString()}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopiedId('card');
      setTimeout(() => setCopiedId(null), 3000);
    } catch { /* ignore */ }
  };

  /* ── Copy to clipboard ────────────────────────────────────── */
  const copyPhone = async (id: string, number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  /* ── Add Contact — saves to DB ────────────────────────────── */
  const handleAddContact = async () => {
    setAddError('');
    if (!newContact.name.trim())   { setAddError('Name is required');         return; }
    if (!newContact.number.trim()) { setAddError('Phone number is required'); return; }

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
          priority:     contacts.length + 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save contact');
      }

      const { contact } = await res.json();
      setContacts(prev => [
        ...prev,
        {
          id:           contact.id,
          name:         contact.name,
          relationship: contact.relationship,
          number:       contact.number,
          email:        contact.email || undefined,
          isPrimary:    contact.priority === 1,
          priority:     contact.priority,
        },
      ]);
      setNewContact({ name: '', relationship: '', number: '', email: '' });
      setShowAddContact(false);
      setContactSaveSuccess(true);
      setTimeout(() => setContactSaveSuccess(false), 3000);
    } catch (err: any) {
      setAddError(err.message || 'Failed to save contact. Please try again.');
    } finally {
      setAddingContact(false);
    }
  };

  /* ── Remove Contact — deletes from DB ────────────────────── */
  const removeContact = async (id: string) => {
    // Optimistic update
    setContacts(prev => prev.filter(c => c.id !== id));
    try {
      await fetch('/api/emergency-contacts', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      });
    } catch {
      // Re-fetch on failure to restore correct state
      fetch('/api/emergency-contacts')
        .then(r => r.json())
        .then(({ contacts: data }) => setContacts(data || []));
    }
  };

  /* ── Derived Medical ID values ────────────────────────────── */
  const medIdBloodType = healthProfile?.bloodType || 'Not set';
  const medIdAllergies = healthProfile?.allergies?.length
    ? healthProfile.allergies.map(a => a.name).join(', ')
    : 'None recorded';
  const medIdConditions = healthProfile?.conditions?.filter(c => c.status !== 'resolved').length
    ? healthProfile.conditions!.filter(c => c.status !== 'resolved').map(c => `${c.name} — ${c.status}`).join(', ')
    : 'None recorded';
  const medIdMedications = healthProfile?.medications?.filter(m => m.active).length
    ? healthProfile.medications!.filter(m => m.active).map(m => m.dose ? `${m.name} ${m.dose}` : m.name).join(', ')
    : 'None recorded';
  const medIdContact = contacts[0]
    ? `${contacts[0].name} · ${contacts[0].number}`
    : 'Not set — add an emergency contact';

  // ── Notification panel ──────────────────────────────────────
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

  const emNotifications = React.useMemo(() => {
    type NotifItem = { id: string; icon: React.ComponentType<{size:number}>; color: string; title: string; body: string; action?: () => void };
    const list: NotifItem[] = [];
    if (sosSent)
      list.push({ id:'sos', icon:AlertTriangle, color:'red', title:'SOS Alert Activated', body:`Call 193 now${location?.city ? ` · Location: ${location.city}` : ' · Getting your location…'}`, action:()=>window.open('tel:193','_self') });
    if (location && nearestER)
      list.push({ id:'er', icon:Navigation, color:'red', title:`Nearest ER: ${nearestER.name}`, body:`${nearestER.distance} away · Tap to open in Maps`, action:()=>window.open(`https://maps.google.com/maps/search/hospital/@${location.lat},${location.lng},14z`,'_blank') });
    if (locationShared && location)
      list.push({ id:'loc', icon:MapPin, color:'teal', title:`Location shared — ${location.city||'GPS acquired'}`, body:`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}${location.accuracy ? ` · ±${Math.round(location.accuracy)}m` : ''}`, action:()=>window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`,'_blank') });
    if (contacts.length > 0)
      list.push({ id:'contacts', icon:Phone, color:'teal', title:`${contacts.length} emergency contact${contacts.length>1?'s':''} saved`, body:`Primary: ${contacts[0].name} · ${contacts[0].number}`, action:()=>window.open(`tel:${contacts[0].number}`,'_self') });
    else
      list.push({ id:'no-contacts', icon:Plus, color:'amber', title:'No emergency contacts added', body:'Add contacts so they can be notified in emergencies.', action:()=>setShowAddContact(true) });
    if (medIdBloodType === 'Not set')
      list.push({ id:'medid', icon:BookOpen, color:'amber', title:'Medical ID incomplete', body:'Add your blood type and allergies for first responders.', action:()=>router.push('/profile') });
    return list;
  }, [sosSent, location, nearestER, locationShared, contacts, medIdBloodType, router]);

  const emHasUnread = emNotifications.some(n=>n.id!=='empty') && !notifsRead;
  const toggleNotifPanel = () => { setShowNotifPanel(p=>!p); setNotifsRead(true); };

  const filteredGuides = allFirstAidGuides.filter(g =>
    searchQuery ? g.title.toLowerCase().includes(searchQuery.toLowerCase()) : true,
  );

  const severityLabel = (s: FirstAidGuide['severity']) =>
    s === 'critical' ? '🔴 Critical' : s === 'high' ? '🟠 High Priority' : '🟡 Medium';
  const severityColor = (s: FirstAidGuide['severity']) =>
    s === 'critical' ? 'em-guide--critical' : s === 'high' ? 'em-guide--high' : 'em-guide--medium';

  /* ── Guards ───────────────────────────────────────────────── */
  if (status === 'loading') return (
    <div className="hc-loading">
      <div className="hc-loading__logo"><Heart size={22} /></div>
      <p>Loading Emergency Hub…</p>
    </div>
  );
  if (status === 'unauthenticated') return null;

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <DashboardLayout activeTab="/emergency" className="hc-layout--has-mob-topbar">

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
                  <button className="db-topbar__icon-btn db-topbar__notif" ref={notifBellRef} type="button" aria-label="Notifications" onClick={toggleNotifPanel}>
                    <Bell size={18} />{emHasUnread && <span className="db-topbar__notif-dot" />}
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

      {/* ── Mobile topbar ──────────────────────────────────── */}
      <div className="mob-topbar">
        <div className="mob-topbar__left">
          <Heart size={18} className="mob-topbar__logo-icon" />
          <span className="mob-topbar__logo-text">HealthConnect</span>
        </div>
        <div className="mob-topbar__right">
          <button className="mob-topbar__btn" type="button" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button ref={notifMobRef} className="mob-topbar__btn mob-topbar__bell" type="button" aria-label="Notifications" onClick={toggleNotifPanel}>
            <Bell size={18} />{emHasUnread && <span className="mob-topbar__bell-dot" />}
          </button>
          <button className="mob-topbar__avatar-btn" type="button" onClick={() => router.push('/profile')}>
            <div className="mob-topbar__avatar">
              {userImage ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" /> : userInitials}
            </div>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          NOTIFICATION PANEL
      ══════════════════════════════════════════════════════ */}
      {showNotifPanel && (
        <>
          <div className="db-notif-panel" ref={notifPanelRef} role="dialog" aria-label="Notifications">
            <div className="db-notif-panel__header">
              <span className="db-notif-panel__title">Notifications</span>
              {emNotifications.some(n => n.id !== 'empty') && (
                <span className="db-notif-panel__count">{emNotifications.filter(n => n.id !== 'empty').length}</span>
              )}
              <button className="db-notif-panel__close" onClick={()=>setShowNotifPanel(false)} type="button" aria-label="Close"><X size={15}/></button>
            </div>
            <div className="db-notif-panel__list">
              {emNotifications.map(n => {
                const Icon = n.icon;
                return (
                  <button key={n.id} className={`db-notif-item db-notif-item--${n.color}`}
                    onClick={()=>{ setShowNotifPanel(false); n.action?.(); }}
                    type="button" disabled={!n.action}>
                    <div className={`db-notif-item__icon db-notif-item__icon--${n.color}`}><Icon size={14}/></div>
                    <div className="db-notif-item__body">
                      <p className="db-notif-item__title">{n.title}</p>
                      <p className="db-notif-item__body-text">{n.body}</p>
                    </div>
                    {n.action && <ChevronRight size={13} className="db-notif-item__arrow"/>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="db-notif-overlay" onClick={()=>setShowNotifPanel(false)} />
        </>
      )}

      {/* ── Mobile bottom nav ──────────────────────────────── */}
      <nav className="mob-tab-bar" aria-label="Main navigation">
        <div className="mob-tab-bar__inner">
          <button className="mob-tab-btn" onClick={() => router.push('/dashboard')} type="button" aria-label="Home">
            <Heart size={22} />
            Home
          </button>
          <button className="mob-tab-btn" onClick={() => router.push('/facilities')} type="button" aria-label="Find facilities">
            <MapPin size={22} />
            Find
          </button>
          <button className="mob-tab-btn" onClick={() => router.push('/symptom-checker')} type="button" aria-label="Symptom Checker">
            <Bot size={22} />
            Check
          </button>
          <button
            className="mob-tab-btn mob-tab-btn--sos active"
            onClick={() => router.push('/emergency')}
            type="button"
            aria-current="page"
            aria-label="Emergency"
          >
            <span className="mob-tab-sos-icon"><Phone size={20} /></span>
            SOS
          </button>
          <button className="mob-tab-btn" onClick={() => router.push('/profile')} type="button" aria-label="Profile">
            <User size={22} />
            Profile
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════ */}
      <div className="db-page em-page">

        {/* ── HERO ─────────────────────────────────────────── */}
        <div className="em-hero">
          <div className="em-hero__bg" />
          <div className="em-hero__content">
            <div className="em-hero__left">
              <span className="em-hero__badge"><span className="em-hero__badge-dot" />Emergency Hub</span>
              <h1 className="em-hero__title">Stay Calm.<br />Help Is Nearby.</h1>
              <p className="em-hero__sub">
                Instant access to emergency services, first aid guides, and your emergency contacts — all in one place.
              </p>

              {locationError && (
                <div className="em-loc-error"><AlertCircle size={13} /> {locationError}</div>
              )}

              <div className="em-hero__actions">
                <button
                  className={`em-hero__loc-btn${locationShared ? ' em-hero__loc-btn--active' : ''}`}
                  onClick={shareLocation} disabled={isLoadingLocation} type="button"
                >
                  {isLoadingLocation ? <Loader2 size={15} className="em-spin" /> : <Navigation size={15} />}
                  {location?.city || 'Share Location'}
                </button>
                {locationShared && location && (
                  <a
                    href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                    target="_blank" rel="noopener noreferrer" className="em-hero__maps-btn"
                  >
                    <ExternalLink size={13} /> Open in Maps
                  </a>
                )}
                <button className="em-hero__medid-btn" onClick={() => router.push('/profile')} type="button">
                  <BookOpen size={15} /> Medical ID
                </button>
              </div>

              {location && (
                <p className="em-loc-accuracy">
                  📍 {location.city}
                  {location.accuracy ? ` · ±${Math.round(location.accuracy)}m accuracy` : ''}
                  {locationShared && <span className="em-loc-copy-note"> · Maps link copied</span>}
                </p>
              )}
            </div>

            {/* SOS Button */}
            <div className="em-sos-wrap">
              {sosSent ? (
                <div className="em-sos-sent">
                  <div className="em-sos-sent__icon"><Check size={36} /></div>
                  <p className="em-sos-sent__label">SOS Activated</p>

                  {/* Elapsed timer */}
                  <div className="em-sos-sent__timer">
                    <Clock size={14} />
                    <span>{formatElapsed(sosElapsed)}</span>
                    <span className="em-sos-sent__timer-label">elapsed since activation</span>
                  </div>

                  {/* Location line */}
                  <p className="em-sos-sent__sub">
                    {location?.city
                      ? <><strong>{location.city}</strong><br />Nearest ER: <strong>{nearestER?.name || '…'}{nearestER?.distance ? ` · ${nearestER.distance}` : ''}</strong></>
                      : 'Getting your location…'}
                  </p>

                  {/* Email send status */}
                  <div className="em-sos-sent__sms-status">
                    {sosSending ? (
                      <span className="em-sos-sent__sms-status--sending">
                        <Loader2 size={13} className="em-spin" /> Emailing your emergency contacts…
                      </span>
                    ) : sosSendResult ? (
                      sosSendResult.noContacts ? (
                        <span className="em-sos-sent__sms-status--warn">
                          ⚠️ No emergency contacts saved — add them in the Contacts tab
                        </span>
                      ) : sosSendResult.smtpMissing ? (
                        <span className="em-sos-sent__sms-status--warn">
                          ⚠️ Email service not configured — contacts were not notified.<br />
                          Please call them manually below.
                        </span>
                      ) : sosSendResult.noEmails ? (
                        <span className="em-sos-sent__sms-status--warn">
                          ⚠️ No email addresses saved for your contacts.<br />
                          Add emails in the Contacts tab, then call manually below.
                        </span>
                      ) : sosSendResult.success ? (
                        <span className="em-sos-sent__sms-status--ok">
                          ✓ Alert emailed to {sosSendResult.sent} of {sosSendResult.emailedCount} contact{sosSendResult.emailedCount !== 1 ? 's' : ''}
                          {sosSendResult.withoutEmail && sosSendResult.withoutEmail.length > 0 && (
                            <span className="em-sos-sent__contact-names">
                              {sosSendResult.withoutEmail.length} contact{sosSendResult.withoutEmail.length !== 1 ? 's have' : ' has'} no email — call manually
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="em-sos-sent__sms-status--err">
                          ✗ Email failed — please call contacts manually
                        </span>
                      )
                    ) : null}
                  </div>

                  {/* Manual call buttons for each contact */}
                  {contacts.length > 0 && (
                    <div className="em-sos-sent__contacts">
                      {contacts.map(c => (
                        <a key={c.id} href={`tel:${c.number}`} className="em-sos-sent__contact-call">
                          <Phone size={12} /> Call {c.name}
                        </a>
                      ))}
                    </div>
                  )}

                  <a href="tel:193" className="em-sos-sent__call"><Phone size={15} /> Call Ambulance — 193</a>
                  <button className="em-sos-sent__reset" onClick={resetSOS} type="button">Cancel Alert</button>
                </div>
              ) : (
                <>
                  <div
                    className={`em-sos-btn${sosActive ? ' em-sos-btn--active' : ''}`}
                    onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold}
                    onTouchStart={e => {
                      // Record start position — never preventDefault (would break page scroll)
                      touchStartYRef.current = e.touches[0].clientY;
                      startHold();
                    }}
                    onTouchMove={e => {
                      // If finger moves >8px vertically the user is scrolling — cancel hold
                      if (Math.abs(e.touches[0].clientY - touchStartYRef.current) > 8) {
                        endHold();
                      }
                    }}
                    onTouchEnd={endHold}
                    onTouchCancel={endHold}
                    role="button" tabIndex={0} aria-label="Hold to activate SOS"
                    style={{ '--sos-progress': `${holdProgress}%` } as React.CSSProperties}
                  >
                    <div className="em-sos-btn__ring em-sos-btn__ring--1" />
                    <div className="em-sos-btn__ring em-sos-btn__ring--2" />
                    <div className="em-sos-btn__ring em-sos-btn__ring--3" />
                    <div className="em-sos-btn__core">
                      <span className="em-sos-btn__label">SOS</span>
                      {sosActive && <span className="em-sos-btn__count">{sosCountdown}</span>}
                    </div>
                    {sosActive && (
                      <svg className="em-sos-btn__progress" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,77,109,0.3)" strokeWidth="4" />
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#FF4D6D" strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${(holdProgress / 100) * 339.3} 339.3`}
                          transform="rotate(-90 60 60)" />
                      </svg>
                    )}
                  </div>
                  <p className="em-sos-hint">Hold to activate · Sends location to emergency contacts</p>
                </>
              )}
            </div>
          </div>

          {/* Quick cards */}
          <div className="em-quick-grid">
            <a href="tel:193" className="em-quick-card em-quick-card--red">
              <Phone size={22} className="em-quick-card__icon" />
              <span className="em-quick-card__title">Call 193</span>
              <span className="em-quick-card__sub">National Ambulance</span>
            </a>
            <button className="em-quick-card em-quick-card--teal" onClick={shareLocation} type="button">
              <MapPin size={22} className="em-quick-card__icon" />
              <span className="em-quick-card__title">{locationShared ? 'Location Shared ✓' : 'Share Location'}</span>
              <span className="em-quick-card__sub">
                {locationShared && location?.city ? location.city : 'Get & copy GPS link'}
              </span>
            </button>
            <button className="em-quick-card em-quick-card--violet" onClick={() => setShowPersonalCard(true)} type="button">
              <ClipboardList size={22} className="em-quick-card__icon" />
              <span className="em-quick-card__title">My Emergency Card</span>
              <span className="em-quick-card__sub">Share with first responders</span>
            </button>
            <button
              className="em-quick-card em-quick-card--amber"
              onClick={() => location
                ? window.open(`https://maps.google.com/maps/search/hospital/@${location.lat},${location.lng},14z`, '_blank')
                : shareLocation()
              }
              type="button"
            >
              <Navigation size={22} className="em-quick-card__icon" />
              <span className="em-quick-card__title">Nearest ER</span>
              <span className="em-quick-card__sub">
                {isLoadingER
                  ? 'Searching…'
                  : nearestER
                  ? `${nearestER.name} · ${nearestER.distance}`
                  : 'Enable location first'}
              </span>
            </button>
            <button className="em-quick-card em-quick-card--mint" onClick={startBreathing} type="button">
              <HeartPulse size={22} className="em-quick-card__icon" />
              <span className="em-quick-card__title">Calm Breathing</span>
              <span className="em-quick-card__sub">4-7-8 guided pattern</span>
            </button>
            <button className="em-quick-card em-quick-card--blue" onClick={() => router.push('/facilities')} type="button">
              <MapPin size={22} className="em-quick-card__icon" />
              <span className="em-quick-card__title">Find Hospital</span>
              <span className="em-quick-card__sub">Nearby facilities map</span>
            </button>
          </div>
        </div>

        {/* ── BREATHING GUIDE MODAL ────────────────────────────── */}
        {showBreathing && (() => {
          const current = BREATH_PHASES.find(p => p.phase === breathPhase)!;
          return (
            <div className="em-breathing-overlay" onClick={stopBreathing}>
              <div className="em-breathing-modal" onClick={e => e.stopPropagation()}>
                <button className="em-breathing-close" onClick={stopBreathing} type="button"><X size={18}/></button>
                <p className="em-breathing-title">Calm Breathing</p>
                <p className="em-breathing-cycle">Cycle {breathCount + 1}</p>
                <div className="em-breathing-circle" style={{ '--breath-color': current.color } as React.CSSProperties}>
                  <div className={`em-breathing-ring em-breathing-ring--${breathPhase}`} />
                  <div className="em-breathing-core">
                    <span className="em-breathing-phase">{current.label}</span>
                    <span className="em-breathing-secs">{current.secs}s</span>
                  </div>
                </div>
                <p className="em-breathing-hint">4-7-8 pattern · Tap anywhere to stop</p>
              </div>
            </div>
          );
        })()}

        {/* ── PERSONAL EMERGENCY CARD MODAL ───────────────────── */}
        {showPersonalCard && (
          <div className="em-card-overlay" onClick={() => setShowPersonalCard(false)}>
            <div className="em-personal-card" onClick={e => e.stopPropagation()}>
              <button className="em-card-close" onClick={() => setShowPersonalCard(false)} type="button"><X size={16}/></button>

              <div className="em-personal-card__header">
                <div className="em-personal-card__logo"><Heart size={18}/></div>
                <div>
                  <p className="em-personal-card__brand">HealthConnect</p>
                  <p className="em-personal-card__label">Emergency Medical ID</p>
                </div>
              </div>

              <h2 className="em-personal-card__name">{userName}</h2>

              <div className="em-personal-card__rows">
                <div className="em-personal-card__row em-personal-card__row--highlight">
                  <Droplets size={14}/><span className="em-personal-card__key">Blood Type</span>
                  <span className="em-personal-card__val">{medIdBloodType}</span>
                </div>
                {medIdAllergies !== 'None recorded' && (
                  <div className="em-personal-card__row em-personal-card__row--warn">
                    <AlertTriangle size={14}/><span className="em-personal-card__key">⚠️ Allergies</span>
                    <span className="em-personal-card__val">{medIdAllergies}</span>
                  </div>
                )}
                <div className="em-personal-card__row">
                  <Pill size={14}/><span className="em-personal-card__key">Medications</span>
                  <span className="em-personal-card__val">{medIdMedications}</span>
                </div>
                <div className="em-personal-card__row">
                  <Activity size={14}/><span className="em-personal-card__key">Conditions</span>
                  <span className="em-personal-card__val">{medIdConditions}</span>
                </div>
                <div className="em-personal-card__row">
                  <Phone size={14}/><span className="em-personal-card__key">Contact</span>
                  <span className="em-personal-card__val">{medIdContact}</span>
                </div>
                {location && (
                  <div className="em-personal-card__row">
                    <MapPin size={14}/><span className="em-personal-card__key">Location</span>
                    <span className="em-personal-card__val">{location.city || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}</span>
                  </div>
                )}
              </div>

              {/* Blood type compatibility */}
              {BLOOD_COMPATIBILITY[medIdBloodType] && (
                <div className="em-personal-card__blood-compat">
                  <p className="em-personal-card__compat-title">Blood Transfusion Compatibility</p>
                  <div className="em-personal-card__compat-row">
                    <span className="em-personal-card__compat-label">Can receive from:</span>
                    <div className="em-personal-card__compat-tags">
                      {BLOOD_COMPATIBILITY[medIdBloodType].canReceiveFrom.map(t => (
                        <span key={t} className={`em-personal-card__blood-tag${t === medIdBloodType ? ' em-personal-card__blood-tag--self' : ''}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="em-personal-card__compat-row">
                    <span className="em-personal-card__compat-label">Can donate to:</span>
                    <div className="em-personal-card__compat-tags">
                      {BLOOD_COMPATIBILITY[medIdBloodType].canDonateTo.map(t => (
                        <span key={t} className={`em-personal-card__blood-tag${t === medIdBloodType ? ' em-personal-card__blood-tag--self' : ''}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="em-personal-card__actions">
                <button className="em-personal-card__copy" onClick={copyPersonalCard} type="button">
                  {copiedId === 'card' ? <><Check size={14}/>Copied!</> : <><Copy size={14}/>Copy Card</>}
                </button>
                <button className="em-personal-card__edit" onClick={() => { setShowPersonalCard(false); router.push('/profile'); }} type="button">
                  <Edit2 size={14}/>Edit Profile
                </button>
              </div>

              <p className="em-personal-card__ts">Generated {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {/* ── MOBILE TABS ──────────────────────────────────── */}
        <div className="em-mob-tabs">
          {(['services', 'firstaid', 'contacts'] as const).map(tab => (
            <button key={tab}
              className={`em-mob-tab${activeTab === tab ? ' em-mob-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)} type="button"
            >
              {tab === 'services' ? '🚨 Emergency' : tab === 'firstaid' ? '🩺 First Aid' : '👥 Contacts'}
            </button>
          ))}
        </div>

        {/* ── MAIN GRID ────────────────────────────────────── */}
        <div className="em-grid">

          {/* LEFT: Services + First Aid */}
          <div className={`em-grid__main${activeTab === 'contacts' ? ' em-mob-hidden' : ''}`}>

            {/* Ghana Emergency Services */}
            <section className={`em-section${activeTab === 'firstaid' ? ' em-mob-hidden' : ''}`}>
              <div className="em-section__head">
                <h2 className="em-section__title"><Shield size={18} />Ghana Emergency Services</h2>
                <span className="em-section__badge">24/7</span>
              </div>
              <p className="em-section__sub">Tap the phone icon to dial directly · Copy icon saves number to clipboard</p>
              <div className="em-services-list">
                {GHANA_SERVICES.map(svc => (
                  <div key={svc.id} className={`em-service em-service--${svc.color}`}>
                    <div className="em-service__icon"><svc.icon size={20} /></div>
                    <div className="em-service__body">
                      <p className="em-service__name">{svc.name}</p>
                      <p className="em-service__desc">{svc.description}</p>
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
            <section className={`em-section${activeTab === 'services' ? ' em-mob-hidden' : ''}`}>
              <div className="em-section__head">
                <h2 className="em-section__title"><Plus size={18} />First Aid Guides</h2>
                <span className="em-badge-offline"><Zap size={11} />Works Offline</span>
              </div>
              <p className="em-section__sub">Tap any guide to see full step-by-step instructions</p>

              <div className="em-guides-list">
                {filteredGuides.map(guide => (
                  <div key={guide.id} className={`em-guide-wrap${activeGuide === guide.id ? ' em-guide-wrap--open' : ''}`}>
                    <button
                      className={`em-guide ${severityColor(guide.severity)}`}
                      onClick={() => setActiveGuide(activeGuide === guide.id ? null : guide.id)}
                      type="button"
                    >
                      <div className="em-guide__icon"><guide.icon size={20} /></div>
                      <div className="em-guide__body">
                        <p className="em-guide__title">{guide.title}</p>
                        <p className="em-guide__steps">{guide.steps.length} steps · {severityLabel(guide.severity)}</p>
                      </div>
                      <div className={`em-guide__open${activeGuide === guide.id ? ' em-guide__open--rotated' : ''}`}>
                        <ChevronDown size={16} />
                      </div>
                    </button>

                    {activeGuide === guide.id && (
                      <div className="em-guide-steps">
                        {guide.warning && (
                          <div className="em-guide-warning">
                            <AlertTriangle size={14} /><p>{guide.warning}</p>
                          </div>
                        )}
                        {guide.steps.map((step, idx) => (
                          <div key={idx} className="em-step">
                            <div className="em-step__num">{idx + 1}</div>
                            <div className="em-step__content">
                              <p className="em-step__text">{step.instruction}</p>
                              {step.tip && (
                                <div className="em-step__tip">
                                  <Info size={12} /><span>{step.tip}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="em-guide-cta">
                          <a href="tel:193" className="em-guide-cta__call"><Phone size={14} /> Call Ambulance — 193</a>
                          <button className="em-guide-cta__close" onClick={() => setActiveGuide(null)} type="button">
                            <X size={14} /> Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredGuides.length === 0 && searchQuery && (
                  <div className="em-guides-empty">
                    <Search size={22} />
                    <p>No guides match "<strong>{searchQuery}</strong>"</p>
                    <button onClick={() => setSearchQuery('')} type="button">Clear search</button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT: Contacts + Medical ID + Location */}
          <div className={`em-grid__side${activeTab === 'services' || activeTab === 'firstaid' ? ' em-mob-hidden' : ''}`}>

            {/* Emergency Contacts */}
            <section className="em-section em-section--contacts">
              <div className="em-section__head">
                <h2 className="em-section__title"><User size={18} />Emergency Contacts</h2>
                <button className="em-section__add" type="button"
                  onClick={() => { setShowAddContact(v => !v); setAddError(''); }}
                >
                  {showAddContact ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add</>}
                </button>
              </div>

              {/* Success message */}
              {contactSaveSuccess && (
                <div className="em-contact-success">
                  <Check size={13} /> Contact saved successfully
                </div>
              )}

              {/* Inline add form */}
              {showAddContact && (
                <div className="em-add-contact">
                  {addError && <p className="em-add-contact__error"><AlertCircle size={12} /> {addError}</p>}
                  <input
                    className="em-add-contact__input" placeholder="Full name *"
                    value={newContact.name}
                    onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="em-add-contact__input" placeholder="Relationship (e.g. Sister)"
                    value={newContact.relationship}
                    onChange={e => setNewContact(p => ({ ...p, relationship: e.target.value }))}
                  />
                  <input
                    className="em-add-contact__input" placeholder="Phone number *" type="tel"
                    value={newContact.number}
                    onChange={e => setNewContact(p => ({ ...p, number: e.target.value }))}
                  />
                  <input
                    className="em-add-contact__input" placeholder="Email address (for SOS alerts)"
                    type="email"
                    value={newContact.email}
                    onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                  />
                  <p className="em-add-contact__email-hint">
                    Email is used to notify this contact when you activate SOS
                  </p>
                  <button
                    className="em-add-contact__save" onClick={handleAddContact}
                    disabled={addingContact} type="button"
                  >
                    {addingContact ? <Loader2 size={14} className="em-spin" /> : <Check size={14} />}
                    {addingContact ? 'Saving…' : 'Save Contact'}
                  </button>
                </div>
              )}

              {/* Contacts list */}
              {isLoadingContacts ? (
                <div className="em-contacts-loading">
                  <Loader2 size={18} className="em-spin" />
                  <span>Loading contacts…</span>
                </div>
              ) : contacts.length === 0 ? (
                <div className="em-contacts-empty">
                  <User size={24} />
                  <p>No emergency contacts yet</p>
                  <span>Add a contact so first responders can reach your family</span>
                  <button
                    className="em-contacts-empty__btn"
                    onClick={() => setShowAddContact(true)}
                    type="button"
                  >
                    <Plus size={13} /> Add First Contact
                  </button>
                </div>
              ) : (
                <div className="em-contacts-list">
                  {contacts.map(c => (
                    <div key={c.id} className={`em-contact${c.isPrimary ? ' em-contact--primary' : ''}`}>
                      <div className="em-contact__avatar">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="em-contact__body">
                        <p className="em-contact__name">
                          {c.name}
                          {c.isPrimary && <span className="em-contact__primary-badge">Primary</span>}
                        </p>
                        <p className="em-contact__rel">{c.relationship} · {c.number}</p>
                        {c.email
                          ? <p className="em-contact__email em-contact__email--set">{c.email}</p>
                          : <p className="em-contact__email em-contact__email--missing">No email — won't receive SOS alerts</p>
                        }
                      </div>
                      <div className="em-contact__actions">
                        <button className="em-contact__copy-btn" title="Copy number"
                          onClick={() => copyPhone(c.id, c.number)} type="button">
                          {copiedId === c.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        <a href={`tel:${c.number}`} className="em-contact__call">
                          <Phone size={14} /> Call
                        </a>
                        {!c.isPrimary && (
                          <button className="em-contact__remove" onClick={() => removeContact(c.id)}
                            type="button" title="Remove contact">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Medical ID — pulls from real health profile */}
            <section className="em-section em-med-id">
              <div className="em-med-id__header">
                <BookOpen size={16} />
                <h3>Medical ID</h3>
                <span className="em-badge-offline"><Zap size={11} />Offline</span>
              </div>
              <p className="em-med-id__note">Shown to first responders — keep this up to date</p>

              {isLoadingProfile ? (
                <div className="em-med-id__loading">
                  <Loader2 size={16} className="em-spin" /> Loading…
                </div>
              ) : (
                <div className="em-med-id__body">
                  {[
                    { key: 'Name',       val: userName,           highlight: false, warn: false },
                    { key: 'Blood Type', val: medIdBloodType,     highlight: medIdBloodType !== 'Not set', warn: false },
                    { key: 'Allergies',  val: medIdAllergies,     highlight: false, warn: medIdAllergies !== 'None recorded' },
                    { key: 'Conditions', val: medIdConditions,    highlight: false, warn: false },
                    { key: 'Medications',val: medIdMedications,   highlight: false, warn: false },
                    { key: 'Contact',    val: medIdContact,       highlight: false, warn: false },
                  ].map(({ key, val, highlight, warn }) => (
                    <div key={key} className="em-med-id__row">
                      <span className="em-med-id__key">{key}</span>
                      <span className={`em-med-id__val${highlight ? ' em-med-id__val--red' : warn ? ' em-med-id__val--amber' : ''}`}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button className="em-med-id__edit" onClick={() => router.push('/profile')} type="button">
                {isLoadingProfile ? 'Loading profile…' : 'Edit in Health Profile'} <ChevronRight size={14} />
              </button>
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
                    <span>🏥 Nearest ER:</span>
                    <button
                      onClick={() => window.open(`https://maps.google.com/maps/search/hospital/@${location.lat},${location.lng},14z`, '_blank')}
                      type="button"
                    >
                      {nearestER.name} · {nearestER.distance} →
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