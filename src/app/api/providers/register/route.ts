// src/app/api/providers/register/route.ts
//
// Public provider self-registration (Section 10.4 / Step 11 of the
// handoff). No patient session required — a clinic owner filling this
// in is not necessarily a HealthNav patient account holder.
//
// The new Provider row is created with the schema default
// status: 'PENDING', which GET /api/providers already excludes from
// search results (status: 'VERIFIED' only). There is no admin UI yet
// to flip PENDING -> VERIFIED; until one exists, do it directly in the
// database (or a Prisma Studio session) after checking the submission.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

  const {
    type, name, specialtySlug, phone, whatsapp, email,
    bio, licenceNumber, address, district, region,
    lat, lng, languages, insuranceAccepted,
  } = body as Record<string, unknown>;

  // ── Validation ──────────────────────────────────────────────────
  if (type !== 'DOCTOR' && type !== 'CLINIC') {
    return NextResponse.json({ error: 'type must be "DOCTOR" or "CLINIC".' }, { status: 400 });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Please enter a name.' }, { status: 400 });
  }
  if (typeof specialtySlug !== 'string' || !specialtySlug.trim()) {
    return NextResponse.json({ error: 'Please select a specialty.' }, { status: 400 });
  }
  if (typeof phone !== 'string' || !/^[+\d][\d\s-]{6,}$/.test(phone.trim())) {
    return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
  }
  if (typeof address !== 'string' || !address.trim()) {
    return NextResponse.json({ error: 'Please enter an address.' }, { status: 400 });
  }
  if (typeof district !== 'string' || !district.trim()) {
    return NextResponse.json({ error: 'Please select a district.' }, { status: 400 });
  }
  const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng));
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return NextResponse.json(
      { error: 'Missing location. Use "Set my location" or enter a valid address.' },
      { status: 400 },
    );
  }
  if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  // ── Resolve specialty slug -> id ───────────────────────────────
  const specialty = await prisma.specialty.findUnique({ where: { slug: specialtySlug } });
  if (!specialty) {
    // Most likely cause: prisma/seed-phase8.ts hasn't been run against
    // this database yet.
    return NextResponse.json(
      { error: 'Unknown specialty. If this is a new environment, run prisma/seed-phase8.ts first.' },
      { status: 400 },
    );
  }

  try {
    const provider = await prisma.provider.create({
      data: {
        type,
        name: name.trim(),
        specialtyId: specialty.id,
        phone: phone.trim(),
        whatsapp: typeof whatsapp === 'string' && whatsapp.trim() ? whatsapp.trim() : null,
        email: typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null,
        bio: typeof bio === 'string' && bio.trim() ? bio.trim() : null,
        licenceNumber: typeof licenceNumber === 'string' && licenceNumber.trim() ? licenceNumber.trim() : null,
        address: address.trim(),
        district: district.trim(),
        region: typeof region === 'string' && region.trim() ? region.trim() : 'Greater Accra',
        lat: latNum,
        lng: lngNum,
        languages: Array.isArray(languages) && languages.length > 0
          ? languages.filter((l): l is string => typeof l === 'string')
          : ['English'],
        insuranceAccepted: Array.isArray(insuranceAccepted) && insuranceAccepted.length > 0
          ? insuranceAccepted.filter((i): i is string => typeof i === 'string')
          : ['NHIS'],
        // status defaults to PENDING — hidden from search until an
        // admin verifies it.
      },
      select: { id: true, name: true, status: true },
    });

    return NextResponse.json(
      { message: 'Registration received. Your listing will go live once verified.', provider },
      { status: 201 },
    );
  } catch (err) {
    console.error('Provider registration error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
