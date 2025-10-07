// LocationPermissionBanner.tsx
// Add this component to your facility finder page

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Heart, TrendingUp, X, Check } from 'lucide-react';

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
    // Check if user has already granted location permission
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setHasLocationPermission(result.state === 'granted');
        
        // Show banner if permission is not granted
        if (result.state !== 'granted') {
          // Delay showing banner for smooth animation
          setTimeout(() => setIsVisible(true), 500);
        }
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setHasLocationPermission(result.state === 'granted');
          if (result.state === 'granted') {
            handleDismiss();
          }
        });
      }).catch(() => {
        // Fallback: show banner if permissions API not supported
        setTimeout(() => setIsVisible(true), 500);
      });
    } else {
      // Show banner if permissions API not supported
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300);
  };

  // Don't render if already has permission or not visible
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
        >
          {isLoading ? (
            <>
              <div className="auth-spinner"></div>
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
        >
          <span>Maybe Later</span>
        </button>
      </div>
      
      <button
        className="location-banner-close"
        onClick={handleDismiss}
        aria-label="Close banner"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default LocationPermissionBanner;
