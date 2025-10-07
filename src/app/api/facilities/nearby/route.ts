// app/api/facilities/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Known Ghana facilities
function getKnownGhanaFacilities(lat: number, lng: number): Facility[] {
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
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '5.6037');
    const lng = parseFloat(searchParams.get('lng') || '-0.1870');
    const limit = parseInt(searchParams.get('limit') || '3');
    const radius = parseInt(searchParams.get('radius') || '10000'); // in meters

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    let allFacilities: Facility[] = [];

    // Get known Ghana facilities
    const knownFacilities = getKnownGhanaFacilities(lat, lng);
    allFacilities.push(...knownFacilities);

    // Try to fetch from Overpass API (OpenStreetMap)
    try {
      const overpassQuery = `
        [out:json][timeout:30];
        (
          node["amenity"="hospital"](around:${radius},${lat},${lng});
          way["amenity"="hospital"](around:${radius},${lat},${lng});
          node["amenity"="clinic"](around:${radius},${lat},${lng});
          way["amenity"="clinic"](around:${radius},${lat},${lng});
          node["amenity"="pharmacy"](around:${radius},${lat},${lng});
          way["amenity"="pharmacy"](around:${radius},${lat},${lng});
        );
        out center body;
      `;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const overpassResponse = await fetch(
        `https://overpass-api.de/api/interpreter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
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

              if (distance > radius / 1000) return;

              let type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center' = 'clinic';
              if (amenity === 'hospital') {
                type = 'hospital';
              } else if (amenity === 'pharmacy') {
                type = 'pharmacy';
              } else if (amenity === 'clinic') {
                type = 'clinic';
              }

              const services: string[] = [];
              if (element.tags.emergency === 'yes') services.push('Emergency Care');
              if (type === 'hospital') {
                services.push('Inpatient Care', 'General Medicine');
              } else if (type === 'pharmacy') {
                services.push('Prescriptions', 'OTC Medications');
              }

              allFacilities.push({
                id: `osm_${element.type}_${element.id}`,
                name,
                type,
                address: element.tags['addr:full'] || element.tags['addr:street'] || 'Address not available',
                city: element.tags['addr:city'] || 'Accra',
                region: element.tags['addr:state'] || 'Greater Accra',
                distance,
                rating: 3.5 + Math.random() * 1.5,
                reviews: Math.floor(Math.random() * 300) + 20,
                phone: element.tags.phone || 'Not available',
                hours: element.tags.opening_hours || (type === 'hospital' ? '24/7' : 'Call for hours'),
                services,
                coordinates: coords as [number, number],
                emergencyServices: element.tags.emergency === 'yes' || type === 'hospital',
                insurance: ['NHIS', 'Private'],
                website: element.tags.website
              });
            } catch (error) {
              console.warn('Error processing OSM element:', error);
            }
          });
        }
      }
    } catch (error) {
      console.warn('Overpass API error:', error);
    }

    // Remove duplicates
    const uniqueFacilities = allFacilities.filter((facility, index, self) => {
      return index === self.findIndex(f => {
        const nameSimilar = f.name.toLowerCase().trim() === facility.name.toLowerCase().trim();
        const locationClose = Math.abs(f.distance - facility.distance) < 0.05;
        return nameSimilar && locationClose;
      });
    });

    // Sort by distance and limit results
    uniqueFacilities.sort((a, b) => a.distance - b.distance);
    const facilitiesInRadius = uniqueFacilities.filter(f => f.distance <= radius / 1000);
    const limitedFacilities = facilitiesInRadius.slice(0, limit);

    return NextResponse.json({
      success: true,
      facilities: limitedFacilities,
      total: facilitiesInRadius.length,
      location: { lat, lng },
      radius: radius / 1000
    });

  } catch (error) {
    console.error('Error in nearby facilities API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby facilities' },
      { status: 500 }
    );
  }
}