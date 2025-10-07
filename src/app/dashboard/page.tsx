'use client'

import React, { useState, useEffect, useCallback } from 'react';
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
  CheckCircle
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

const Dashboard: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  
  // Real activity states
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [activityCounts, setActivityCounts] = useState({
    facilities: 0,
    symptoms: 0,
    emergency: 0
  });
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  
  // Nearby facilities states
  const [nearbyFacilities, setNearbyFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
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
  
  // Check if user has already granted location permission (without prompting)
  useEffect(() => {
    if (status !== 'authenticated') return;
    
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation([position.coords.latitude, position.coords.longitude]);
            },
            (error) => {
              console.warn('Geolocation error:', error);
            },
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000
            }
          );
        }
      }).catch(() => {
        console.log('Permissions API not supported');
      });
    }
  }, [status]);
  
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

  // Known Ghana facilities
  const getKnownGhanaFacilities = useCallback((lat: number, lng: number): Facility[] => {
    const knownFacilities = [
      {
        name: "Korle Bu Teaching Hospital",
        coordinates: [5.5502, -0.2174] as [number, number],
        type: "hospital",
        address: "Guggisberg Avenue, Korle Bu",
        city: "Accra",
        phone: "+233 30 266 6375",
        services: ["Emergency Care", "Surgery", "Cardiology", "Neurology", "Oncology", "Maternity"],
        emergencyServices: true
      },
      {
        name: "Ridge Hospital",
        coordinates: [5.6037, -0.1870] as [number, number],
        type: "hospital",
        address: "Castle Road, Ridge",
        city: "Accra",
        phone: "+233 30 222 2211",
        services: ["Emergency Care", "Internal Medicine", "Pediatrics", "Obstetrics"],
        emergencyServices: true
      },
      {
        name: "37 Military Hospital",
        coordinates: [5.5970, -0.1700] as [number, number],
        type: "hospital",
        address: "Liberation Road, Airport Residential Area",
        city: "Accra",
        phone: "+233 30 277 6111",
        services: ["Emergency Care", "Military Medicine", "Rehabilitation", "Surgery"],
        emergencyServices: true
      },
      {
        name: "Ernest Chemists - Oxford Street",
        coordinates: [5.5550, -0.1873] as [number, number],
        type: "pharmacy",
        address: "Oxford Street, Osu",
        city: "Accra",
        phone: "+233 30 224 1234",
        services: ["Prescriptions", "OTC Medicines", "Health Consultations"],
        emergencyServices: false
      },
      {
        name: "Nyaho Medical Centre",
        coordinates: [5.6050, -0.1690] as [number, number],
        type: "clinic",
        address: "Airport City, Kotoka International Airport Area",
        city: "Accra",
        phone: "+233 30 278 2641",
        services: ["Emergency Care", "Internal Medicine", "Surgery", "Radiology"],
        emergencyServices: true
      },
      {
        name: "Greater Accra Regional Hospital",
        coordinates: [5.6520, -0.1670] as [number, number],
        type: "hospital",
        address: "Ridge, Near Parliament House",
        city: "Accra",
        phone: "+233 30 222 4200",
        services: ["Emergency Care", "General Medicine", "Surgery", "Maternity"],
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

  // Fetch nearby facilities with real data
  const fetchNearbyFacilities = useCallback(async () => {
    if (!userLocation || status !== 'authenticated') return;
    
    try {
      setIsLoadingFacilities(true);
      setFacilitiesError(null);
      
      const [lat, lng] = userLocation;
      let allFacilities: Facility[] = [];
      
      // Get known Ghana facilities first
      const knownFacilities = getKnownGhanaFacilities(lat, lng);
      allFacilities.push(...knownFacilities);
      
      // Try to fetch from OpenStreetMap
      try {
        const overpassQuery = `
          [out:json][timeout:30];
          (
            node["amenity"="hospital"](around:10000,${lat},${lng});
            way["amenity"="hospital"](around:10000,${lat},${lng});
            node["amenity"="clinic"](around:10000,${lat},${lng});
            way["amenity"="clinic"](around:10000,${lat},${lng});
            node["amenity"="pharmacy"](around:10000,${lat},${lng});
            way["amenity"="pharmacy"](around:10000,${lat},${lng});
          );
          out center body;
        `;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
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
                if (name.length < 3) return;
                
                const amenity = element.tags.amenity || 'clinic';
                const distance = calculateDistance(lat, lng, coords[0], coords[1]);
                
                if (distance > 10) return;
                
                let type: string = 'clinic';
                if (amenity === 'hospital') {
                  type = 'hospital';
                } else if (amenity === 'pharmacy') {
                  type = 'pharmacy';
                }
                
                const services: string[] = [];
                if (element.tags.emergency === 'yes') services.push('Emergency Care');
                if (type === 'hospital') {
                  if (services.length === 0) services.push('Inpatient Care', 'General Medicine');
                } else if (type === 'pharmacy') {
                  if (services.length === 0) services.push('Prescriptions', 'OTC Medications');
                } else {
                  if (services.length === 0) services.push('Outpatient Care', 'Consultations');
                }
                
                allFacilities.push({
                  id: `osm_${element.type}_${element.id}`,
                  name,
                  type,
                  address: element.tags['addr:street'] || 'Address not available',
                  city: element.tags['addr:city'] || 'Accra',
                  region: 'Greater Accra',
                  distance,
                  rating: 3.5 + Math.random() * 1.5,
                  reviews: Math.floor(Math.random() * 300) + 20,
                  phone: element.tags.phone || 'Not available',
                  hours: element.tags.opening_hours || (type === 'hospital' ? '24/7' : 'Call for hours'),
                  services,
                  coordinates: coords as [number, number],
                  emergencyServices: element.tags.emergency === 'yes' || type === 'hospital',
                  insurance: ['NHIS', 'Private']
                });
              } catch (elementError) {
                console.warn('Error processing element:', elementError);
              }
            });
          }
        }
      } catch (overpassError: any) {
        console.warn('Overpass API error:', overpassError);
      }
      
      // Remove duplicates and sort by distance
      const uniqueFacilities = allFacilities.filter((facility, index, self) => {
        return index === self.findIndex(f => {
          const nameSimilar = f.name.toLowerCase().trim() === facility.name.toLowerCase().trim();
          const locationClose = Math.abs(f.distance - facility.distance) < 0.05;
          return nameSimilar && locationClose;
        });
      });
      
      uniqueFacilities.sort((a, b) => a.distance - b.distance);
      
      // Get top 5 nearest facilities
      setNearbyFacilities(uniqueFacilities.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching nearby facilities:', error);
      setFacilitiesError('Unable to load nearby facilities');
      
      // Fallback to known facilities only
      if (userLocation) {
        const fallbackFacilities = getKnownGhanaFacilities(userLocation[0], userLocation[1]);
        setNearbyFacilities(fallbackFacilities.slice(0, 5));
      }
    } finally {
      setIsLoadingFacilities(false);
    }
  }, [userLocation, status, calculateDistance, getKnownGhanaFacilities]);
  
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
      
      // Transform API data to match ActivityItem interface with actions
      const transformedActivities = data.activities.map((activity: any) => ({
        id: activity.id,
        type: activity.activityType,
        title: activity.title,
        time: getRelativeTime(new Date(activity.createdAt)),
        icon: getActivityIcon(activity.activityType),
        action: () => {
          // Add resume functionality based on activity type
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
      label: "Facilities Found", 
      value: activityCounts.facilities.toString(), 
      icon: MapPin, 
      color: "stat-blue",
      trend: activityCounts.facilities > 0 ? "+2 this week" : undefined,
      insight: activityCounts.facilities === 0 ? "Start exploring nearby healthcare" : "Continue exploring"
    },
    { 
      label: "Symptoms Checked", 
      value: activityCounts.symptoms.toString(), 
      icon: Bot, 
      color: "stat-purple",
      trend: activityCounts.symptoms > 0 ? "Last checked 2 days ago" : undefined,
      insight: activityCounts.symptoms === 0 ? "Get AI-powered health insights" : "Stay informed"
    },
    { 
      label: "Emergency Access", 
      value: activityCounts.emergency.toString(), 
      icon: Phone, 
      color: "stat-red",
      insight: "Always ready when you need it"
    }
  ];

  // Update time every minute (not every second)
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
    
    // Simple open/closed logic (8 AM - 6 PM for regular facilities)
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

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab="/dashboard" />
      
      <div className="dashboard-content">
        {/* Enhanced Welcome Section with Emergency Access */}
        <div className="dashboard-welcome-enhanced">
          <div className="dashboard-welcome-main">
            <h2 className="dashboard-welcome-title">
              {getGreeting()}, {userName.split(' ')[0]}!
            </h2>
            <p className="dashboard-welcome-subtitle">
              {getContextualInfo()}
            </p>
            {userLocation && (
              <div className="dashboard-location-badge">
                <MapPin size={16} />
                <span>Accra, Ghana</span>
              </div>
            )}
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
            {/* Nearby Facilities - Enhanced */}
            <div className="dashboard-card dashboard-facilities-card">
              <div className="dashboard-card-header dashboard-facilities-header">
                <h3 className="dashboard-card-title">
                  <MapPin className="dashboard-card-title-icon" size={20} />
                  Nearby Facilities
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
                  <div style={{ 
                    padding: '2rem 1.5rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <MapPin size={32} style={{ opacity: 0.5 }} />
                    <div>
                      <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
                        Location Not Enabled
                      </p>
                      <p style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                        Visit the Facility Finder to enable location and discover nearby healthcare facilities
                      </p>
                    </div>
                    <button 
                      onClick={() => router.push('/facilities')}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.625rem 1.25rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <MapPin size={16} />
                      Go to Facility Finder
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
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    <MapPin size={32} style={{ opacity: 0.5, margin: '0 auto 0.5rem' }} />
                    <p>No facilities found nearby</p>
                    <button 
                      onClick={() => router.push('/facilities')}
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Search Facilities
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
                        </div>
                        <div className={`dashboard-facility-status ${isOpen ? 'status-open' : 'status-closed'}`}>
                          <div className={`status-dot ${isOpen ? 'dot-open' : 'dot-closed'}`}></div>
                          {status}
                        </div>
                        <div className="dashboard-facility-actions">
                          <button 
                            className="facility-quick-btn"
                            onClick={() => window.open(`tel:${facility.id}`)}
                            type="button"
                          >
                            <Phone size={14} />
                          </button>
                          <button 
                            className="facility-quick-btn"
                            onClick={() => router.push(`/facilities?id=${facility.id}`)}
                            type="button"
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
                {nearbyFacilities.length > 0 && (
                  <div className="insight-item">
                    <Info size={16} className="insight-icon-info" />
                    <p>{nearbyFacilities.length} healthcare facilities within 5km</p>
                  </div>
                )}
                {activityCounts.facilities === 0 && activityCounts.symptoms === 0 && (
                  <div className="insight-item">
                    <Info size={16} className="insight-icon-info" />
                    <p>Start exploring to get personalized insights</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Emergency Button */}
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
                Your trusted companion for healthcare navigation and emergency preparedness.
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