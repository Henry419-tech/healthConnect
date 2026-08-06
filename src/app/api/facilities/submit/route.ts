// src/app/api/facilities/submit/route.ts
//
// Public facility self-submission — the user-facing counterpart to
// api/providers/register/route.ts, following the same pattern: rows land
// as status: 'PENDING' and are invisible to /api/facilities/verified
// (VERIFIED only) until an admin approves them at /admin/facilities.
//
// UNLIKE provider registration, this route is NOT in middleware.ts's
// public-prefix list — /facilities itself already requires a logged-in
// patient session (it's not a public path either), so "who can report a
// missing facility" naturally inherits that same requirement rather than
// being opened up separately. submittedById is read server-side from the
// session (matches /api/user/profile's convention) rather than trusted
// from the request body, so it can't be spoofed to attribute a submission
// to someone else.
//
// Closes the loop referenced in schema.prisma's Facility comment block
// (Phase 9): submittedById/source: 'user' existed in the schema but nothing
// populated them until this route.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FACILITY_TYPE_OPTIONS } from '@/lib/constants';

const VALID_TYPE_SLUGS = new Set(FACILITY_TYPE_OPTIONS.map(t => t.slug));

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Please sign in to submit a facility.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

  const {
    name, type, phone, whatsapp, website,
    address, city, region, district,
    lat, lng, emergencyServices, hours, nhis, services,
  } = body as Record<string, unknown>;

  // ── Validation ──────────────────────────────────────────────────
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Please enter a facility name.' }, { status: 400 });
  }
  if (typeof type !== 'string' || !VALID_TYPE_SLUGS.has(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${[...VALID_TYPE_SLUGS].join(', ')}` },
      { status: 400 },
    );
  }
  if (typeof address !== 'string' || !address.trim()) {
    return NextResponse.json({ error: 'Please enter an address.' }, { status: 400 });
  }
  const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng));
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return NextResponse.json(
      { error: 'Missing location. Use "Set my location" or enter a valid address.' },
      { status: 400 },
    );
  }
  if (phone && (typeof phone !== 'string' || !/^[+\d][\d\s-]{6,}$/.test(phone.trim()))) {
    return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
  }
  if (nhis !== undefined && !['confirmed', 'likely', 'none'].includes(String(nhis))) {
    return NextResponse.json({ error: 'nhis must be "confirmed", "likely", or "none".' }, { status: 400 });
  }

  const typeOption = FACILITY_TYPE_OPTIONS.find(t => t.slug === type)!;

  // Resolve the session user's id server-side — not trusted from the body.
  const submitter = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  try {
    const facility = await prisma.facility.create({
      data: {
        name: name.trim(),
        type,
        typeLabel: typeOption.label,
        source: 'user',
        // status defaults to PENDING — excluded from
        // /api/facilities/verified (VERIFIED only) until an admin approves.
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        whatsapp: typeof whatsapp === 'string' && whatsapp.trim() ? whatsapp.trim() : null,
        website: typeof website === 'string' && website.trim() ? website.trim() : null,
        address: address.trim(),
        city: typeof city === 'string' && city.trim() ? city.trim() : null,
        region: typeof region === 'string' && region.trim() ? region.trim() : null,
        district: typeof district === 'string' && district.trim() ? district.trim() : null,
        lat: latNum,
        lng: lngNum,
        emergencyServices: emergencyServices === true,
        hours: typeof hours === 'string' && hours.trim() ? hours.trim() : null,
        nhis: typeof nhis === 'string' ? nhis : 'none',
        services: Array.isArray(services)
          ? services.filter((s): s is string => typeof s === 'string')
          : [],
        submittedById: submitter?.id ?? null,
      },
      select: { id: true, name: true, status: true },
    });

    return NextResponse.json(
      { message: 'Submission received. This facility will appear in search once verified.', facility },
      { status: 201 },
    );
  } catch (err) {
    console.error('Facility submission error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}