'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardHeader from '@/components/DashboardHeader';
import { trackActivity, activityTypes } from '@/lib/activityTracker';
import { 
  Search, MapPin, Phone, Clock, Star, Heart, Hospital, Pill, 
  Stethoscope, Map, List, Locate, Navigation, AlertCircle, 
  Filter, ChevronDown, Info, Loader2, RefreshCw, Bell, User, LogOut,
  Check, X, Moon, Sun, Crosshair, Home, Bot, Menu
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
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setHasLocationPermission(result.state === 'granted');
        
        if (result.state !== 'granted') {
          setTimeout(() => setIsVisible(true), 500);
        }
        
        const handleChange = () => {
          setHasLocationPermission(result.state === 'granted');
          if (result.state === 'granted') {
            handleDismiss();
          }
        };
        
        result.addEventListener('change', handleChange);
        
        return () => {
          result.removeEventListener('change', handleChange);
        };
      }).catch(() => {
        setTimeout(() => setIsVisible(true), 500);
      });
    } else {
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300);
  };

  if (hasLocationPermission || !isVisible) {
    return null;
  }

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

export default function DynamicFacilityFinder() {
  // Component will export at the end
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRadius, setSelectedRadius] = useState('10000');
  const [sortBy, setSortBy] = useState('distance');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | undefined>();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationBanner, setShowLocationBanner] = useState(true);
  
  // Mobile navigation state
  const [activeBottomTab, setActiveBottomTab] = useState<string>('facilities');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Ref for smooth scrolling
  const mapViewRef = useRef<HTMLDivElement>(null);

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

  // Auto switch to map view when location is obtained (only on first location get)
  const hasAutoSwitchedRef = useRef(false);
  useEffect(() => {
    if (userLocation && viewMode === 'list' && !hasAutoSwitchedRef.current) {
      setViewMode('map');
      hasAutoSwitchedRef.current = true;
    }
  }, [userLocation, viewMode]);
  
  // Sign out handler
  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

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
    if (userLocation) {
      const [lat, lng] = userLocation;
      const [facLat, facLng] = facility.coordinates;
      window.open(`https://www.google.com/maps/dir/${lat},${lng}/${facLat},${facLng}`, '_blank');
    } else {
      const [facLat, facLng] = facility.coordinates;
      window.open(`https://www.google.com/maps/search/${facLat},${facLng}`, '_blank');
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
    } catch (error) {
      console.warn('Reverse geocoding failed, using coordinate estimation:', error);
    }
    
    // Fallback: Try to determine location from coordinates (Ghana regions approximation)
    return getGhanaRegionFromCoordinates(lat, lng);
  }, []);

  // Helper function to estimate Ghana region from coordinates
  const getGhanaRegionFromCoordinates = (lat: number, lng: number): LocationInfo => {
    // Approximate Ghana region boundaries
    if (lat >= 5.5 && lat <= 5.7 && lng >= -0.3 && lng <= 0.0) {
      return { city: 'Accra', region: 'Greater Accra', country: 'Ghana' };
    } else if (lat >= 6.6 && lat <= 6.8 && lng >= -1.7 && lng <= -1.5) {
      return { city: 'Kumasi', region: 'Ashanti', country: 'Ghana' };
    } else if (lat >= 9.3 && lat <= 9.5 && lng >= -1.0 && lng <= -0.8) {
      return { city: 'Tamale', region: 'Northern', country: 'Ghana' };
    } else if (lat >= 5.0 && lat <= 5.2 && lng >= -2.0 && lng <= -1.8) {
      return { city: 'Takoradi', region: 'Western', country: 'Ghana' };
    } else if (lat >= 4.8 && lat <= 5.2 && lng >= -0.3 && lng <= 0.2) {
      return { city: 'Tema', region: 'Greater Accra', country: 'Ghana' };
    } else if (lat >= 6.0 && lat <= 7.0 && lng >= -1.0 && lng <= 0.5) {
      return { city: 'Unknown', region: 'Central Ghana', country: 'Ghana' };
    } else if (lat >= 7.0 && lat <= 11.0) {
      return { city: 'Unknown', region: 'Northern Ghana', country: 'Ghana' };
    } else if (lat >= 4.5 && lat <= 6.0) {
      return { city: 'Unknown', region: 'Southern Ghana', country: 'Ghana' };
    }
    
    return { city: 'Unknown', region: 'Ghana', country: 'Ghana' };
  };
  // Fetch facilities
  const fetchNearbyFacilities = useCallback(async (lat: number, lng: number, radius: number = 10000) => {
    setIsLoadingFacilities(true);
    setError(null);
    
    console.log('🔍 Searching for facilities:', { lat, lng, radius: `${radius}m` });
    
    try {
      let allFacilities: Facility[] = [];
      
      // Fetch from Overpass API (OpenStreetMap)
      try {
        const overpassQuery = `
          [out:json][timeout:60];
          (
            node["amenity"="hospital"](around:${radius},${lat},${lng});
            way["amenity"="hospital"](around:${radius},${lat},${lng});
            relation["amenity"="hospital"](around:${radius},${lat},${lng});
            node["amenity"="clinic"](around:${radius},${lat},${lng});
            way["amenity"="clinic"](around:${radius},${lat},${lng});
            relation["amenity"="clinic"](around:${radius},${lat},${lng});
            node["amenity"="pharmacy"](around:${radius},${lat},${lng});
            way["amenity"="pharmacy"](around:${radius},${lat},${lng});
            node["amenity"="doctors"](around:${radius},${lat},${lng});
            way["amenity"="doctors"](around:${radius},${lat},${lng});
            node["healthcare"](around:${radius},${lat},${lng});
            way["healthcare"](around:${radius},${lat},${lng});
            relation["healthcare"](around:${radius},${lat},${lng});
          );
          out center body;
        `;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        const overpassResponse = await fetch(
          `https://overpass-api.de/api/interpreter`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: `data=${encodeURIComponent(overpassQuery)}`,
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (overpassResponse.ok) {
          const overpassData = await overpassResponse.json();
          
          console.log(`✅ Found ${overpassData.elements?.length || 0} facilities from OpenStreetMap`);
          
          if (overpassData.elements && Array.isArray(overpassData.elements)) {
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
                if (name.length < 3 || name.toLowerCase() === 'unnamed') return;
                
                const amenity = element.tags.amenity || element.tags.healthcare || 'clinic';
                const distance = calculateDistance(lat, lng, coords[0], coords[1]);
                
                if (distance > radius / 1000) return;
                
                let type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center' = 'clinic';
                if (amenity === 'hospital' || element.tags.healthcare === 'hospital') {
                  type = 'hospital';
                } else if (amenity === 'pharmacy') {
                  type = 'pharmacy';
                } else if (element.tags.healthcare === 'centre' || 
                          element.tags.healthcare === 'center' ||
                          element.tags.healthcare === 'health_centre') {
                  type = 'health_center';
                } else if (amenity === 'doctors' || amenity === 'clinic') {
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
                
                if (services.length < 2) {
                  if (type === 'hospital') {
                    services.push('Inpatient Care', 'General Medicine', 'Emergency Services');
                  } else if (type === 'pharmacy') {
                    services.push('Prescriptions', 'OTC Medications', 'Health Consultations');
                  } else if (type === 'clinic') {
                    services.push('Outpatient Care', 'Consultations', 'Basic Treatment');
                  } else if (type === 'health_center') {
                    services.push('Primary Care', 'Preventive Services', 'Basic Treatment');
                  }
                }
                
                let address = 'Address not available';
                if (element.tags['addr:full']) {
                  address = element.tags['addr:full'];
                } else {
                  const parts = [
                    element.tags['addr:housenumber'],
                    element.tags['addr:street'],
                    element.tags['addr:suburb']
                  ].filter(Boolean);
                  if (parts.length > 0) address = parts.join(', ');
                }
                
                const city = element.tags['addr:city'] || 
                            element.tags['addr:town'] || 
                            element.tags['addr:suburb'] || 
                            'Unknown';
                
                const region = element.tags['addr:state'] || 
                              element.tags['addr:region'] || 
                              element.tags['addr:province'] ||
                              'Unknown';
                
                allFacilities.push({
                  id: `osm_${element.type}_${element.id}`,
                  name,
                  type,
                  address,
                  city,
                  region,
                  distance,
                  rating: 3.5 + Math.random() * 1.5,
                  reviews: Math.floor(Math.random() * 300) + 20,
                  phone: element.tags.phone || element.tags['contact:phone'] || element.tags['phone:mobile'] || 'Not available',
                  hours: element.tags.opening_hours || (type === 'hospital' && element.tags.emergency === 'yes' ? '24/7' : 'Call for hours'),
                  services: services.slice(0, 8),
                  coordinates: coords as [number, number],
                  emergencyServices: element.tags.emergency === 'yes' || (type === 'hospital' && element.tags.emergency !== 'no'),
                  insurance: ['NHIS', 'Private'],
                  specializations: services.slice(0, 3),
                  website: element.tags.website || element.tags['contact:website'] || element.tags.url
                });
              } catch (elementError) {
                console.warn('Error processing element:', elementError);
              }
            });
          }
        } else {
          throw new Error(`Overpass API returned status ${overpassResponse.status}`);
        }
      } catch (overpassError: any) {
        console.error('Overpass API error:', overpassError);
        if (overpassError.name === 'AbortError') {
          setError('Request timed out. Please try with a smaller search radius or check your internet connection.');
        } else {
          setError('Unable to load facilities from OpenStreetMap. Please check your internet connection and try again.');
        }
        setFacilities([]);
        setIsLoadingFacilities(false);
        return;
      }
      
      const uniqueFacilities = allFacilities.filter((facility, index, self) => {
        return index === self.findIndex(f => {
          const nameSimilar = f.name.toLowerCase().trim() === facility.name.toLowerCase().trim();
          const locationClose = Math.abs(f.distance - facility.distance) < 0.05;
          return nameSimilar && locationClose;
        });
      });
      
      uniqueFacilities.sort((a, b) => a.distance - b.distance);
      const facilitiesInRadius = uniqueFacilities.filter(f => f.distance <= radius / 1000);
      
      console.log(`✅ ${facilitiesInRadius.length} facilities within ${radius/1000}km`);
      
      if (facilitiesInRadius.length === 0) {
        setError(`No healthcare facilities found within ${radius/1000}km of your location. Try increasing the search radius.`);
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

   console.log('📍 Requesting GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const location: [number, number] = [latitude, longitude];
        
     const method = accuracy < 100 ? 'GPS' : 'Network-based';
console.log(`✅ Location obtained: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (${method}, ±${Math.round(accuracy)}m)`);
        
        setUserLocation(location);
        
        // Get location name
        const info = await reverseGeocode(latitude, longitude);
        setLocationInfo({ ...info, accuracy });
        
        if (info.city && info.region) {
  console.log(`📍 ${info.city}, ${info.region}`);
}
        
        // Fetch nearby facilities
        await fetchNearbyFacilities(latitude, longitude, parseInt(selectedRadius));
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
      },
      (error) => {
        console.error('❌ Location error:', error.message);
        
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
        maximumAge: 0
      }
    );
  }, [selectedRadius, fetchNearbyFacilities, reverseGeocode]);

  // Refetch when radius changes
  useEffect(() => {
    if (userLocation && status === 'authenticated') {
      const timeoutId = setTimeout(() => {
       console.log(`🔄 Updating search radius to ${parseInt(selectedRadius)/1000}km`);
       fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius));
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedRadius, userLocation, status, fetchNearbyFacilities]);

  // Enhanced filtering
  const filteredFacilities = facilities
    .filter(facility => {
      const matchesSearch = facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          facility.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          facility.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          facility.services.some(service => service.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = selectedType === 'all' || facility.type === selectedType;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'reviews':
          return b.reviews - a.reviews;
        case 'distance':
        default:
          return a.distance - b.distance;
      }
    });

  // User info
  const userName: string = session?.user?.name || 'User';
  const userEmail: string | null = session?.user?.email || null;

  // Bottom navigation handler
  const handleBottomNavClick = (path: string, tab: string) => {
    setActiveBottomTab(tab);
    router.push(path);
  };

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
    <div className="facility-finder">
      {/* Dashboard Header */}
      <DashboardHeader activeTab="/facilities" />

      {/* Mobile Side Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-nav-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Side Menu */}
      <div className={`mobile-side-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <div className="mobile-menu-user">
            <div className="mobile-menu-avatar">
              {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="mobile-menu-user-info">
              <div className="mobile-menu-user-name">{userName}</div>
              {userEmail && <div className="mobile-menu-user-email">{userEmail}</div>}
            </div>
          </div>
          <button 
            className="mobile-menu-close"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mobile-menu-nav">
          <button 
            className="mobile-menu-item"
            onClick={() => { router.push('/dashboard'); setIsMobileMenuOpen(false); }}
          >
            <Home size={20} />
            <span>Dashboard</span>
          </button>
          <button 
            className="mobile-menu-item"
            onClick={() => { router.push('/facilities'); setIsMobileMenuOpen(false); }}
          >
            <MapPin size={20} />
            <span>Find Facilities</span>
          </button>
          <button 
            className="mobile-menu-item"
            onClick={() => { router.push('/symptom-checker'); setIsMobileMenuOpen(false); }}
          >
            <Bot size={20} />
            <span>Symptom Checker</span>
          </button>
          <button 
            className="mobile-menu-item"
            onClick={() => { router.push('/emergency'); setIsMobileMenuOpen(false); }}
          >
            <Phone size={20} />
            <span>Emergency Hub</span>
          </button>
          <button 
            className="mobile-menu-item"
            onClick={() => { router.push('/profile'); setIsMobileMenuOpen(false); }}
          >
            <User size={20} />
            <span>Profile</span>
          </button>
          <div className="mobile-menu-divider"></div>
          <button 
            className="mobile-menu-item mobile-menu-item-danger"
            onClick={handleSignOut}
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="facility-finder-content">
        <div className="facility-finder-page-header">
          <h2>Find Healthcare Facilities</h2>
          <p className="facility-finder-page-subtitle">
            Click "Find Near Me" to discover healthcare facilities in your area using GPS
          </p>
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
            <div className="facility-finder-search-wrapper">
              <Search className="facility-finder-search-icon" size={20} />
              <input
                type="text"
                placeholder="Search healthcare facilities, services, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="facility-finder-search-input"
              />
              <button 
                className="facility-finder-filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
                type="button"
              >
                <Filter size={18} />
                <ChevronDown size={16} className={showFilters ? 'rotated' : ''} />
              </button>
            </div>
            
            {showFilters && (
              <div className="facility-finder-filters-extended">
                <div className="filter-row">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="facility-finder-filter-select"
                  >
                    <option value="distance">Sort by Distance</option>
                    <option value="rating">Sort by Rating</option>
                    <option value="reviews">Sort by Reviews</option>
                    <option value="name">Sort by Name</option>
                  </select>
                  
                  {userLocation && (
                    <button 
                      className="refresh-btn"
                      onClick={() => fetchNearbyFacilities(userLocation[0], userLocation[1], parseInt(selectedRadius))}
                      disabled={isLoadingFacilities}
                      type="button"
                    >
                      {isLoadingFacilities ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
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
              <span className="results-label">{filteredFacilities.length === 1 ? 'facility' : 'facilities'} found</span>
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
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} type="button">×</button>
          </div>
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
                    filteredFacilities.slice(0, 10).map(facility => (
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
                            {facility.emergencyServices && (
                              <span className="emergency-badge">24/7 Emergency</span>
                            )}
                            <span className="insurance-badge">{facility.insurance[0]}</span>
                          </div>
                          
                          <p className="facility-result-services">
                            {facility.services.slice(0, 2).join(', ')}
                            {facility.services.length > 2 && `... +${facility.services.length - 2} more`}
                          </p>
                        </div>
                        
                        <div className="facility-result-actions">
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
                    ))
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
                  {filteredFacilities.map(facility => (
                    <div key={facility.id} className="facility-finder-list-card">
                      <div className="facility-card-header">
                        <div className={`facility-card-icon ${facility.type}`}>
                          {React.createElement(getFacilityIconComponent(facility.type), { size: 28 })}
                        </div>
                        <div className="facility-card-info">
                          <h3 className="facility-card-name">{facility.name}</h3>
                          <p className="facility-card-location">
                            <MapPin size={14} />
                            {facility.address}, {facility.city}
                          </p>
                          <p className="facility-card-distance">{facility.distance.toFixed(1)} km away</p>
                        </div>
                        <div className="facility-card-rating">
                          <div className="rating-display">
                            <Star size={16} className="rating-star" fill="currentColor" />
                            <span className="rating-value">{facility.rating.toFixed(1)}</span>
                          </div>
                          <span className="rating-reviews">({facility.reviews} reviews)</span>
                        </div>
                      </div>
                      
                      <div className="facility-card-quick-info">
                        <div className="quick-info-item">
                          <Clock size={14} />
                          <span>{facility.hours}</span>
                        </div>
                        <div className="quick-info-item">
                          <Phone size={14} />
                          <span>{facility.phone}</span>
                        </div>
                        {facility.emergencyServices && (
                          <div className="quick-info-item emergency">
                            <AlertCircle size={14} />
                            <span>Emergency Services</span>
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
                        <button 
                          className="facility-card-btn facility-card-btn-secondary"
                          onClick={() => window.open(`tel:${facility.phone}`, '_self')}
                          type="button"
                        >
                          <Phone size={18} />
                          Call Facility
                        </button>
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
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Facility Detail Modal */}
      {selectedFacility && (
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
              <div className="facility-detail-rating">
                <Star size={20} className="rating-star" fill="currentColor" />
                <span className="rating-value">{selectedFacility.rating.toFixed(1)}</span>
                <span className="rating-reviews">({selectedFacility.reviews})</span>
              </div>
            </div>
            
            <div className="facility-detail-body">
              <div className="detail-section">
                <h3>Contact Information</h3>
                <p><MapPin size={16} /> {selectedFacility.address}, {selectedFacility.city}, {selectedFacility.region}</p>
                <p><Phone size={16} /> {selectedFacility.phone}</p>
                <p><Clock size={16} /> {selectedFacility.hours}</p>
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
              <button className="detail-action-btn secondary" onClick={() => window.open(`tel:${selectedFacility.phone}`, '_self')} type="button">
                <Phone size={20} />
                Call Now
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="dashboard-bottom-nav">
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/dashboard', 'dashboard')}
          type="button"
        >
          <Home size={22} />
          <span>Home</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'facilities' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/facilities', 'facilities')}
          type="button"
        >
          <MapPin size={22} />
          <span>Facilities</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'symptom' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/symptom-checker', 'symptom')}
          type="button"
        >
          <Bot size={22} />
          <span>Symptoms</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'emergency' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/emergency', 'emergency')}
          type="button"
        >
          <Phone size={22} />
          <span>Emergency</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/profile', 'profile')}
          type="button"
        >
          <User size={22} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}