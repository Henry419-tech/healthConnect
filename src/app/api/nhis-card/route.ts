// src/app/api/nhis-card/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession }          from 'next-auth';
import { authOptions }               from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';

/* ── helpers ─────────────────────────────────────────────────── */
async function getProfile(userId: string) {
  return prisma.healthProfile.findUnique({ where: { userId } });
}

/* ════════════════════════════════════════════════════════════════
   GET  /api/nhis-card
   Returns the user's NHIS card record (or null if not set yet).
════════════════════════════════════════════════════════════════ */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const profile = await getProfile(session.user.id);
  if (!profile)
    return NextResponse.json({ nhisCard: null });

  const nhisCard = await prisma.nhisCard.findUnique({
    where: { profileId: profile.id },
  });

  return NextResponse.json({ nhisCard });
}

/* ════════════════════════════════════════════════════════════════
   POST  /api/nhis-card
   Creates or updates (upsert) the user's NHIS card.

   Body fields (all optional):
     nhisId, membershipType, expiryDate, issuedDate,
     issuingBody, notes, frontImageUrl, backImageUrl
════════════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Ensure HealthProfile exists (create minimal one if not)
  let profile = await getProfile(session.user.id);
  if (!profile) {
    profile = await prisma.healthProfile.create({
      data: { userId: session.user.id },
    });
  }

  const {
    nhisId, membershipType, issuingBody, notes,
    frontImageUrl, backImageUrl,
    expiryDate, issuedDate,
  } = body as {
    nhisId?:         string;
    membershipType?: string;
    issuingBody?:    string;
    notes?:          string;
    frontImageUrl?:  string;
    backImageUrl?:   string;
    expiryDate?:     string;
    issuedDate?:     string;
  };

  const data = {
    nhisId:         nhisId         ?? undefined,
    membershipType: membershipType ?? undefined,
    issuingBody:    issuingBody    ?? undefined,
    notes:          notes          ?? undefined,
    frontImageUrl:  frontImageUrl  ?? undefined,
    backImageUrl:   backImageUrl   ?? undefined,
    expiryDate:     expiryDate  ? new Date(expiryDate)  : undefined,
    issuedDate:     issuedDate  ? new Date(issuedDate)  : undefined,
  };

  const nhisCard = await prisma.nhisCard.upsert({
    where:  { profileId: profile.id },
    create: { profileId: profile.id, ...data },
    update: data,
  });

  return NextResponse.json({ nhisCard });
}

/* ════════════════════════════════════════════════════════════════
   DELETE  /api/nhis-card
   Removes the user's NHIS card record entirely.
════════════════════════════════════════════════════════════════ */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const profile = await getProfile(session.user.id);
  if (!profile)
    return NextResponse.json({ ok: true }); // nothing to delete

  await prisma.nhisCard.deleteMany({ where: { profileId: profile.id } });

  return NextResponse.json({ ok: true });
}