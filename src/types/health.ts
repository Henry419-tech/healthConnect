/* ================================================================
   src/types/health.ts
   Shared health & emergency types — used by both emergency/page.tsx
   and profile/ProfileContent.tsx.
   ================================================================ */

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  number: string;
  email?: string;
  isPrimary?: boolean;
  priority?: number;
}

export interface Allergy {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction?: string;
  notes?: string;
  isNoneConfirmed?: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  active: boolean;
  route?: string;
  indication?: string;
  prescribedBy?: string;
  pharmacy?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  isNoneConfirmed?: boolean;
}

export interface Condition {
  id: string;
  name: string;
  status: 'managed' | 'active' | 'resolved';
  since?: string;
  category?: string;
  diagnosedYear?: string;
  treatedBy?: string;
  notes?: string;
  isNoneConfirmed?: boolean;
}

export interface SavedFacility {
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

export interface FamilyMember {
  id: string;
  relation: string;
  conditions?: string;
  /**
   * True when the relation === 'Prefer not to share'. No DB column needed;
   * the reserved relation string is the sentinel. Derived at runtime.
   */
  preferNotToShare?: boolean;
}

/** Full NHIS card — used in ProfileContent (includes image URLs) */
export interface NhisCard {
  id: string;
  nhisId?: string;
  membershipType?: string;
  issuedDate?: string;
  expiryDate?: string;
  issuingBody?: string;
  notes?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
}

/**
 * Lightweight NHIS shape used on the Emergency page — no image URLs
 * needed there; maps to the same DB record via the API.
 */
export type NhisCardData = Omit<NhisCard, 'id' | 'frontImageUrl' | 'backImageUrl'>;

export interface HealthProfile {
  bloodType: string;
  age: number;
  weight: string;
  height: string;
  dob: string;
  memberSince: string;
  bmi?: number;
  gender?: string;
}

/** Minimal health data needed for emergency Medical ID display */
export interface HealthProfileData {
  bloodType?: string;
  allergies?: { name: string; severity: string }[];
  medications?: { name: string; dose?: string; active: boolean }[];
  conditions?: { name: string; status: string }[];
}

export interface NearbyFacility {
  name: string;
  distance?: string;
  lat?:      number;  
  lng?:      number;   
}