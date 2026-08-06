'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardLayout from '@/components/DashboardLayout';
import NotificationBell from '@/components/NotificationBell';
import { useRegisterNotifications } from '@/contexts/NotificationsContext';
import type { AppNotification } from '@/lib/notifications/types';
import FindCareToggle from '@/components/FindCareToggle';
import { trackActivity, activityTypes } from '@/lib/activityTracker';
import DashbordFooter from '@/components/DashboardFooter';
import { FACILITY_TYPE_OPTIONS, DEFAULT_FACILITY_TYPE_SLUGS, type FacilityTypeOption } from '@/lib/constants';
import { formatDistance } from '@/lib/utils';
import '@/styles/dashboard-header.css';
import '@/styles/dashboard.css';
import '@/styles/profile.css';
import '@/styles/facilities.css';
import '@/styles/facilities-mobile.css';
import '@/styles/dashboard-mobile.css';
import '@/styles/find-care-toggle.css';
import '@/styles/find-care-results.css';
import '@/styles/find-care-results-mobile.css';
import MobTabBar from '@/components/MobTabBar';
const MobTopbarMenu = dynamic(() => import('@/components/MobTopbarMenu'), { ssr: false });
import '@/styles/footer.css';
import { 
  Search, MapPin, Phone, Clock, Star, Heart, Hospital, Pill, 
  Stethoscope, Map, List, Locate, Navigation, AlertCircle, 
  Filter, ChevronDown, ChevronRight, Info, Loader2, RefreshCw, User,
  Check, X, Moon, Sun, Crosshair, Globe, Bookmark, BookmarkCheck,
  Syringe, Watch, Droplets, FileText,
  Smile, Eye, Ear, Microscope, Baby, Brain, Building2,
  ArrowLeft, MessageCircle, ExternalLink, PhoneCall
} from 'lucide-react';

/* ── Icon map for FACILITY_TYPE_OPTIONS.icon strings — mirrors /find-care/results ── */
const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Hospital, Stethoscope, Smile, Eye, Ear, Pill, Microscope, Baby, Brain, Building2,
};

// Type definitions
// `type` is one of the FACILITY_TYPE_OPTIONS slugs (hospital, clinic, dentist,
// eye_clinic, ent_clinic, pharmacy, laboratory, maternity, mental_health).
// rating/reviews/services/specializations/insurance were always fabricated
// placeholder data and have been removed; `nhis` replaces `insurance` with a
// real confirmed/likely/none signal derived from OSM tags (see detectNhis).
interface Facility {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  address: string;
  city: string;
  region: string;
  distance: number;
  phone: string;
  hours: string;
  coordinates: [number, number];
  emergencyServices: boolean;
  nhis: 'confirmed' | 'likely' | 'none';
  website?: string;
}

interface LocationInfo {
  city?: string;
  region?: string;
  country?: string;
  accuracy?: number;
}


// ── Opening-hours parser for common OSM formats ──────────────────
// Handles: "24/7", "Mo-Fr 08:00-17:00", "Mo-Sa 08:00-18:00; Su 09:00-13:00",
//           "08:00-17:00" (time-only), "Mo-Fr 08:00-17:00; PH off", etc.
const DAY_IDX: Record<string,number> = {
  mo:0, tu:1, we:2, th:3, fr:4, sa:5, su:6,
  mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6,
};
function parseOsmHours(raw: string): { label: string; isOpen: boolean; isUnknown?: boolean } {
  if (!raw || raw.trim() === '' || raw.toLowerCase() === 'call for hours') {
    return { label: 'Hours unknown', isOpen: false, isUnknown: true };
  }
  const norm = raw.trim().toLowerCase();
  if (norm === '24/7' || norm === 'always') return { label: 'Open 24/7', isOpen: true };

  const now = new Date();
  // Use Ghana time (UTC+0, no DST). getUTCHours gives UTC; Ghana is UTC+0.
  const dayOfWeek = now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1; // Mon=0 … Sun=6
  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();

  // Parse time string "HH:MM" → minutes
  const toMin = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };

  // Expand day-range "mo-fr" → [0,1,2,3,4]
  const expandDays = (spec: string): number[] => {
    spec = spec.trim();
    if (spec === 'ph' || spec === 'off') return [];
    const parts = spec.split(',').flatMap(seg => {
      seg = seg.trim();
      const dashIdx = seg.indexOf('-');
      if (dashIdx > 0) {
        const s = DAY_IDX[seg.slice(0, dashIdx).trim()];
        const e = DAY_IDX[seg.slice(dashIdx + 1).trim()];
        if (s == null || e == null) return [];
        const days: number[] = [];
        for (let d = s; d !== (e + 1) % 7; d = (d + 1) % 7) {
          days.push(d);
          if (d === e) break;
        }
        return days;
      }
      const d = DAY_IDX[seg];
      return d != null ? [d] : [];
    });
    return parts;
  };

  // Split on ";" into rules, evaluate each
  const rules = norm.split(';').map(r => r.trim()).filter(Boolean);
  for (const rule of rules) {
    if (rule === 'off' || rule === 'closed') continue;
    // time-only rule: "08:00-17:00"
    const timeOnly = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(rule);
    if (timeOnly) {
      const open = toMin(timeOnly[1]), close = toMin(timeOnly[2]);
      return minuteOfDay >= open && minuteOfDay < close
        ? { label: 'Open Now', isOpen: true }
        : { label: 'Closed', isOpen: false };
    }
    // day + time rule: "mo-fr 08:00-17:00" or "mo,sa 08:00-18:00"
    const dayTime = /^([a-z,\-\s]+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(rule);
    if (dayTime) {
      const days = expandDays(dayTime[1]);
      if (!days.includes(dayOfWeek)) continue;
      const open = toMin(dayTime[2]), close = toMin(dayTime[3]);
      if (minuteOfDay >= open && minuteOfDay < close) return { label: 'Open Now', isOpen: true };
      return { label: 'Closed', isOpen: false };
    }
  }
  return { label: 'Hours unknown', isOpen: false, isUnknown: true };
}

function getOpenStatus(hours: string, emergencyServices: boolean): { label: string; isOpen: boolean; isUnknown?: boolean } {
  if (emergencyServices) return { label: 'Open 24/7', isOpen: true };
  if (hours === '24/7') return { label: 'Open 24/7', isOpen: true };
  return parseOsmHours(hours);
}

// ── Shared facility-type + NHIS logic — ported from find-care/results ────
// so both BROWSE and RESULTS states classify OSM elements identically and
// /facilities can fully replace /find-care/results (Phase 1 parity target).

// Which FACILITY_TYPE_OPTIONS entry does this element's tags match?
function resolveFacilityType(tags: Record<string, string>): FacilityTypeOption | null {
  for (const t of FACILITY_TYPE_OPTIONS) {
    for (const tag of t.tags) {
      const val = tags[tag.key];
      if (!val) continue;
      if (tag.regex ? new RegExp(tag.value, 'i').test(val) : val === tag.value) return t;
    }
  }
  return null;
}

// NHIS acceptance isn't a standard OSM key. We surface what the data can
// actually support: an explicit insurance tag naming NHIS ("confirmed"),
// or a government/public operator ("likely" — Ghana's NHIS network is
// built on public facilities) — otherwise "none".
function detectNhis(tags: Record<string, string>): 'confirmed' | 'likely' | 'none' {
  const insuranceText = [tags.insurance, tags['healthcare:insurance'], tags['payment:nhis']]
    .filter(Boolean).join(' ').toLowerCase();
  if (insuranceText.includes('nhis')) return 'confirmed';

  const operatorText = [tags.operator, tags['operator:type']].filter(Boolean).join(' ').toLowerCase();
  if (
    operatorText.includes('government') || operatorText.includes('public') ||
    operatorText.includes('ghana health service') || operatorText.includes('municipal') ||
    operatorText.includes('district assembly')
  ) {
    return 'likely';
  }
  return 'none';
}

// Builds an Overpass QL query unioning every tag matcher for the given
// facility types — used by RESULTS STATE (ported from find-care/results).
function buildTypedOverpassQuery(types: FacilityTypeOption[], lat: number, lng: number, radiusM: number): string {
  const clauses: string[] = [];
  for (const t of types) {
    for (const tag of t.tags) {
      clauses.push(
        tag.regex
          ? `node["${tag.key}"~"${tag.value}",i](around:${radiusM},${lat},${lng});`
          : `node["${tag.key}"="${tag.value}"](around:${radiusM},${lat},${lng});`
      );
    }
  }
  return `[out:json][timeout:25];(${clauses.join('')});out center body;`;
}

// Normalizes Ghana numbers to a wa.me-friendly international format.
function toWhatsAppLink(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('233')) return `https://wa.me/${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `https://wa.me/233${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

// Dynamically import MapContainer
const MapContainer = dynamic(() => import('./MapContainer'), { 
  ssr: false,
  loading: () => (
    <div className="facility-finder-map loading-map">
      <div className="loading-map-content">
        <Loader2 size={32} className="spin" />
        <p>Loading map...</p>
      </div>
    </div>
  )
});

// Location Permission Banner Component
interface LocationPermissionBannerProps {
  onEnableLocation: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

const LocationPermissionBanner: React.FC<LocationPermissionBannerProps> = ({
  onEnableLocation,
  onDismiss,
  isLoading = false
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          onDismiss();
          return;
        }
        setTimeout(() => setIsVisible(true), 500);
        result.addEventListener('change', () => {
          if (result.state === 'granted') {
            setIsVisible(false);
            setTimeout(() => onDismiss(), 300);
          }
        });
      }).catch(() => { setTimeout(() => setIsVisible(true), 500); });
    } else {
      setTimeout(() => setIsVisible(true), 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300);
  };

  if (!isVisible) return null;

  return (
    <div className="lba">
      {/* Decorative bg */}
      <div className="lba__bg-rings" aria-hidden="true">
        <span className="lba__ring lba__ring--1" />
        <span className="lba__ring lba__ring--2" />
        <span className="lba__ring lba__ring--3" />
      </div>
      <div className="lba__glow" aria-hidden="true" />

      {/* Close */}
      <button className="lba__close" onClick={handleDismiss} aria-label="Dismiss" type="button">
        <X size={14} />
      </button>

      <div className="lba__inner">
        {/* ── Left content ── */}
        <div className="lba__content">
          {/* Header */}
          <div className="lba__head">
            <div className="lba__icon-wrap">
              <MapPin size={24} />
            </div>
            <div>
              <div className="lba__eyebrow">Location access</div>
              <h3 className="lba__title">Find care near you</h3>
              <p className="lba__sub">
                See hospitals, clinics and pharmacies within walking or driving distance.
              </p>
            </div>
          </div>

          {/* Benefit chips */}
          <div className="lba__benefits">
            {([
              { icon: <Sun size={12} />,        text: 'Accurate distances' },
              { icon: <MapPin size={12} />,      text: 'Nearby facilities'  },
              { icon: <Check size={12} />,       text: 'Real-time results'  },
              { icon: <Phone size={12} />,       text: 'Emergency services' },
            ] as { icon: React.ReactNode; text: string }[]).map(({ icon, text }) => (
              <span key={text} className="lba__chip">{icon}{text}</span>
            ))}
          </div>

          {/* Actions */}
          <div className="lba__actions">
            <button
              className="lba__btn-primary"
              onClick={onEnableLocation}
              disabled={isLoading}
              type="button"
            >
              {isLoading
                ? <><Loader2 size={15} className="spin" />Locating…</>
                : <><Crosshair size={15} />Enable GPS</>}
            </button>
            <button
              className="lba__btn-ghost"
              onClick={handleDismiss}
              disabled={isLoading}
              type="button"
            >
              Maybe later
            </button>
          </div>
        </div>

        {/* ── Right visual panel ── */}
        <div className="lba__visual" aria-hidden="true">
          <svg className="lba__map-svg" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grid */}
            {[40,80,120].map(v => (
              <g key={v}>
                <line x1="0" y1={v} x2="160" y2={v} stroke="var(--lba-grid)" strokeWidth="1"/>
                <line x1={v} y1="0" x2={v} y2="160" stroke="var(--lba-grid)" strokeWidth="1"/>
              </g>
            ))}
            {/* Roads */}
            <path d="M0 75 Q40 70 80 80 Q120 90 160 82" stroke="var(--lba-road-main)" strokeWidth="3" strokeLinecap="round"/>
            <path d="M0 110 Q60 105 80 80 Q95 62 160 58" stroke="var(--lba-road-sec)" strokeWidth="2" strokeLinecap="round"/>
            <path d="M65 0 Q72 40 80 80 Q88 118 92 160" stroke="var(--lba-road-sec)" strokeWidth="2" strokeLinecap="round"/>
            {/* Blocks */}
            {([
              [10,50,22,16],[38,30,18,22],[96,48,24,18],[126,30,20,28],
              [10,120,28,18],[100,95,20,22],[128,90,24,30]
            ] as number[][]).map(([x,y,w,h],i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx="3"
                fill="var(--lba-block-fill)" stroke="var(--lba-block-stroke)" strokeWidth="0.8"/>
            ))}
            {/* Ping rings */}
            <circle cx="80" cy="80" r="6" fill="none" stroke="var(--lba-ping)" strokeWidth="1">
              <animate attributeName="r" values="6;24" dur="2.2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0" dur="2.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="80" cy="80" r="6" fill="none" stroke="var(--lba-ping)" strokeWidth="1.5">
              <animate attributeName="r" values="6;16" dur="2.2s" begin="0.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.7;0" dur="2.2s" begin="0.6s" repeatCount="indefinite"/>
            </circle>
            {/* Center dot */}
            <circle cx="80" cy="80" r="5" fill="var(--lba-dot)"/>
            <circle cx="80" cy="80" r="2.5" fill="#fff"/>
            {/* Blur overlay with question mark */}
            <circle cx="80" cy="80" r="36" fill="var(--lba-overlay)"/>
            <text x="80" y="89" textAnchor="middle"
              fontFamily="Outfit,sans-serif" fontSize="30" fontWeight="700"
              fill="var(--lba-question)">?</text>
          </svg>
        </div>
      </div>
    </div>
  );
};

// Location Confirmation Component
interface LocationConfirmationProps {
  location: [number, number];
  locationInfo?: LocationInfo;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const LocationConfirmation: React.FC<LocationConfirmationProps> = ({
  location,
  locationInfo,
  onRefresh,
  isRefreshing
}) => {
  const isGps  = locationInfo?.accuracy != null && locationInfo.accuracy < 100;
  const isGood = locationInfo?.accuracy != null && locationInfo.accuracy < 2000;
  // Logarithmic bar: maps real GPS range (1m–50000m) to 0–100%
  // log(1)=0 → 100%, log(50000)≈10.8 → 0%
  const barPct = locationInfo?.accuracy
    ? Math.max(4, Math.min(100, Math.round(100 - (Math.log(locationInfo.accuracy) / Math.log(50000)) * 100)))
    : 55;
  // Signal bars 1–4 derived from bar percentage
  const sigBars = Math.max(1, Math.min(4, Math.ceil(barPct / 25)));

  const cityLabel = locationInfo?.city && locationInfo?.region
    ? `${locationInfo.city}, ${locationInfo.region}`
    : null;
  const coordLabel = `${Math.abs(location[0]).toFixed(4)}° ${location[0] >= 0 ? 'N' : 'S'}, ${Math.abs(location[1]).toFixed(4)}° ${location[1] >= 0 ? 'E' : 'W'}`;

  return (
    <div className={`loc-card${isGood ? '' : ' loc-card--weak'}`}>
      {/* Radar rings */}
      <div className="loc-card__rings" aria-hidden="true">
        <span className="loc-card__ring" />
        <span className="loc-card__ring" />
        <span className="loc-card__ring" />
      </div>
      {/* Ambient glow blob */}
      <div className="loc-card__blob" aria-hidden="true" />

      {/* Pin icon with live dot */}
      <div className="loc-card__pin" aria-hidden="true">
        <MapPin size={22} />
        <span className="loc-card__live-dot" />
      </div>

      {/* Body */}
      <div className="loc-card__body">
        <div className="loc-card__status">
          <span className="loc-card__status-dot" />
          Location locked
        </div>
        <p className="loc-card__city">
          {cityLabel ?? coordLabel}
        </p>
        <p className="loc-card__coords">{coordLabel}</p>

        {/* Accuracy row */}
        <div className="loc-card__acc-row">
          <span className="loc-card__acc-label">Accuracy</span>
          <div className="loc-card__acc-track">
            <span
              className={`loc-card__acc-fill${isGood ? '' : ' loc-card__acc-fill--weak'}`}
              style={{ width: `${barPct}%` }}
            />
          </div>
          {locationInfo?.accuracy && (
            <span className={`loc-card__acc-val${isGood ? '' : ' loc-card__acc-val--weak'}`}>
              ±{Math.round(locationInfo.accuracy)}m
            </span>
          )}
          {/* Signal strength bars */}
          <div className="loc-card__signal" aria-label={`Signal: ${sigBars} of 4 bars`}>
            {[1,2,3,4].map(b => (
              <span key={b} className={`loc-card__sig-bar loc-card__sig-bar--${b}${b <= sigBars ? ' active' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="loc-card__actions">
        <span className="loc-card__method">{isGps ? 'GPS' : 'Network'}</span>
        <button
          className="loc-card__refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          type="button"
          aria-label="Refresh location"
        >
          <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
          <span>{isRefreshing ? 'Updating…' : 'Refresh'}</span>
        </button>
      </div>
    </div>
  );
};


// ── Module-level helper: estimate Ghana region from coordinates ─
// Defined outside the component so it can be referenced by
// reverseGeocode (useCallback) without hoisting issues.
function getGhanaRegionFromCoordinates(lat: number, lng: number): LocationInfo {
  if (lat >= 5.5 && lat <= 5.7 && lng >= -0.3 && lng <= 0.0)
    return { city: 'Accra', region: 'Greater Accra', country: 'Ghana' };
  if (lat >= 6.6 && lat <= 6.8 && lng >= -1.7 && lng <= -1.5)
    return { city: 'Kumasi', region: 'Ashanti', country: 'Ghana' };
  if (lat >= 9.3 && lat <= 9.5 && lng >= -1.0 && lng <= -0.8)
    return { city: 'Tamale', region: 'Northern', country: 'Ghana' };
  if (lat >= 5.0 && lat <= 5.2 && lng >= -2.0 && lng <= -1.8)
    return { city: 'Takoradi', region: 'Western', country: 'Ghana' };
  if (lat >= 4.8 && lat <= 5.2 && lng >= -0.3 && lng <= 0.2)
    return { city: 'Tema', region: 'Greater Accra', country: 'Ghana' };
  if (lat >= 5.5 && lat <= 6.8 && lng >= -2.0 && lng <= 0.0)
    return { city: 'Unknown', region: 'Central Region', country: 'Ghana' };
  if (lat >= 6.8 && lat <= 8.5 && lng >= -2.5 && lng <= 0.5)
    return { city: 'Unknown', region: 'Ashanti/Brong-Ahafo', country: 'Ghana' };
  if (lat >= 8.5 && lat <= 11.2)
    return { city: 'Unknown', region: 'Northern Ghana', country: 'Ghana' };
  if (lat >= 4.5 && lat <= 5.5)
    return { city: 'Unknown', region: 'Southern Ghana', country: 'Ghana' };
  return { city: 'Unknown', region: 'Ghana', country: 'Ghana' };
}

// ── Saved Facilities Bar Component ──────────────────────────────
interface SavedFacilitiesBarProps {
  savedIds: Set<string>;
  facilities: Facility[];
  onSelect: (f: Facility) => void;
  onUnsave: (f: Facility) => void;
  onGetDirections: (f: Facility) => void;
}

const SavedFacilitiesBar: React.FC<SavedFacilitiesBarProps> = ({
  savedIds, facilities, onSelect, onUnsave, onGetDirections
}) => {
  const saved = facilities.filter(f => savedIds.has(f.id));
  if (saved.length === 0) return null;

  return (
    <div className="saved-facilities-bar">
      <div className="saved-facilities-bar__header">
        <BookmarkCheck size={16} className="saved-facilities-bar__icon" />
        <span className="saved-facilities-bar__title">Saved Facilities</span>
        <span className="saved-facilities-bar__count">{saved.length}</span>
      </div>
      <div className="saved-facilities-bar__scroll">
        {saved.map(facility => (
          <div
            key={facility.id}
            className="saved-facility-chip"
            onClick={() => onSelect(facility)}
          >
            <div className={`saved-chip__dot saved-chip__dot--${facility.type}`} />
            <div className="saved-chip__info">
              <span className="saved-chip__name">{facility.name}</span>
              <span className="saved-chip__meta">{facility.distance.toFixed(1)} km · {facility.typeLabel}</span>
            </div>
            <div className="saved-chip__actions">
              <button
                className="saved-chip__btn saved-chip__btn--dir"
                onClick={e => { e.stopPropagation(); onGetDirections(facility); }}
                title="Get directions"
                type="button"
              >
                <Navigation size={13} />
              </button>
              <button
                className="saved-chip__btn saved-chip__btn--remove"
                onClick={e => { e.stopPropagation(); onUnsave(facility); }}
                title="Remove"
                type="button"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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

function DynamicFacilityFinderInner() {
  // Component will export at the end
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  const searchParams = useSearchParams();

  // ── RESULTS STATE detection ──────────────────────────────────────
  // Landed via a /find-care symptom/type search (?type=&lat=&lng=) or the
  // dashboard's NHIS-facilities link (?nhis=true, no type, maybe no
  // lat/lng if GPS wasn't granted yet) → header morphs into the filtered-
  // results header and this becomes the sole replacement for
  // /find-care/results. Landed on bare /facilities (bottom nav) → none of
  // these params are present → BROWSE STATE, unchanged.
  const [isResultsMode] = useState(() =>
    !!(searchParams?.get('type') || searchParams?.get('nhis') ||
       (searchParams?.get('lat') && searchParams?.get('lng')))
  );
  const [resultsSeed] = useState(() => ({
    lat: parseFloat(searchParams?.get('lat') ?? ''),
    lng: parseFloat(searchParams?.get('lng') ?? ''),
    // GPS accuracy (metres) of the fix find-care used to build this URL.
    // find-care only takes a single getCurrentPosition() reading — often
    // the least accurate fix a device returns, since the chipset hasn't
    // converged yet — so a coarse fix here can genuinely place the user
    // outside a real facility's radius. NaN when absent (older links,
    // dashboard's NHIS link) so the missing-accuracy branch below always
    // treats it as "coarse, refine to be safe" rather than silently
    // trusting an unknown fix.
    acc:  parseFloat(searchParams?.get('acc')  ?? ''),
    nhis: searchParams?.get('nhis') === 'true',
  }));

  // RESULTS STATE back navigation — same ?from= pattern as
  // dashboard/activities: honor an explicit ?from= (set by /find-care and
  // /emergency, the two entry points into RESULTS STATE) so the user lands
  // back where they actually started, not always /find-care. Falls back to
  // browser history, then /find-care as the last resort (e.g. deep link).
  const handleResultsBack = useCallback(() => {
    const from = searchParams?.get('from');
    if (from) {
      router.push(from);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/find-care');
    }
  }, [router, searchParams]);

  // Desktop-only label text for the button above — mobile uses the
  // results title instead (see mob-topbar__title), so this doesn't need
  // to be shown there.
  const RESULTS_BACK_LABELS: Record<string, string> = {
    '/find-care': 'Back to Find Care',
    '/emergency': 'Back to Emergency',
  };
  const resultsBackLabel = RESULTS_BACK_LABELS[searchParams?.get('from') ?? ''] ?? 'Back to Find Care';

  // State management — seed search from ?q= URL param if present
  const [searchQuery, setSearchQuery] = useState(() => searchParams?.get('q') ?? '');
  const [searchActive, setSearchActive] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState(() => searchParams?.get('type') ?? 'all');
  // RESULTS STATE defaults to a 15km radius (parity with find-care/results);
  // BROWSE STATE keeps its existing 10km default.
  const [selectedRadius, setSelectedRadius] = useState(() => isResultsMode ? '15000' : '10000');
  // ── RESULTS-STATE-only filters (ported from find-care/results) ──────
  const [nhisOnly, setNhisOnly] = useState(() => resultsSeed.nhis);
  const [districtQuery, setDistrictQuery] = useState('');
  // filteredFacilities (below) feeds MapContainer's facilities prop, which
  // tears down and rebuilds every marker on change — debounce the two
  // free-text inputs that drive it so fast typing doesn't rebuild the
  // (up to 100) markers on every keystroke. The input fields themselves
  // stay bound to the instant searchQuery/districtQuery state so typing
  // still feels responsive; only the expensive downstream filter/map
  // update waits for a pause.
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [debouncedDistrictQuery, setDebouncedDistrictQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDistrictQuery(districtQuery), 300);
    return () => clearTimeout(t);
  }, [districtQuery]);
  const [sortBy, setSortBy] = useState('distance');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  // Separate from selectedFacility — persists after modal closes so map stays focused
  const [mapFocusFacility, setMapFocusFacility] = useState<Facility | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | undefined>();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  // Results mode kicks off a fetch immediately on mount ONLY when the URL
  // already carries lat/lng (find-care already had GPS granted). In that
  // case seed this true so the first paint shows the loading pill instead
  // of a flash of the "No matches yet" empty state (see isLoadingFacilities
  // seeding note below for the full explanation). When coords are absent,
  // the mount effect calls getCurrentLocation() instead — which only
  // starts a fetch once GPS resolves — so seeding true here would instead
  // leave the pill stuck on "Looking for care near you…" forever if the
  // user denies the permission prompt. isLoadingLocation (not this flag)
  // already covers that in-between waiting period.
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(
    isResultsMode && !Number.isNaN(resultsSeed.lat) && !Number.isNaN(resultsSeed.lng)
  );
  // True for the life of the silent GPS-accuracy-refinement watch kicked
  // off by getCurrentLocation() when the first fix is coarse (>500m). A
  // fetch already resolved against that coarse fix can look like a
  // complete, trustworthy answer (zero results = "not found") even though
  // a better coordinate -- and possibly a different answer -- is already
  // known to be on the way. isLoadingOrRefining below folds this into
  // every place that decides whether to show a *final* empty state, so
  // "not found" is never shown and then silently reversed once
  // refinement lands.
  const [isRefiningLocation, setIsRefiningLocation] = useState(false);
  // Single source of truth for "don't show a final answer yet" -- use
  // this, not isLoadingFacilities directly, anywhere that decides whether
  // to render a definitive empty/no-results state.
  const isLoadingOrRefining = isLoadingFacilities || isRefiningLocation;
  const [isFromCache, setIsFromCache] = useState(false); // true while showing cached data during bg refresh
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationBanner, setShowLocationBanner] = useState(true);
  const [savedFacilityIds, setSavedFacilityIds] = useState<Set<string>>(new Set());
  const [isSavingFacility, setIsSavingFacility] = useState(false);

  // Ref for smooth scrolling
  const mapViewRef       = useRef<HTMLDivElement>(null);
  // Scroll target for the auto-scroll-on-first-results behaviour below —
  // this is the search bar + filter chips section specifically, not the
  // map further down, so the landed view matches "search bar right below
  // the top bar, map visible beneath it" rather than jumping past the
  // search/filter controls entirely.
  const searchControlsRef = useRef<HTMLDivElement>(null);
  const hasScrolledToResultsRef = useRef(false);
  // True once MapContainer's onReady fires — i.e. markers are actually
  // placed, not just that `facilities` has data. MapContainer is a
  // client-only, dynamically-loaded component with its own Leaflet init
  // sequence, decoupled from the Overpass fetch — `facilities` can be
  // populated (isLoadingFacilities already false) while the map itself is
  // still setting up, so this is the signal that closes that gap.
  const [mapReady, setMapReady] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false); // prevents double-fetch from radius effect + location

  // Cancel any in-flight Overpass fetch on unmount
  useEffect(() => { return () => { fetchAbortRef.current?.abort(); }; }, []);

  // ── localStorage cache helpers ────────────────────────────────
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  const getCacheKey = useCallback((lat: number, lng: number, radius: number) => {
    // Round to ~500m grid so nearby positions reuse the same cache entry
    const rLat = Math.round(lat * 200) / 200;
    const rLng = Math.round(lng * 200) / 200;
    return `hc_fac_${rLat}_${rLng}_${radius}`;
  }, []);

  const readCache = useCallback((lat: number, lng: number, radius: number): Facility[] | null => {
    try {
      const key = getCacheKey(lat, lng, radius);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { facilities, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
      return facilities as Facility[];
    } catch { return null; }
  }, [getCacheKey]);

  const writeCache = useCallback((lat: number, lng: number, radius: number, facilities: Facility[]) => {
    try {
      const key = getCacheKey(lat, lng, radius);
      localStorage.setItem(key, JSON.stringify({ facilities, ts: Date.now() }));
    } catch { /* storage full — silently ignore */ }
  }, [getCacheKey]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    localStorage.setItem('facilityFinderDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // On mount: seed from ?q= and/or ?type= URL params, then clean the URL.
  useEffect(() => {
    const q    = searchParams?.get('q')    ?? null;
    const type = searchParams?.get('type') ?? null;
    if (q || type) {
      window.history.replaceState({}, '', '/facilities');
      if (q)    { setSearchQuery(q); setSearchDropdownOpen(true); }
      if (type) setSelectedType(type);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // RESULTS STATE: seed location directly from the URL's lat/lng when
  // present (find-care already had GPS granted before navigating here —
  // full parity with find-care/results' urlLat/urlLng fast path, never
  // re-requesting GPS in that case). When coordinates are absent (e.g. the
  // dashboard's NHIS link before GPS is granted), auto-request location
  // immediately instead of waiting for a banner click — find-care/results
  // does the same (its `requestLocation()` fires as soon as status is
  // 'unset', not gated behind a click).
  useEffect(() => {
    if (!isResultsMode) return;
    setShowLocationBanner(false);
    if (!Number.isNaN(resultsSeed.lat) && !Number.isNaN(resultsSeed.lng)) {
      setUserLocation([resultsSeed.lat, resultsSeed.lng]);
      setLocationPermission('granted');
      isFetchingRef.current = false;
      fetchNearbyFacilities(resultsSeed.lat, resultsSeed.lng, parseInt(selectedRadius));
      // find-care's fix was a single getCurrentPosition() reading — treat
      // an unknown accuracy (older links) the same as a coarse one, since
      // there's no basis to trust it as final either way.
      startAccuracyRefinement(Number.isNaN(resultsSeed.acc) ? Infinity : resultsSeed.acc, parseInt(selectedRadius));
    } else {
      getCurrentLocation(); // resolves GPS itself, then fetches — see getCurrentLocation
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll once results are actually ready — lands the search/filter
  // bar just below the top bar with the map/list visible beneath it,
  // rather than leaving the page wherever it happened to be scrolled
  // (typically still up at the now-empty hero/back-button area). Fires
  // exactly once per page load: covers BOTH ways this page starts —
  // the URL-seeded fast path above (find-care already had GPS granted)
  // and the slower GPS-resolves-here path inside getCurrentLocation —
  // since both eventually converge on isLoadingFacilities flipping to
  // false with userLocation set. Guarded so it never re-fires on later
  // radius/type/filter changes, which shouldn't yank the viewport.
  //
  // Also waits for mapReady when viewMode is 'map' (the default): the
  // Overpass fetch finishing (isLoadingFacilities → false) only means the
  // *data* exists, not that the map has actually placed markers for it —
  // MapContainer loads and initializes Leaflet on its own, separate
  // timeline. Without this, the scroll could fire and reveal a map that's
  // still mid-setup, which is the "scroll happens before the facility is
  // generated" bug — the whole point of scrolling down is to hand control
  // back once there's something real to look at.
  useEffect(() => {
    if (hasScrolledToResultsRef.current) return;
    if (isLoadingFacilities || !userLocation) return;
    if (viewMode === 'map' && !mapReady) return;
    hasScrolledToResultsRef.current = true;
    const timer = setTimeout(() => {
      searchControlsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(timer);
  }, [isLoadingFacilities, userLocation, viewMode, mapReady]);

  // RESULTS STATE: re-run the type-scoped Overpass query when the type
  // filter changes after the initial load (handled above / by
  // getCurrentLocation). Uses whichever userLocation is current, whether it
  // came from the URL seed or GPS.
  const isFirstTypeRender = useRef(true);
  useEffect(() => {
    if (!isResultsMode) return;
    if (isFirstTypeRender.current) { isFirstTypeRender.current = false; return; }
    if (!userLocation) return;
    isFetchingRef.current = false;
    fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  // RESULTS STATE: change the type filter with the loading flag flipped in
  // the SAME state update, not one tick later. `filteredFacilities` (below)
  // filters `facilities` by `f.type === selectedType` client-side — so the
  // instant selectedType changes, that memo re-evaluates against whatever
  // `facilities` currently holds, which is still the PREVIOUS type's data
  // (the new type-scoped fetch hasn't run yet; it's kicked off by the
  // effect above, which only fires *after* this render commits and paints).
  // Old-type facilities all fail `f.type === selectedType` against the new
  // type, so filteredFacilities briefly goes to zero — and since
  // isLoadingFacilities was still false from the previous, already-settled
  // search, isLoadingOrRefining was false too, so that single render
  // painted a real "No {type} found" (list pill, map popup, and results
  // count) before the effect above even started fetching. Plain
  // setSelectedType(slug) hits this on every type-pill tap. Batching
  // setIsLoadingFacilities(true) into the same event handler closes the
  // gap: isLoadingOrRefining is already true by the time this render's
  // filteredFacilities would've been zero, so the loading pill shows
  // instead — exactly like a fresh search, which this effectively is.
  // BROWSE STATE deliberately skipped: it has every type pre-loaded and
  // never refetches on a type change (see the effect above), so forcing
  // a loading flag there would show a pill nothing ever clears.
  const selectResultsType = useCallback((slug: string) => {
    if (isResultsMode) setIsLoadingFacilities(true);
    setSelectedType(slug);
  }, [isResultsMode]);

  // On mount: if geolocation permission is already granted, auto-fetch without showing banner
  // (BROWSE STATE only — RESULTS STATE already has its location from the URL)
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (isResultsMode) return;
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setLocationPermission(result.state as 'granted' | 'prompt' | 'denied');
      result.onchange = () => setLocationPermission(result.state as 'granted' | 'prompt' | 'denied');
      if (result.state === 'granted') {
        setShowLocationBanner(false);
        getCurrentLocation();
      }
    }).catch(() => { setLocationPermission('unknown'); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isResultsMode]);

  // Auto switch to map view when location is obtained (only on first location get)
  const hasAutoSwitchedRef = useRef(false);
  useEffect(() => {
    if (userLocation && viewMode === 'list' && !hasAutoSwitchedRef.current) {
      setViewMode('map');
      hasAutoSwitchedRef.current = true;
    }
  }, [userLocation, viewMode]);
  
  // Load saved facility IDs on mount
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/saved-facilities')
      .then(r => r.json())
      .then(({ facilities }) => {
        if (Array.isArray(facilities)) {
          setSavedFacilityIds(new Set(facilities.map((f: any) => f.facilityId)));
        }
      })
      .catch(() => {});
  }, [status]);

  // Per-facility in-flight tracking (not a global lock)
  const savingInFlightRef = useRef<Set<string>>(new Set());

  const toggleSaveFacility = useCallback(async (facility: Facility) => {
    if (savingInFlightRef.current.has(facility.id)) return;
    savingInFlightRef.current.add(facility.id);
    setIsSavingFacility(true);

    const alreadySaved = savedFacilityIds.has(facility.id);

    // Optimistic update
    setSavedFacilityIds(prev => {
      const n = new Set(prev);
      alreadySaved ? n.delete(facility.id) : n.add(facility.id);
      return n;
    });

    try {
      if (alreadySaved) {
        const res = await fetch('/api/saved-facilities', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facilityId: facility.id }),
        });
        if (!res.ok) throw new Error('Delete failed');
      } else {
        const res = await fetch('/api/saved-facilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facilityId:       facility.id,
            name:             facility.name,
            type:             facility.type,
            address:          facility.address,
            city:             facility.city,
            region:           facility.region,
            phone:            facility.phone,
            hours:            facility.hours,
            website:          facility.website,
            emergencyServices:facility.emergencyServices,
            latitude:         facility.coordinates[0],
            longitude:        facility.coordinates[1],
            distance:         facility.distance,
          }),
        });
        if (!res.ok) throw new Error('Save failed');
      }
    } catch (e) {
      // Roll back optimistic update on failure
      setSavedFacilityIds(prev => {
        const n = new Set(prev);
        alreadySaved ? n.add(facility.id) : n.delete(facility.id);
        return n;
      });
      setError('Could not save facility. Please try again.');
      console.error('Save facility error:', e);
    } finally {
      savingInFlightRef.current.delete(facility.id);
      setIsSavingFacility(savingInFlightRef.current.size > 0);
    }
  }, [savedFacilityIds]);

  const getFacilityIconComponent = useCallback((type: string) => {
    const opt = FACILITY_TYPE_OPTIONS.find(t => t.slug === type);
    return (opt && TYPE_ICONS[opt.icon]) || Building2;
  }, []);

  // Handle facility selection with tracking
  const handleFacilitySelect = useCallback(async (facility: Facility) => {
    setSelectedFacility(facility);
    setMapFocusFacility(facility); // persists after modal closes
    // Switch to map view and close search dropdown so the pin is visible
    setViewMode('map');
    setSearchDropdownOpen(false);
    setSearchQuery('');

    // Track this activity
    try {
      await trackActivity(
        activityTypes.FACILITY_FOUND,
        `Found ${facility.name}`,
        `${facility.typeLabel} • ${facility.distance.toFixed(1)} km away`,
        {
          facilityId: facility.id,
          facilityName: facility.name,
          facilityType: facility.type,
          type: facility.type,
          lat: facility.coordinates[0],
          lng: facility.coordinates[1],
          distance: facility.distance,
          city: facility.city,
          region: facility.region,
          emergencyServices: facility.emergencyServices
        }
      );
    } catch (error) {
      console.error('Failed to track facility selection:', error);
    }
  }, []);

  const getDirections = useCallback((facility: Facility) => {
    const [facLat, facLng] = facility.coordinates;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      // Apple Maps — opens natively in iOS
      const dest = `${facLat},${facLng}`;
      const url = userLocation
        ? `maps://maps.apple.com/?saddr=${userLocation[0]},${userLocation[1]}&daddr=${dest}&dirflg=d`
        : `maps://maps.apple.com/?daddr=${dest}`;
      // Try Apple Maps first, fall back to Google Maps if scheme unavailable
      const fallback = () => {
        const gUrl = userLocation
          ? `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${facLat},${facLng}`
          : `https://www.google.com/maps/search/${facLat},${facLng}`;
        window.open(gUrl, '_blank');
      };
      const a = document.createElement('a');
      a.href = url;
      try { a.click(); } catch { fallback(); }
    } else {
      const gUrl = userLocation
        ? `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${facLat},${facLng}`
        : `https://www.google.com/maps/search/${facLat},${facLng}`;
      window.open(gUrl, '_blank');
    }
  }, [userLocation]);

  // Calculate distance
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

// Reverse geocode to get location name
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<LocationInfo> => {
    try {
      // Use our Next.js API route to avoid CORS issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `/api/geocode?lat=${lat}&lon=${lng}`,
        {
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return {
          city: data.city,
          region: data.region,
          country: data.country
        };
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.warn('Reverse geocoding failed, using coordinate estimation:', error);
      }
    }
    
    // Fallback: Try to determine location from coordinates (Ghana regions approximation)
    return getGhanaRegionFromCoordinates(lat, lng);
  }, []);

  // Fetch facilities
  const fetchNearbyFacilities = useCallback(async (lat: number, lng: number, radius: number = 10000, resolvedLocation?: LocationInfo) => {
    // Guard against concurrent fetches (e.g. radius effect + location effect
    // firing together). Checked BEFORE touching fetchAbortRef: callers that
    // want to force a supersede (radius change, retry buttons, etc.) reset
    // isFetchingRef.current = false themselves right before calling, so
    // they still get through this check. If we instead created a new
    // AbortController and reassigned fetchAbortRef.current first (as this
    // used to do) and only checked the guard afterwards, a bail-out call
    // would leave fetchAbortRef pointing at a controller nothing ever used
    // — orphaning whatever controller the still-in-flight call is actually
    // using. On unmount, the cleanup effect aborts via fetchAbortRef, so it
    // would abort that unused controller instead of the real one, and the
    // genuinely in-flight fetch would keep running (and could still call
    // setState) after the component is gone.
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Abort any in-flight request before starting a new one
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    // ── Show cached results instantly while fresh data loads ──────
    // RESULTS STATE queries are type-scoped (hospital-only, dentist-only,
    // etc.) but the cache key is only lat/lng/radius — reusing it across
    // modes/types would serve a stale, incomplete subset. BROWSE STATE
    // caching is unchanged. (find-care/results itself has no caching.)
    const cached = isResultsMode ? null : readCache(lat, lng, radius);
    if (cached && cached.length > 0) {
      setFacilities(cached);
      setIsFromCache(true);
    }

    setIsLoadingFacilities(true);
    setError(null);

    try {
      let allFacilities: Facility[] = [];

      // RESULTS STATE: types come from the FACILITY_TYPE_OPTIONS-driven
      // selectedType filter ('all' → the default hospital/clinic/pharmacy
      // set, matching find-care/results' typeSlug === '' behaviour).
      const activeTypes: FacilityTypeOption[] = isResultsMode
        ? (selectedType !== 'all'
            ? FACILITY_TYPE_OPTIONS.filter(t => t.slug === selectedType)
            : FACILITY_TYPE_OPTIONS.filter(t => (DEFAULT_FACILITY_TYPE_SLUGS as readonly string[]).includes(t.slug)))
        : FACILITY_TYPE_OPTIONS;

      // Fetch from Overpass API (OpenStreetMap)
      try {
        // RESULTS STATE — ported query-builder from find-care/results, driven
        // by FACILITY_TYPE_OPTIONS so it correctly handles regex specialty tags
        // (ENT/maternity/mental-health). BROWSE STATE keeps its own broader,
        // hand-tuned amenity list (nwr = node|way|relation; out center body
        // gives coords for ways/relations too) plus shop=optician so eye-care
        // facilities can now be classified into the eye_clinic slug.
        const overpassQuery = isResultsMode
          ? buildTypedOverpassQuery(activeTypes, lat, lng, radius)
          : `
          [out:json][timeout:60];
          (
            nwr["amenity"="hospital"](around:${radius},${lat},${lng});
            nwr["amenity"="clinic"](around:${radius},${lat},${lng});
            nwr["amenity"="pharmacy"](around:${radius},${lat},${lng});
            nwr["amenity"="doctors"](around:${radius},${lat},${lng});
            nwr["amenity"="dentist"](around:${radius},${lat},${lng});
            nwr["amenity"="laboratory"](around:${radius},${lat},${lng});
            nwr["amenity"="nursing_home"](around:${radius},${lat},${lng});
            nwr["amenity"="social_facility"]["social_facility"="nursing_home"](around:${radius},${lat},${lng});
            nwr["shop"="optician"](around:${radius},${lat},${lng});
            nwr["healthcare"](around:${radius},${lat},${lng});
            nwr["healthcare:speciality"](around:${radius},${lat},${lng});
          );
          out center body;
        `;

        const DIRECT_MIRRORS = [
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
          'https://overpass.openstreetmap.ru/api/interpreter',
        ];

        // Wraps fetch() with its OWN hard deadline (via a local
        // AbortController) while still honoring the outer `controller`
        // (the one that cancels this whole fetchNearbyFacilities call on
        // unmount/a newer search). Neither the proxy call nor the direct-
        // mirror fallback below used to have any timeout at all — if a
        // connection just hung instead of failing outright, the browser's
        // own default TCP/HTTP timeout (which can be minutes, not
        // seconds) was the only thing that would ever move things along.
        // That compounded with the old sequential-mirror server route to
        // produce the multi-minute waits this used to have.
        const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
          const localController = new AbortController();
          const onOuterAbort = () => localController.abort();
          controller.signal.addEventListener('abort', onOuterAbort);
          const timer = setTimeout(() => localController.abort(), timeoutMs);
          try {
            return await fetch(url, { ...options, signal: localController.signal });
          } finally {
            clearTimeout(timer);
            controller.signal.removeEventListener('abort', onOuterAbort);
          }
        };

        const fetchWithRetry = async (): Promise<any> => {
          // ── 1. Always try the server-side proxy first ──────────────
          // It already races all 5 mirrors internally now (see
          // /api/overpass/route.ts), bounded to ~22s worst case — this
          // just gives it a little headroom above that instead of no
          // ceiling at all.
          try {
            const proxyResp = await fetchWithTimeout('/api/overpass', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: overpassQuery }),
            }, 28_000);
            if (proxyResp.ok) {
              const data = await proxyResp.json();
              // Only treat as success if we actually got elements array
              // (could be empty array [] which is valid — just no facilities nearby)
              if (data && Array.isArray(data.elements)) return data;
              // data.error means the proxy itself reported all mirrors failed
              if (data?.error) {
                console.warn('[facilities] proxy returned error:', data.error);
                // fall through to direct mirrors
              }
            }
          } catch (e: any) {
            if (controller.signal.aborted) throw e; // real cancellation — stop entirely
            // otherwise: our own 28s timeout, or a network error — fall through
          }

          // ── 2. Browser direct fallback ──────────────────────────────
          // Last resort if the proxy's own 5-mirror race came back empty
          // — covers the case where the SERVER's outbound network
          // specifically is the problem (e.g. its IP got rate-limited)
          // even though the user's own connection is fine. Kept lean —
          // one attempt per mirror, hard-timed — since the proxy already
          // did the thorough retrying; this doesn't need to repeat that.
          for (const mirror of DIRECT_MIRRORS) {
            try {
              const resp = await fetchWithTimeout(mirror, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Accept': 'application/json',
                },
                body: `data=${encodeURIComponent(overpassQuery)}`,
              }, 8_000);
              if (resp.ok) {
                const data = await resp.json();
                if (data && Array.isArray(data.elements)) return data;
              }
            } catch (e: any) {
              if (controller.signal.aborted) throw e; // real cancellation — stop entirely
              // otherwise: this mirror's own timeout/network error — try the next one
            }
          }

          // All sources exhausted
          return null;
        };

        let overpassData: any;
        try {
          overpassData = await fetchWithRetry();
        } catch (overpassError: any) {
          const isAbort = overpassError?.name === 'AbortError';
          if (isAbort) {
            // Silent abort — navigated away or a newer fetch started
            return;
          }
          setError('Unable to load facilities. Check your internet connection and try again.');
          setFacilities([]);
          return;
        }

        // fetchWithRetry returns null when all sources are exhausted
        if (overpassData === null) {
          setError('Map data service is temporarily unavailable. Please wait a moment and tap "Try Again".');
          setFacilities([]);
          return;
        }

        if (overpassData?.elements && Array.isArray(overpassData.elements)) {
            overpassData.elements.forEach((element: any) => {
              try {
                const coords = element.lat && element.lon 
                  ? [element.lat, element.lon] 
                  : element.center 
                  ? [element.center.lat, element.center.lon]
                  : null;
                  
                if (!coords || !element.tags) return;
                
                const name = element.tags.name || 
                            element.tags['name:en'] || 
                            element.tags['official_name'] ||
                            'Healthcare Facility';
                if (name.length < 3) return;
                if (/^\d+$/.test(name)) return;  // purely numeric name
                if (['unnamed', 'unknown', 'n/a', 'na'].includes(name.toLowerCase())) return;
                
                const distance = calculateDistance(lat, lng, coords[0], coords[1]);

                if (distance > radius / 1000) return;

                // Classify against the 9-type FACILITY_TYPE_OPTIONS taxonomy —
                // shared with RESULTS STATE / find-care/results. Elements that
                // don't match any of the 9 official types (e.g. a bare
                // nursing_home with no other healthcare tag) are dropped,
                // same as find-care/results — see Phase 1 summary for this
                // BROWSE-STATE behaviour change (previously bucketed as
                // 'health_center', which is no longer one of the 9 types).
                const matchedType = resolveFacilityType(element.tags);
                if (!matchedType) return;
                const type = matchedType.slug;

                let address = '';
                if (element.tags['addr:full']) {
                  address = element.tags['addr:full'];
                } else {
                  const parts = [
                    element.tags['addr:housenumber'],
                    element.tags['addr:street'],
                    element.tags['addr:place'],
                    element.tags['addr:suburb'],
                    element.tags['addr:neighbourhood'],
                  ].filter(Boolean);
                  if (parts.length > 0) address = parts.join(', ');
                }
                
                const city = element.tags['addr:city'] ||
                            element.tags['addr:town'] ||
                            element.tags['is_in:city'] ||
                            element.tags['is_in:town'] ||
                            element.tags['addr:suburb'] ||
                            '';   // filled in below after OSM parse loop

                const region = element.tags['addr:state'] ||
                               element.tags['addr:region'] ||
                               element.tags['addr:province'] ||
                               element.tags['is_in:state'] ||
                               element.tags['is_in:region'] ||
                               '';   // filled in below
                
                const osmId = `osm_${element.type}_${element.id}`;
                allFacilities.push({
                  id: osmId,
                  name,
                  type,
                  typeLabel: matchedType.label,
                  address,
                  city,
                  region,
                  distance,
                  phone: (() => {
                    const raw = element.tags.phone || element.tags['contact:phone'] || element.tags['phone:mobile'] || element.tags['contact:mobile'] || '';
                    // Normalise: keep +, digits, spaces, dashes only
                    return raw.replace(/[^+0-9\s\-]/g, '').trim();
                  })(),
                  hours: element.tags.opening_hours || (type === 'hospital' && element.tags.emergency === 'yes' ? '24/7' : 'Call for hours'),
                  coordinates: coords as [number, number],
                  emergencyServices: element.tags.emergency === 'yes' || element.tags['emergency_service'] === 'yes',
                  nhis: detectNhis(element.tags),
                  website: element.tags.website || element.tags['contact:website'] || element.tags.url
                });
              } catch (elementError) {
                console.warn('Error processing element:', elementError);
              }
            });
          }
      } catch (innerError) {
        console.warn('Error processing Overpass data:', innerError);
      }

      // Merge in admin-verified DB facilities (Phase 9) — these exist to
      // cover gaps in OSM's Ghana coverage, especially eye_clinic /
      // ent_clinic / laboratory / maternity (thin because they depend on
      // the sparse free-text healthcare:speciality OSM tag — see the
      // constants.ts comment on FACILITY_TYPE_OPTIONS). Fetched separately
      // from Overpass rather than folded into fetchWithRetry() above:
      // this is our own DB, so it doesn't need the mirror-fallback chain
      // and a failure here shouldn't block OSM results from showing.
      // Runs for both BROWSE and RESULTS states; RESULTS passes `type` so
      // the DB query stays scoped the same way the Overpass query is.
      try {
        const verifiedParams = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radius: String(radius),
        });
        if (isResultsMode && selectedType !== 'all') {
          verifiedParams.set('type', selectedType);
        }
        const verifiedResp = await fetch(`/api/facilities/verified?${verifiedParams.toString()}`, {
          signal: controller.signal,
        });
        if (verifiedResp.ok) {
          const verifiedData = await verifiedResp.json();
          if (Array.isArray(verifiedData?.facilities)) {
            allFacilities = allFacilities.concat(verifiedData.facilities);
          }
        } else {
          console.warn('[facilities] /api/facilities/verified returned', verifiedResp.status);
        }
      } catch (verifiedError: any) {
        if (verifiedError?.name === 'AbortError') throw verifiedError;
        // DB facilities are additive — OSM results still show on failure.
        console.warn('Error fetching verified DB facilities:', verifiedError);
      }

      // Back-fill blank city / region with the user's detected location
      //  (most Ghana OSM nodes are tagged without addr:city)
      if (allFacilities.length > 0) {
        const fallbackCity   = resolvedLocation?.city   || locationInfo?.city   || '';
        const fallbackRegion = resolvedLocation?.region || locationInfo?.region || '';
        allFacilities = allFacilities.map(f => ({
          ...f,
          city:   f.city   || fallbackCity   || 'Unknown',
          region: f.region || fallbackRegion || 'Unknown',
        }))
      }

      // Deduplicate: keep the first occurrence whose coordinates are
      // within 50 m of any already-kept facility (same physical building).
      const kept: Facility[] = [];
      for (const fac of allFacilities) {
        const tooClose = kept.some(k => {
          const dlat = (k.coordinates[0] - fac.coordinates[0]) * 111320;
          const dlng = (k.coordinates[1] - fac.coordinates[1]) * 111320 * Math.cos(fac.coordinates[0] * Math.PI / 180);
          return Math.sqrt(dlat * dlat + dlng * dlng) < 50; // 50 metres
        });
        if (!tooClose) kept.push(fac);
      }
      const uniqueFacilities = kept;
      
      uniqueFacilities.sort((a, b) => a.distance - b.distance);
      const facilitiesInRadius = uniqueFacilities.filter(f => f.distance <= radius / 1000);
      

      
      if (facilitiesInRadius.length === 0) {
        // Don't use error state — use a soft empty state so filters/radius UI stays visible
        setError(null);
      }

      const limited = facilitiesInRadius.slice(0, 100);
      setFacilities(limited);
      setIsFromCache(false);

      // Write fresh results to cache for instant display on next visit
      // (BROWSE STATE only — see the read-side comment above)
      if (!isResultsMode && limited.length > 0) writeCache(lat, lng, radius, limited);
      
    } catch (error) {
      // A call whose controller has since been replaced (aborted by a
      // newer call, not a real failure of this one) was superseded, not
      // genuinely erroring — let the newer, still-in-flight call own the
      // outcome instead of stomping its eventual result with this stale
      // one's error state.
      if (fetchAbortRef.current !== controller) return;
      console.error('Error fetching facilities:', error);
      // Only clear facilities if we have no cached data showing
      if (!isFromCache) {
        setError('Failed to load healthcare facilities. Please try again.');
        setFacilities([]);
      } else {
        // Keep showing cached results, just show a soft warning
        setError('Could not refresh facilities. Showing cached results.');
      }
    } finally {
      // Same guard: only the still-current call may clear the shared
      // loading/guard state. Concretely, this happens on every fresh
      // results-page mount in dev — React 18 StrictMode double-invokes the
      // mount effect with no cleanup function to cancel the first
      // invocation's work, so that first call's controller gets aborted by
      // the second's `fetchAbortRef.current?.abort()`. Without this guard,
      // the first (now-stale) call's finally still runs unconditionally,
      // flipping isLoadingFacilities back to false — and isFetchingRef's
      // guard back open — while the second, real call is still mid-fetch.
      // isLoadingOrRefining reads false for a beat with facilities still
      // empty, so the page paints a real "No {type} found" before the
      // fetch that would have actually answered the question has finished.
      if (fetchAbortRef.current === controller) {
        isFetchingRef.current = false;
        setIsFromCache(false);
        setIsLoadingFacilities(false);
      }
    }
  }, [calculateDistance, readCache, writeCache, isResultsMode, selectedType]);

  // Get current location with high accuracy
  const resetMapFocus = useCallback(() => {
    setMapFocusFacility(null);
  }, []);

  // Silent background watch for a better GPS fix, used whenever the
  // location currently driving the search is coarse (>500m accuracy, or
  // unknown). isRefiningLocation stays true for the whole watch so
  // isLoadingOrRefining keeps the empty/"not found" states from rendering
  // against a fix that might still improve — see isLoadingOrRefining above.
  // Originally only ran inside getCurrentLocation() (BROWSE STATE / no-URL
  // RESULTS STATE), which meant the URL-seeded RESULTS STATE path (coords
  // handed off from find-care) never got this safety net at all: find-care
  // takes a single getCurrentPosition() reading — often a device's least
  // accurate fix, since the chipset hasn't converged yet — and a coarse
  // fix there can genuinely land outside a real nearby facility's radius.
  // That fetch would complete "successfully" with zero results and the
  // page would declare a false negative it could have silently corrected.
  // Cleared on every exit path: the update arrives, arrives but isn't
  // meaningfully better, or the watch itself errors/times out. Guarded by
  // refiningWatchIdRef against a second, duplicate watch starting while one
  // is already active — same mechanism as fetchAbortRef above: if this ever
  // gets called twice in quick succession for the same mount (StrictMode's
  // dev-only double-invoke of the mount effect), an unguarded second watch
  // would mean two watches racing, and whichever settles first clears the
  // shared isRefiningLocation to false — potentially while the *other*
  // watch, the one actually likely to find the better fix, is still going.
  const refiningWatchIdRef = useRef<number | null>(null);
  const startAccuracyRefinement = useCallback((initialAccuracy: number, radius: number) => {
    if (!navigator.geolocation) return;
    if (initialAccuracy <= 500) return;
    if (refiningWatchIdRef.current !== null) return; // already refining — don't start a second watch
    let bestAccuracy = initialAccuracy;
    setIsRefiningLocation(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos2) => {
        if (pos2.coords.accuracy < bestAccuracy - 50) {
          bestAccuracy = pos2.coords.accuracy;
          const loc2: [number, number] = [pos2.coords.latitude, pos2.coords.longitude];
          setUserLocation(loc2);
          setLocationInfo(prev => (prev ? { ...prev, accuracy: pos2.coords.accuracy } : prev));
          // Silent background re-fetch — reset guard before calling
          isFetchingRef.current = false;
          fetchNearbyFacilities(pos2.coords.latitude, pos2.coords.longitude, radius);
        }
        navigator.geolocation.clearWatch(watchId);
        refiningWatchIdRef.current = null;
        setIsRefiningLocation(false);
      },
      () => { navigator.geolocation.clearWatch(watchId); refiningWatchIdRef.current = null; setIsRefiningLocation(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    refiningWatchIdRef.current = watchId;
  }, [fetchNearbyFacilities]);

  const getCurrentLocation = useCallback(() => {
    // Clicking Find Near Me / Refresh should return map to user's location
    setMapFocusFacility(null);
    setIsLoadingLocation(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please use a modern browser or enable location services.');
      setIsLoadingLocation(false);
      return;
    }

    let bestAccuracy = Infinity;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy >= bestAccuracy) { setIsLoadingLocation(false); return; }
        bestAccuracy = accuracy;
        const location: [number, number] = [latitude, longitude];

        setUserLocation(location);
        setLocationPermission('granted');
        // Set this here, before reverseGeocode's await, not after — reverseGeocode
        // is a real network call, and userLocation above is already set by the
        // time it's in flight. Without this, there's a window where userLocation
        // is truthy, facilities is still empty, and isLoadingFacilities hasn't
        // been set yet (that used to happen inside fetchNearbyFacilities, called
        // only after reverseGeocode resolves) — which is exactly the condition
        // that renders the "No matches yet" empty state below instead of the
        // "Looking for care near you…" loading pill.
        setIsLoadingFacilities(true);
        const info = await reverseGeocode(latitude, longitude);
        setLocationInfo({ ...info, accuracy });

        // Fetch nearby facilities — reset guard first since this is a fresh user action
        isFetchingRef.current = false;
        await fetchNearbyFacilities(latitude, longitude, parseInt(selectedRadius), info);
        setIsLoadingLocation(false);

        // Switch to map view
        setViewMode('map');
        // (Scroll-to-results now handled by the unified effect below, which
        // also covers the URL-seeded results path this call alone didn't.)

        // If this first fix is coarse, refine it in the background rather
        // than trusting it as final — see startAccuracyRefinement above.
        startAccuracyRefinement(accuracy, parseInt(selectedRadius));
      },
      (error) => {
        console.error('Location error:', error.message);
        setIsLoadingLocation(false);
        let errorMessage = 'Unable to get your location. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable location services in your browser settings and refresh the page.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is currently unavailable. Please check your GPS/WiFi and try again.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'An unknown error occurred. Please try again.';
        }
        setError(errorMessage);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }, [selectedRadius, fetchNearbyFacilities, reverseGeocode, startAccuracyRefinement]);

  // Refetch when radius changes — skip on initial mount (location already fetches on mount)
  const isFirstRadiusRender = useRef(true);
  useEffect(() => {
    if (isFirstRadiusRender.current) { isFirstRadiusRender.current = false; return; }
    if (!userLocation || status !== 'authenticated') return;
    const timeoutId = setTimeout(() => {
      isFetchingRef.current = false; // radius change is an explicit re-fetch intent
      fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedRadius]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smart search: normalization + token-based relevance scoring
  const normaliseStr = (s: string) =>
    s.toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/['-_\/]/g, ' ')
     .replace(/\s+/g, ' ').trim();

  const scoreMatch = (facility: Facility, rawQuery: string): number => {
    if (!rawQuery.trim()) return 1;
    const tokens = normaliseStr(rawQuery).split(' ').filter(Boolean);
    if (!tokens.length) return 1;
    const fields = [
      { text: normaliseStr(facility.name),                          weight: 10 },
      { text: normaliseStr(facility.typeLabel),                      weight:  6 },
      { text: normaliseStr(facility.city),                           weight:  5 },
      { text: normaliseStr(facility.region),                         weight:  4 },
      { text: normaliseStr(facility.address),                        weight:  3 },
      { text: facility.emergencyServices ? 'emergency 24 7 247' : '', weight: 5 },
      { text: facility.nhis !== 'none' ? 'nhis insurance' : '',       weight: 2 },
    ];
    let score = 0;
    for (const token of tokens) {
      let hit = false;
      for (const field of fields) {
        if (field.text.includes(token)) {
          const wb = new RegExp('(?:^|\\s)' + token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
          score += field.weight * (wb.test(field.text) ? 1.5 : 1);
          hit = true;
        }
      }
      if (!hit) return 0;
    }
    return score;
  };

  const filteredFacilities = useMemo(() => facilities
    .map(f => ({ f, score: scoreMatch(f, debouncedSearchQuery) }))
    .filter(({ score, f }) => score > 0 && (selectedType === 'all' || f.type === selectedType))
    // RESULTS-STATE-only filters (ported from find-care/results): the
    // Overpass query is already type-scoped there, but district substring
    // matching and the NHIS-only toggle are client-side, same as before.
    .filter(({ f }) => !isResultsMode || !debouncedDistrictQuery.trim() || f.address.toLowerCase().includes(debouncedDistrictQuery.trim().toLowerCase()))
    .filter(({ f }) => !isResultsMode || !nhisOnly || f.nhis !== 'none')
    .sort((a, b) => {
      if (debouncedSearchQuery.trim() && a.score !== b.score) return b.score - a.score;
      switch (sortBy) {
        case 'name':     return a.f.name.localeCompare(b.f.name);
        default:         return a.f.distance - b.f.distance;
      }
    })
    .map(({ f }) => f),
  [facilities, debouncedSearchQuery, selectedType, sortBy, isResultsMode, debouncedDistrictQuery, nhisOnly]);

  // RESULTS STATE zero/thin-results empty state — ported verbatim (label
  // logic + recovery actions) from find-care/results.
  const resultsRadiusKm = parseInt(selectedRadius) / 1000;
  const resultsActiveLabel = selectedType !== 'all'
    ? (FACILITY_TYPE_OPTIONS.find(t => t.slug === selectedType)?.label.toLowerCase() ?? 'facilities')
    : 'facilities';
  const RESULTS_RADIUS_OPTIONS_KM = [5, 10, 15, 20];

  // RESULTS STATE header content — ported from find-care/results.
  const resultsActiveTypeOpt = selectedType !== 'all' ? FACILITY_TYPE_OPTIONS.find(t => t.slug === selectedType) : undefined;
  const resultsPageTitle = resultsActiveTypeOpt ? resultsActiveTypeOpt.label : 'Hospitals, clinics & pharmacies';
  const ResultsHeaderIcon = resultsActiveTypeOpt ? (TYPE_ICONS[resultsActiveTypeOpt.icon] ?? Building2) : Building2;
  const resultsLocationLabel = userLocation
    ? 'Right where you are'
    : locationPermission === 'denied'
    ? 'Location unavailable — enable it to search nearby'
    : 'Finding your location…';
  const renderResultsEmptyState = () => (
    !userLocation ? (
      <div className="fcr-empty-state">
        <Locate size={20} />
        <h2 className="fcr-empty-state__title">
          {locationPermission === 'denied' ? 'Location access needed' : 'Finding your location…'}
        </h2>
        <p className="fcr-empty-state__body">
          {locationPermission === 'denied'
            ? 'Enable location in your browser settings, then refresh the page to search nearby.'
            : "We're locating you now — results will appear as soon as we have it."}
        </p>
        {locationPermission === 'denied' && (
          <div className="fcr-empty-state__actions">
            <button className="fcr-empty-state__btn" onClick={getCurrentLocation} type="button">
              Try again
            </button>
          </div>
        )}
      </div>
    ) : (
    <div className="fcr-empty-state">
      <MapPin size={20} />
      <h2 className="fcr-empty-state__title">
        No {resultsActiveLabel} found within {resultsRadiusKm} km
      </h2>
      <p className="fcr-empty-state__body">
        Try widening your search, or start with a general hospital nearby — they can refer you to a specialist.
      </p>
      <div className="fcr-empty-state__actions">
        {resultsRadiusKm < 20 && (
          <button
            className="fcr-empty-state__btn"
            onClick={() => setSelectedRadius(String((RESULTS_RADIUS_OPTIONS_KM.find(k => k > resultsRadiusKm) ?? 20) * 1000))}
            type="button"
          >
            Widen to {RESULTS_RADIUS_OPTIONS_KM.find(k => k > resultsRadiusKm) ?? 20} km
          </button>
        )}
        {nhisOnly && (
          <button className="fcr-empty-state__btn" onClick={() => setNhisOnly(false)} type="button">
            Remove NHIS filter
          </button>
        )}
        {selectedType !== 'all' && selectedType !== 'hospital' && (
          <button className="fcr-empty-state__btn" onClick={() => selectResultsType('hospital')} type="button">
            Try Hospital instead
          </button>
        )}
      </div>
    </div>
    )
  );

  // ── BROWSE-mode "nothing found" content — single source of truth ────
  // Previously re-derived independently in three places (the map-view
  // sidebar, the full list view, and the compact map-overlay card below),
  // and they'd quietly drifted apart: only the list view offered a
  // "Try 50km" step beyond 20km, and the "enable location" copy differed
  // slightly between sidebar and list. All three now read from here, so
  // they can't disagree, and adding a future radius step is a one-line
  // change instead of three. (RESULTS mode's equivalent, renderResultsEmptyState
  // above, was already a single shared function — this brings BROWSE mode
  // up to the same standard.)
  type EmptyStateAction = { label: string; onClick: () => void; icon?: boolean };
  const browseEmptyState = useMemo((): { headline: string; hint: string; actions: EmptyStateAction[] } | null => {
    if (isResultsMode || isLoadingOrRefining || filteredFacilities.length > 0) return null;
    if (!userLocation) {
      const actions: EmptyStateAction[] = [{ label: 'Enable Location', onClick: getCurrentLocation, icon: true }];
      return {
        headline: 'No facilities found',
        hint: 'Enable location to find facilities near you.',
        actions,
      };
    }
    const radiusKm = parseInt(selectedRadius) / 1000;
    const actions: EmptyStateAction[] = [];
    if (selectedRadius !== '20000') actions.push({ label: 'Try 20km radius', onClick: () => setSelectedRadius('20000') });
    if (selectedRadius !== '50000') actions.push({ label: 'Try 50km radius', onClick: () => setSelectedRadius('50000') });
    return {
      headline: `No healthcare facilities found within ${radiusKm}km of your location.`,
      hint: 'Try increasing the search radius or adjusting your filters.',
      actions,
    };
  }, [isResultsMode, isLoadingOrRefining, filteredFacilities.length, userLocation, selectedRadius, getCurrentLocation]);

  // Compact version of the empty-state messaging above, for the small
  // card MapContainer overlays directly on the map itself (see isLoading/
  // emptyState props there). Only one action fits in that space, so this
  // picks the single most useful one rather than every option the fuller
  // sidebar/list empty states offer. Mirrors those states' conditions
  // exactly (isLoadingFacilities false, a real search happened, zero
  // results, no fetch error) so the map and the list/sidebar never
  // disagree about whether results exist.
  const mapEmptyState = useMemo(() => {
    if (isLoadingOrRefining || !userLocation || error || filteredFacilities.length > 0) return null;
    if (isResultsMode) {
      const nextRadiusKm = RESULTS_RADIUS_OPTIONS_KM.find(k => k > resultsRadiusKm);
      return {
        title: `No ${resultsActiveLabel} found within ${resultsRadiusKm} km`,
        body: 'Try widening your search, or start with a general hospital nearby — they can refer you to a specialist.',
        actionLabel: nextRadiusKm ? `Widen to ${nextRadiusKm} km` : undefined,
        onAction: nextRadiusKm ? () => setSelectedRadius(String(nextRadiusKm * 1000)) : undefined,
      };
    }
    // userLocation is already confirmed truthy by the guard above, so
    // browseEmptyState is always in its "has location" shape here.
    if (!browseEmptyState) return null;
    return {
      title: browseEmptyState.headline,
      body: browseEmptyState.hint,
      actionLabel: browseEmptyState.actions[0]?.label,
      onAction: browseEmptyState.actions[0]?.onClick,
    };
  }, [isLoadingOrRefining, userLocation, error, filteredFacilities.length, isResultsMode, resultsRadiusKm, resultsActiveLabel, browseEmptyState]);

  // User info
  const userName: string = session?.user?.name || 'User';
  const userEmail: string | null = session?.user?.email || null;
  const userImage: string | null = (session?.user as any)?.image || null;
  const userInitials: string = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const notifications = React.useMemo((): AppNotification[] => {
    const nowIso = new Date().toISOString();
    const list: AppNotification[] = [];

    // Location not granted — always first
    if (!userLocation && locationPermission !== 'granted') {
      list.push({
        id: 'location', scope: 'contextual', createdAt: nowIso,
        icon: locationPermission === 'denied' ? AlertCircle : Crosshair,
        color: locationPermission === 'denied' ? 'red' : 'amber',
        title: locationPermission === 'denied'
          ? 'Location access blocked'
          : 'Enable GPS to find facilities near you',
        body: locationPermission === 'denied'
          ? 'Open your browser settings, allow location access, then refresh the page.'
          : 'Grant location access so we can show hospitals, clinics and pharmacies closest to you.',
        onSelect: locationPermission === 'denied' ? undefined : getCurrentLocation,
      });
    }

    // Low GPS accuracy — results may be off
    if (userLocation && locationInfo?.accuracy && locationInfo.accuracy > 500)
      list.push({
        id: 'low-accuracy', scope: 'contextual', createdAt: nowIso,
        icon: Crosshair,
        color: 'amber',
        title: `Low GPS accuracy — ±${Math.round(locationInfo.accuracy)}m`,
        body: 'Your location fix is weak. Results may not reflect your exact position. Tap to retry GPS.',
        onSelect: getCurrentLocation,
      });

    // Search active but filtered list is empty (raw facilities exist, query filters them all out)
    if (searchQuery.trim() && facilities.length > 0 && !isLoadingFacilities)
      list.push({
        id: 'empty-search', scope: 'contextual', createdAt: nowIso,
        icon: Search,
        color: 'amber',
        title: `No results for "${searchQuery}"`,
        body: 'Try a different search term, change the facility type filter, or increase the radius.',
      });

    // Selected facility has emergency services — nudge to save it
    if (selectedFacility?.emergencyServices && !savedFacilityIds.has(selectedFacility.id))
      list.push({
        id: 'save-er', scope: 'contextual', createdAt: nowIso,
        icon: BookmarkCheck,
        color: 'teal',
        title: `Save ${selectedFacility.name}?`,
        body: 'This facility has emergency services. Bookmark it so you can find it instantly in a crisis.',
        onSelect: () => toggleSaveFacility(selectedFacility),
      });
    if (userLocation && !isLoadingOrRefining && facilities.length === 0 && !error) {
      const radiusKm = Math.round(parseInt(selectedRadius) / 1000);
      list.push({
        id: 'no-results', scope: 'contextual', createdAt: nowIso,
        icon: MapPin,
        color: 'amber',
        title: 'No facilities found nearby',
        body: `Nothing found within ${radiusKm} km. Try increasing your search radius in the filters.`,
        onSelect: () => setShowFilters(true),
      });
    }

    // Fetch error
    if (error) {
      list.push({
        id: 'error', scope: 'contextual', createdAt: nowIso,
        icon: AlertCircle,
        color: 'red',
        title: 'Could not load facilities',
        body: 'There was a problem fetching nearby facilities. Tap to retry.',
        onSelect: userLocation
          ? () => { isFetchingRef.current = false; fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius)); }
          : undefined,
      });
    }

    // Saved facilities nudge
    if (savedFacilityIds.size > 0) {
      list.push({
        id: 'saved', scope: 'contextual', createdAt: nowIso,
        icon: BookmarkCheck,
        color: 'teal',
        title: `${savedFacilityIds.size} saved ${savedFacilityIds.size === 1 ? 'facility' : 'facilities'}`,
        body: 'View your saved facilities on the profile page or scroll up to the saved bar.',
        onSelect: () => router.push('/profile'),
      });
    }

    // Location found — show city/accuracy info as a positive confirmation.
    // silent: true — informational only, doesn't bump the unread badge.
    if (userLocation && locationInfo?.city && facilities.length > 0) {
      list.push({
        id: 'located', scope: 'contextual', createdAt: nowIso, silent: true,
        icon: MapPin,
        color: 'mint',
        title: `Showing facilities near ${locationInfo.city}`,
        body: `${facilities.length} healthcare ${facilities.length === 1 ? 'facility' : 'facilities'} found within ${Math.round(parseInt(selectedRadius) / 1000)} km.${locationInfo.accuracy ? ` GPS accuracy ±${Math.round(locationInfo.accuracy)}m.` : ''}`,
      });
    }

    if (list.length === 0)
      list.push({
        id: 'empty', scope: 'contextual', createdAt: nowIso, silent: true,
        icon: MapPin, color: 'mint', title: 'No new notifications',
        body: 'Enable GPS to start finding nearby healthcare facilities.',
      });

    return list;
  }, [userLocation, locationPermission, facilities, isLoadingOrRefining, error, savedFacilityIds, locationInfo, selectedRadius, searchQuery, selectedFacility, getCurrentLocation, fetchNearbyFacilities, toggleSaveFacility, router]);

  useRegisterNotifications('facilities', notifications);

  if (status === 'loading') {
    return (
      <div className="hc-loading">
        <div className="hc-loading__mark"><Heart size={26} /></div>
        <div className="hc-loading__brand">
          <span className="hc-loading__name">HealthConnect</span>
          <span className="hc-loading__sub">Navigator</span>
        </div>
        <div className="hc-loading__dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    /*
      mob-topbar and mob-tab-bar MUST be direct children of DashboardLayout
      (i.e. inside hc-layout__content, not nested inside .facility-finder).
      dashboard-header.css activates them via:
        .hc-layout--has-mob-topbar .mob-topbar  { display: flex }
        .hc-layout--has-mob-topbar .mob-tab-bar { display: block }
      If they're nested deeper (e.g. inside .facility-finder) the selectors
      still match because CSS descendant selectors don't care about depth —
      BUT position:fixed pulls them out of the layout flow anyway, so the
      real issue is that facilities.css was hiding them with display:none.
      That's now fixed. Keeping them here outside .facility-finder is the
      cleanest structure: chrome above/below, content in the middle.
    */
    <DashboardLayout activeTab="/facilities" showFooter={false} className="hc-layout--has-mob-topbar">

      {/* ── Fixed background layer — pattern + tint stay pinned to the
           viewport while everything else scrolls over it. A real
           position:fixed element, not background-attachment:fixed,
           since that CSS property is unreliably ignored on iOS Safari.
           Same technique as Dashboard's .db-bg-fixed / Emergency's
           .em-bg-fixed / Profile's .pr-bg-fixed. ── */}
      <div className="facility-finder-bg-fixed" aria-hidden="true" />

      {/* ── Mobile sticky top bar ─────────────────────────────────
           position:fixed — sits above all page content.
           Shown at ≤640px via hc-layout--has-mob-topbar rules.   */}
      <div className="mob-topbar">
        <div className="mob-topbar__left">
          <HCLogo size={30} />
          <span className="mob-topbar__logo-text">HealthConnect</span>
        </div>
        <div className="mob-topbar__right">
          <MobTopbarMenu />
        </div>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────
           Shared component — Home / Find / Emergency / Profile, same as
           /dashboard, /find-care, /emergency, /profile. Find tab shows
           the location pin here since /facilities is the map view. */}
      <MobTabBar currentPath="/facilities" />

      {/* ── Desktop topbar — same as profile page, hidden on mobile ── */}
      <div className="db-topbar">
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
          <button className="db-topbar__user" type="button" onClick={() => router.push('/profile')} title="Go to Profile">
            <div className="db-topbar__user-avatar">
              {userImage
                ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" />
                : userInitials}
            </div>
            <div className="db-topbar__user-info">
              <span className="db-topbar__user-name">{userName}</span>
              <span className="db-topbar__user-id">HC-{userEmail?.slice(0,5).toUpperCase()}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Notifications panel is now the single shared one — see
           NotificationPanel.tsx, mounted once by DashboardLayout. This
           page just registers its GPS/search tips into the feed above
           (notifications + useRegisterNotifications). */}

    <div className="facility-finder">

      {/* Main Content */}
      <div className="facility-finder-content">

        {/* Page header — morphs between BROWSE and RESULTS STATE based on how
             /facilities was arrived at (bare vs ?type=&lat=&lng=). Both
             render from the same underlying facilities/filters/view state;
             this is conditional header content, not two glued-together pages. */}
        <div className="facility-header-morph" key={isResultsMode ? 'results' : 'browse'}>
          {isResultsMode ? (
            <div className="fcr-page-header">
              <span className="fcr-page-header__ghost-icon" aria-hidden="true">
                <ResultsHeaderIcon size={132} strokeWidth={1.5} />
              </span>
              <div className="fcr-page-header__left">
                <button className="fcr-back" onClick={handleResultsBack} type="button" aria-label={resultsBackLabel}>
                  <ArrowLeft size={14} /> <span className="fcr-back__label">{resultsBackLabel}</span>
                </button>
                <h1 className="fcr-page-header__title">
                  <span className="fcr-page-header__icon"><ResultsHeaderIcon size={22} /></span>
                  {resultsPageTitle}
                </h1>
                <p className="fcr-page-header__sub"><MapPin size={12} /> {resultsLocationLabel}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="pr-page-header">
                <div>
                  <h1 className="pr-page-header__title">Nearby Facilities</h1>
                  <p className="pr-page-header__sub">Hospitals, clinics and pharmacies near you</p>
                </div>
                <div className="pr-page-header__actions">
                  <button
                    className={`pr-btn pr-btn--primary${isLoadingLocation ? ' loading' : ''}`}
                    onClick={() => { resetMapFocus(); getCurrentLocation(); }}
                    disabled={isLoadingLocation}
                    type="button"
                  >
                    {isLoadingLocation
                      ? <Loader2 size={14} className="pr-spin" />
                      : <Crosshair size={14} />}
                    {isLoadingLocation ? 'Finding you…' : 'Find Near Me'}
                  </button>
                </div>
              </div>

              {/* Mode toggle — switch to symptom-based doctor search */}
              <FindCareToggle active="facilities" />
            </>
          )}
        </div>

        {/* Location Permission Banner — RESULTS STATE already has its
             location from the URL, so this only ever shows in BROWSE STATE */}
        {showLocationBanner && !userLocation && (
          <LocationPermissionBanner
            onEnableLocation={getCurrentLocation}
            onDismiss={() => setShowLocationBanner(false)}
            isLoading={isLoadingLocation}
          />
        )}

        {/* Location Confirmation — wrapper reserves space to prevent page jump
             while location is fetched, so it's always rendered in BROWSE STATE.
             RESULTS STATE already has its location from the URL (no async wait,
             nothing to guard against), so the wrapper is skipped entirely there
             unless the cache-refresh badge needs it — as an empty flex child it
             was still costing two gap-widths of dead space for no reason. */}
        {(!isResultsMode || (isFromCache && isLoadingFacilities)) && (
          <div className={`loc-confirmation-wrap${isResultsMode ? ' loc-confirmation-wrap--compact' : ''}`}>
            {userLocation && !isResultsMode && (
              <LocationConfirmation
                location={userLocation}
                locationInfo={locationInfo}
                onRefresh={getCurrentLocation}
                isRefreshing={isLoadingLocation}
              />
            )}
            {/* Shown while fresh data loads in background over cached results */}
            {isFromCache && isLoadingFacilities && (
              <div className="cache-refresh-badge">
                <Loader2 size={12} className="spin" />
                <span>Updating results…</span>
              </div>

            )}
          </div>
        )}

        {/* Search and Filters */}
        <div className="facility-finder-controls" ref={searchControlsRef}>
          <div className="facility-finder-search-section">
            <div className={`facility-finder-search-wrapper${searchActive ? ' search-focused' : ''}`}>
              <button
                type="button"
                className="facility-finder-search-icon-btn"
                aria-label="Search"
                onClick={() => searchInputRef.current?.focus()}
              >
                <Search size={20} />
              </button>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search clinics, hospitals, pharmacies..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(e.target.value.trim().length > 0);
                }}
                onFocus={() => {
                  setSearchActive(true);
                  if (searchQuery.trim().length > 0) setSearchDropdownOpen(true);
                }}
                onBlur={() => {
                  setSearchActive(false);
                  // Delay close so clicks on dropdown items register
                  setTimeout(() => setSearchDropdownOpen(false), 180);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setSearchDropdownOpen(false);
                    searchInputRef.current?.blur();
                  }
                }}
                className="facility-finder-search-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {/* Clear button */}
              {searchQuery && (
                <button
                  type="button"
                  className="facility-finder-search-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchDropdownOpen(false);
                    searchInputRef.current?.focus();
                  }}
                >
                  <X size={16} />
                </button>
              )}

              <button
                className="facility-finder-filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
                type="button"
                aria-label="Toggle filters"
              >
                <Filter size={15} />
                <ChevronDown size={14} className={showFilters ? 'rotated' : ''} />
              </button>
            </div>

            {/* ── Search autocomplete dropdown ── */}
            {searchDropdownOpen && filteredFacilities.length > 0 && (
              <div className="search-dropdown" role="listbox" aria-label="Search suggestions">
                {filteredFacilities.slice(0, 6).map(facility => {
                  const FacIcon = getFacilityIconComponent(facility.type);
                  return (
                    <button
                      key={facility.id}
                      className="search-dropdown__item"
                      type="button"
                      role="option"
                      onMouseDown={() => handleFacilitySelect(facility)}
                    >
                      <div className={`search-dropdown__icon search-dropdown__icon--${facility.type}`}>
                        <FacIcon size={14} />
                      </div>
                      <div className="search-dropdown__body">
                        <span className="search-dropdown__name">{facility.name}</span>
                        <span className="search-dropdown__meta">
                          {facility.typeLabel} · {facility.city}
                          {facility.distance > 0 ? ` · ${facility.distance.toFixed(1)} km` : ''}
                        </span>
                      </div>
                      <div className="search-dropdown__action">
                        <MapPin size={12} />
                        <span>View on map</span>
                      </div>
                    </button>
                  );
                })}
                {filteredFacilities.length > 6 && (
                  <div className="search-dropdown__footer">
                    {filteredFacilities.length - 6} more result{filteredFacilities.length - 6 !== 1 ? 's' : ''} — scroll the list below
                  </div>
                )}
              </div>
            )}

            {/* No matches message */}
            {searchDropdownOpen && searchQuery.trim().length > 0 && filteredFacilities.length === 0 && (
              <div className="search-dropdown search-dropdown--empty">
                <div className="search-dropdown__empty">
                  <Search size={16} />
                  <span>No facilities found for &ldquo;{searchQuery}&rdquo;</span>
                </div>
              </div>
            )}

            {/* Type filter pills — shown below search bar on all screen sizes.
                 Widened from the old 4-bucket set to the full 9-type
                 FACILITY_TYPE_OPTIONS taxonomy shared with find-care/results. */}
            <div className="facility-type-pills">
              {[{ slug: 'all', label: 'All' }, ...FACILITY_TYPE_OPTIONS].map(opt => (
                <button
                  key={opt.slug}
                  className={`type-pill${selectedType === opt.slug ? ' active' : ''}`}
                  onClick={() => selectResultsType(opt.slug)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {showFilters && (
              <div className="facility-finder-filters-extended">
                <div className="filter-row">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="facility-finder-filter-select"
                  >
                    <option value="distance">Sort: Distance</option>
                    <option value="name">Sort: Name</option>
                  </select>

                  <div className="facility-finder-radius-select">
                    <span className="radius-label">Radius:</span>
                    {(isResultsMode
                      ? [{ value: '5000', label: '5km' }, { value: '10000', label: '10km' }, { value: '15000', label: '15km' }, { value: '20000', label: '20km' }]
                      : [{ value: '5000', label: '5km' }, { value: '10000', label: '10km' }, { value: '20000', label: '20km' }, { value: '50000', label: '50km' }]
                    ).map(r => (
                      <button
                        key={r.value}
                        className={`radius-pill${selectedRadius === r.value ? ' active' : ''}`}
                        onClick={() => setSelectedRadius(r.value)}
                        type="button"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {userLocation && (
                    <button
                      className="refresh-btn"
                      onClick={() => { isFetchingRef.current = false; fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius)); }}
                      disabled={isLoadingFacilities}
                      type="button"
                    >
                      {isLoadingFacilities ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                      Refresh
                    </button>
                  )}
                </div>

                {/* ── RESULTS-STATE-only filters — district + NHIS-only toggle,
                     ported from find-care/results into this same panel rather
                     than a second, competing filters UI ── */}
                {isResultsMode && (
                  <div className="fcr-filters__row fcr-filters__row--toggle" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hc-border2)' }}>
                    <input
                      className="fcr-select"
                      type="text"
                      placeholder="Area / district, e.g. Tarkwa"
                      value={districtQuery}
                      onChange={(e) => setDistrictQuery(e.target.value)}
                      style={{ flex: 1, marginRight: 12 }}
                    />
                    <label className="fcr-toggle-label">
                      <input type="checkbox" checked={nhisOnly} onChange={(e) => setNhisOnly(e.target.checked)} />
                      <span>NHIS accepted only</span>
                    </label>
                    {(districtQuery || nhisOnly || selectedRadius !== '15000') && (
                      <button
                        className="fcr-clear-filters"
                        onClick={() => { setDistrictQuery(''); setNhisOnly(false); setSelectedRadius('15000'); }}
                        type="button"
                      >
                        <X size={12} /> Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {isLoadingOrRefining ? (
            <div className="facility-finder-status-pill">
              <Loader2 size={13} className="spin" />
              Looking for {resultsActiveLabel} near you…
            </div>
          ) : isResultsMode && !userLocation ? (
            <div className="facility-finder-status-pill facility-finder-status-pill--empty">
              <MapPin size={13} />
              {locationPermission === 'denied'
                ? 'Enable location access to search nearby'
                : 'Waiting for your location…'}
            </div>
          ) : filteredFacilities.length === 0 && userLocation ? (
            <div className="facility-finder-status-pill facility-finder-status-pill--empty">
              <MapPin size={13} />
              No matches yet — try widening your search below
            </div>
          ) : null}

          <div className="facility-finder-view-controls">
            <div className="results-summary">
              <span className="results-count">{filteredFacilities.length}</span>
              <span className="results-label">
                {searchQuery.trim() || selectedType !== 'all'
                  ? `result${filteredFacilities.length !== 1 ? 's' : ''} (of ${facilities.length})`
                  : `facilit${filteredFacilities.length !== 1 ? 'ies' : 'y'} nearby`}
              </span>
              {isLoadingFacilities && <Loader2 size={16} className="spin" />}
            </div>

            <Link href="/facilities/submit" className="facility-finder-add-link">
              Don't see a place? Add it
            </Link>

            <div className="facility-finder-view-toggle">
              <button 
                className={`facility-finder-view-btn ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => {
                  if (userLocation) {
                    setViewMode('map');
                  }
                }}
                type="button"
                disabled={!userLocation}
                title={!userLocation ? 'Enable location to use map view' : 'Switch to map view'}
              >
                <Map size={18} />
                Map
              </button>
              <button 
                className={`facility-finder-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                type="button"
                title="Switch to list view"
              >
                <List size={18} />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={20} className="error-banner__icon" />
            <div className="error-banner__body">
              <span className="error-banner__msg">{error}</span>
              {userLocation && (
                <button
                  className="error-banner__retry"
                  type="button"
                  onClick={() => {
                    setError(null);
                    isFetchingRef.current = false;
                    fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius));
                  }}
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              )}
            </div>
            <button className="error-banner__close" onClick={() => setError(null)} type="button" aria-label="Dismiss">×</button>
          </div>
        )}

        {/* ── Saved Facilities Section ──────────────────────────── */}
        {savedFacilityIds.size > 0 && (
          <SavedFacilitiesBar
            savedIds={savedFacilityIds}
            facilities={facilities}
            onSelect={handleFacilitySelect}
            onUnsave={toggleSaveFacility}
            onGetDirections={getDirections}
          />
        )}

        {/* Main Facility Content */}
        <div className="facility-finder-main" ref={mapViewRef}>
          {viewMode === 'map' ? (
            <div className="facility-finder-map-container">
              <MapContainer 
                facilities={filteredFacilities}
                userLocation={userLocation}
                onFacilitySelect={handleFacilitySelect}
                focusFacility={mapFocusFacility}
                onReady={() => setMapReady(true)}
                isLoading={isLoadingOrRefining}
                emptyState={mapEmptyState}
              />
              
              <div className="facility-finder-map-sidebar">
                <div className="facility-finder-results-header">
                  <h3>Nearby Healthcare Facilities</h3>
                  {!userLocation && (
                    <p className="location-prompt">
                      <Locate size={16} />
                      Click "Find Near Me" to discover facilities around you
                    </p>
                  )}
                </div>
                
                <div className="facility-finder-results-list">
                  {isLoadingOrRefining ? (
                    <div className="loading-facilities">
                      <div className="loading-facilities-pulse">
                        <Loader2 size={22} className="spin" />
                      </div>
                      <p>Looking for care near you…</p>
                      <small>This usually takes just a few seconds — hang tight.</small>
                    </div>
                  ) : filteredFacilities.length === 0 ? (
                    isResultsMode ? renderResultsEmptyState() : browseEmptyState && (
                    <div className="no-facilities">
                      <Hospital size={32} />
                      <p>{browseEmptyState.headline}</p>
                      <p>{browseEmptyState.hint}</p>
                      {browseEmptyState.actions.length > 0 && (
                        <div className="radius-suggestions">
                          {browseEmptyState.actions.map(action => (
                            <button
                              key={action.label}
                              className="location-enable-btn"
                              onClick={action.onClick}
                              type="button"
                            >
                              {action.icon && <Locate size={20} />}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    )
                  ) : (
                    filteredFacilities.map(facility => {
                      const { label: statusLabel, isOpen, isUnknown } = getOpenStatus(facility.hours, facility.emergencyServices);
                      const hasPhone = !!facility.phone;
                      return (
                      <div 
                        key={facility.id} 
                        className={`facility-finder-result-card ${selectedFacility?.id === facility.id ? 'selected' : ''}`}
                        onClick={() => handleFacilitySelect(facility)}
                      >
                        <div className="facility-result-header">
                          <div className={`facility-result-icon ${facility.type}`}>
                            {React.createElement(getFacilityIconComponent(facility.type), { size: 20 })}
                          </div>
                          <div className="facility-result-info">
                            <h4 className="facility-result-name">{facility.name}</h4>
                            <p className="facility-result-location">{facility.city}, {facility.region}</p>
                            <p className="facility-result-distance">{facility.distance.toFixed(1)} km away</p>
                          </div>
                        </div>
                        
                        <div className="facility-result-details">
                          <div className="facility-badges">
                            <span className={`facility-status-badge ${isOpen ? 'open' : isUnknown ? 'unknown' : 'closed'}`}>
                              {statusLabel}
                            </span>
                            {facility.emergencyServices && (
                              <span className="emergency-badge">24/7 Emergency</span>
                            )}
                            {facility.nhis !== 'none' && (
                              <span className={`fcr-badge ${facility.nhis === 'confirmed' ? 'fcr-badge--nhis' : 'fcr-badge--nhis-likely'}`}>
                                <Check size={11} /> {facility.nhis === 'confirmed' ? 'NHIS' : 'NHIS likely'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="facility-result-actions">
                          {hasPhone && (
                            <button 
                              className="facility-action-btn call-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`tel:${facility.phone}`, '_self');
                              }}
                              type="button"
                            >
                              <Phone size={14} />
                              Call
                            </button>
                          )}
                          {hasPhone && (
                            <button
                              className="facility-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(toWhatsAppLink(facility.phone), '_blank');
                              }}
                              type="button"
                            >
                              <MessageCircle size={14} />
                              WhatsApp
                            </button>
                          )}
                          <button 
                            className="facility-action-btn directions-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              getDirections(facility);
                            }}
                            type="button"
                          >
                            <Navigation size={14} />
                            Directions
                          </button>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="facility-finder-list-view">
              <div className="facility-finder-list-header">
                <h3>Healthcare Facilities</h3>
                {!userLocation && (
                  <p className="location-prompt">
                    <Locate size={16} />
                    Enable GPS location to find facilities near you
                  </p>
                )}
              </div>
              
              {isLoadingOrRefining ? (
                <div className="loading-facilities-list">
                  <div className="loading-facilities-pulse">
                    <Loader2 size={26} className="spin" />
                  </div>
                  <p>Looking for care near you…</p>
                  <small>This usually takes just a few seconds — hang tight.</small>
                </div>
              ) : filteredFacilities.length === 0 ? (
                isResultsMode ? renderResultsEmptyState() : browseEmptyState && (
                <div className="no-results-message">
                  <div className="no-results-icon">
                    <Search size={48} />
                  </div>
                  <h3>No facilities found</h3>
                  {userLocation && <p>{browseEmptyState.headline}</p>}
                  <p>{browseEmptyState.hint}</p>
                  {browseEmptyState.actions.length > 0 && (
                    <div className="radius-suggestions">
                      {browseEmptyState.actions.map(action => (
                        <button
                          key={action.label}
                          className="location-enable-btn"
                          onClick={action.onClick}
                          type="button"
                        >
                          {action.icon && <Locate size={20} />}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                )
              ) : (
                <div className={isResultsMode ? 'fcr-grid' : 'facility-finder-list-grid'}>
                  {filteredFacilities.map(facility => {
                    const { label: statusLabel, isOpen, isUnknown } = getOpenStatus(facility.hours, facility.emergencyServices);
                    const hasPhone = !!facility.phone;
                    const FacIcon = getFacilityIconComponent(facility.type);

                    // ── RESULTS STATE: fcr-card, exact parity with find-care/results ──
                    if (isResultsMode) {
                      const isSaved = savedFacilityIds.has(facility.id);
                      return (
                        <div key={facility.id} className="fcr-card">
                          <div className="fcr-card__top">
                            <div className="fcr-card__icon"><FacIcon size={20} /></div>
                            <div className="fcr-card__id">
                              <h3 className="fcr-card__name">{facility.name}</h3>
                              <span className="fcr-card__type">{facility.typeLabel}</span>
                            </div>
                            <div className="fcr-card__top-actions">
                              <span className="fcr-distance-chip">{formatDistance(facility.distance)}</span>
                              <button
                                className={`fcr-card__bookmark${isSaved ? ' fcr-card__bookmark--saved' : ''}`}
                                onClick={e => { e.stopPropagation(); toggleSaveFacility(facility); }}
                                disabled={isSavingFacility}
                                type="button"
                                aria-label={isSaved ? 'Remove from saved' : 'Save facility'}
                              >
                                <Bookmark size={16} fill={isSaved ? 'var(--hc-teal)' : 'none'} />
                              </button>
                            </div>
                          </div>

                          <div className="fcr-card__meta">
                            <span className="fcr-card__meta-item"><MapPin size={12} /> {[facility.address, facility.city].filter(Boolean).join(', ') || 'Address not available'}</span>
                            {facility.hours && facility.hours !== 'Call for hours' && (
                              <span className="fcr-card__meta-item">🕐 {facility.hours}</span>
                            )}
                          </div>

                          {facility.nhis !== 'none' && (
                            <div className="fcr-card__badges">
                              <span className={`fcr-badge ${facility.nhis === 'confirmed' ? 'fcr-badge--nhis' : 'fcr-badge--nhis-likely'}`}>
                                <Check size={11} /> {facility.nhis === 'confirmed' ? 'NHIS Accepted' : 'NHIS likely (public facility)'}
                              </span>
                            </div>
                          )}

                          <div className="fcr-card__actions">
                            {hasPhone && (
                              <a className="fcr-action-btn fcr-action-btn--call" href={`tel:${facility.phone}`} onClick={e => e.stopPropagation()}>
                                <Phone size={14} /> Call
                              </a>
                            )}
                            {hasPhone && (
                              <a className="fcr-action-btn fcr-action-btn--whatsapp" href={toWhatsAppLink(facility.phone)}
                                target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                <MessageCircle size={14} /> WhatsApp
                              </a>
                            )}
                            <a className="fcr-action-btn" href={`https://maps.google.com/?q=${facility.coordinates[0]},${facility.coordinates[1]}`}
                              target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                              <ExternalLink size={14} /> Directions
                            </a>
                          </div>
                        </div>
                      );
                    }

                    // ── BROWSE STATE: existing detailed card, unchanged except for
                    // the removal of fabricated rating/services/specializations/insurance ──
                    return (
                    <div key={facility.id} className="facility-finder-list-card">
                      <div className="facility-card-header">
                        <div className={`facility-card-icon ${facility.type}`}>
                          {React.createElement(FacIcon, { size: 28 })}
                        </div>
                        <div className="facility-card-info">
                          <h3 className="facility-card-name">{facility.name}</h3>
                          <p className="facility-card-location">
                            <MapPin size={14} />
                            {[facility.address, facility.city].filter(Boolean).join(', ') || 'Address not available'}
                          </p>
                          <p className="facility-card-distance">{facility.distance.toFixed(1)} km away</p>
                        </div>
                      </div>
                      
                      <div className="facility-card-quick-info">
                        <div className={`quick-info-item status-item ${isOpen ? 'open' : isUnknown ? 'unknown' : 'closed'}`}>
                          <span className={`status-dot ${isOpen ? 'open' : isUnknown ? 'unknown' : 'closed'}`} />
                          <span>{statusLabel}</span>
                          {facility.hours && facility.hours !== 'Call for hours' && facility.hours !== '24/7' && (
                            <span className="hours-detail">· {facility.hours}</span>
                          )}
                        </div>
                        {hasPhone && (
                          <div className="quick-info-item">
                            <Phone size={14} />
                            <span>{facility.phone}</span>
                          </div>
                        )}
                        {facility.emergencyServices && (
                          <div className="quick-info-item emergency">
                            <AlertCircle size={14} />
                            <span>Emergency Services Available</span>
                          </div>
                        )}
                        {facility.nhis !== 'none' && (
                          <div className="quick-info-item">
                            <Check size={14} />
                            <span>{facility.nhis === 'confirmed' ? 'NHIS Accepted' : 'NHIS likely (public facility)'}</span>
                          </div>
                        )}
                        {facility.website && (
                          <div className="quick-info-item">
                            <Globe size={14} />
                            <a
                              href={facility.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="facility-website-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>
                      
                      <div className="facility-card-actions">
                        <button 
                          className="facility-card-btn facility-card-btn-primary"
                          onClick={() => getDirections(facility)}
                          type="button"
                        >
                          <Navigation size={16} />
                          Get Directions
                        </button>
                        {hasPhone && (
                          <button 
                            className="facility-card-btn facility-card-btn-secondary"
                            onClick={() => window.open(`tel:${facility.phone}`, '_self')}
                            type="button"
                          >
                            <Phone size={16} />
                            Call
                          </button>
                        )}
                        <button
                          className={`facility-card-btn facility-card-btn-save${savedFacilityIds.has(facility.id) ? ' saved' : ''}`}
                          onClick={() => toggleSaveFacility(facility)}
                          disabled={isSavingFacility}
                          type="button"
                          title={savedFacilityIds.has(facility.id) ? 'Remove from saved' : 'Save facility'}
                        >
                          {savedFacilityIds.has(facility.id)
                            ? <><BookmarkCheck size={15} />Saved</>
                            : <><Bookmark size={15} />Save</>}
                        </button>
                        <button 
                          className="facility-card-btn facility-card-btn-info"
                          onClick={() => handleFacilitySelect(facility)}
                          type="button"
                        >
                          <Info size={16} />
                          Details
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {isResultsMode && (
          <div className="fcr-emergency-footer">
            <PhoneCall size={14} />
            <span>Think this is an emergency? <Link href="/emergency">Emergency Hub</Link></span>
          </div>
        )}
      </div>

      {selectedFacility && (() => {
        const { label: statusLabel, isOpen, isUnknown } = getOpenStatus(selectedFacility.hours, selectedFacility.emergencyServices);
        const hasPhone = !!selectedFacility.phone;
        return (
        <div className="facility-detail-panel">
          <div className="facility-detail-content">
            <button
              className="modal-close-btn"
              onClick={() => {
                setSelectedFacility(null);
                // Re-open the marker popup after panel closes so the tag is visible
                if (mapFocusFacility) {
                  setTimeout(() => {
                    const event = new CustomEvent('reopenFacilityPopup', {
                      detail: { facilityId: mapFocusFacility.id }
                    });
                    window.dispatchEvent(event);
                  }, 120);
                }
              }}
              type="button"
            >×</button>

            {/* Drag handle — real flex child (not ::before) so flex column stays intact */}
            <div className="facility-detail-drag-handle" />

            {/* Scrollable section */}
            <div className="facility-detail-scroll">
            <div className="facility-detail-header">
              <div className={`facility-detail-icon ${selectedFacility.type}`}>
                {React.createElement(getFacilityIconComponent(selectedFacility.type), { size: 32 })}
              </div>
              <div className="facility-detail-title">
                <h2>{selectedFacility.name}</h2>
                <p className="facility-detail-type">
                  {selectedFacility.typeLabel} in {selectedFacility.city}
                </p>
                <p className="facility-detail-distance">{selectedFacility.distance.toFixed(1)} km from your location</p>
              </div>
              <div className="facility-detail-rating fac-no-rating">No ratings yet</div>
            </div>
            
            <div className="facility-detail-body">
              <div className="detail-section">
                <h3>Contact Information</h3>
                <p><MapPin size={16} /> {[selectedFacility.address, selectedFacility.city, selectedFacility.region].filter(Boolean).join(', ') || 'Address not available'}</p>
                {hasPhone && <p><Phone size={16} /> {selectedFacility.phone}</p>}
                <p>
                  <span className={`status-dot ${isOpen ? 'open' : isUnknown ? 'unknown' : 'closed'}`} style={{ display: 'inline-block', marginRight: 6 }} />
                  <strong style={{ color: isOpen ? 'var(--hc-mint)' : isUnknown ? 'var(--hc-text2)' : 'var(--hc-red)' }}>{statusLabel}</strong>
                  {selectedFacility.hours && selectedFacility.hours !== '24/7' && selectedFacility.hours !== 'Call for hours' && (
                    <span style={{ color: 'var(--hc-text2)', marginLeft: 6 }}>· {selectedFacility.hours}</span>
                  )}
                </p>
                {selectedFacility.website && (
                  <p>
                    <Globe size={16} />
                    <a
                      href={selectedFacility.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="facility-website-link"
                    >
                      {selectedFacility.website.replace(/^https?:\/\//, '')}
                    </a>
                  </p>
                )}
              </div>
              
              <div className="detail-section">
                <h3>NHIS & Insurance</h3>
                {selectedFacility.nhis !== 'none' ? (
                  <div className="detail-insurance-tags">
                    <span className="detail-insurance-tag">
                      {selectedFacility.nhis === 'confirmed' ? 'NHIS Accepted' : 'NHIS likely (public facility)'}
                    </span>
                  </div>
                ) : (
                  <p style={{ color: 'var(--hc-text2)', fontSize: 13 }}>No NHIS signal available for this facility — call ahead to confirm.</p>
                )}
                {selectedFacility.emergencyServices && (
                  <div className="emergency-service-notice">
                    <AlertCircle size={16} />
                    <span>24/7 Emergency Services Available</span>
                  </div>
                )}
              </div>
            </div>
            </div>{/* end facility-detail-scroll */}
            
            <div className="facility-detail-actions">
              <button className="detail-action-btn primary" onClick={() => getDirections(selectedFacility)} type="button">
                <Navigation size={16} />
                Directions
              </button>
              {hasPhone && (
                <button className="detail-action-btn secondary" onClick={() => window.open(`tel:${selectedFacility.phone}`, '_self')} type="button">
                  <Phone size={16} />
                  Call
                </button>
              )}
              {hasPhone && (
                <button className="detail-action-btn secondary" onClick={() => window.open(toWhatsAppLink(selectedFacility.phone), '_blank')} type="button">
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              )}
              <button
                className={`detail-action-btn save-btn${savedFacilityIds.has(selectedFacility.id) ? ' saved' : ''}`}
                onClick={() => toggleSaveFacility(selectedFacility)}
                disabled={isSavingFacility}
                type="button"
                title={savedFacilityIds.has(selectedFacility.id) ? 'Remove from saved' : 'Save facility'}
              >
                {savedFacilityIds.has(selectedFacility.id)
                  ? <><BookmarkCheck size={16} />Saved</>
                  : <><Bookmark size={16} />Save</>}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Dashboard Footer */}
      <DashbordFooter />

    </div>
    </DashboardLayout>
  );
}
export default function DynamicFacilityFinder() {
  return (
    <Suspense fallback={
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-title">Loading...</div>
        </div>
      </div>
    }>
      <DynamicFacilityFinderInner />
    </Suspense>
  );
}