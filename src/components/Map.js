// components/Map.js
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../lib/leafletConfig'; // Fix default icons

// Custom hospital icon
const hospitalIcon = new L.DivIcon({
  html: '<div style="background: #ff4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px;">🏥</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

export default function HealthcareMap({ hospitals = [] }) {
  const [selectedHospital, setSelectedHospital] = useState(null);

  return (
    <MapContainer
      center={[5.6037, -0.1870]} // Accra, Ghana
      zoom={12}
      style={{ width: '100%', height: '400px', borderRadius: '8px' }}
    >
      {/* Multiple tile layer options - choose one */}
      
      {/* Option 1: Standard OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Option 2: CartoDB Light (cleaner look) */}
      {/* <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      /> */}

      {hospitals.map((hospital, index) => (
        <Marker
          key={index}
          position={[hospital.latitude, hospital.longitude]}
          icon={hospitalIcon}
          eventHandlers={{
            click: () => setSelectedHospital(hospital)
          }}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{hospital.name}</h3>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>📍 {hospital.address}</p>
              {hospital.phone && (
                <p style={{ margin: '5px 0', fontSize: '14px' }}>📞 {hospital.phone}</p>
              )}
              <div style={{ marginTop: '10px' }}>
                <button 
                  style={{
                    background: '#4285f4',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '5px'
                  }}
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`, '_blank')}
                >
                  Get Directions
                </button>
                {hospital.phone && (
                  <button 
                    style={{
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(`tel:${hospital.phone}`)}
                  >
                    Call
                  </button>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}