'use client'

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital, Pill, Stethoscope, Heart, Loader2, SearchX } from 'lucide-react';

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
  type: string; // one of FACILITY_TYPE_OPTIONS slugs — see src/lib/constants.ts
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

interface MapContainerProps {
  facilities: Facility[];
  userLocation: [number, number] | null;
  onFacilitySelect: (facility: Facility) => void;
  focusFacility?: Facility | null;
  // Fires once, the first time markers have actually been placed for the
  // CURRENT (settled) `facilities` prop — see isLoading below for what
  // "settled" excludes. This is a client-only, dynamically-imported
  // component (see the `dynamic(..., { ssr:false })` wrapper in page.tsx)
  // with its own Leaflet init sequence — the parent's `facilities` array
  // can be populated well before this map has finished getting ready, so
  // callers that need to know "the map now reflects reality" (e.g. before
  // auto-scrolling to reveal it) should use this rather than inferring
  // readiness from the facilities data alone.
  onReady?: () => void;
  // True while the parent's Overpass fetch for the current search is in
  // flight. Without this, onReady fired the moment Leaflet itself finished
  // initialising (~100-300ms) — far faster than the network round-trip —
  // with `facilities` still stuck at its pre-fetch `[]`. Gating onReady on
  // `!isLoading` too means it only fires once the current data (real
  // results, or a genuine zero) has actually been rendered — not a
  // transient placeholder. Also drives the "finding facilities…" overlay.
  isLoading?: boolean;
  // Friendly card overlaid on the map once loading finishes with zero
  // results for a real search. Parent computes the copy and any follow-up
  // action (e.g. widen radius) since it already owns that logic for the
  // sidebar/list empty states — MapContainer just displays what it's given.
  emptyState?: { title: string; body: string; actionLabel?: string; onAction?: () => void } | null;
}

const MapContainer: React.FC<MapContainerProps> = ({ facilities, userLocation, onFacilitySelect, focusFacility, onReady, isLoading = false, emptyState = null }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasFiredOnReadyRef = useRef(false);
  // True from the moment a facility is selected until its marker's popup
  // actually opens on screen — covers the flyTo pan/zoom animation, which
  // otherwise left the user staring at a static map with no feedback that
  // anything was happening (see loading overlay in the return below).
  const [isFocusing, setIsFocusing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Icon color per facility type — widened from 4 buckets to the full
  // 9-type FACILITY_TYPE_OPTIONS taxonomy shared with /facilities and
  // find-care/results.
  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'hospital':      return '#ef4444'; // red
      case 'clinic':        return '#00d2ff'; // cyan
      case 'pharmacy':      return '#10b981'; // green
      case 'dentist':       return '#f59e0b'; // amber
      case 'eye_clinic':    return '#8b5cf6'; // violet
      case 'ent_clinic':    return '#ec4899'; // pink
      case 'laboratory':    return '#6366f1'; // indigo
      case 'maternity':     return '#fb7185'; // rose
      case 'mental_health': return '#14b8a6'; // teal
      default: return '#6b7280'; // gray
    }
  };

  const MARKER_LETTERS: Record<string, string> = {
    hospital: 'H', clinic: 'CL', pharmacy: 'P', dentist: 'D',
    eye_clinic: 'EY', ent_clinic: 'EN', laboratory: 'LB',
    maternity: 'M', mental_health: 'MH',
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
            font-size:11px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor:pointer;
          ">
            ${MARKER_LETTERS[type] ?? '?'}
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

    let initTimer: ReturnType<typeof setTimeout> | undefined;
    let invalidateTimer: ReturnType<typeof setTimeout> | undefined;

    if (!mapRef.current) {
      // Add a small delay to ensure DOM is ready
      initTimer = setTimeout(() => {
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
          invalidateTimer = setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.invalidateSize();
            }
          }, 100);
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }, 100);
    }

    // Single cleanup path for both timers AND the map instance, so
    // map.remove() actually runs on unmount. Previously the `!mapRef.current`
    // branch above returned its own cleanup that only cleared the init
    // timer — with a [] dep array that branch is the only one ever taken
    // on mount, so the map.remove() cleanup below was unreachable and the
    // Leaflet instance (DOM nodes, tile layer, internal listeners) leaked
    // every time this component unmounted.
    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (invalidateTimer) clearTimeout(invalidateTimer);
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

    // Center map on user location — but only if we're not focused on a
    // searched facility. Once a facility is focused (isFocusedOnFacilityRef=true)
    // the map stays there even after the detail panel closes.
    if (!isFocusedOnFacilityRef.current) {
      mapRef.current.setView(userLocation, 13, {
        animate: true,
        duration: 1
      });
    }

    // Invalidate map size to ensure proper rendering
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

  }, [userLocation, isMapReady]);

  // The "Your Location" popup above opens automatically and stays open
  // (autoClose/closeOnClick are both false) — fine on its own, but it's
  // centered on the user marker, which is also roughly where the map is
  // centered, which is also where the empty-state card below centers
  // itself. With zero results, that's two cards stacked on the same spot.
  // Closing this one when emptyState is showing keeps a single, legible
  // message on screen instead of an overlapping mess.
  useEffect(() => {
    if (emptyState) {
      userMarkerRef.current?.closePopup();
    }
  }, [emptyState]);

  // Update facility markers
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    markerMapRef.current.clear();

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
            <span style="background:rgba(59,130,246,0.1);color:#3b82f6;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${facility.typeLabel}</span>
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
      markerMapRef.current.set(facility.id, marker);
    });

    // First time markers are placed for the CURRENT, settled facilities —
    // tells callers the map now visually reflects real data, not just
    // that the data array changed. Skipped while isLoading is true so
    // this never fires against the transient `[]` shown before a fetch
    // resolves — see onReady/isLoading in props above.
    //
    // Also requires userLocation: in plain browse mode (arriving with no
    // location yet), the map finishes initializing well before the user
    // grants location, at which point isLoading is *also* false (nothing
    // has started loading yet) — so without this check the latch fires
    // immediately against the empty pre-search state, and by the time the
    // real first search runs, onReady has already fired and can't signal
    // that *those* markers have landed. Gating on userLocation too keeps
    // this aligned with the only consumer (page.tsx's auto-scroll effect),
    // which already requires userLocation before it does anything.
    if (!hasFiredOnReadyRef.current && !isLoading && userLocation) {
      hasFiredOnReadyRef.current = true;
      onReady?.();
    }

    // Always snap to user at street level. fitBounds is intentionally removed —
    // it zooms out to show all markers at once, which makes them look crowded
    // in dense areas like Accra. Users can pan/zoom to find farther facilities.
    if (userLocation) {
      const current = mapRef.current.getCenter();
      const toRad = (d: number) => (d * Math.PI) / 180;
      const distKm =
        6371 * 2 * Math.asin(Math.sqrt(
          Math.sin(toRad((current.lat - userLocation[0]) / 2)) ** 2 +
          Math.cos(toRad(userLocation[0])) * Math.cos(toRad(current.lat)) *
          Math.sin(toRad((current.lng - userLocation[1]) / 2)) ** 2
        ));
      // Only re-centre if drifted >500 m AND user hasn't searched for a facility
      if (distKm > 0.5 && !isFocusedOnFacilityRef.current) {
        mapRef.current.setView(userLocation, 13, { animate: true, duration: 0.8 });
      }
    }

    // Invalidate map size after adding markers
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities, isMapReady, userLocation, isLoading]);

  // Marker id → marker lookup (rebuilt whenever facilities markers change)
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  // Tracks whether the map is currently focused on a searched facility.
  // When true, the userLocation effect must NOT snap the map back.
  const isFocusedOnFacilityRef = useRef(false);

  // Fly to facility when selected from search dropdown.
  // Uses focusFacility?.id as the dep so re-selecting same facility still works.
  // When focusFacility is null (user clicked Find Near Me), release the lock.
  useEffect(() => {
    if (!focusFacility) {
      isFocusedOnFacilityRef.current = false; // allow map to snap back to user
      setIsFocusing(false);
      return;
    }
    if (!mapRef.current || !isMapReady) return;
    isFocusedOnFacilityRef.current = true; // prevent userLocation from snapping back
    setIsFocusing(true); // shows the loading overlay until the popup lands below
    const [lat, lng] = focusFacility.coordinates;
    mapRef.current.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
    // Open popup after animation lands
    const popupTimer = setTimeout(() => {
      markerMapRef.current.get(focusFacility.id)?.openPopup();
      setIsFocusing(false);
    }, 1350);
    // Previously had no cleanup — if focusFacility changed again (or the
    // component unmounted) before this fired, it could still open a stale
    // popup or call setIsFocusing after the fact. Clearing it here matches
    // the pattern the rest of this file already uses for its own timers.
    return () => clearTimeout(popupTimer);
  }, [focusFacility?.id, focusFacility, isMapReady]);

  // Reopen marker popup when detail panel closes (panel was covering the tag)
  useEffect(() => {
    const handler = (e: Event) => {
      const { facilityId } = (e as CustomEvent).detail;
      const marker = markerMapRef.current.get(facilityId);
      if (marker && mapRef.current) {
        // Small delay so the panel slide-out animation finishes first
        setTimeout(() => marker.openPopup(), 150);
      }
    };
    window.addEventListener('reopenFacilityPopup', handler);
    return () => window.removeEventListener('reopenFacilityPopup', handler);
  }, []);

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
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Leaflet takes direct DOM ownership of this element (tile panes,
          markers, etc. are appended imperatively via L.map('facility-map')).
          It must stay free of React-rendered children — React and Leaflet
          fighting over the same DOM node's children is how you get
          "Failed to execute removeChild" errors. The overlay below is a
          sibling instead, in the wrapper div React actually controls. */}
      <div
        id="facility-map"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          position: 'relative',
          zIndex: 1
        }}
      />
      {(!isMapReady || isFocusing || isLoading) && (
        <div className="facility-map-loading-overlay" role="status" aria-live="polite">
          <div className="facility-map-loading-overlay__content">
            <Loader2 size={22} className="spin" />
            <p>
              {!isMapReady
                ? 'Loading map…'
                : isFocusing
                ? `Finding ${focusFacility?.name ?? 'the facility'}…`
                : 'Finding facilities near you…'}
            </p>
          </div>
        </div>
      )}
      {isMapReady && !isLoading && !isFocusing && emptyState && (
        <div className="facility-map-empty-overlay" role="status">
          <div className="facility-map-empty-overlay__content">
            <SearchX size={26} />
            <h4>{emptyState.title}</h4>
            <p>{emptyState.body}</p>
            {emptyState.actionLabel && emptyState.onAction && (
              <button type="button" className="fcr-empty-state__btn" onClick={emptyState.onAction}>
                {emptyState.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapContainer;