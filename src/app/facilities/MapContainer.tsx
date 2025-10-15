'use client'

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital, Pill, Stethoscope, Heart } from 'lucide-react';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

interface MapContainerProps {
  facilities: Facility[];
  userLocation: [number, number] | null;
  onFacilitySelect: (facility: Facility) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({ facilities, userLocation, onFacilitySelect }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get icon color based on facility type
  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'hospital': return '#ef4444'; // red
      case 'clinic': return '#8b5cf6'; // purple
      case 'pharmacy': return '#10b981'; // green
      case 'health_center': return '#3b82f6'; // blue
      default: return '#6b7280'; // gray
    }
  };

  // Create custom icon for facility markers
  const createFacilityIcon = (type: string, isEmergency: boolean) => {
    const color = getMarkerColor(type);
    const emergencyBadge = isEmergency ? '<div style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;border:2px solid white;">!</div>' : '';
    
    return L.divIcon({
      className: 'custom-facility-marker',
      html: `
        <div style="position:relative;width:32px;height:32px;">
          <div style="
            width:32px;
            height:32px;
            background:${color};
            border:3px solid white;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-weight:bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor:pointer;
          ">
            ${type === 'hospital' ? 'H' : type === 'clinic' ? 'C' : type === 'pharmacy' ? 'P' : 'HC'}
          </div>
          ${emergencyBadge}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  };

  // Create custom icon for user location
  const createUserLocationIcon = () => {
    return L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position:relative;width:40px;height:40px;">
          <div style="
            position:absolute;
            top:50%;
            left:50%;
            transform:translate(-50%,-50%);
            width:40px;
            height:40px;
            background:rgba(59,130,246,0.2);
            border-radius:50%;
            animation:pulse-ring 2s infinite;
          "></div>
          <div style="
            position:absolute;
            top:50%;
            left:50%;
            transform:translate(-50%,-50%);
            width:20px;
            height:20px;
            background:#3b82f6;
            border:4px solid white;
            border-radius:50%;
            box-shadow: 0 4px 12px rgba(59,130,246,0.5);
          "></div>
        </div>
        <style>
          @keyframes pulse-ring {
            0%, 100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
            50% { opacity: 0.5; transform: translate(-50%,-50%) scale(1.3); }
          }
        </style>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Default to Ghana center if no user location
    const defaultCenter: [number, number] = userLocation || [7.9465, -1.0232];
    const defaultZoom = userLocation ? 13 : 7;

    if (!mapRef.current) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const mapElement = document.getElementById('facility-map');
        if (!mapElement) {
          console.error('Map element not found');
          return;
        }

        try {
          const map = L.map('facility-map', {
            center: defaultCenter,
            zoom: defaultZoom,
            zoomControl: true,
            attributionControl: true,
            preferCanvas: true, // Better performance on mobile
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            minZoom: 3,
          }).addTo(map);

          mapRef.current = map;
          setIsMapReady(true);

          // Force map to recalculate size after initialization
          setTimeout(() => {
            if (map) {
              map.invalidateSize();
            }
          }, 100);
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }, 100);

      return () => clearTimeout(timer);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle window resize and orientation change
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const handleResize = () => {
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isMapReady]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !isMapReady || !userLocation) return;

    // Remove old user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Create new user marker
    const userMarker = L.marker(userLocation, {
      icon: createUserLocationIcon(),
      zIndexOffset: 1000 // Make sure it's on top
    });

    userMarker.bindPopup(`
      <div style="text-align:center;padding:8px;">
        <strong style="color:#3b82f6;">Your Location</strong><br/>
        <small style="color:#6b7280;">Current position</small>
      </div>
    `, {
      closeButton: true,
      autoClose: false,
      closeOnClick: false
    });

    userMarker.addTo(mapRef.current);
    
    // IMPORTANT: Open the popup automatically when location is obtained
    userMarker.openPopup();
    
    userMarkerRef.current = userMarker;

    // Center map on user location
    mapRef.current.setView(userLocation, 13, {
      animate: true,
      duration: 1
    });

    // Invalidate map size to ensure proper rendering
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

  }, [userLocation, isMapReady]);

  // Update facility markers
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add facility markers
    facilities.forEach(facility => {
      const marker = L.marker(facility.coordinates, {
        icon: createFacilityIcon(facility.type, facility.emergencyServices)
      });

      marker.bindPopup(`
        <div style="min-width:200px;padding:8px;">
          <h3 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#1f2937;">${facility.name}</h3>
          <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;">${facility.city}, ${facility.region}</p>
          <p style="margin:0 0 8px 0;font-size:12px;color:#3b82f6;font-weight:600;">${facility.distance.toFixed(1)} km away</p>
          <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;">
            ${facility.emergencyServices ? '<span style="background:rgba(239,68,68,0.1);color:#dc2626;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">24/7 Emergency</span>' : ''}
            <span style="background:rgba(59,130,246,0.1);color:#3b82f6;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${facility.type.replace('_', ' ')}</span>
          </div>
          <button 
            onclick="window.selectFacility('${facility.id}')"
            style="
              width:100%;
              padding:8px;
              background:#3b82f6;
              color:white;
              border:none;
              border-radius:8px;
              font-weight:600;
              cursor:pointer;
              font-size:12px;
            "
          >
            View Details
          </button>
        </div>
      `, {
        maxWidth: 250,
        closeButton: true
      });

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all facilities and user location
    if (facilities.length > 0 && userLocation) {
      const bounds = L.latLngBounds([
        userLocation,
        ...facilities.map(f => f.coordinates)
      ]);
      mapRef.current.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 15
      });
    }

    // Invalidate map size after adding markers
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

  }, [facilities, isMapReady, userLocation]);

  // Handle facility selection from popup
  useEffect(() => {
    (window as any).selectFacility = (facilityId: string) => {
      const facility = facilities.find(f => f.id === facilityId);
      if (facility) {
        onFacilitySelect(facility);
      }
    };

    return () => {
      delete (window as any).selectFacility;
    };
  }, [facilities, onFacilitySelect]);

  return (
    <div 
      ref={containerRef}
      id="facility-map" 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '400px',
        position: 'relative',
        zIndex: 1
      }} 
    />
  );
};

export default MapContainer;