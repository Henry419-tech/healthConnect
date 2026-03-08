// src/app/api/saved-facilities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/* ── GET /api/saved-facilities ─────────────────────────────────── */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const facilities = await prisma.savedFacility.findMany({
    where:   { userId: user.id },
    orderBy: { savedAt: 'desc' },
  });

  return NextResponse.json({ facilities });
}

/* ── POST /api/saved-facilities ────────────────────────────────── */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const {
    facilityId, name, type, address, city, region,
    phone, hours, website, emergencyServices,
    latitude, longitude, distance,
  } = body;

  if (!facilityId || !name || latitude == null || longitude == null)
    return NextResponse.json({ error: 'Missing required fields: facilityId, name, latitude, longitude' }, { status: 400 });

  const facility = await prisma.savedFacility.upsert({
    where:  { userId_facilityId: { userId: user.id, facilityId } },
    create: {
      userId:            user.id,
      facilityId,
      name,
      type:              type ?? 'clinic',
      address:           address ?? null,
      city:              city ?? null,
      region:            region ?? null,
      phone:             phone ?? null,
      hours:             hours ?? null,
      website:           website ?? null,
      emergencyServices: emergencyServices ?? false,
      latitude,
      longitude,
      distance:          distance ?? null,
    },
    update: {
      name,
      type,
      address,
      city,
      region,
      phone,
      hours,
      website,
      emergencyServices: emergencyServices ?? false,
      latitude,
      longitude,
      distance,
      savedAt: new Date(),
    },
  });

  return NextResponse.json({ facility }, { status: 201 });
}

/* ── DELETE /api/saved-facilities ──────────────────────────────── */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let deleteBody: any;
  try { deleteBody = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const { facilityId } = deleteBody;
  if (!facilityId)
    return NextResponse.json({ error: 'facilityId required' }, { status: 400 });

  await prisma.savedFacility.deleteMany({
    where: { userId: user.id, facilityId },
  });

  return NextResponse.json({ success: true });
}