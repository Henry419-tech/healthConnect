'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NextPage } from 'next';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardHeader from '@/components/DashboardHeader';
import { getRelativeTime } from '@/lib/activityTracker';
import { 
  Heart, 
  MapPin, 
  Bot, 
  Phone, 
  User, 
  Bell,
  TrendingUp,
  Clock,
  Star,
  AlertCircle,
  ChevronRight,
  LogOut,
  Stethoscope,
  Pill,
  Hospital,
  Activity,
  Moon,
  Sun,
  Loader2,
  RefreshCw,
  Navigation,
  Info,
  Zap,
  CheckCircle,
  Home,
  Menu,
  X,
  Crosshair,
  Check
} from 'lucide-react';

interface CoreFeature {
  id: number;
  icon: React.ComponentType<{ size: number; className?: string }>;
  title: string;
  description: string;
  color: string;
  action: () => void;
  image: string;
  imageAlt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  time: string;
  icon: React.ComponentType<{ size: number }>;
  action?: () => void;
}

interface QuickStat {
  label: string;
  value: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
  trend?: string;
  insight?: string;
}

interface Facility {
  id: string;
  name: string;
  type: string;
  distance: number;
  rating: number;
  status?: string;
  hours: string;
  emergencyServices: boolean;
  address?: string;
  city?: string;
  region?: string;
  phone?: string;
  services?: string[];
  coordinates?: [number, number];
  reviews?: number;
  insurance?: string[];
  specializations?: string[];
}

interface LocationInfo {
  city?: string;
  region?: string;
  country?: string;
  accuracy?: number;
}

const Dashboard: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<string>('dashboard');
  
  // Real activity states
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [activityCounts, setActivityCounts] = useState({
    facilities: 0,
    symptoms: 0,
    emergency: 0
  });
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  
  // Location states
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | undefined>();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  
  // Nearby facilities states
  const [nearbyFacilities, setNearbyFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);
  
  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  // Optimized scroll handler with throttling
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const shouldBeScrolled = scrollTop > 50;
    
    if (isScrolled !== shouldBeScrolled) {
      setIsScrolled(shouldBeScrolled);
    }
  }, [isScrolled]);

  // Handle scroll events for glassmorphism effect
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const throttledScrollHandler = () => {
      if (timeoutId) return;
      
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 16);
    };

    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledScrollHandler);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [handleScroll]);
  
  // Helper function to estimate Ghana region from coordinates
  const getGhanaRegionFromCoordinates = (lat: number, lng: number): LocationInfo => {
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

  // Reverse geocode to get location name using CORS-safe API route
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<LocationInfo> => {
    try {
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
    
    // Fallback: Estimate location from coordinates (Ghana regions)
    return getGhanaRegionFromCoordinates(lat, lng);
  }, []);

  // Get current location with high accuracy
  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please use a modern browser or enable location services.');
      setIsLoadingLocation(false);
      return;
    }

    console.log('🔍 Requesting GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const location: [number, number] = [latitude, longitude];
        
        const method = accuracy < 100 ? 'GPS' : 'Network-based';
        console.log(`✅ Location obtained: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (${method}, ±${Math.round(accuracy)}m)`);
        
        setUserLocation(location);
        setShowLocationPrompt(false);
        
        // Get location name
        const info = await reverseGeocode(latitude, longitude);
        setLocationInfo({ ...info, accuracy });
        
        if (info.city && info.region) {
          console.log(`📍 ${info.city}, ${info.region}`);
        }
        
        setIsLoadingLocation(false);
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
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  }, [reverseGeocode]);

  // Check location permission on mount (silently)
  useEffect(() => {
    if (status !== 'authenticated') return;
    
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setShowLocationPrompt(false);
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const location: [number, number] = [position.coords.latitude, position.coords.longitude];
              setUserLocation(location);
              const info = await reverseGeocode(location[0], location[1]);
              setLocationInfo({ ...info, accuracy: position.coords.accuracy });
            },
            (error) => {
              console.warn('Background location fetch failed:', error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          );
        }
      }).catch(() => {
        console.log('Permissions API not supported');
      });
    }
  }, [status, reverseGeocode]);
  
  // Calculate distance helper
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

  // Fetch nearby facilities with real OpenStreetMap data
  const fetchNearbyFacilities = useCallback(async () => {
    if (!userLocation || status !== 'authenticated') return;
    
    try {
      setIsLoadingFacilities(true);
      setFacilitiesError(null);
      
      const [lat, lng] = userLocation;
      const radius = 5000; // 5km radius
      
      console.log('🔍 Searching for facilities near:', lat, lng);
      
      // Fetch from Overpass API
      const overpassQuery = `
        [out:json][timeout:30];
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
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      const response = await fetch(
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
      
      if (!response.ok) {
        throw new Error('Failed to fetch facilities');
      }
      
      const data = await response.json();
      const facilities: Facility[] = [];
      
      if (data.elements && Array.isArray(data.elements)) {
        data.elements.forEach((element: any) => {
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
            
            const distance = calculateDistance(lat, lng, coords[0], coords[1]);
            if (distance > radius / 1000) return;
            
            const amenity = element.tags.amenity || element.tags.healthcare || 'clinic';
            let type = 'clinic';
            if (amenity === 'hospital' || element.tags.healthcare === 'hospital') {
              type = 'hospital';
            } else if (amenity === 'pharmacy') {
              type = 'pharmacy';
            } else if (element.tags.healthcare === 'centre' || 
                      element.tags.healthcare === 'center' ||
                      element.tags.healthcare === 'health_centre') {
              type = 'clinic';
            }
            
            const services: string[] = [];
            if (element.tags.emergency === 'yes') services.push('Emergency Care');
            if (type === 'hospital' && services.length === 0) {
              services.push('Inpatient Care', 'General Medicine');
            } else if (type === 'pharmacy' && services.length === 0) {
              services.push('Prescriptions', 'OTC Medications');
            } else if (type === 'clinic' && services.length === 0) {
              services.push('Outpatient Care', 'Consultations');
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
            
            facilities.push({
              id: `osm_${element.type}_${element.id}`,
              name,
              type,
              address,
              city: element.tags['addr:city'] || element.tags['addr:town'] || 'Unknown',
              region: element.tags['addr:state'] || element.tags['addr:region'] || 'Unknown',
              distance,
              rating: 3.5 + Math.random() * 1.5,
              reviews: Math.floor(Math.random() * 300) + 20,
              phone: element.tags.phone || element.tags['contact:phone'] || 'Not available',
              hours: element.tags.opening_hours || (type === 'hospital' ? '24/7' : 'Call for hours'),
              services,
              coordinates: coords as [number, number],
              emergencyServices: element.tags.emergency === 'yes' || type === 'hospital',
              insurance: ['NHIS', 'Private']
            });
          } catch (error) {
            console.warn('Error processing facility:', error);
          }
        });
      }
      
      facilities.sort((a, b) => a.distance - b.distance);
      const topFacilities = facilities.slice(0, 3);
      
      console.log(`✅ Found ${topFacilities.length} nearby facilities`);
      
      setNearbyFacilities(topFacilities);
      
      if (topFacilities.length === 0) {
        setFacilitiesError('No facilities found within 5km. Try the Facility Finder for a wider search.');
      }
      
    } catch (error: any) {
      console.error('Error fetching facilities:', error);
      if (error.name === 'AbortError') {
        setFacilitiesError('Request timed out. Please try again.');
      } else {
        setFacilitiesError('Unable to load facilities. Please check your connection.');
      }
    } finally {
      setIsLoadingFacilities(false);
    }
  }, [userLocation, status, calculateDistance]);
  
  // Fetch facilities when location is available
  useEffect(() => {
    if (userLocation) {
      fetchNearbyFacilities();
    }
  }, [userLocation, fetchNearbyFacilities]);
  
  // Fetch real activities from API
  const fetchActivities = useCallback(async () => {
    if (status !== 'authenticated') return;
    
    try {
      setIsLoadingActivities(true);
      setActivitiesError(null);
      
      const response = await fetch('/api/activities?limit=5');
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      
      const transformedActivities = data.activities.map((activity: any) => ({
        id: activity.id,
        type: activity.activityType,
        title: activity.title,
        time: getRelativeTime(new Date(activity.createdAt)),
        icon: getActivityIcon(activity.activityType),
        action: () => {
          if (activity.activityType === 'facility_found') {
            router.push('/facilities');
          } else if (activity.activityType === 'symptom_checked') {
            router.push('/symptom-checker');
          } else if (activity.activityType === 'emergency_accessed') {
            router.push('/emergency');
          }
        }
      }));
      
      setRecentActivities(transformedActivities);
      setActivityCounts({
        facilities: data.counts.facilities,
        symptoms: data.counts.symptoms,
        emergency: data.counts.emergency
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivitiesError('Failed to load activities');
    } finally {
      setIsLoadingActivities(false);
    }
  }, [status, router]);

  // Fetch activities on mount and when authenticated
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Helper function to get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'facility_found': return Hospital;
      case 'symptom_checked': return Bot;
      case 'emergency_accessed': return Phone;
      case 'first_aid_viewed': return Heart;
      default: return Activity;
    }
  };
  
  // Get user info with proper typing
  const userName: string = session?.user?.name || 'User';
  const userEmail: string | null = session?.user?.email || null;
  
  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Get contextual greeting based on health system hours
  const getContextualInfo = (): string => {
    const hour = currentTime.getHours();
    if (hour >= 18 || hour < 6) return "Most clinics are closed. Emergency services available 24/7";
    if (hour >= 12 && hour < 14) return "Lunch hours - some facilities may have limited service";
    return "Most healthcare facilities are open";
  };
  
  const [coreFeatures] = useState<CoreFeature[]>([
    { 
      id: 1, 
      icon: MapPin, 
      title: "Smart Facility Finder", 
      description: "Find nearby hospitals, clinics, and pharmacies",
      color: "feature-blue",
      action: () => router.push('/facilities'),
      image: "/images/facility-finder.jpg", 
      imageAlt: "Healthcare facility finder illustration"
    },
    { 
      id: 2, 
      icon: Bot, 
      title: "AI Symptom Checker", 
      description: "Get AI-powered health assessments",
      color: "feature-purple",
      action: () => router.push('/symptom-checker'),
      image: "/images/ai-symptom-checker.jpg",
      imageAlt: "AI symptom checker illustration"
    },
    { 
      id: 3, 
      icon: Phone, 
      title: "Emergency Hub", 
      description: "Quick access to emergency services & first aid",
      color: "feature-red",
      action: () => router.push('/emergency'),
      image: "/images/emergency-hub.jpg",
      imageAlt: "Emergency services illustration"
    }
  ]);

  // Enhanced quick stats with insights
  const quickStats: QuickStat[] = [
    { 
      label: "Facilities", 
      value: activityCounts.facilities.toString(), 
      icon: MapPin, 
      color: "stat-blue",
      trend: activityCounts.facilities > 0 ? "+2 this week" : undefined,
      insight: activityCounts.facilities === 0 ? "Start exploring nearby healthcare" : "Continue exploring"
    },
    { 
      label: "Symptoms", 
      value: activityCounts.symptoms.toString(), 
      icon: Bot, 
      color: "stat-purple",
      trend: activityCounts.symptoms > 0 ? "Last checked 2 days ago" : undefined,
      insight: activityCounts.symptoms === 0 ? "Get AI-powered health insights" : "Stay informed"
    },
    { 
      label: "Emergency", 
      value: activityCounts.emergency.toString(), 
      icon: Phone, 
      color: "stat-red",
      insight: "Always ready when you need it"
    }
  ];

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="dashboard-container">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div className="dashboard-logo-icon">
            <Heart size={20} className="dashboard-logo-heart" />
          </div>
          <div style={{ color: '#6b7280' }}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  // Don't render if unauthenticated
  if (status === 'unauthenticated') {
    return null;
  }

  const getGreeting = (): string => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getFacilityIcon = (type: string): React.ComponentType<{ size: number; className?: string }> => {
    switch (type.toLowerCase()) {
      case 'hospital': return Hospital;
      case 'pharmacy': return Pill;
      case 'clinic': return Stethoscope;
      default: return Hospital;
    }
  };
  
  const getFacilityStatus = (facility: Facility): { status: string; isOpen: boolean } => {
    const hour = currentTime.getHours();
    
    if (facility.emergencyServices) {
      return { status: 'Open 24/7', isOpen: true };
    }
    
    const isOpen = hour >= 8 && hour < 18;
    
    if (isOpen) {
      const hoursLeft = 18 - hour;
      return { 
        status: hoursLeft <= 2 ? `Closing in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}` : 'Open Now',
        isOpen: true 
      };
    }
    
    return { status: 'Closed', isOpen: false };
  };

  const handleBottomNavClick = (path: string, tab: string) => {
    setActiveBottomTab(tab);
    router.push(path);
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab="/dashboard" />
      
      {/* Mobile Navigation Overlay */}
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
      
      <div className="dashboard-content">
        {/* Enhanced Welcome Section with Accurate Location */}
        <div className="dashboard-welcome-enhanced">
          <div className="dashboard-welcome-main">
            <h2 className="dashboard-welcome-title">
              {getGreeting()}, {userName.split(' ')[0]}! 👋
            </h2>
            <p className="dashboard-welcome-subtitle">
              {getContextualInfo()}
            </p>
            
            {/* Dynamic Location Display */}
            {userLocation && locationInfo ? (
              <div className="dashboard-location-info">
                <div className="dashboard-location-badge accurate">
                  <MapPin size={16} />
                  <span>
                    {locationInfo.city && locationInfo.region 
                      ? `${locationInfo.city}, ${locationInfo.region}`
                      : 'Location detected'
                    }
                  </span>
                  {locationInfo.accuracy && locationInfo.accuracy < 100 && (
                    <span className="location-accuracy-badge" title={`GPS accuracy: ±${Math.round(locationInfo.accuracy)}m`}>
                      High Accuracy
                    </span>
                  )}
                  {locationInfo.accuracy && locationInfo.accuracy >= 100 && (
                    <span className="location-accuracy-badge network" title={`Network accuracy: ±${Math.round(locationInfo.accuracy)}m`}>
                      Network
                    </span>
                  )}
                </div>
                {nearbyFacilities.length > 0 && (
                  <div className="dashboard-facilities-summary">
                    <Hospital size={14} />
                    <span>{nearbyFacilities.length} healthcare facilities within 5km</span>
                  </div>
                )}
              </div>
            ) : isLoadingLocation ? (
              <div className="dashboard-location-badge loading">
                <Loader2 size={16} className="spin" />
                <span>Getting your location...</span>
              </div>
            ) : showLocationPrompt ? (
              <div className="dashboard-location-prompt">
                <div className="location-prompt-content">
                  <MapPin size={18} />
                  <span>Enable location to find nearby healthcare facilities</span>
                </div>
                <button 
                  className="location-enable-btn-compact"
                  onClick={getCurrentLocation}
                  type="button"
                >
                  <Crosshair size={16} />
                  Enable GPS Location
                </button>
              </div>
            ) : locationError ? (
              <div className="dashboard-location-error">
                <AlertCircle size={14} />
                <span>{locationError}</span>
                <button 
                  className="location-retry-btn"
                  onClick={getCurrentLocation}
                  type="button"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            ) : null}
          </div>
          
          {/* Emergency Quick Access Panel */}
          <div className="emergency-quick-access-panel">
            <button 
              className="emergency-call-primary"
              onClick={() => window.open('tel:911')}
              type="button"
              aria-label="Call emergency services"
            >
              <Phone size={24} />
              <div className="emergency-call-info">
                <span className="emergency-call-label">Emergency</span>
                <span className="emergency-call-number">911</span>
              </div>
            </button>
            <button 
              className="emergency-access-button"
              onClick={() => router.push('/emergency')}
              type="button"
            >
              <AlertCircle size={20} />
              <span>All Emergency Resources</span>
            </button>
          </div>
        </div>

        {/* Quick Action Bar - Compact */}
        <div className="quick-action-bar">
          <button 
            className="quick-action-btn quick-action-blue"
            onClick={() => router.push('/facilities')}
            type="button"
          >
            <MapPin size={20} />
            <span>Find Facilities</span>
            <ChevronRight size={16} />
          </button>
          <button 
            className="quick-action-btn quick-action-purple"
            onClick={() => router.push('/symptom-checker')}
            type="button"
          >
            <Bot size={20} />
            <span>Check Symptoms</span>
            <ChevronRight size={16} />
          </button>
          <button 
            className="quick-action-btn quick-action-red"
            onClick={() => router.push('/emergency')}
            type="button"
          >
            <Phone size={20} />
            <span>Emergency Hub</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Featured Services with Beautiful Images */}
        <div className="dashboard-features-section">
          <div className="section-header-row">
            <h3 className="section-title">
              <Zap size={24} />
              Featured Services
            </h3>
          </div>
          <div className="dashboard-features-grid-compact">
            {coreFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={feature.action}
                className={`dashboard-feature-card dashboard-feature-card-${feature.color} dashboard-feature-card-with-image`}
                type="button"
              >
                <div className={`dashboard-feature-image-container dashboard-feature-image-${feature.id}`}>
                  <div className={`dashboard-feature-icon dashboard-feature-icon-${feature.color} dashboard-feature-icon-fallback`}>
                    <feature.icon size={28} className="dashboard-feature-icon-svg" />
                  </div>
                </div>
                
                <div className="dashboard-feature-content">
                  <h3 className="dashboard-feature-title">
                    <div className={`dashboard-feature-title-icon dashboard-feature-title-icon-${feature.color}`}>
                      <feature.icon size={20} />
                    </div>
                    {feature.title}
                  </h3>
                  <p className="dashboard-feature-description">{feature.description}</p>
                  <div className="dashboard-feature-cta">
                    Open
                    <ChevronRight size={18} className="dashboard-feature-arrow" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-main-grid">
          {/* Main Content Area */}
          <div className="dashboard-main-content">
            {/* Enhanced Activity Insights */}
            <div className="dashboard-card dashboard-stats-card">
              <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                  <Activity className="dashboard-card-title-icon" size={24} />
                  Your Health Journey
                </h3>
                <button 
                  className="dashboard-view-all-btn" 
                  type="button"
                  onClick={fetchActivities}
                  disabled={isLoadingActivities}
                  title="Refresh insights"
                >
                  {isLoadingActivities ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                </button>
              </div>
              <div className="dashboard-stats-grid">
                {quickStats.map((stat, index) => (
                  <div key={index} className={`dashboard-stat-item dashboard-stat-${stat.color}`}>
                    <div className="dashboard-stat-header">
                      <stat.icon size={20} className="dashboard-stat-icon" />
                      {stat.trend && <div className="dashboard-stat-trend-badge">{stat.trend}</div>}
                    </div>
                    <div className="dashboard-stat-value">{stat.value}</div>
                    <div className="dashboard-stat-label">{stat.label}</div>
                    {stat.insight && (
                      <div className="dashboard-stat-insight">
                        <Info size={12} />
                        <span>{stat.insight}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent & Saved Activity */}
            <div className="dashboard-card dashboard-activity-card">
              <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                  <Clock className="dashboard-card-title-icon" size={24} />
                  Recent Activity
                </h3>
                <button 
                  className="dashboard-view-all-btn" 
                  type="button"
                  onClick={() => router.push('/dashboard/activities')}
                >
                  View All
                  <ChevronRight size={16} />
                </button>
              </div>
              
              <div className="dashboard-activity-list">
                {isLoadingActivities ? (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Loader2 size={24} className="spin" />
                    <p>Loading activities...</p>
                  </div>
                ) : activitiesError ? (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#ef4444',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertCircle size={32} style={{ opacity: 0.5 }} />
                    <p>{activitiesError}</p>
                    <button 
                      onClick={fetchActivities}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <RefreshCw size={16} />
                      Try Again
                    </button>
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Activity size={32} style={{ opacity: 0.5, margin: '0 auto' }} />
                    <p style={{ fontWeight: 500 }}>No activities yet</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Start using features to see your activity here
                    </p>
                  </div>
                ) : (
                  recentActivities.map((activity) => (
                    <button
                      key={activity.id}
                      className="dashboard-activity-item-enhanced"
                      onClick={activity.action}
                      type="button"
                    >
                      <div className="dashboard-activity-icon">
                        <activity.icon size={18} />
                      </div>
                      <div className="dashboard-activity-content">
                        <p className="dashboard-activity-title">{activity.title}</p>
                        <p className="dashboard-activity-time">{activity.time}</p>
                      </div>
                      <ChevronRight size={16} className="dashboard-activity-arrow" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="dashboard-sidebar">
            {/* Nearby Facilities - Enhanced with Accurate Location */}
            <div className="dashboard-card dashboard-facilities-card">
              <div className="dashboard-card-header dashboard-facilities-header">
                <h3 className="dashboard-card-title">
                  <MapPin className="dashboard-card-title-icon" size={20} />
                  Nearby Facilities
                  {userLocation && locationInfo?.city && (
                    <span className="facilities-location-badge">
                      in {locationInfo.city}
                    </span>
                  )}
                </h3>
                <button 
                  className="dashboard-view-all-btn"
                  onClick={() => router.push('/facilities')}
                  type="button"
                >
                  View All
                </button>
              </div>
              <div className="dashboard-facilities-list">
                {!userLocation ? (
                  <div className="facilities-empty-state">
                    <div className="facilities-empty-icon">
                      <MapPin size={32} />
                    </div>
                    <div className="facilities-empty-content">
                      <h4>Enable Location</h4>
                      <p>
                        Allow location access to discover healthcare facilities near you
                      </p>
                    </div>
                    <button 
                      className="facilities-enable-location-btn"
                      onClick={getCurrentLocation}
                      disabled={isLoadingLocation}
                      type="button"
                    >
                      {isLoadingLocation ? (
                        <>
                          <Loader2 size={16} className="spin" />
                          <span>Getting Location...</span>
                        </>
                      ) : (
                        <>
                          <Crosshair size={16} />
                          <span>Enable GPS Location</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : isLoadingFacilities ? (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Loader2 size={24} className="spin" />
                    <p>Finding nearby facilities...</p>
                    {locationInfo?.city && (
                      <small>Searching in {locationInfo.city}</small>
                    )}
                  </div>
                ) : facilitiesError ? (
                  <div style={{ 
                    padding: '1.5rem', 
                    textAlign: 'center', 
                    color: '#ef4444',
                    fontSize: '0.875rem'
                  }}>
                    <AlertCircle size={24} style={{ opacity: 0.5, margin: '0 auto 0.5rem' }} />
                    <p>{facilitiesError}</p>
                    <button 
                      onClick={fetchNearbyFacilities}
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        margin: '0.75rem auto 0'
                      }}
                    >
                      <RefreshCw size={14} />
                      Retry
                    </button>
                  </div>
                ) : nearbyFacilities.length === 0 ? (
                  <div className="facilities-empty-state">
                    <div className="facilities-empty-icon">
                      <Hospital size={32} />
                    </div>
                    <div className="facilities-empty-content">
                      <h4>No Facilities Found</h4>
                      <p>
                        No healthcare facilities found within 5km
                        {locationInfo?.city && ` of ${locationInfo.city}`}
                      </p>
                    </div>
                    <button 
                      className="facilities-enable-location-btn"
                      onClick={() => router.push('/facilities')}
                      type="button"
                    >
                      <MapPin size={16} />
                      <span>Search Wider Area</span>
                    </button>
                  </div>
                ) : (
                  nearbyFacilities.map((facility) => {
                    const IconComponent = getFacilityIcon(facility.type);
                    const { status, isOpen } = getFacilityStatus(facility);
                    
                    return (
                      <div key={facility.id} className="dashboard-facility-item-enhanced">
                        <div className="dashboard-facility-header">
                          <div className="dashboard-facility-name">
                            <IconComponent size={16} className="dashboard-facility-type-icon" />
                            <span className="dashboard-facility-title">{facility.name}</span>
                          </div>
                          <div className="dashboard-facility-rating">
                            <Star size={12} className="dashboard-rating-star" />
                            <span className="dashboard-rating-value">{facility.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="dashboard-facility-info">
                          {facility.type} • {facility.distance.toFixed(1)} km
                          {facility.city && facility.city !== 'Unknown' && (
                            <span className="facility-city"> • {facility.city}</span>
                          )}
                        </div>
                        <div className={`dashboard-facility-status ${isOpen ? 'status-open' : 'status-closed'}`}>
                          <div className={`status-dot ${isOpen ? 'dot-open' : 'dot-closed'}`}></div>
                          {status}
                        </div>
                        <div className="dashboard-facility-actions">
                          {facility.phone && facility.phone !== 'Not available' && (
                            <button 
                              className="facility-quick-btn"
                              onClick={() => window.open(`tel:${facility.phone}`)}
                              type="button"
                              title="Call facility"
                            >
                              <Phone size={14} />
                            </button>
                          )}
                          <button 
                            className="facility-quick-btn"
                            onClick={() => router.push(`/facilities?id=${facility.id}`)}
                            type="button"
                            title="Get directions"
                          >
                            <Navigation size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Emergency Hub - Compact */}
            <div className="dashboard-card dashboard-emergency-card-compact">
              <div className="dashboard-emergency-header">
                <div className="dashboard-emergency-icon">
                  <Phone size={20} />
                </div>
                <h3 className="dashboard-emergency-title">Emergency Hub</h3>
              </div>
              <p className="dashboard-emergency-description">
                Access emergency services and first aid guides anytime.
              </p>
              <button 
                className="dashboard-emergency-btn-primary"
                onClick={() => router.push('/emergency')}
                type="button"
              >
                Open Emergency Hub
              </button>
            </div>

            {/* Health Insights Widget */}
            <div className="dashboard-card dashboard-insights-card">
              <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                  <TrendingUp className="dashboard-card-title-icon" size={20} />
                  Health Insights
                </h3>
              </div>
              <div className="dashboard-insights-list">
                {activityCounts.symptoms > 0 && (
                  <div className="insight-item">
                    <CheckCircle size={16} className="insight-icon-success" />
                    <p>You've checked symptoms {activityCounts.symptoms} time{activityCounts.symptoms > 1 ? 's' : ''}</p>
                  </div>
                )}
                {activityCounts.facilities > 0 && (
                  <div className="insight-item">
                    <CheckCircle size={16} className="insight-icon-success" />
                    <p>{activityCounts.facilities} new facilities discovered</p>
                  </div>
                )}
                {nearbyFacilities.length > 0 && locationInfo?.city && (
                  <div className="insight-item">
                    <Info size={16} className="insight-icon-info" />
                    <p>{nearbyFacilities.length} healthcare facilities in {locationInfo.city}</p>
                  </div>
                )}
                {userLocation && locationInfo?.accuracy && locationInfo.accuracy < 100 && (
                  <div className="insight-item">
                    <CheckCircle size={16} className="insight-icon-success" />
                    <p>High-accuracy GPS location enabled</p>
                  </div>
                )}
                {activityCounts.facilities === 0 && activityCounts.symptoms === 0 && !userLocation && (
                  <div className="insight-item">
                    <Info size={16} className="insight-icon-info" />
                    <p>Enable location to get personalized insights</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

     {/* Bottom Navigation - Mobile Only */}
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
      
      {/* Floating Emergency Button - Desktop Only */}
      <button
        className="dashboard-floating-emergency"
        onClick={() => router.push('/emergency')}
        title="Quick access to Emergency Hub"
        type="button"
        aria-label="Emergency Hub"
      >
        <Phone size={24} />
      </button>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="dashboard-footer-content">
          <div className="dashboard-footer-main">
            <div className="dashboard-footer-brand">
              <div className="dashboard-footer-logo">
                <Heart size={20} className="dashboard-footer-heart" />
                <span className="dashboard-footer-brand-text">HealthConnect Navigator</span>
              </div>
              <p className="dashboard-footer-tagline">
                Your trusted companion for healthcare navigation and emergency preparedness across Ghana.
              </p>
            </div>
            
            <div className="dashboard-footer-links">
              <div className="dashboard-footer-section">
                <h4 className="dashboard-footer-section-title">Services</h4>
                <ul className="dashboard-footer-list">
                  <li><button onClick={() => router.push('/facilities')} className="dashboard-footer-link">Find Facilities</button></li>
                  <li><button onClick={() => router.push('/symptom-checker')} className="dashboard-footer-link">Symptom Checker</button></li>
                  <li><button onClick={() => router.push('/emergency')} className="dashboard-footer-link">Emergency Hub</button></li>
                </ul>
              </div>
              
              <div className="dashboard-footer-section">
                <h4 className="dashboard-footer-section-title">Account</h4>
                <ul className="dashboard-footer-list">
                  <li><button onClick={() => router.push('/profile')} className="dashboard-footer-link">Profile</button></li>
                  <li><button onClick={handleSignOut} className="dashboard-footer-link">Sign Out</button></li>
                </ul>
              </div>
              
              <div className="dashboard-footer-section">
                <h4 className="dashboard-footer-section-title">Support</h4>
                <ul className="dashboard-footer-list">
                  <li><button className="dashboard-footer-link">Help Center</button></li>
                  <li><button className="dashboard-footer-link">Contact Us</button></li>
                  <li><button className="dashboard-footer-link">Privacy Policy</button></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="dashboard-footer-bottom">
            <div className="dashboard-footer-copyright">
              <p>&copy; 2025 HealthConnect Navigator. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;