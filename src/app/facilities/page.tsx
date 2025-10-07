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
  Check, X, Moon, Sun
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
          Enable Location for Better Results
        </h3>
        <p className="location-banner-description">
          Allow us to access your location to find the nearest healthcare facilities, 
          get accurate distances, and receive personalized recommendations based on your area.
        </p>
        
        <div className="location-banner-benefits">
          <div className="location-benefit">
            <Check size={14} />
            <span>Accurate distance calculations</span>
          </div>
          <div className="location-benefit">
            <Check size={14} />
            <span>Nearest facilities first</span>
          </div>
          <div className="location-benefit">
            <Check size={14} />
            <span>Real-time directions</span>
          </div>
          <div className="location-benefit">
            <Check size={14} />
            <span>Emergency services nearby</span>
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
              <MapPin size={20} />
              <span>Enable Location</span>
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

export default function DynamicFacilityFinder() {
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
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationBanner, setShowLocationBanner] = useState(true);
 
  
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

  // Auto switch to map view when location is obtained
  useEffect(() => {
    if (userLocation && viewMode === 'list') {
      setViewMode('map');
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

  // Known Ghana facilities
  const getKnownGhanaFacilities = useCallback((lat: number, lng: number): Facility[] => {
    const knownFacilities = [
      {
        name: "Korle Bu Teaching Hospital",
        coordinates: [5.5502, -0.2174] as [number, number],
        type: "hospital" as const,
        address: "Guggisberg Avenue, Korle Bu",
        city: "Accra",
        phone: "+233 30 266 6375",
        services: ["Emergency Care", "Surgery", "Cardiology", "Neurology", "Oncology", "Maternity"],
        emergencyServices: true
      },
      {
        name: "Ridge Hospital",
        coordinates: [5.6037, -0.1870] as [number, number],
        type: "hospital" as const,
        address: "Castle Road, Ridge",
        city: "Accra",
        phone: "+233 30 222 2211",
        services: ["Emergency Care", "Internal Medicine", "Pediatrics", "Obstetrics"],
        emergencyServices: true
      },
      {
        name: "37 Military Hospital",
        coordinates: [5.5970, -0.1700] as [number, number],
        type: "hospital" as const,
        address: "Liberation Road, Airport Residential Area",
        city: "Accra",
        phone: "+233 30 277 6111",
        services: ["Emergency Care", "Military Medicine", "Rehabilitation", "Surgery"],
        emergencyServices: true
      },
      {
        name: "Ernest Chemists - Oxford Street",
        coordinates: [5.5550, -0.1873] as [number, number],
        type: "pharmacy" as const,
        address: "Oxford Street, Osu",
        city: "Accra",
        phone: "+233 30 224 1234",
        services: ["Prescriptions", "OTC Medicines", "Health Consultations"],
        emergencyServices: false
      },
      {
        name: "Nyaho Medical Centre",
        coordinates: [5.6050, -0.1690] as [number, number],
        type: "clinic" as const,
        address: "Airport City, Kotoka International Airport Area",
        city: "Accra",
        phone: "+233 30 278 2641",
        services: ["Emergency Care", "Internal Medicine", "Surgery", "Radiology"],
        emergencyServices: true
      },
      {
        name: "Greater Accra Regional Hospital",
        coordinates: [5.6520, -0.1670] as [number, number],
        type: "hospital" as const,
        address: "Ridge, Near Parliament House",
        city: "Accra",
        phone: "+233 30 222 4200",
        services: ["Emergency Care", "General Medicine", "Surgery", "Maternity"],
        emergencyServices: true
      },
      {
        name: "Medlab Diagnostic Services",
        coordinates: [5.5600, -0.2000] as [number, number],
        type: "clinic" as const,
        address: "Labone, Near A&C Mall",
        city: "Accra",
        phone: "+233 30 277 3888",
        services: ["Laboratory Tests", "Medical Imaging", "Consultations"],
        emergencyServices: false
      },
      {
        name: "Lister Hospital",
        coordinates: [5.6200, -0.1650] as [number, number],
        type: "hospital" as const,
        address: "Airport Residential Area",
        city: "Accra",
        phone: "+233 30 277 6751",
        services: ["Emergency Care", "Maternity", "Surgery", "Pediatrics"],
        emergencyServices: true
      }
    ];

    return knownFacilities.map((facility, index) => ({
      id: `known_${index}`,
      ...facility,
      region: "Greater Accra",
      distance: calculateDistance(lat, lng, facility.coordinates[0], facility.coordinates[1]),
      rating: 4.0 + Math.random(),
      reviews: Math.floor(Math.random() * 1000) + 100,
      hours: facility.emergencyServices ? "24/7" : "8:00 AM - 6:00 PM",
      insurance: ["NHIS", "Private", "International"],
      specializations: facility.services.slice(0, 2)
    }));
  }, [calculateDistance]);

  // Fetch facilities
  const fetchNearbyFacilities = useCallback(async (lat: number, lng: number, radius: number = 10000) => {
    setIsLoadingFacilities(true);
    setError(null);
    
    try {
      let allFacilities: Facility[] = [];
      
      const knownFacilities = getKnownGhanaFacilities(lat, lng);
      allFacilities.push(...knownFacilities);
      
      try {
        const overpassQuery = `
          [out:json][timeout:60];
          (
            node["amenity"="hospital"](around:${radius},${lat},${lng});
            way["amenity"="hospital"](around:${radius},${lat},${lng});
            node["amenity"="clinic"](around:${radius},${lat},${lng});
            way["amenity"="clinic"](around:${radius},${lat},${lng});
            node["amenity"="pharmacy"](around:${radius},${lat},${lng});
            way["amenity"="pharmacy"](around:${radius},${lat},${lng});
            node["amenity"="doctors"](around:${radius},${lat},${lng});
            way["amenity"="doctors"](around:${radius},${lat},${lng});
            node["healthcare"](around:${radius},${lat},${lng});
            way["healthcare"](around:${radius},${lat},${lng});
          );
          out center body;
        `;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
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
          
          if (overpassData.elements && Array.isArray(overpassData.elements)) {
            overpassData.elements.forEach((element: any) => {
              try {
                const coords = element.lat && element.lon 
                  ? [element.lat, element.lon] 
                  : element.center 
                  ? [element.center.lat, element.center.lon]
                  : null;
                  
                if (!coords || !element.tags) return;
                
                const name = element.tags.name || element.tags['name:en'] || 'Healthcare Facility';
                if (name.length < 3 || name.toLowerCase() === 'unnamed') return;
                
                const amenity = element.tags.amenity || element.tags.healthcare || 'clinic';
                const distance = calculateDistance(lat, lng, coords[0], coords[1]);
                
                if (distance > radius / 1000) return;
                
                let type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center' = 'clinic';
                if (amenity === 'hospital' || element.tags.healthcare === 'hospital') {
                  type = 'hospital';
                } else if (amenity === 'pharmacy') {
                  type = 'pharmacy';
                } else if (element.tags.healthcare === 'centre' || element.tags.healthcare === 'center') {
                  type = 'health_center';
                } else if (amenity === 'doctors' || amenity === 'clinic') {
                  type = 'clinic';
                }
                
                const services: string[] = [];
                if (element.tags.emergency === 'yes') services.push('Emergency Care');
                if (element.tags['healthcare:speciality']) {
                  const specialties = element.tags['healthcare:speciality'].split(';');
                  services.push(...specialties.slice(0, 3));
                }
                if (type === 'hospital') {
                  if (services.length === 0) services.push('Inpatient Care', 'General Medicine');
                } else if (type === 'pharmacy') {
                  if (services.length === 0) services.push('Prescriptions', 'OTC Medications');
                } else if (type === 'clinic') {
                  if (services.length === 0) services.push('Outpatient Care', 'Consultations');
                }
                
                let address = 'Address not available';
                if (element.tags['addr:full']) {
                  address = element.tags['addr:full'];
                } else if (element.tags['addr:street']) {
                  const parts = [
                    element.tags['addr:housenumber'],
                    element.tags['addr:street']
                  ].filter(Boolean);
                  address = parts.join(' ');
                }
                
                allFacilities.push({
                  id: `osm_${element.type}_${element.id}`,
                  name,
                  type,
                  address,
                  city: element.tags['addr:city'] || element.tags['addr:suburb'] || 'Accra',
                  region: element.tags['addr:state'] || element.tags['addr:region'] || 'Greater Accra',
                  distance,
                  rating: 3.5 + Math.random() * 1.5,
                  reviews: Math.floor(Math.random() * 300) + 20,
                  phone: element.tags.phone || element.tags['contact:phone'] || element.tags['phone:mobile'] || 'Not available',
                  hours: element.tags.opening_hours || (type === 'hospital' && element.tags.emergency === 'yes' ? '24/7' : 'Call for hours'),
                  services,
                  coordinates: coords as [number, number],
                  emergencyServices: element.tags.emergency === 'yes' || (type === 'hospital' && !element.tags.emergency),
                  insurance: ['NHIS', 'Private'],
                  website: element.tags.website || element.tags['contact:website']
                });
              } catch (elementError) {
                console.warn('Error processing element:', elementError);
              }
            });
          }
        }
      } catch (overpassError: any) {
        if (overpassError.name === 'AbortError') {
          console.warn('Overpass API request timed out');
          setError('Some facilities could not be loaded due to timeout. Showing available facilities.');
        } else {
          console.warn('Overpass API error:', overpassError);
        }
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
      
      if (facilitiesInRadius.length === 0) {
        setError('No facilities found in this area. Try increasing the search radius.');
      }
      
      setFacilities(facilitiesInRadius.slice(0, 100));
      
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setError('Failed to load healthcare facilities. Showing known facilities only.');
      const fallbackFacilities = getKnownGhanaFacilities(lat, lng);
      setFacilities(fallbackFacilities);
    } finally {
      setIsLoadingFacilities(false);
    }
  }, [calculateDistance, getKnownGhanaFacilities]);

  // Get current location with auto-scroll and map view
  const getCurrentLocation = useCallback(() => {
    setIsLoadingLocation(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location: [number, number] = [latitude, longitude];
        setUserLocation(location);
        
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
        console.error('Geolocation error:', error);
        setIsLoadingLocation(false);
        
        let errorMessage = 'Unable to get your location. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable location services in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is currently unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
        }
        setError(errorMessage);
        
        // Fallback to Accra
        const accraLat = 5.6037;
        const accraLng = -0.1870;
        setUserLocation([accraLat, accraLng]);
        fetchNearbyFacilities(accraLat, accraLng, parseInt(selectedRadius));
        
        // Still switch to map and scroll
        setViewMode('map');
        setTimeout(() => {
          mapViewRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 300);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  }, [selectedRadius, fetchNearbyFacilities]);

  // Load default facilities on mount
  useEffect(() => {
    if (status === 'authenticated' && facilities.length === 0) {
      const accraLat = 5.6037;
      const accraLng = -0.1870;
      fetchNearbyFacilities(accraLat, accraLng, parseInt(selectedRadius));
    }
  }, [status, fetchNearbyFacilities, facilities.length, selectedRadius]);

  // Refetch when radius changes
  useEffect(() => {
    if (userLocation && status === 'authenticated') {
      const timeoutId = setTimeout(() => {
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

      {/* Main Content */}
      <div className="facility-finder-content">
        <div className="facility-finder-page-header">
          <h2>Find Healthcare Facilities</h2>
          <p className="facility-finder-page-subtitle">Click on the button below to find healthcare facilities near you</p>
          <button 
            className={`facility-finder-location-btn ${isLoadingLocation ? 'loading' : ''}`}
            onClick={getCurrentLocation}
            disabled={isLoadingLocation}
            type="button"
          >
            {isLoadingLocation ? <Loader2 size={20} className="spin" /> : <Locate size={20} />}
            <span>{isLoadingLocation ? 'Locating...' : 'Find Near Me'}</span>
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
                    value={selectedType} 
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="facility-finder-filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="hospital">Hospitals</option>
                    <option value="clinic">Clinics</option>
                    <option value="pharmacy">Pharmacies</option>
                    <option value="health_center">Health Centers</option>
                  </select>
                  
                  <select 
                    value={selectedRadius} 
                    onChange={(e) => setSelectedRadius(e.target.value)}
                    className="facility-finder-filter-select"
                  >
                    <option value="5000">Within 5 km</option>
                    <option value="10000">Within 10 km</option>
                    <option value="20000">Within 20 km</option>
                    <option value="50000">Within 50 km</option>
                  </select>
                </div>
                
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
              <span className="results-label">facilities found</span>
              {isLoadingFacilities && <Loader2 size={16} className="spin" />}
            </div>
            
            <div className="facility-finder-view-toggle">
              <button 
                className={`facility-finder-view-btn ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => setViewMode('map')}
                type="button"
              >
                <Map size={18} />
                Map
              </button>
              <button 
                className={`facility-finder-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                type="button"
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
                    </div>
                  ) : filteredFacilities.length === 0 ? (
                    <div className="no-facilities">
                      <Hospital size={32} />
                      <p>No facilities found</p>
                      <p>Try adjusting your search or location</p>
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
                    Enable location to find facilities near you
                  </p>
                )}
              </div>
              
              {isLoadingFacilities ? (
                <div className="loading-facilities-list">
                  <Loader2 size={32} className="spin" />
                  <p>Searching for healthcare facilities...</p>
                </div>
              ) : filteredFacilities.length === 0 ? (
                <div className="no-results-message">
                  <div className="no-results-icon">
                    <Search size={48} />
                  </div>
                  <h3>No facilities found</h3>
                  <p>Try adjusting your search criteria or enable location services</p>
                  {!userLocation && (
                    <button className="location-enable-btn" onClick={getCurrentLocation} type="button">
                      <Locate size={20} />
                      Enable Location
                    </button>
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
    </div>
  );
}