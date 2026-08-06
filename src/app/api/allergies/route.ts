// src/app/api/allergies/route.ts
//
// Medical-ID allergies. Deliberately trimmed to the two fields the
// Emergency page's Personal Card actually shows — name + severity.
// (reaction / onsetDate / notes / isNoneConfirmed exist on the model but
// are out of scope for the medical-ID surface; this isn't a full health
// record any more, see HEALTHNAV_MASTER_HANDOFF.md "What Was Cut and Why".)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SEVERITIES = ['mild', 'moderate', 'severe'] as const;

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.healthProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.healthProfile.create({ data: { userId } });
}

// ── GET — list allergies for the signed-in user ────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ success: true, allergies: [] });

  const allergies = await prisma.allergy.findMany({
    where:   { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, allergies });
}

// ── POST — add a new allergy ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const severity = body?.severity;

  if (!name) {
    return NextResponse.json({ error: 'Allergy name is required.' }, { status: 400 });
  }
  if (!SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: 'Severity must be mild, moderate, or severe.' }, { status: 400 });
  }

  const profile = await getOrCreateProfile(session.user.id);

  const allergy = await prisma.allergy.create({
    data: { profileId: profile.id, name, severity },
  });

  return NextResponse.json({ success: true, message: 'Allergy added.', allergy });
}

// ── PUT — update an existing allergy ────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body?.id;
  const name = String(body?.name ?? '').trim();
  const severity = body?.severity;

  if (!id) return NextResponse.json({ error: 'Allergy ID is required.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Allergy name is required.' }, { status: 400 });
  if (!SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: 'Severity must be mild, moderate, or severe.' }, { status: 400 });
  }

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  const existing = profile
    ? await prisma.allergy.findFirst({ where: { id, profileId: profile.id } })
    : null;
  if (!existing) {
    return NextResponse.json({ error: 'Allergy not found or does not belong to you.' }, { status: 404 });
  }

  const allergy = await prisma.allergy.update({ where: { id }, data: { name, severity } });

  return NextResponse.json({ success: true, message: 'Allergy updated.', allergy });
}

// ── DELETE — remove an allergy ──────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ error: 'Allergy ID is required.' }, { status: 400 });

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  const existing = profile
    ? await prisma.allergy.findFirst({ where: { id, profileId: profile.id } })
    : null;
  if (!existing) {
    return NextResponse.json({ error: 'Allergy not found or does not belong to you.' }, { status: 404 });
  }

  await prisma.allergy.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Allergy removed.' });
}
