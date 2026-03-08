'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardHeader from '@/components/DashboardHeader';
import { trackActivity, activityTypes } from '@/lib/activityTracker';
import '@/styles/facilities.css';
import '@/styles/facilities-mobile.css';
import '@/styles/facilities-layout-fix.css';
import { 
  Search, MapPin, Phone, Clock, Star, Heart, Hospital, Pill, 
  Stethoscope, Map, List, Locate, Navigation, AlertCircle, 
  Filter, ChevronDown, ChevronRight, Info, Loader2, RefreshCw, Bell, User,
  Check, X, Moon, Sun, Crosshair, Bot, Globe, Bookmark, BookmarkCheck
} from 'lucide-react';

// Type definitions
interface Facility {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center';
  address: string;
  city: string;
  region: string;
  distance: number;
  rating: number;
  reviews: number;
  phone: string;
  hours: string;
  services: string[];
  coordinates: [number, number];
  emergencyServices: boolean;
  insurance: string[];
  specializations?: string[];
  website?: string;
}

interface LocationInfo {
  city?: string;
  region?: string;
  country?: string;
  accuracy?: number;
}

// Deterministic pseudo-random from a string seed — xorshift32 variant
function seededRandom(seed: string): number {
  let h = 2166136261; // FNV offset basis
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (Math.imul(h, 16777619)) >>> 0; // FNV-1a multiply, keep unsigned 32-bit
  }
  // xorshift to scatter the bits further
  h ^= h >>> 13; h = (Math.imul(h, 0x5bd1e995)) >>> 0; h ^= h >>> 15;
  return h / 4294967295;
}

// ── Opening-hours parser for common OSM formats ──────────────────
// Handles: "24/7", "Mo-Fr 08:00-17:00", "Mo-Sa 08:00-18:00; Su 09:00-13:00",
//           "08:00-17:00" (time-only), "Mo-Fr 08:00-17:00; PH off", etc.
const DAY_IDX: Record<string,number> = {
  mo:0, tu:1, we:2, th:3, fr:4, sa:5, su:6,
  mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6,
};
function parseOsmHours(raw: string): { label: string; isOpen: boolean } {
  if (!raw || raw.trim() === '' || raw.toLowerCase() === 'call for hours') {
    return { label: 'Hours unknown', isOpen: false };
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
  return { label: 'Hours unknown', isOpen: false };
}

function getOpenStatus(hours: string, emergencyServices: boolean): { label: string; isOpen: boolean } {
  if (emergencyServices) return { label: 'Open 24/7', isOpen: true };
  if (hours === '24/7') return { label: 'Open 24/7', isOpen: true };
  return parseOsmHours(hours);
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
          // Already granted — the main component handles auto-fetch, just hide banner
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
      }).catch(() => {
        setTimeout(() => setIsVisible(true), 500);
      });
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
    <div className="location-permission-banner">
      <div className="location-banner-icon">
        <MapPin size={28} />
      </div>
      
      <div className="location-banner-content">
        <h3 className="location-banner-title">
          <Navigation size={18} />
          Enable Location for Accurate Results
        </h3>
        <p className="location-banner-description">
          Allow us to access your location to find the nearest healthcare facilities in your area. 
          We use GPS for the most accurate results.
        </p>
        
        <div className="location-banner-benefits">
          <div className="location-benefit">
            <Check size={14} />
            <span>GPS-accurate distances</span>
          </div>
          <div className="location-benefit">
            <Check size={14} />
            <span>Find nearby facilities</span>
          </div>
          <div className="location-benefit">
            <Check size={14} />
            <span>Real-time directions</span>
          </div>
          <div className="location-benefit">
            <Check size={14} />
            <span>Emergency services</span>
          </div>
        </div>
      </div>
      
      <div className="location-banner-actions">
        <button
          className="facility-finder-location-btn"
          onClick={onEnableLocation}
          disabled={isLoading}
          type="button"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="spin" />
              <span>Locating...</span>
            </>
          ) : (
            <>
              <Crosshair size={20} />
              <span>Enable GPS</span>
            </>
          )}
        </button>
        
        <button
          className="facility-finder-location-btn location-btn-secondary"
          onClick={handleDismiss}
          disabled={isLoading}
          type="button"
        >
          <span>Maybe Later</span>
        </button>
      </div>
      
      <button
        className="location-banner-close"
        onClick={handleDismiss}
        aria-label="Close banner"
        type="button"
      >
        <X size={18} />
      </button>
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
  return (
    <div className="location-confirmation">
      <div className="location-confirmation-icon">
        <MapPin size={20} />
      </div>
      <div className="location-confirmation-content">
        <strong>Your location detected</strong>
        {locationInfo?.city && locationInfo?.region ? (
          <p>{locationInfo.city}, {locationInfo.region}</p>
        ) : (
          <p>Coordinates: {location[0].toFixed(4)}°N, {Math.abs(location[1]).toFixed(4)}°W</p>
        )}
        {locationInfo?.accuracy && (
          <small className={locationInfo.accuracy < 100 ? 'accuracy-good' : 'accuracy-low'}>
            Accuracy: ±{Math.round(locationInfo.accuracy)}m 
            {locationInfo.accuracy < 100 ? ' (GPS)' : ' (Network)'}
          </small>
        )}
      </div>
      <button
        className="location-refresh-btn"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh location"
      >
        <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
      </button>
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
              <span className="saved-chip__meta">{facility.distance.toFixed(1)} km · {facility.type.replace('_', ' ')}</span>
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

export default function DynamicFacilityFinder() {
  // Component will export at the end
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  const searchParams = useSearchParams();

  // State management — seed search from ?q= URL param if present
  const [searchQuery, setSearchQuery] = useState(() => searchParams?.get('q') ?? '');
  const [searchActive, setSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRadius, setSelectedRadius] = useState('10000');
  const [sortBy, setSortBy] = useState('distance');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | undefined>();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationBanner, setShowLocationBanner] = useState(true);
  const [savedFacilityIds, setSavedFacilityIds] = useState<Set<string>>(new Set());
  const [isSavingFacility, setIsSavingFacility] = useState(false);

  /* ── Notification panel ────────────────────────────────────── */
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifsRead,     setNotifsRead]     = useState(false);
  const notifMobRef   = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  
  // Mobile navigation state
  const [activeBottomTab, setActiveBottomTab] = useState<string>('facilities');

  // Sidebar collapsed state — kept for :has()-unsupported browsers only.
  // Primary layout is driven by CSS :has() in facilities-layout-fix.css
  // which works before JS hydrates and eliminates blank-page flash.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Ref for smooth scrolling
  const mapViewRef    = useRef<HTMLDivElement>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight Overpass fetch on unmount
  useEffect(() => { return () => { fetchAbortRef.current?.abort(); }; }, []);

  // Track sidebar for fallback class on browsers without :has()
  useEffect(() => {
    const sidebar = document.querySelector('.hc-sidebar');
    if (!sidebar) return;
    const check = () => setSidebarCollapsed(sidebar.classList.contains('hc-sidebar--collapsed'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  // On mount: if ?q param was passed, clear it from the URL (keep the UI clean)
  // but keep the searchQuery state so filtering works immediately.
  useEffect(() => {
    const q = searchParams?.get('q') ?? null;
    if (q) {
      // Replace URL without the param so back-button works cleanly
      window.history.replaceState({}, '', '/facilities');
      setSearchQuery(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mount: if geolocation permission is already granted, auto-fetch without showing banner
  useEffect(() => {
    if (status !== 'authenticated') return;
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
  }, [status]);

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
    switch (type) {
      case 'hospital': return Hospital;
      case 'pharmacy': return Pill;
      case 'clinic': return Stethoscope;
      case 'health_center': return Heart;
      default: return Hospital;
    }
  }, []);

  // Handle facility selection with tracking
  const handleFacilitySelect = useCallback(async (facility: Facility) => {
    setSelectedFacility(facility);
    
    // Track this activity
    try {
      await trackActivity(
        activityTypes.FACILITY_FOUND,
        `Found ${facility.name}`,
        `${facility.type.replace('_', ' ')} • ${facility.distance.toFixed(1)} km away`,
        {
          facilityId: facility.id,
          facilityName: facility.name,
          facilityType: facility.type,
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
    setIsLoadingFacilities(true);
    setError(null);
    

    
    try {
      let allFacilities: Facility[] = [];
      
      // Fetch from Overpass API (OpenStreetMap)
      try {
        // nwr = node|way|relation shorthand; out center body gives coords for ways/relations too
        const overpassQuery = `
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
            nwr["healthcare"](around:${radius},${lat},${lng});
            nwr["healthcare:speciality"](around:${radius},${lat},${lng});
          );
          out center body;
        `;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('timeout'), 55000);

        // Strategy: try our own server-side proxy first (bypasses CORS + browser rate-limits),
        // then fall back to direct mirror calls in case the proxy itself is unreachable.
        const DIRECT_MIRRORS = [
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
          'https://overpass.openstreetmap.ru/api/interpreter',
        ];

        const fetchWithRetry = async (): Promise<any> => {
          // ── 1. Always try the server-side proxy first ──────────────
          // The proxy uses the server's IP (no CORS, no browser rate-limit)
          // and shuffles across 5 mirrors with GET fallback automatically.
          try {
            const proxyResp = await fetch('/api/overpass', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: overpassQuery }),
              signal: controller.signal,
            });
            if (proxyResp.ok) {
              const data = await proxyResp.json();
              if (data?.elements) return data;
              // Proxy returned 200 but no elements — try direct as fallback
            }
            // Non-ok (502 all mirrors failed) — try direct mirrors from browser
          } catch (e: any) {
            if (e?.name === 'AbortError') throw e;
            // Proxy unreachable (e.g. dev without the API route) — try direct
          }

          // ── 2. Browser direct fallback (best-effort, may hit CORS/rate-limits) ──
          for (const mirror of DIRECT_MIRRORS) {
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                const resp = await fetch(mirror, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                  },
                  body: `data=${encodeURIComponent(overpassQuery)}`,
                  signal: controller.signal,
                });
                if (resp.status === 429) {
                  if (attempt === 0) {
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                  }
                  break; // try next mirror
                }
                if (resp.ok) {
                  const data = await resp.json();
                  if (data?.elements) return data;
                }
                break;
              } catch (e: any) {
                if (e?.name === 'AbortError') throw e;
                break; // network/CORS error — try next mirror
              }
            }
          }

          // All sources exhausted — return null so the caller shows a friendly error
          return null;
        };

        let overpassData: any;
        try {
          overpassData = await fetchWithRetry();
          clearTimeout(timeoutId);
        } catch (overpassError: any) {
          clearTimeout(timeoutId);
          const isAbort   = overpassError?.name === 'AbortError';
          const isTimeout = isAbort && overpassError?.message === 'timeout';

          if (isAbort && !isTimeout) {
            // Silent abort (component unmount / navigation)
            setIsLoadingFacilities(false);
            return;
          }
          if (isTimeout) {
            setError('Request timed out. Try a smaller radius or check your connection.');
          } else {
            setError('Unable to load facilities. Check your internet connection and try again.');
          }
          setFacilities([]);
          setIsLoadingFacilities(false);
          return;
        }

        // fetchWithRetry returns null when all sources are exhausted (no throw)
        if (overpassData === null) {
          clearTimeout(timeoutId);
          setError('Map data service is temporarily unavailable. Please wait a moment and tap "Try Again".');
          setFacilities([]);
          setIsLoadingFacilities(false);
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
                
                const amenity = element.tags.amenity || element.tags.healthcare || 'clinic';
                const distance = calculateDistance(lat, lng, coords[0], coords[1]);
                
                if (distance > radius / 1000) return;
                
                let type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center' = 'clinic';
                const hc = element.tags.healthcare || '';
                if (amenity === 'hospital' || hc === 'hospital') {
                  type = 'hospital';
                } else if (amenity === 'pharmacy' || hc === 'pharmacy') {
                  type = 'pharmacy';
                } else if (
                  hc === 'centre' || hc === 'center' || hc === 'health_centre' ||
                  hc === 'community_health_centre' || hc === 'health_post' ||
                  amenity === 'health_post'
                ) {
                  type = 'health_center';
                } else if (
                  amenity === 'doctors' || amenity === 'clinic' ||
                  amenity === 'dentist' || amenity === 'laboratory' ||
                  amenity === 'nursing_home' ||
                  hc === 'doctor' || hc === 'general_practitioner' ||
                  hc === 'outpatient' || hc === 'clinic' ||
                  hc === 'dentist' || hc === 'laboratory' ||
                  hc === 'maternity' || hc === 'blood_bank' ||
                  hc === 'optometrist' || hc === 'physiotherapist'
                ) {
                  type = 'clinic';
                }
                
                const services: string[] = [];
                if (element.tags.emergency === 'yes') services.push('Emergency Care');
                if (element.tags['healthcare:speciality']) {
                  const specialties = element.tags['healthcare:speciality'].split(';')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0);
                  services.push(...specialties.slice(0, 5));
                }
                
                // Add amenity-specific defaults when OSM doesn't provide speciality tags
                if (amenity === 'dentist' || hc === 'dentist') {
                  if (!services.includes('Dentistry')) services.push('Dentistry', 'Oral Health', 'Dental Consultations');
                } else if (amenity === 'laboratory' || hc === 'laboratory') {
                  if (!services.includes('Laboratory')) services.push('Laboratory Tests', 'Diagnostics', 'Blood Tests');
                } else if (hc === 'maternity') {
                  if (!services.includes('Maternity')) services.push('Maternity Care', 'Antenatal', 'Delivery Services');
                } else if (hc === 'optometrist') {
                  if (!services.includes('Optometry')) services.push('Eye Care', 'Vision Tests', 'Optometry');
                } else if (hc === 'physiotherapist') {
                  if (!services.includes('Physiotherapy')) services.push('Physiotherapy', 'Rehabilitation');
                }
                if (services.length < 2) {
                  if (type === 'hospital') {
                    services.push('Inpatient Care', 'General Medicine', 'Outpatient Care');
                  } else if (type === 'pharmacy') {
                    services.push('Prescriptions', 'OTC Medications', 'Health Consultations');
                  } else if (type === 'clinic') {
                    services.push('Outpatient Care', 'Consultations', 'Basic Treatment');
                  } else if (type === 'health_center') {
                    services.push('Primary Care', 'Preventive Services', 'Basic Treatment');
                  }
                }
                
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
                const rng1 = seededRandom(osmId + '_rating');
                const rng2 = seededRandom(osmId + '_reviews');
                allFacilities.push({
                  id: osmId,
                  name,
                  type,
                  address,
                  city,
                  region,
                  distance,
                  rating: parseFloat((3.5 + rng1 * 1.5).toFixed(1)),
                  reviews: 20 + Math.floor(rng2 * 280),
                  phone: (() => {
                    const raw = element.tags.phone || element.tags['contact:phone'] || element.tags['phone:mobile'] || element.tags['contact:mobile'] || '';
                    // Normalise: keep +, digits, spaces, dashes only
                    return raw.replace(/[^+0-9\s\-]/g, '').trim();
                  })(),
                  hours: element.tags.opening_hours || (type === 'hospital' && element.tags.emergency === 'yes' ? '24/7' : 'Call for hours'),
                  services: services.slice(0, 8),
                  coordinates: coords as [number, number],
                  emergencyServices: element.tags.emergency === 'yes' || element.tags['emergency_service'] === 'yes',
                  insurance: (() => {
                    const ins: string[] = [];
                    const nhisTag = element.tags['healthcare:insurance'] || element.tags['payment:nhis'];
                    if (nhisTag === 'yes' || nhisTag === 'only' || nhisTag == null) ins.push('NHIS');
                    if (element.tags['payment:private_insurance'] === 'yes' || nhisTag == null) ins.push('Private');
                    if (element.tags['payment:cash'] !== 'no') ins.push('Cash');
                    return ins.length > 0 ? ins : ['NHIS', 'Private', 'Cash'];
                  })(),
                  specializations: services.slice(0, 3),
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
      
      setFacilities(facilitiesInRadius.slice(0, 100));
      
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setError('Failed to load healthcare facilities. Please try again.');
      setFacilities([]);
    } finally {
      setIsLoadingFacilities(false);
    }
  }, [calculateDistance]);

  // Get current location with high accuracy
  const getCurrentLocation = useCallback(() => {
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
        if (accuracy >= bestAccuracy) return; // already have a better fix
        bestAccuracy = accuracy;
        const location: [number, number] = [latitude, longitude];

        setUserLocation(location);
        setLocationPermission('granted');
        const info = await reverseGeocode(latitude, longitude);
        setLocationInfo({ ...info, accuracy });

        // Fetch nearby facilities
        await fetchNearbyFacilities(latitude, longitude, parseInt(selectedRadius), info);
        setIsLoadingLocation(false);

        // Switch to map view
        setViewMode('map');

        // Scroll to map view smoothly
        setTimeout(() => {
          mapViewRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 300);

        // If accuracy > 500m, try a watch for a better GPS fix (silent background update)
        if (accuracy > 500) {
          const watchId = navigator.geolocation.watchPosition(
            async (pos2) => {
              if (pos2.coords.accuracy < bestAccuracy - 50) {
                bestAccuracy = pos2.coords.accuracy;
                const loc2: [number, number] = [pos2.coords.latitude, pos2.coords.longitude];
                setUserLocation(loc2);
                setLocationInfo(prev => ({ ...prev, accuracy: pos2.coords.accuracy }));
                // Silent background re-fetch
                await fetchNearbyFacilities(pos2.coords.latitude, pos2.coords.longitude, parseInt(selectedRadius));
              }
              navigator.geolocation.clearWatch(watchId);
            },
            () => navigator.geolocation.clearWatch(watchId),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        }
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
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0   // always get fresh fix when user taps GPS button
      }
    );
  }, [selectedRadius, fetchNearbyFacilities, reverseGeocode]);

  // Refetch when radius changes
  useEffect(() => {
    if (userLocation && status === 'authenticated') {
      const timeoutId = setTimeout(() => {

       fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius));
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedRadius, userLocation, status, fetchNearbyFacilities]);

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
      { text: normaliseStr(facility.type.replace(/_/g, ' ')),       weight:  6 },
      { text: normaliseStr(facility.city),                           weight:  5 },
      { text: normaliseStr(facility.region),                         weight:  4 },
      { text: normaliseStr(facility.address),                        weight:  3 },
      { text: facility.services.map(s => normaliseStr(s)).join(' '), weight:  4 },
      { text: (facility.specializations ?? []).map(s => normaliseStr(s)).join(' '), weight: 3 },
      { text: facility.emergencyServices ? 'emergency 24 7 247' : '', weight: 5 },
      { text: facility.insurance.map(s => normaliseStr(s)).join(' '), weight: 2 },
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

  const filteredFacilities = facilities
    .map(f => ({ f, score: scoreMatch(f, searchQuery) }))
    .filter(({ score, f }) => score > 0 && (selectedType === 'all' || f.type === selectedType))
    .sort((a, b) => {
      if (searchQuery.trim() && a.score !== b.score) return b.score - a.score;
      switch (sortBy) {
        case 'rating':   return b.f.rating - a.f.rating;
        case 'name':     return a.f.name.localeCompare(b.f.name);
        case 'reviews':  return b.f.reviews - a.f.reviews;
        default:         return a.f.distance - b.f.distance;
      }
    })
    .map(({ f }) => f);

  // User info
  const userName: string = session?.user?.name || 'User';
  const userEmail: string | null = session?.user?.email || null;
  const userImage: string | null = (session?.user as any)?.image || null;
  const userInitials: string = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  // Bottom navigation handler
  const handleBottomNavClick = (path: string, tab: string) => {
    setActiveBottomTab(tab);
    router.push(path);
  };

  /* ── Notification panel logic ────────────────────────────────── */
  useEffect(() => {
    if (!showNotifPanel) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        notifPanelRef.current && !notifPanelRef.current.contains(t) &&
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

    // Location not granted — always first
    if (!userLocation && locationPermission !== 'granted') {
      list.push({
        id: 'location',
        icon: locationPermission === 'denied' ? AlertCircle : Crosshair,
        color: locationPermission === 'denied' ? 'red' : 'amber',
        title: locationPermission === 'denied'
          ? 'Location access blocked'
          : 'Enable GPS to find facilities near you',
        body: locationPermission === 'denied'
          ? 'Open your browser settings, allow location access, then refresh the page.'
          : 'Grant location access so we can show hospitals, clinics and pharmacies closest to you.',
        action: locationPermission === 'denied' ? undefined : getCurrentLocation,
      });
    }

    // Low GPS accuracy — results may be off
    if (userLocation && locationInfo?.accuracy && locationInfo.accuracy > 500)
      list.push({
        id: 'low-accuracy',
        icon: Crosshair,
        color: 'amber',
        title: `Low GPS accuracy — ±${Math.round(locationInfo.accuracy)}m`,
        body: 'Your location fix is weak. Results may not reflect your exact position. Tap to retry GPS.',
        action: getCurrentLocation,
      });

    // Search active but filtered list is empty (raw facilities exist, query filters them all out)
    if (searchQuery.trim() && facilities.length > 0 && !isLoadingFacilities)
      list.push({
        id: 'empty-search',
        icon: Search,
        color: 'amber',
        title: `No results for "${searchQuery}"`,
        body: 'Try a different search term, change the facility type filter, or increase the radius.',
      });

    // Selected facility has emergency services — nudge to save it
    if (selectedFacility?.emergencyServices && !savedFacilityIds.has(selectedFacility.id))
      list.push({
        id: 'save-er',
        icon: BookmarkCheck,
        color: 'teal',
        title: `Save ${selectedFacility.name}?`,
        body: 'This facility has emergency services. Bookmark it so you can find it instantly in a crisis.',
        action: () => toggleSaveFacility(selectedFacility),
      });
    if (userLocation && !isLoadingFacilities && facilities.length === 0 && !error) {
      const radiusKm = Math.round(parseInt(selectedRadius) / 1000);
      list.push({
        id: 'no-results',
        icon: MapPin,
        color: 'amber',
        title: 'No facilities found nearby',
        body: `Nothing found within ${radiusKm} km. Try increasing your search radius in the filters.`,
        action: () => setShowFilters(true),
      });
    }

    // Fetch error
    if (error) {
      list.push({
        id: 'error',
        icon: AlertCircle,
        color: 'red',
        title: 'Could not load facilities',
        body: 'There was a problem fetching nearby facilities. Tap to retry.',
        action: userLocation
          ? () => fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius))
          : undefined,
      });
    }

    // Saved facilities nudge
    if (savedFacilityIds.size > 0) {
      list.push({
        id: 'saved',
        icon: BookmarkCheck,
        color: 'teal',
        title: `${savedFacilityIds.size} saved ${savedFacilityIds.size === 1 ? 'facility' : 'facilities'}`,
        body: 'View your saved facilities on the profile page or scroll up to the saved bar.',
        action: () => router.push('/profile'),
      });
    }

    // Location found — show city/accuracy info as a positive confirmation
    if (userLocation && locationInfo?.city && facilities.length > 0) {
      list.push({
        id: 'located',
        icon: MapPin,
        color: 'mint',
        title: `Showing facilities near ${locationInfo.city}`,
        body: `${facilities.length} healthcare ${facilities.length === 1 ? 'facility' : 'facilities'} found within ${Math.round(parseInt(selectedRadius) / 1000)} km.${locationInfo.accuracy ? ` GPS accuracy ±${Math.round(locationInfo.accuracy)}m.` : ''}`,
      });
    }

    if (list.length === 0)
      list.push({ id: 'empty', icon: MapPin, color: 'mint', title: 'No new notifications', body: 'Enable GPS to start finding nearby healthcare facilities.' });

    return list;
  }, [userLocation, locationPermission, facilities, isLoadingFacilities, error, savedFacilityIds, locationInfo, selectedRadius, searchQuery, selectedFacility, getCurrentLocation, fetchNearbyFacilities, toggleSaveFacility, router]);

  const hasUnread = notifications.some(n => !['empty', 'located'].includes(n.id)) && !notifsRead;
  const toggleNotifPanel = () => { setShowNotifPanel(p => !p); setNotifsRead(true); };

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Heart size={32} className="loading-icon" />
          <div className="loading-title">Loading Ghana Health Network...</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className={`facility-finder${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Dashboard Header — desktop sidebar */}
      <DashboardHeader activeTab="/facilities" />

      {/* ── Mobile sticky top bar (matches dashboard mob-topbar) ── */}
      <div className="mob-topbar fac-mob-topbar">
        <div className="mob-topbar__left">
          <Heart size={18} className="mob-topbar__logo-icon" />
          <span className="mob-topbar__logo-text">HealthConnect</span>
        </div>
        <div className="mob-topbar__right">
          {/* Dark / Light mode toggle */}
          <button
            className="mob-topbar__btn"
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {/* GPS locate button */}
          <button
            className={`mob-topbar__btn fac-mob-gps-btn${isLoadingLocation ? ' loading' : ''}`}
            type="button"
            onClick={getCurrentLocation}
            disabled={isLoadingLocation}
            aria-label="Find near me"
          >
            {isLoadingLocation
              ? <Loader2 size={18} className="spin" />
              : <Crosshair size={18} />}
          </button>
          <button
            ref={notifMobRef}
            className="mob-topbar__btn mob-topbar__bell"
            type="button"
            aria-label="Notifications"
            onClick={toggleNotifPanel}
          >
            <Bell size={18} />
            {hasUnread && <span className="mob-topbar__bell-dot" />}
          </button>
          <button
            className="mob-topbar__avatar-btn"
            type="button"
            onClick={() => router.push('/profile')}
          >
            <div className="mob-topbar__avatar">
              {userImage
                ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" />
                : userInitials}
            </div>
          </button>
        </div>
      </div>

      {/* Notification panel */}
      {showNotifPanel && (
        <>
          <div className="db-notif-panel" ref={notifPanelRef} role="dialog" aria-label="Notifications">
            <div className="db-notif-panel__header">
              <span className="db-notif-panel__title">Notifications</span>
              {notifications.some(n => !['empty', 'located'].includes(n.id)) && (
                <span className="db-notif-panel__count">
                  {notifications.filter(n => !['empty', 'located'].includes(n.id)).length}
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

      {/* Main Content */}
      <div className="facility-finder-content">
        <div className="facility-finder-page-header">
          <h2>Find Healthcare Facilities</h2>
          <p className="facility-finder-page-subtitle">
            Click "Find Near Me" to discover healthcare facilities in your area using GPS
          </p>
          <div className="facility-finder-header-actions">
            <button
              className="facility-finder-notif-btn"
              type="button"
              aria-label="Notifications"
              onClick={toggleNotifPanel}
            >
              <Bell size={20} />
              {hasUnread && <span className="facility-finder-notif-dot" />}
            </button>
            <button 
              className={`facility-finder-location-btn ${isLoadingLocation ? 'loading' : ''}`}
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              type="button"
            >
              {isLoadingLocation ? <Loader2 size={20} className="spin" /> : <Crosshair size={20} />}
              <span>{isLoadingLocation ? 'Getting GPS Location...' : 'Find Near Me (GPS)'}</span>
            </button>
          </div>
        </div>

        {/* Location Permission Banner */}
        {showLocationBanner && !userLocation && (
          <LocationPermissionBanner
            onEnableLocation={getCurrentLocation}
            onDismiss={() => setShowLocationBanner(false)}
            isLoading={isLoadingLocation}
          />
        )}

        {/* Location Confirmation */}
        {userLocation && (
          <LocationConfirmation
            location={userLocation}
            locationInfo={locationInfo}
            onRefresh={getCurrentLocation}
            isRefreshing={isLoadingLocation}
          />
        )}

        {/* Search and Filters */}
        <div className="facility-finder-controls">
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
                placeholder="Search by name, type, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchActive(true)}
                onBlur={() => setSearchActive(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    searchInputRef.current?.blur();
                  }
                }}
                className="facility-finder-search-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {/* Clear button — shown only when there is a query */}
              {searchQuery && (
                <button
                  type="button"
                  className="facility-finder-search-clear"
                  aria-label="Clear search"
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
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

            {/* Type filter pills — shown below search bar on all screen sizes */}
            <div className="facility-type-pills">
              {[
                { value: 'all',           label: 'All' },
                { value: 'hospital',      label: 'Hospitals' },
                { value: 'clinic',        label: 'Clinics' },
                { value: 'pharmacy',      label: 'Pharmacies' },
                { value: 'health_center', label: 'Health Centres' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`type-pill${selectedType === opt.value ? ' active' : ''}`}
                  onClick={() => setSelectedType(opt.value)}
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
                    <option value="rating">Sort: Rating</option>
                    <option value="reviews">Sort: Reviews</option>
                    <option value="name">Sort: Name</option>
                  </select>

                  <div className="facility-finder-radius-select">
                    <span className="radius-label">Radius:</span>
                    {[
                      { value: '5000',  label: '5km' },
                      { value: '10000', label: '10km' },
                      { value: '20000', label: '20km' },
                      { value: '50000', label: '50km' },
                    ].map(r => (
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
                      onClick={() => fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius))}
                      disabled={isLoadingFacilities}
                      type="button"
                    >
                      {isLoadingFacilities ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                      Refresh
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

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
                  {isLoadingFacilities ? (
                    <div className="loading-facilities">
                      <Loader2 size={24} className="spin" />
                      <p>Loading healthcare facilities...</p>
                      <small>Searching OpenStreetMap database...</small>
                    </div>
                  ) : filteredFacilities.length === 0 ? (
                    <div className="no-facilities">
                      <Hospital size={32} />
                      <p>No facilities found</p>
                      {userLocation ? (
                        <>
                          <p>Try adjusting your search radius or filters</p>
                          <button 
                            className="location-enable-btn"
                            onClick={() => setSelectedRadius('20000')}
                            type="button"
                          >
                            Try 20km radius
                          </button>
                        </>
                      ) : (
                        <>
                          <p>Enable location to find facilities near you</p>
                          <button 
                            className="location-enable-btn"
                            onClick={getCurrentLocation}
                            type="button"
                          >
                            <Locate size={20} />
                            Enable Location
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredFacilities.map(facility => {
                      const { label: statusLabel, isOpen } = getOpenStatus(facility.hours, facility.emergencyServices);
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
                          <div className="facility-result-rating">
                            <Star size={14} className="rating-star" fill="currentColor" />
                            <span>{facility.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        
                        <div className="facility-result-details">
                          <div className="facility-badges">
                            <span className={`facility-status-badge ${isOpen ? 'open' : 'closed'}`}>
                              {statusLabel}
                            </span>
                            {facility.emergencyServices && (
                              <span className="emergency-badge">24/7 Emergency</span>
                            )}
                          </div>
                          
                          <p className="facility-result-services">
                            {facility.services.slice(0, 2).join(', ')}
                            {facility.services.length > 2 && ` +${facility.services.length - 2} more`}
                          </p>
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
              
              {isLoadingFacilities ? (
                <div className="loading-facilities-list">
                  <Loader2 size={32} className="spin" />
                  <p>Searching for healthcare facilities...</p>
                  <small>Using OpenStreetMap data for accurate results</small>
                </div>
              ) : filteredFacilities.length === 0 ? (
                <div className="no-results-message">
                  <div className="no-results-icon">
                    <Search size={48} />
                  </div>
                  <h3>No facilities found</h3>
                  {userLocation ? (
                    <>
                      <p>No healthcare facilities found within {parseInt(selectedRadius)/1000}km of your location</p>
                      <p>Try increasing the search radius or adjusting your filters</p>
                      <div className="radius-suggestions">
                        <button 
                          className="location-enable-btn"
                          onClick={() => setSelectedRadius('20000')}
                          type="button"
                        >
                          Try 20km radius
                        </button>
                        <button 
                          className="location-enable-btn"
                          onClick={() => setSelectedRadius('50000')}
                          type="button"
                        >
                          Try 50km radius
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Enable location services to find healthcare facilities near you</p>
                      <button 
                        className="location-enable-btn" 
                        onClick={getCurrentLocation} 
                        type="button"
                      >
                        <Locate size={20} />
                        Enable GPS Location
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="facility-finder-list-grid">
                  {filteredFacilities.map(facility => {
                    const { label: statusLabel, isOpen } = getOpenStatus(facility.hours, facility.emergencyServices);
                    const hasPhone = !!facility.phone;
                    return (
                    <div key={facility.id} className="facility-finder-list-card">
                      <div className="facility-card-header">
                        <div className={`facility-card-icon ${facility.type}`}>
                          {React.createElement(getFacilityIconComponent(facility.type), { size: 28 })}
                        </div>
                        <div className="facility-card-info">
                          <h3 className="facility-card-name">{facility.name}</h3>
                          <p className="facility-card-location">
                            <MapPin size={14} />
                            {[facility.address, facility.city].filter(Boolean).join(', ') || 'Address not available'}
                          </p>
                          <p className="facility-card-distance">{facility.distance.toFixed(1)} km away</p>
                        </div>
                        <div className="facility-card-rating">
                          <div className="rating-display">
                            <Star size={16} className="rating-star" fill="currentColor" />
                            <span className="rating-value">{facility.rating.toFixed(1)}</span>
                          </div>
                          <span className="rating-reviews">({facility.reviews} est.)</span>
                        </div>
                      </div>
                      
                      <div className="facility-card-quick-info">
                        <div className={`quick-info-item status-item ${isOpen ? 'open' : 'closed'}`}>
                          <span className={`status-dot ${isOpen ? 'open' : 'closed'}`} />
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
                      
                      <div className="facility-card-services">
                        <h4>Services Available:</h4>
                        <div className="service-tags">
                          {facility.services.slice(0, 4).map((service, index) => (
                            <span key={index} className="service-tag">{service}</span>
                          ))}
                          {facility.services.length > 4 && (
                            <span className="service-tag-more">+{facility.services.length - 4} more</span>
                          )}
                        </div>
                      </div>
                      
                      {facility.specializations && facility.specializations.length > 0 && (
                        <div className="facility-card-specializations">
                          <h4>Specializations:</h4>
                          <div className="specialization-tags">
                            {facility.specializations.map((spec, index) => (
                              <span key={index} className="specialization-tag">{spec}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="facility-card-insurance">
                        <h4>Insurance Accepted:</h4>
                        <div className="insurance-tags">
                          {facility.insurance.map((ins, index) => (
                            <span key={index} className="insurance-tag">{ins}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="facility-card-actions">
                        <button 
                          className="facility-card-btn facility-card-btn-primary"
                          onClick={() => getDirections(facility)}
                          type="button"
                        >
                          <Navigation size={18} />
                          Get Directions
                        </button>
                        {hasPhone && (
                          <button 
                            className="facility-card-btn facility-card-btn-secondary"
                            onClick={() => window.open(`tel:${facility.phone}`, '_self')}
                            type="button"
                          >
                            <Phone size={18} />
                            Call Facility
                          </button>
                        )}
                        <button 
                          className="facility-card-btn facility-card-btn-info"
                          onClick={() => handleFacilitySelect(facility)}
                          type="button"
                        >
                          <Info size={18} />
                          View Details
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
      </div>

      {selectedFacility && (() => {
        const { label: statusLabel, isOpen } = getOpenStatus(selectedFacility.hours, selectedFacility.emergencyServices);
        const hasPhone = !!selectedFacility.phone;
        return (
        <div className="facility-detail-modal" onClick={() => setSelectedFacility(null)}>
          <div className="facility-detail-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedFacility(null)} type="button">×</button>
            
            <div className="facility-detail-header">
              <div className={`facility-detail-icon ${selectedFacility.type}`}>
                {React.createElement(getFacilityIconComponent(selectedFacility.type), { size: 32 })}
              </div>
              <div className="facility-detail-title">
                <h2>{selectedFacility.name}</h2>
                <p className="facility-detail-type">
                  {selectedFacility.type.charAt(0).toUpperCase() + selectedFacility.type.slice(1).replace('_', ' ')} in {selectedFacility.city}
                </p>
                <p className="facility-detail-distance">{selectedFacility.distance.toFixed(1)} km from your location</p>
              </div>
              <div className="facility-detail-rating" title="Illustrative rating — based on facility type">
                <Star size={20} className="rating-star" fill="currentColor" />
                <span className="rating-value">{selectedFacility.rating.toFixed(1)}</span>
                <span className="rating-reviews">({selectedFacility.reviews} est.)</span>
              </div>
            </div>
            
            <div className="facility-detail-body">
              <div className="detail-section">
                <h3>Contact Information</h3>
                <p><MapPin size={16} /> {[selectedFacility.address, selectedFacility.city, selectedFacility.region].filter(Boolean).join(', ') || 'Address not available'}</p>
                {hasPhone && <p><Phone size={16} /> {selectedFacility.phone}</p>}
                <p>
                  <span className={`status-dot ${isOpen ? 'open' : 'closed'}`} style={{ display: 'inline-block', marginRight: 6 }} />
                  <strong style={{ color: isOpen ? 'var(--hc-mint)' : 'var(--hc-red)' }}>{statusLabel}</strong>
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
                <h3>Services Available</h3>
                <div className="detail-service-tags">
                  {selectedFacility.services.map((service, index) => (
                    <span key={index} className="detail-service-tag">{service}</span>
                  ))}
                </div>
              </div>
              
              <div className="detail-section">
                <h3>Insurance & Payment</h3>
                <div className="detail-insurance-tags">
                  {selectedFacility.insurance.map((ins, index) => (
                    <span key={index} className="detail-insurance-tag">{ins}</span>
                  ))}
                </div>
                {selectedFacility.emergencyServices && (
                  <div className="emergency-service-notice">
                    <AlertCircle size={16} />
                    <span>24/7 Emergency Services Available</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="facility-detail-actions">
              <button className="detail-action-btn primary" onClick={() => getDirections(selectedFacility)} type="button">
                <Navigation size={20} />
                Get Directions
              </button>
              {hasPhone && (
                <button className="detail-action-btn secondary" onClick={() => window.open(`tel:${selectedFacility.phone}`, '_self')} type="button">
                  <Phone size={20} />
                  Call Now
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
                  ? <><BookmarkCheck size={20} />Saved</>
                  : <><Bookmark size={20} />Save</>}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Dashboard Footer */}
      <footer className="dashboard-footer">
        <div className="dashboard-footer-content">
          <div className="dashboard-footer-main">
            <div className="dashboard-footer-brand">
              <div className="dashboard-footer-logo">
                <Heart size={24} className="dashboard-footer-heart" />
                <span className="dashboard-footer-brand-text">HealthConnect Navigator</span>
              </div>
              <p className="dashboard-footer-tagline">
                Connecting you to quality healthcare services across Ghana. 
                Your health, our priority.
              </p>
            </div>
            
            <div className="dashboard-footer-links">
              <div>
                <h4 className="dashboard-footer-section-title">Quick Links</h4>
                <ul className="dashboard-footer-list">
                  <li>
                    <button 
                      className="dashboard-footer-link"
                      onClick={() => router.push('/dashboard')}
                      type="button"
                    >
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <button className="dashboard-footer-link" type="button">
                      Find Facilities
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dashboard-footer-link"
                      onClick={() => router.push('/symptom-checker')}
                      type="button"
                    >
                      Symptom Checker
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dashboard-footer-link"
                      onClick={() => router.push('/emergency')}
                      type="button"
                    >
                      Emergency Services
                    </button>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="dashboard-footer-section-title">Resources</h4>
                <ul className="dashboard-footer-list">
                  <li><button className="dashboard-footer-link" type="button">Health Tips</button></li>
                  <li><button className="dashboard-footer-link" type="button">About Us</button></li>
                  <li><button className="dashboard-footer-link" type="button">Contact Support</button></li>
                  <li><button className="dashboard-footer-link" type="button">Privacy Policy</button></li>
                </ul>
              </div>
              
              <div>
                <h4 className="dashboard-footer-section-title">Support</h4>
                <ul className="dashboard-footer-list">
                  <li><button className="dashboard-footer-link" type="button">Help Center</button></li>
                  <li><button className="dashboard-footer-link" type="button">FAQs</button></li>
                  <li><button className="dashboard-footer-link" type="button">Terms of Service</button></li>
                  <li><button className="dashboard-footer-link" type="button">Feedback</button></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="dashboard-footer-bottom">
            <p className="dashboard-footer-copyright">
              © 2025 HealthConnect Navigator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Bottom tab bar — mobile only, matches dashboard mob-tab-bar */}
      <nav className="mob-tab-bar">
        <div className="mob-tab-bar__inner">
          <button
            className={`mob-tab-btn${activeBottomTab === 'dashboard' ? ' active' : ''}`}
            onClick={() => handleBottomNavClick('/dashboard', 'dashboard')}
            type="button"
          >
            <Heart size={22} />
            Home
          </button>
          <button
            className={`mob-tab-btn${activeBottomTab === 'facilities' ? ' active' : ''}`}
            onClick={() => handleBottomNavClick('/facilities', 'facilities')}
            type="button"
          >
            <MapPin size={22} />
            Find
          </button>
          <button
            className={`mob-tab-btn${activeBottomTab === 'symptom' ? ' active' : ''}`}
            onClick={() => handleBottomNavClick('/symptom-checker', 'symptom')}
            type="button"
          >
            <Bot size={22} />
            Check
          </button>
          <button
            className={`mob-tab-btn${activeBottomTab === 'emergency' ? ' active' : ''}`}
            onClick={() => handleBottomNavClick('/emergency', 'emergency')}
            type="button"
          >
            <Phone size={22} />
            SOS
          </button>
          <button
            className={`mob-tab-btn${activeBottomTab === 'profile' ? ' active' : ''}`}
            onClick={() => handleBottomNavClick('/profile', 'profile')}
            type="button"
          >
            <User size={22} />
            Profile
          </button>
        </div>
      </nav>
    </div>
  );
}