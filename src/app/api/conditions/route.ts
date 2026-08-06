// src/app/api/conditions/route.ts
//
// Medical-ID conditions (backed by the MedicalCondition model). Trimmed to
// name + status — the two fields the Emergency page's Personal Card shows.
// (diagnosedYear / treatedBy / category / notes / isNoneConfirmed exist on
// the model but are out of scope for the medical-ID surface.)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STATUSES = ['managed', 'active', 'resolved'] as const;

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.healthProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.healthProfile.create({ data: { userId } });
}

// ── GET — list conditions for the signed-in user ────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ success: true, conditions: [] });

  const conditions = await prisma.medicalCondition.findMany({
    where:   { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, conditions });
}

// ── POST — add a new condition ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const status = body?.status;

  if (!name) {
    return NextResponse.json({ error: 'Condition name is required.' }, { status: 400 });
  }
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status must be managed, active, or resolved.' }, { status: 400 });
  }

  const profile = await getOrCreateProfile(session.user.id);

  const condition = await prisma.medicalCondition.create({
    data: { profileId: profile.id, name, status },
  });

  return NextResponse.json({ success: true, message: 'Condition added.', condition });
}

// ── PUT — update an existing condition ──────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body?.id;
  const name = String(body?.name ?? '').trim();
  const status = body?.status;

  if (!id) return NextResponse.json({ error: 'Condition ID is required.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Condition name is required.' }, { status: 400 });
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status must be managed, active, or resolved.' }, { status: 400 });
  }

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  const existing = profile
    ? await prisma.medicalCondition.findFirst({ where: { id, profileId: profile.id } })
    : null;
  if (!existing) {
    return NextResponse.json({ error: 'Condition not found or does not belong to you.' }, { status: 404 });
  }

  const condition = await prisma.medicalCondition.update({ where: { id }, data: { name, status } });

  return NextResponse.json({ success: true, message: 'Condition updated.', condition });
}

// ── DELETE — remove a condition ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ error: 'Condition ID is required.' }, { status: 400 });

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  const existing = profile
    ? await prisma.medicalCondition.findFirst({ where: { id, profileId: profile.id } })
    : null;
  if (!existing) {
    return NextResponse.json({ error: 'Condition not found or does not belong to you.' }, { status: 404 });
  }

  await prisma.medicalCondition.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Condition removed.' });
}
