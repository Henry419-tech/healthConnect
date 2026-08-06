// src/app/api/medications/route.ts
//
// Medical-ID medications. Trimmed to the fields the profile Medical ID
// card and the Emergency page's Personal Card actually show — name,
// dose, frequency, active. (route / indication / prescribedBy / pharmacy /
// startDate / endDate / notes / isNoneConfirmed exist on the model but are
// out of scope for the medical-ID surface; this isn't a full health record,
// see HEALTHNAV_MASTER_HANDOFF.md "What Was Cut and Why".)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.healthProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.healthProfile.create({ data: { userId } });
}

// ── GET — list medications for the signed-in user ──────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ success: true, medications: [] });

  const medications = await prisma.medication.findMany({
    where:   { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, medications });
}

// ── POST — add a new medication ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const dose = body?.dose != null ? String(body.dose).trim() : '';
  const frequency = body?.frequency != null ? String(body.frequency).trim() : '';
  const active = body?.active !== false; // defaults to true unless explicitly false

  if (!name) {
    return NextResponse.json({ error: 'Medication name is required.' }, { status: 400 });
  }

  const profile = await getOrCreateProfile(session.user.id);

  const medication = await prisma.medication.create({
    data: { profileId: profile.id, name, dose, frequency, active },
  });

  return NextResponse.json({ success: true, message: 'Medication added.', medication });
}

// ── PUT — update an existing medication ─────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body?.id;
  const name = String(body?.name ?? '').trim();
  const dose = body?.dose != null ? String(body.dose).trim() : '';
  const frequency = body?.frequency != null ? String(body.frequency).trim() : '';
  const active = body?.active !== false;

  if (!id) return NextResponse.json({ error: 'Medication ID is required.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Medication name is required.' }, { status: 400 });

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  const existing = profile
    ? await prisma.medication.findFirst({ where: { id, profileId: profile.id } })
    : null;
  if (!existing) {
    return NextResponse.json({ error: 'Medication not found or does not belong to you.' }, { status: 404 });
  }

  const medication = await prisma.medication.update({
    where: { id },
    data: { name, dose, frequency, active },
  });

  return NextResponse.json({ success: true, message: 'Medication updated.', medication });
}

// ── DELETE — remove a medication ────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ error: 'Medication ID is required.' }, { status: 400 });

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  const existing = profile
    ? await prisma.medication.findFirst({ where: { id, profileId: profile.id } })
    : null;
  if (!existing) {
    return NextResponse.json({ error: 'Medication not found or does not belong to you.' }, { status: 404 });
  }

  await prisma.medication.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Medication removed.' });
}