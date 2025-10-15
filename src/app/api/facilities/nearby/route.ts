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

    // Get query parameters - NO DEFAULT COORDINATES
    const searchParams = request.nextUrl.searchParams;
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    
    // Require actual coordinates - don't use defaults
    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: 'Location coordinates are required. Please enable location services.' },
        { status: 400 }
      );
    }
    
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    const limit = parseInt(searchParams.get('limit') || '200'); // Increased from 50 to 200
    const radius = parseInt(searchParams.get('radius') || '10000'); // in meters

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates provided' },
        { status: 400 }
      );
    }

    // Validate coordinates are within reasonable bounds for Ghana
    // Ghana bounds: Latitude 4.5° to 11°N, Longitude 3.5°W to 1.5°E
    if (lat < 4.5 || lat > 11 || lng < -3.5 || lng > 1.5) {
      console.warn(`Coordinates outside Ghana bounds: ${lat}, ${lng}`);
      // Don't reject, but log warning
    }

    console.log(`Searching for facilities near: ${lat}, ${lng} within ${radius}m`);

    let allFacilities: Facility[] = [];

    // Fetch from Overpass API (OpenStreetMap) - PRIMARY SOURCE
    try {
      const overpassQuery = `
        [out:json][timeout:45];
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
        
        console.log(`Overpass API returned ${overpassData.elements?.length || 0} results`);

        if (overpassData.elements && Array.isArray(overpassData.elements)) {
          overpassData.elements.forEach((element: any) => {
            try {
              // Get coordinates
              const coords = element.lat && element.lon
                ? [element.lat, element.lon]
                : element.center
                ? [element.center.lat, element.center.lon]
                : null;

              if (!coords || !element.tags) return;

              // Get name
              const name = element.tags.name || 
                          element.tags['name:en'] || 
                          element.tags['official_name'] ||
                          'Healthcare Facility';
              
              if (name.length < 3 || name.toLowerCase() === 'unnamed') return;

              // Calculate distance
              const distance = calculateDistance(lat, lng, coords[0], coords[1]);
              if (distance > radius / 1000) return;

              // Determine facility type
              const amenity = element.tags.amenity || element.tags.healthcare || 'clinic';
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

              // Extract services
              const services: string[] = [];
              if (element.tags.emergency === 'yes') services.push('Emergency Care');
              if (element.tags['healthcare:speciality']) {
                const specialties = element.tags['healthcare:speciality'].split(';')
                  .map((s: string) => s.trim())
                  .filter((s: string) => s.length > 0);
                services.push(...specialties.slice(0, 5));
              }
              
              // Add default services based on type
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

              // Build address
              let address = 'Address not available';
              if (element.tags['addr:full']) {
                address = element.tags['addr:full'];
              } else {
                const addressParts = [
                  element.tags['addr:housenumber'],
                  element.tags['addr:street'],
                  element.tags['addr:suburb']
                ].filter(Boolean);
                if (addressParts.length > 0) {
                  address = addressParts.join(', ');
                }
              }

              // Get location details
              const city = element.tags['addr:city'] || 
                          element.tags['addr:town'] || 
                          element.tags['addr:suburb'] || 
                          'Unknown';
              
              const region = element.tags['addr:state'] || 
                            element.tags['addr:region'] || 
                            element.tags['addr:province'] ||
                            'Unknown';

              // Get contact info
              const phone = element.tags.phone || 
                           element.tags['contact:phone'] || 
                           element.tags['phone:mobile'] || 
                           'Not available';

              const hours = element.tags.opening_hours || 
                           (type === 'hospital' && element.tags.emergency === 'yes' ? '24/7' : 'Call for hours');

              const website = element.tags.website || 
                             element.tags['contact:website'] || 
                             element.tags.url;

              // Determine if emergency services available
              const emergencyServices = element.tags.emergency === 'yes' || 
                                       (type === 'hospital' && element.tags.emergency !== 'no');

              // Create facility object
              allFacilities.push({
                id: `osm_${element.type}_${element.id}`,
                name,
                type,
                address,
                city,
                region,
                distance,
                rating: 3.5 + Math.random() * 1.5, // Placeholder - could integrate Google Places API
                reviews: Math.floor(Math.random() * 300) + 20, // Placeholder
                phone,
                hours,
                services: services.slice(0, 8), // Limit to 8 services
                coordinates: coords as [number, number],
                emergencyServices,
                insurance: ['NHIS', 'Private'], // Default - could be enhanced
                specializations: services.slice(0, 3),
                website
              });
            } catch (error) {
              console.warn('Error processing OSM element:', error);
            }
          });
        }
      } else {
        console.error(`Overpass API error: ${overpassResponse.status}`);
      }
    } catch (error: any) {
      console.error('Overpass API fetch error:', error);
      if (error.name === 'AbortError') {
        console.warn('Overpass API request timed out');
      }
    }

    // Remove duplicates based on name and location similarity
    const uniqueFacilities = allFacilities.filter((facility, index, self) => {
      return index === self.findIndex(f => {
        const nameSimilar = f.name.toLowerCase().trim() === facility.name.toLowerCase().trim();
        const locationClose = Math.abs(f.distance - facility.distance) < 0.05; // Within 50 meters
        return nameSimilar && locationClose;
      });
    });

    // Sort by distance
    uniqueFacilities.sort((a, b) => a.distance - b.distance);
    
    // Filter to radius
    const facilitiesInRadius = uniqueFacilities.filter(f => f.distance <= radius / 1000);
    
    // Limit results
    const limitedFacilities = facilitiesInRadius.slice(0, limit);

    console.log(`Returning ${limitedFacilities.length} facilities out of ${facilitiesInRadius.length} found`);

    return NextResponse.json({
      success: true,
      facilities: limitedFacilities,
      total: facilitiesInRadius.length,
      location: { lat, lng },
      radius: radius / 1000,
      message: facilitiesInRadius.length === 0 
        ? 'No facilities found in this area. Try increasing the search radius.'
        : undefined
    });

  } catch (error) {
    console.error('Error in nearby facilities API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch nearby facilities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}