// src/app/api/providers/route.ts
//
// GET /api/providers?specialty=[slug]&lat=X&lng=Y&radius=15&district=[name]&languages=a,b&nhisOnly=1
//
// Public read endpoint — powers /find-care/results (and later the
// registered-provider layer on /facilities). Returns VERIFIED, active
// Provider rows, optionally filtered by specialty/district/language/NHIS
// and sorted by Haversine distance when lat/lng are supplied.
//
// NOTE: this route is NOT yet in middleware's PUBLIC_PREFIXES — every
// caller today is an authenticated patient page, so the session gate
// upstream already covers it. Section 15 of the handoff calls for adding
// '/api/providers' to PUBLIC_PREFIXES once /provider/register (Step 11)
// needs to hit this same search unauthenticated; deliberately left alone
// here to avoid widening the public surface ahead of that step.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDistance } from '@/lib/utils';

export interface ProviderResult {
  id: string;
  type: 'DOCTOR' | 'CLINIC';
  name: string;
  specialty: { slug: string; name: string; icon: string | null };
  bio: string | null;
  phone: string;
  whatsapp: string | null;
  address: string;
  district: string;
  region: string;
  lat: number;
  lng: number;
  languages: string[];
  insuranceAccepted: string[];
  photos: string[];
  status: 'VERIFIED';
  distance: number | null; // km, null when no lat/lng supplied
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const specialtySlug = params.get('specialty') || undefined;
    const district = params.get('district') || undefined;
    const languagesParam = params.get('languages');
    const languages = languagesParam
      ? languagesParam.split(',').map(l => l.trim()).filter(Boolean)
      : undefined;
    const nhisOnly = params.get('nhisOnly') === '1' || params.get('nhisOnly') === 'true';

    const latParam = params.get('lat');
    const lngParam = params.get('lng');
    const lat = latParam ? parseFloat(latParam) : undefined;
    const lng = lngParam ? parseFloat(lngParam) : undefined;
    const hasLocation = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);

    const radiusKm = parseFloat(params.get('radius') || '15');

    // Resolve specialty slug -> id, if provided. An unknown slug returns
    // an empty result set rather than a 400 — the results page treats
    // that the same as "no providers", which triggers its facility
    // fallback rather than surfacing a hard error to the patient.
    let specialtyId: string | undefined;
    let specialtyRecord: { slug: string; name: string; icon: string | null } | null = null;
    if (specialtySlug) {
      const specialty = await prisma.specialty.findUnique({
        where: { slug: specialtySlug },
        select: { id: true, slug: true, name: true, icon: true },
      });
      if (!specialty) {
        return NextResponse.json({ providers: [], total: 0, specialty: null });
      }
      specialtyId = specialty.id;
      specialtyRecord = { slug: specialty.slug, name: specialty.name, icon: specialty.icon };
    }

    const providers = await prisma.provider.findMany({
      where: {
        status: 'VERIFIED',
        active: true,
        ...(specialtyId ? { specialtyId } : {}),
        ...(district ? { district } : {}),
        ...(languages && languages.length > 0 ? { languages: { hasSome: languages } } : {}),
        ...(nhisOnly ? { insuranceAccepted: { has: 'NHIS' } } : {}),
      },
      select: {
        id: true, type: true, name: true, bio: true,
        phone: true, whatsapp: true,
        address: true, district: true, region: true, lat: true, lng: true,
        languages: true, insuranceAccepted: true, photos: true,
        specialty: { select: { slug: true, name: true, icon: true } },
      },
    });

    let results: ProviderResult[] = providers.map(p => ({
      id: p.id,
      type: p.type,
      name: p.name,
      specialty: p.specialty,
      bio: p.bio,
      phone: p.phone,
      whatsapp: p.whatsapp,
      address: p.address,
      district: p.district,
      region: p.region,
      lat: p.lat,
      lng: p.lng,
      languages: p.languages,
      insuranceAccepted: p.insuranceAccepted,
      photos: p.photos,
      status: 'VERIFIED',
      distance: hasLocation ? calculateDistance(lat as number, lng as number, p.lat, p.lng) : null,
    }));

    // Distance filter + sort only apply when we actually have a fix.
    // Without lat/lng (district-only search) we fall back to sorting by
    // name so results are still deterministic.
    if (hasLocation) {
      results = results.filter(r => r.distance !== null && r.distance <= radiusKm);
      results.sort((a, b) => (a.distance as number) - (b.distance as number));
    } else {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json({
      providers: results,
      total: results.length,
      specialty: specialtyRecord,
    });
  } catch (error) {
    console.error('Error in /api/providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
