// src/app/api/health-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: fetch full profile, auto-create if missing
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let profile = await prisma.healthProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        allergies:     { orderBy: { createdAt: 'desc' } },
        medications:   { orderBy: { createdAt: 'desc' } },
        conditions:    { orderBy: { createdAt: 'desc' } },
        familyMembers: { orderBy: { createdAt: 'desc' } },
        reminders:     { where: { active: true }, orderBy: { time: 'asc' } },
        nhisCard:      true,
      },
    });

    if (!profile) {
      profile = await prisma.healthProfile.create({
        data: { userId: session.user.id },
        include: {
          allergies: true, medications: true, conditions: true,
          familyMembers: true, reminders: true, nhisCard: true,
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[health-profile] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: update vitals — recalculates BMI using current stored values when only
// one of weight/height is provided in this request.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { bloodType, dateOfBirth, gender } = body;

    const parsedWeight = body.weightKg != null ? parseFloat(String(body.weightKg)) : undefined;
    const parsedHeight = body.heightCm != null ? parseFloat(String(body.heightCm)) : undefined;

    if (parsedWeight !== undefined && (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 500))
      return NextResponse.json({ error: 'Invalid weight value' }, { status: 400 });
    if (parsedHeight !== undefined && (isNaN(parsedHeight) || parsedHeight <= 0 || parsedHeight > 300))
      return NextResponse.json({ error: 'Invalid height value' }, { status: 400 });

    // Fetch current values to compute BMI even on partial updates
    const existing = await prisma.healthProfile.findUnique({
      where: { userId: session.user.id },
      select: { weightKg: true, heightCm: true },
    });
    const w = parsedWeight ?? existing?.weightKg ?? null;
    const h = parsedHeight ?? existing?.heightCm ?? null;
    let bmi: number | undefined;
    if (w && h && w > 0 && h > 0) {
      const hm = h / 100;
      bmi = parseFloat((w / (hm * hm)).toFixed(1));
    }

    const profile = await prisma.healthProfile.upsert({
      where:  { userId: session.user.id },
      update: {
        ...(bloodType    !== undefined && { bloodType:   bloodType   || null }),
        ...(dateOfBirth  !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(parsedWeight !== undefined && { weightKg:    parsedWeight }),
        ...(parsedHeight !== undefined && { heightCm:    parsedHeight }),
        ...(gender       !== undefined && { gender:      gender      || null }),
        ...(bmi          !== undefined && { bmi }),
      },
      create: {
        userId:      session.user.id,
        bloodType:   bloodType  || null,
        gender:      gender     || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        weightKg:    parsedWeight ?? null,
        heightCm:    parsedHeight ?? null,
        bmi:         bmi          ?? null,
      },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[health-profile] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}