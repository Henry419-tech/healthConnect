'use client'

import React, { useEffect, useRef } from 'react';

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

const MapContainer: React.FC<MapContainerProps> = ({ 
  facilities, 
  userLocation, 
  onFacilitySelect 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const leafletRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        console.log('Initializing Leaflet map...');
        
        // Import Leaflet
        const L = await import('leaflet');
        leafletRef.current = L;
        
        // Fix Leaflet default icon issue
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        if (!mounted) return;

        // Initialize map
        const center: [number, number] = userLocation || [5.6037, -0.1870];
        console.log('Map center:', center);
        
        mapInstanceRef.current = L.map(mapRef.current, {
          center,
          zoom: userLocation ? 13 : 10,
          zoomControl: true,
          scrollWheelZoom: true,
        });
        
        console.log('Map instance created');

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
        
        console.log('Tile layer added');

        // Add scale control
        L.control.scale({ 
          imperial: false, 
          metric: true 
        }).addTo(mapInstanceRef.current);

        console.log('Map initialization complete. Waiting for facilities...');
        console.log('Initial facilities count:', facilities.length);
        console.log('User location:', userLocation);

      } catch (error) {
        console.error('Map initialization error:', error);
      }
    };

    initMap();

    return () => {
      mounted = false;
      // Cleanup
      if (mapInstanceRef.current) {
        console.log('Cleaning up map instance');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
      leafletRef.current = null;
    };
  }, []); // Only run once on mount

  // Separate effect for updating markers and view
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletRef.current) return;

    const L = leafletRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      try {
        mapInstanceRef.current.removeLayer(marker);
      } catch (e) {
        console.warn('Error removing marker:', e);
      }
    });
    markersRef.current = [];

    // Add user location marker if available
    if (userLocation) {
      try {
        const userIcon = L.divIcon({
          html: `<div style="
            width: 24px;
            height: 24px;
            background: #8b5cf6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 10px;
              height: 10px;
              background: white;
              border-radius: 50%;
            "></div>
          </div>`,
          className: 'user-location-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        
        const userMarker = L.marker(userLocation, { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="text-align: center; padding: 8px; min-width: 150px;">
              <strong style="color: #8b5cf6; font-size: 14px;">📍 Your Location</strong>
              <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Current position</p>
            </div>
          `);
        
        markersRef.current.push(userMarker);
        
        // Center map on user location
        mapInstanceRef.current.setView(userLocation, 13, {
          animate: true,
          duration: 1
        });
        
        console.log('User marker added at:', userLocation);
      } catch (e) {
        console.warn('Error adding user marker:', e);
      }
    }

    // Add facility markers
    console.log(`Adding ${facilities.length} facility markers to map`);
    
    facilities.forEach((facility, index) => {
      try {
        if (!facility.coordinates || facility.coordinates.length !== 2) {
          console.warn(`Facility ${facility.name} has invalid coordinates:`, facility.coordinates);
          return;
        }

        const [lat, lng] = facility.coordinates;
        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`Facility ${facility.name} has NaN coordinates:`, lat, lng);
          return;
        }

        let markerColor;
        let markerLabel;
        
        switch (facility.type) {
          case 'hospital': 
            markerColor = facility.emergencyServices ? '#dc2626' : '#ea580c';
            markerLabel = 'H';
            break;
          case 'pharmacy': 
            markerColor = '#2563eb';
            markerLabel = 'P';
            break;
          case 'clinic': 
            markerColor = '#16a34a';
            markerLabel = 'C';
            break;
          case 'health_center':
            markerColor = '#7c3aed';
            markerLabel = 'HC';
            break;
          default: 
            markerColor = '#6b7280';
            markerLabel = '?';
        }
        
        const customIcon = L.divIcon({
          html: `<div style="
            width: 32px;
            height: 32px;
            background-color: ${markerColor};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${markerLabel}</div>`,
          className: 'custom-facility-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(mapInstanceRef.current);

        // Create popup content
        const popupContent = `
          <div style="min-width: 280px; max-width: 320px; font-family: system-ui;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
              <div style="flex: 1;">
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #1f2937; line-height: 1.3;">${facility.name}</h3>
                <span style="background: ${markerColor}; color: white; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${facility.type.replace('_', ' ')}</span>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; align-items: start; gap: 8px;">
                <span style="font-size: 16px;">📍</span>
                <div>
                  <strong style="font-size: 13px; color: #374151;">Location:</strong>
                  <p style="margin: 2px 0 0; font-size: 13px; color: #6b7280; line-height: 1.4;">${facility.address}, ${facility.city}</p>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">📏</span>
                <span style="font-size: 13px; color: #6b7280;"><strong style="color: #374151;">Distance:</strong> ${facility.distance.toFixed(1)} km away</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">⭐</span>
                <span style="font-size: 13px; color: #6b7280;"><strong style="color: #374151;">Rating:</strong> ${facility.rating.toFixed(1)} (${facility.reviews} reviews)</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🕐</span>
                <span style="font-size: 13px; color: #6b7280;"><strong style="color: #374151;">Hours:</strong> ${facility.hours}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">📞</span>
                <span style="font-size: 13px; color: #6b7280;"><strong style="color: #374151;">Phone:</strong> ${facility.phone}</span>
              </div>
              
              ${facility.emergencyServices ? '<div style="background: #fee2e2; border: 1px solid #fecaca; padding: 8px; border-radius: 6px; margin-top: 4px;"><span style="color: #dc2626; font-weight: 600; font-size: 12px;">🚨 24/7 Emergency Services Available</span></div>' : ''}
              
              <div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button onclick="window.open('tel:${facility.phone}', '_self')" style="background: #10b981; color: white; border: none; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">📞 Call</button>
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}', '_blank')" style="background: #3b82f6; color: white; border: none; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">🗺️ Directions</button>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 340,
          className: 'custom-popup',
          closeButton: true
        });

        marker.on('click', () => {
          onFacilitySelect(facility);
          // Open popup when marker is clicked
          marker.openPopup();
        });

        markersRef.current.push(marker);
      } catch (e) {
        console.warn(`Error adding marker for ${facility.name}:`, e);
      }
    });

    console.log(`Successfully added ${markersRef.current.length} markers to map`);

    // Fit map to show all markers
    if (markersRef.current.length > 0) {
      try {
        const group = L.featureGroup(markersRef.current);
        const bounds = group.getBounds();
        
        if (bounds.isValid()) {
          // Add padding and set max zoom
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [60, 60],
            maxZoom: userLocation ? 14 : 12,
            animate: true,
            duration: 1
          });
          
          console.log('Map bounds set successfully');
        } else {
          console.warn('Invalid bounds calculated');
        }
      } catch (e) {
        console.warn('Error fitting bounds:', e);
      }
    } else if (userLocation) {
      // If no facilities but we have user location, center on user
      mapInstanceRef.current.setView(userLocation, 13);
    }

  }, [facilities, userLocation, onFacilitySelect]);

  return (
    <>
      <style jsx>{`
        .facility-finder-map {
          width: 100%;
          height: 100%;
          min-height: 500px;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        .loading-map {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 500px;
        }
        .loading-map-content {
          text-align: center;
          color: #6b7280;
        }
        .loading-map-content p {
          margin-top: 12px;
          font-size: 14px;
        }
        /* Ensure Leaflet controls are visible */
        .leaflet-control-zoom,
        .leaflet-control-scale {
          z-index: 1000 !important;
        }
        /* Custom marker hover effect */
        .custom-facility-marker {
          transition: transform 0.2s ease;
        }
        .custom-facility-marker:hover {
          transform: scale(1.2);
          z-index: 1000 !important;
        }
        /* Custom popup styling */
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        .leaflet-popup-tip {
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      <div 
        ref={mapRef} 
        className="facility-finder-map"
      />
    </>
  );
};

export default MapContainer;