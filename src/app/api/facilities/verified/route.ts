// src/app/api/facilities/verified/route.ts
//
// GET /api/facilities/verified?lat=X&lng=Y&radius=10000&type=[slug]
//
// Public read endpoint for the Facility table (Phase 9) — admin-verified
// facilities that fill gaps in live OSM/Overpass coverage, especially
// eye_clinic / ent_clinic / laboratory / maternity (see constants.ts
// comment on FACILITY_TYPE_OPTIONS for why OSM is thin there).
//
// Mirrors /api/providers' conventions: Haversine distance via calculateDistance,
// radius filter + sort only applied when lat/lng are supplied.
//
// `radius` is in METRES here (not km) to match the Overpass query params
// page.tsx already uses (`radius` state there is metres) — makes the two
// fetches in fetchFacilities() call-compatible with the same variable.
//
// Returns the same shape as the OSM-derived Facility objects in page.tsx
// (see the Facility interface there) so the two arrays can be concatenated
// directly before the existing 50m proximity dedup runs.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDistance } from '@/lib/utils';

export interface VerifiedFacilityResult {
  id: string;
  name: string;
  type: string;
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
  source: 'db'; // lets the frontend tell DB-sourced facilities apart from OSM ones
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const latParam = params.get('lat');
    const lngParam = params.get('lng');
    const lat = latParam ? parseFloat(latParam) : undefined;
    const lng = lngParam ? parseFloat(lngParam) : undefined;
    const hasLocation = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);

    // Metres, matching page.tsx's Overpass `radius` param — converted to km
    // for the calculateDistance() comparison below.
    const radiusM = parseFloat(params.get('radius') || '10000');
    const radiusKm = radiusM / 1000;

    const typeParam = params.get('type') || undefined; // single slug, or omitted for all types

    const facilities = await prisma.facility.findMany({
      where: {
        status: 'VERIFIED',
        ...(typeParam ? { type: typeParam } : {}),
      },
      select: {
        id: true, name: true, type: true, typeLabel: true,
        phone: true, website: true,
        address: true, city: true, region: true,
        lat: true, lng: true,
        emergencyServices: true, hours: true, nhis: true,
      },
    });

    let results: VerifiedFacilityResult[] = facilities.map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
      typeLabel: f.typeLabel || f.type,
      address: f.address || '',
      city: f.city || '',
      region: f.region || '',
      distance: hasLocation ? calculateDistance(lat as number, lng as number, f.lat, f.lng) : 0,
      phone: f.phone || '',
      hours: f.hours || 'Call for hours',
      coordinates: [f.lat, f.lng],
      emergencyServices: f.emergencyServices,
      nhis: (f.nhis as 'confirmed' | 'likely' | 'none') || 'none',
      website: f.website || undefined,
      source: 'db',
    }));

    // Same pattern as /api/providers: only filter/sort by distance when we
    // actually have a fix. Without lat/lng, return everything sorted by name.
    if (hasLocation) {
      results = results.filter(r => r.distance <= radiusKm);
      results.sort((a, b) => a.distance - b.distance);
    } else {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json({ facilities: results, total: results.length });
  } catch (error) {
    console.error('Error in /api/facilities/verified:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verified facilities', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}