export const FACILITY_TYPES = {
  HOSPITAL: 'Hospital',
  CLINIC: 'Clinic',
  PHARMACY: 'Pharmacy',
  EMERGENCY: 'Emergency Room',
  SPECIALIST: 'Specialist',
} as const

// ── Find Care facility types (Section 11/12 of the handoff) ─────────────
// Each type maps to one or more OSM tag matchers used to build the
// Overpass query on /facilities (RESULTS STATE). `regex: true` matchers use
// Overpass's case-insensitive `~` operator against free-text tags like
// `healthcare:speciality`, since OSM has no dedicated key for some
// specialties (ENT, mental health, maternity) — coverage for these is
// expected to be thinner in smaller towns (Section 21).
export interface FacilityTypeTagMatch {
  key: string;
  value: string;
  regex?: boolean;
}

export interface FacilityTypeOption {
  slug: string;
  label: string;
  icon: string; // lucide-react component name, resolved by the page
  tags: FacilityTypeTagMatch[];
}

export const FACILITY_TYPE_OPTIONS: FacilityTypeOption[] = [
  { slug: 'hospital',      label: 'Hospital',       icon: 'Hospital',    tags: [{ key: 'amenity', value: 'hospital' }] },
  { slug: 'clinic',        label: 'Clinic',         icon: 'Stethoscope', tags: [{ key: 'amenity', value: 'clinic' }] },
  { slug: 'dentist',       label: 'Dental',         icon: 'Smile',       tags: [{ key: 'amenity', value: 'dentist' }] },
  { slug: 'eye_clinic',    label: 'Eye Care',       icon: 'Eye',         tags: [{ key: 'healthcare', value: 'optometrist' }, { key: 'shop', value: 'optician' }] },
  { slug: 'ent_clinic',    label: 'ENT',            icon: 'Ear',         tags: [{ key: 'healthcare:speciality', value: 'otolaryngology|ent', regex: true }] },
  { slug: 'pharmacy',      label: 'Pharmacy',       icon: 'Pill',        tags: [{ key: 'amenity', value: 'pharmacy' }] },
  { slug: 'laboratory',    label: 'Lab',            icon: 'Microscope', tags: [{ key: 'healthcare', value: 'laboratory' }] },
  { slug: 'maternity',     label: 'Maternity',      icon: 'Baby',        tags: [{ key: 'healthcare:speciality', value: 'gynaecology|obstetrics|midwifery', regex: true }] },
  { slug: 'mental_health', label: 'Mental Health',  icon: 'Brain',       tags: [{ key: 'healthcare:speciality', value: 'psychiatry|mental', regex: true }, { key: 'healthcare', value: 'psychotherapist' }] },
];

// Default (no type specified) — e.g. dashboard NHIS card link
// (/facilities?nhis=true). Broad, well-covered types only.
export const DEFAULT_FACILITY_TYPE_SLUGS = ['hospital', 'clinic', 'pharmacy'] as const;

export const RISK_LEVELS = {
  EMERGENCY: 'Emergency',
  URGENT: 'Urgent',
  ROUTINE: 'Routine',
  SELF_CARE: 'Self Care',
} as const

export const RISK_LEVEL_COLORS = {
  EMERGENCY: 'bg-red-500',
  URGENT: 'bg-orange-500',
  ROUTINE: 'bg-yellow-500',
  SELF_CARE: 'bg-green-500',
}

export const EMERGENCY_NUMBERS = {
  AMBULANCE: '193',
  FIRE: '192',
  POLICE: '191',
} as const

// ── Find Care symptom chips ──────────────────────────────────────────────
// Grouped by body area for the /find-care symptom selector (Section 9 of
// the handoff). slug values must match SymptomTag.slug seeded into the DB
// (see prisma/seed-phase8.ts) and the keys used in
// src/lib/symptomSpecialtyMap.ts — all three must stay in sync.
export interface SymptomOption {
  label:    string;
  slug:     string;
  category: 'Head & Neck' | 'Chest' | 'Stomach' | 'Skin' | 'Mental Health' | 'General';
}

export const COMMON_SYMPTOMS: SymptomOption[] = [
  // Head & Neck
  { label: 'Headache',           slug: 'headache',           category: 'Head & Neck' },
  { label: 'Fever',              slug: 'fever',               category: 'Head & Neck' },
  { label: 'Dizziness',          slug: 'dizziness',           category: 'Head & Neck' },
  { label: 'Blurred vision',     slug: 'blurred-vision',      category: 'Head & Neck' },
  { label: 'Eye pain',           slug: 'eye-pain',            category: 'Head & Neck' },
  { label: 'Eye redness',        slug: 'redness',             category: 'Head & Neck' },
  { label: 'Ear pain',           slug: 'ear-pain',            category: 'Head & Neck' },
  { label: 'Hearing loss',       slug: 'hearing-loss',        category: 'Head & Neck' },
  { label: 'Sore throat',        slug: 'sore-throat',         category: 'Head & Neck' },
  { label: 'Nasal congestion',   slug: 'nasal-congestion',    category: 'Head & Neck' },
  { label: 'Tooth pain',         slug: 'tooth-pain',          category: 'Head & Neck' },
  { label: 'Gum swelling',       slug: 'gum-swelling',        category: 'Head & Neck' },

  // Chest
  { label: 'Chest pain',            slug: 'chest-pain',            category: 'Chest' },
  { label: 'Shortness of breath',   slug: 'shortness-of-breath',   category: 'Chest' },
  { label: 'Palpitations',          slug: 'palpitations',          category: 'Chest' },
  { label: 'Breathing difficulty',  slug: 'breathing-difficulty',  category: 'Chest' },
  { label: 'Chronic cough',         slug: 'chronic-cough',         category: 'Chest' },
  { label: 'Cough',                 slug: 'cough',                 category: 'Chest' },
  { label: 'High blood pressure',   slug: 'high-blood-pressure',   category: 'Chest' },

  // Stomach
  { label: 'Stomach pain',   slug: 'stomach-pain',   category: 'Stomach' },
  { label: 'Nausea',         slug: 'nausea',         category: 'Stomach' },
  { label: 'Vomiting',       slug: 'vomiting',       category: 'Stomach' },
  { label: 'Diarrhoea',      slug: 'diarrhoea',      category: 'Stomach' },
  { label: 'Bloating',       slug: 'bloating',       category: 'Stomach' },

  // Skin
  { label: 'Skin rash',          slug: 'skin-rash',          category: 'Skin' },
  { label: 'Itching',            slug: 'itching',            category: 'Skin' },
  { label: 'Hives',               slug: 'hives',              category: 'Skin' },
  { label: 'Skin discolouration', slug: 'skin-discoloration', category: 'Skin' },
  { label: 'Acne',                slug: 'acne',               category: 'Skin' },
  { label: 'Hair loss',           slug: 'hair-loss',          category: 'Skin' },

  // Mental Health
  { label: 'Anxiety',              slug: 'anxiety',              category: 'Mental Health' },
  { label: 'Depression',           slug: 'depression',           category: 'Mental Health' },
  { label: 'Mood changes',         slug: 'mood-changes',         category: 'Mental Health' },
  { label: 'Insomnia',             slug: 'insomnia',             category: 'Mental Health' },
  { label: 'Memory loss',          slug: 'memory-loss',          category: 'Mental Health' },

  // General
  { label: 'Fatigue',                slug: 'fatigue',                category: 'General' },
  { label: 'Cold symptoms',          slug: 'cold',                   category: 'General' },
  { label: 'Joint pain',             slug: 'joint-pain',             category: 'General' },
  { label: 'Swelling',               slug: 'swelling',               category: 'General' },
  { label: 'Stiffness',              slug: 'stiffness',              category: 'General' },
  { label: 'Back pain',              slug: 'back-pain',              category: 'General' },
  { label: 'Fracture',               slug: 'fracture',               category: 'General' },
  { label: 'Joint injury',           slug: 'joint-injury',           category: 'General' },
  { label: 'Sports injury',          slug: 'sports-injury',          category: 'General' },
  { label: 'Frequent urination',     slug: 'frequent-urination',     category: 'General' },
  { label: 'Kidney pain',            slug: 'kidney-pain',            category: 'General' },
  { label: 'Weight changes',         slug: 'weight-changes',         category: 'General' },
  { label: 'Excessive thirst',       slug: 'excessive-thirst',       category: 'General' },
  { label: 'Night sweats',           slug: 'night-sweats',           category: 'General' },
  { label: 'Pregnancy',              slug: 'pregnancy',              category: 'General' },
  { label: 'Menstrual issues',       slug: 'menstrual-issues',       category: 'General' },
  { label: 'Pelvic pain',            slug: 'pelvic-pain',            category: 'General' },
  { label: 'Child illness',          slug: 'child-illness',          category: 'General' },
  { label: 'Growth concern',         slug: 'growth-concern',         category: 'General' },
  { label: 'Lump or abnormal growth', slug: 'lump',                  category: 'General' },
]

export const BODY_PARTS = [
  'Head',
  'Neck',
  'Chest',
  'Abdomen',
  'Back',
  'Arms',
  'Legs',
  'Hands',
  'Feet',
]

// ── Ghana districts ──────────────────────────────────────────────────────
// Used as the location fallback on /find-care when GPS is denied, and by
// provider registration (Section 10.4 of the handoff) for the district
// dropdown. Accra districts first per Section 18 (Ghana-Specific Context).
export const GHANA_DISTRICTS = [
  'Osu', 'Labone', 'East Legon', 'Airport Residential', 'Cantonments',
  'Adabraka', 'Dansoman', 'Achimota', 'Korle Bu', 'Tema',
  'Accra Central', 'Madina', 'Spintex', 'Teshie', 'Nungua',
  'Kaneshie', 'Dzorwulu', 'Abelemkpe', 'North Kaneshie', 'Ashaiman',
  'Kumasi', 'Takoradi', 'Cape Coast', 'Tamale', 'Ho', 'Sunyani',
] as const

// ── Ghana languages ──────────────────────────────────────────────────────
// Provider.languages values (Section 10 of the handoff) and the language
// filter on /facilities (RESULTS STATE). Also feeds the provider registration
// form's language multi-select (Section 10.4).
export const GHANA_LANGUAGES = [
  'English', 'Twi', 'Ga', 'Ewe', 'Hausa', 'Fante', 'Dagbani', 'Dagaare',
] as const