/* ================================================================
   src/lib/symptomSpecialtyMap.ts
   Static symptom → facility-type lookup for the /find-care page
   (Section 11 of the HEALTHNAV master handoff — Mode B: "Find by
   Symptom"). Client-side only, no API call.

   IMPORTANT: this maps to the SAME facility-type taxonomy used by
   /facilities' RESULTS STATE (FACILITY_TYPE_OPTIONS in lib/constants.ts) —
   not to individual doctors/specialists. There is no provider/doctor
   marketplace in v1; matching a symptom here just tells the person
   which kind of facility to search for, then hands off to
   /facilities?type=<slug>. This file previously mapped
   symptoms to 18 doctor specialties (gp, cardiologist, dermatologist,
   etc.) from an earlier, unused provider-marketplace build — that
   model is gone.

   Usage:
     import { matchSymptoms } from '@/lib/symptomSpecialtyMap';
     const matches = matchSymptoms(['chest-pain', 'shortness-of-breath']);
     // matches[0].slug === 'hospital'
   ================================================================ */

import { FACILITY_TYPE_OPTIONS, type FacilityTypeOption } from '@/lib/constants';

/* ── Doctor/clinic specialties ─────────────────────────────────────
   Mirrors the Specialty rows seeded by prisma/seed-phase8.ts. This is
   a DIFFERENT taxonomy from FACILITY_TYPE_OPTIONS above: those are
   facility *types* (hospital/clinic/pharmacy/...) used by the free
   symptom-matcher below, while these are individual doctor/clinic
   *specialties* (cardiologist, dermatologist, ...) used by the
   provider directory on /facilities (RESULTS STATE) and /provider/register.
   Keep in sync with the `specialties` array in prisma/seed-phase8.ts —
   the slugs here must match Specialty.slug in the database exactly,
   or specialty filtering will silently return zero results. */
export interface SpecialtyOption {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export const SPECIALTIES: SpecialtyOption[] = [
  { slug: 'gp', name: 'General Practitioner', description: 'Your first stop for most everyday health concerns — can refer you to a specialist if needed.', icon: 'Stethoscope' },
  { slug: 'neurologist', name: 'Neurologist', description: 'Treats conditions of the brain, nerves, and nervous system.', icon: 'Brain' },
  { slug: 'cardiologist', name: 'Cardiologist', description: 'Treats conditions of the heart and blood vessels.', icon: 'HeartPulse' },
  { slug: 'dermatologist', name: 'Dermatologist', description: 'Treats skin, hair, and nail conditions.', icon: 'Sparkles' },
  { slug: 'ophthalmologist', name: 'Ophthalmologist', description: 'Treats eye conditions and vision problems.', icon: 'Eye' },
  { slug: 'rheumatologist', name: 'Rheumatologist', description: 'Treats joint, muscle, and autoimmune conditions.', icon: 'Bone' },
  { slug: 'psychiatrist', name: 'Psychiatrist', description: 'Treats mental health conditions — mood, anxiety, and more.', icon: 'BrainCircuit' },
  { slug: 'gastroenterologist', name: 'Gastroenterologist', description: 'Treats digestive system conditions — stomach, gut, and liver.', icon: 'Activity' },
  { slug: 'ent', name: 'ENT Specialist', description: 'Treats ear, nose, and throat conditions.', icon: 'Ear' },
  { slug: 'dentist', name: 'Dentist', description: 'Treats teeth, gums, and oral health.', icon: 'Smile' },
  { slug: 'obgyn', name: 'OB/GYN', description: "Treats women's reproductive health, pregnancy, and menstrual concerns.", icon: 'Heart' },
  { slug: 'paediatrician', name: 'Paediatrician', description: "Treats infants, children, and teenagers' health.", icon: 'Baby' },
  { slug: 'orthopaedic', name: 'Orthopaedic Surgeon', description: 'Treats bones, joints, and musculoskeletal injuries.', icon: 'Bone' },
  { slug: 'urologist', name: 'Urologist', description: 'Treats urinary tract and male reproductive conditions.', icon: 'Droplet' },
  { slug: 'pulmonologist', name: 'Pulmonologist', description: 'Treats lung and breathing conditions.', icon: 'Wind' },
  { slug: 'endocrinologist', name: 'Endocrinologist', description: 'Treats hormone conditions — diabetes, thyroid, and metabolism.', icon: 'Gauge' },
  { slug: 'physiotherapist', name: 'Physiotherapist', description: 'Treats injuries and mobility through physical rehabilitation.', icon: 'Dumbbell' },
  { slug: 'oncologist', name: 'Oncologist', description: 'Treats cancer and investigates unusual growths — always start with a GP referral.', icon: 'Microscope' },
];

export interface FacilityMatch extends FacilityTypeOption {
  confidence:   'high' | 'moderate' | 'low';
  /** True when a general hospital/clinic is a safer first stop than the matched type. */
  generalFirst: boolean;
  score:        number;
}

const FACILITY_BY_SLUG: Record<string, FacilityTypeOption> =
  Object.fromEntries(FACILITY_TYPE_OPTIONS.map(o => [o.slug, o]));

/* ─── Symptom → facility-type weighted map ───────────────────────────
   weight:       1 = weak signal, 2 = moderate, 3 = strong
                 (e.g. "tooth pain" → Dental is a strong/direct signal)
   generalFirst: true means the UI should show a "start with a general
                 hospital/clinic" note even though a more specific type
                 also matched. Set true for anything urgent/ambiguous
                 enough that self-routing straight to a niche type could
                 delay care.
   Expand this table over time; always keep 'clinic' reachable as the
   safe general fallback for ambiguous symptoms.
   ──────────────────────────────────────────────────────────────────── */

interface FacilityWeight { typeSlug: string; weight: number; generalFirst: boolean }

export const SYMPTOM_FACILITY_MAP: Record<string, FacilityWeight[]> = {
  // Head & Neck
  headache:           [{ typeSlug: 'clinic', weight: 2, generalFirst: true }],
  fever:              [{ typeSlug: 'clinic', weight: 2, generalFirst: true }],
  dizziness:          [{ typeSlug: 'clinic', weight: 2, generalFirst: true }],
  'blurred-vision':   [{ typeSlug: 'eye_clinic', weight: 3, generalFirst: false }],
  'eye-pain':         [{ typeSlug: 'eye_clinic', weight: 3, generalFirst: false }],
  redness:            [{ typeSlug: 'eye_clinic', weight: 2, generalFirst: false }],
  'ear-pain':         [{ typeSlug: 'ent_clinic', weight: 3, generalFirst: false }],
  'hearing-loss':     [{ typeSlug: 'ent_clinic', weight: 3, generalFirst: false }],
  'sore-throat':      [{ typeSlug: 'ent_clinic', weight: 1, generalFirst: false }, { typeSlug: 'clinic', weight: 2, generalFirst: false }],
  'nasal-congestion': [{ typeSlug: 'ent_clinic', weight: 2, generalFirst: false }, { typeSlug: 'clinic', weight: 1, generalFirst: false }],
  'tooth-pain':       [{ typeSlug: 'dentist', weight: 3, generalFirst: false }],
  'gum-swelling':     [{ typeSlug: 'dentist', weight: 3, generalFirst: false }],

  // Chest
  'chest-pain':           [{ typeSlug: 'hospital', weight: 3, generalFirst: false }],
  'shortness-of-breath':  [{ typeSlug: 'hospital', weight: 3, generalFirst: false }],
  palpitations:           [{ typeSlug: 'hospital', weight: 2, generalFirst: true }, { typeSlug: 'clinic', weight: 1, generalFirst: false }],
  'breathing-difficulty': [{ typeSlug: 'hospital', weight: 3, generalFirst: false }],
  'chronic-cough':        [{ typeSlug: 'clinic', weight: 2, generalFirst: true }],
  cough:                  [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  'high-blood-pressure':  [{ typeSlug: 'clinic', weight: 2, generalFirst: false }, { typeSlug: 'hospital', weight: 1, generalFirst: false }],

  // Stomach
  'stomach-pain': [{ typeSlug: 'clinic', weight: 2, generalFirst: true }],
  nausea:         [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  vomiting:       [{ typeSlug: 'clinic', weight: 2, generalFirst: true }],
  diarrhoea:      [{ typeSlug: 'clinic', weight: 2, generalFirst: true }],
  bloating:       [{ typeSlug: 'clinic', weight: 1, generalFirst: false }],

  // Skin
  'skin-rash':          [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  itching:              [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  hives:                [{ typeSlug: 'clinic', weight: 2, generalFirst: true }],
  'skin-discoloration': [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  acne:                 [{ typeSlug: 'clinic', weight: 1, generalFirst: false }],
  'hair-loss':          [{ typeSlug: 'clinic', weight: 1, generalFirst: false }],

  // Mental Health
  anxiety:        [{ typeSlug: 'mental_health', weight: 3, generalFirst: false }],
  depression:     [{ typeSlug: 'mental_health', weight: 3, generalFirst: false }],
  'mood-changes': [{ typeSlug: 'mental_health', weight: 2, generalFirst: false }],
  insomnia:       [{ typeSlug: 'mental_health', weight: 1, generalFirst: true }, { typeSlug: 'clinic', weight: 1, generalFirst: false }],
  'memory-loss':  [{ typeSlug: 'hospital', weight: 2, generalFirst: true }, { typeSlug: 'clinic', weight: 1, generalFirst: false }],

  // General
  fatigue:              [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  cold:                 [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  'joint-pain':         [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  swelling:             [{ typeSlug: 'clinic', weight: 1, generalFirst: false }],
  stiffness:            [{ typeSlug: 'clinic', weight: 1, generalFirst: false }],
  'back-pain':          [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  fracture:             [{ typeSlug: 'hospital', weight: 3, generalFirst: false }],
  'joint-injury':       [{ typeSlug: 'hospital', weight: 2, generalFirst: true }, { typeSlug: 'clinic', weight: 1, generalFirst: false }],
  'sports-injury':      [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  'frequent-urination': [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  'kidney-pain':        [{ typeSlug: 'hospital', weight: 3, generalFirst: false }],
  'weight-changes':     [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  'excessive-thirst':   [{ typeSlug: 'hospital', weight: 2, generalFirst: true }, { typeSlug: 'clinic', weight: 1, generalFirst: false }],
  'night-sweats':       [{ typeSlug: 'clinic', weight: 1, generalFirst: false }],
  pregnancy:            [{ typeSlug: 'maternity', weight: 3, generalFirst: false }],
  'menstrual-issues':   [{ typeSlug: 'maternity', weight: 2, generalFirst: false }, { typeSlug: 'clinic', weight: 1, generalFirst: false }],
  'pelvic-pain':        [{ typeSlug: 'maternity', weight: 2, generalFirst: true }, { typeSlug: 'hospital', weight: 1, generalFirst: false }],
  'child-illness':      [{ typeSlug: 'clinic', weight: 2, generalFirst: false }, { typeSlug: 'hospital', weight: 1, generalFirst: false }],
  'growth-concern':     [{ typeSlug: 'clinic', weight: 2, generalFirst: false }],
  lump:                 [{ typeSlug: 'hospital', weight: 2, generalFirst: true }, { typeSlug: 'clinic', weight: 1, generalFirst: false }],
};

/* ─── Confidence banding ─────────────────────────────────────────── */

function confidenceFor(score: number): 'high' | 'moderate' | 'low' {
  if (score >= 5) return 'high';
  if (score >= 3) return 'moderate';
  return 'low';
}

/* ─── Public matcher ─────────────────────────────────────────────────
   Aggregates weights across all selected symptom slugs, one row per
   facility type, sorted by descending score. Always appends 'clinic'
   (the safe general fallback) when:
     - no symptom slug was recognised (fully ambiguous), or
     - any matched type carries generalFirst, or
     - the top match's confidence is 'low'
   and 'clinic' isn't already in the results.
   ──────────────────────────────────────────────────────────────────── */
export function matchSymptoms(selectedSlugs: string[]): FacilityMatch[] {
  if (selectedSlugs.length === 0) return [];

  const totals = new Map<string, { score: number; generalFirst: boolean }>();

  for (const slug of selectedSlugs) {
    const entries = SYMPTOM_FACILITY_MAP[slug];
    if (!entries) continue;
    for (const { typeSlug, weight, generalFirst } of entries) {
      const existing = totals.get(typeSlug) ?? { score: 0, generalFirst: false };
      totals.set(typeSlug, {
        score:        existing.score + weight,
        generalFirst: existing.generalFirst || generalFirst,
      });
    }
  }

  const matches: FacilityMatch[] = Array.from(totals.entries())
    .map(([slug, { score, generalFirst }]) => {
      const facility = FACILITY_BY_SLUG[slug];
      if (!facility) return null;
      return { ...facility, score, generalFirst, confidence: confidenceFor(score) };
    })
    .filter((m): m is FacilityMatch => m !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const hasClinic       = matches.some(m => m.slug === 'clinic');
  const anyGeneralFirst = matches.some(m => m.generalFirst);
  const topConfidence   = matches[0]?.confidence;
  const noneRecognised  = matches.length === 0;

  if (!hasClinic && (noneRecognised || anyGeneralFirst || topConfidence === 'low')) {
    const clinic = FACILITY_BY_SLUG['clinic'];
    matches.push({ ...clinic, score: 0, generalFirst: true, confidence: 'low' });
  }

  return matches;
}