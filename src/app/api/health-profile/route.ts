import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let profile = await prisma.healthProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      allergies: { orderBy: { createdAt: 'desc' } },
      medications: { orderBy: { createdAt: 'desc' } },
      conditions: { orderBy: { createdAt: 'desc' } },
      familyMembers: { orderBy: { createdAt: 'desc' } },
      reminders: { where: { active: true }, orderBy: { time: 'asc' } },
    },
  });

  if (!profile) {
    profile = await prisma.healthProfile.create({
      data: { userId: session.user.id },
      include: { allergies: true, medications: true, conditions: true, familyMembers: true, reminders: true },
    });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { bloodType, dateOfBirth, weightKg, heightCm, gender } = body;

  let bmi: number | undefined;
  if (weightKg && heightCm) {
    const hm = Number(heightCm) / 100;
    bmi = parseFloat((Number(weightKg) / (hm * hm)).toFixed(1));
  }

  const profile = await prisma.healthProfile.upsert({
    where: { userId: session.user.id },
    update: {
      ...(bloodType !== undefined && { bloodType }),
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
      ...(weightKg !== undefined && { weightKg: weightKg ? parseFloat(weightKg) : null }),
      ...(heightCm !== undefined && { heightCm: heightCm ? parseFloat(heightCm) : null }),
      ...(gender !== undefined && { gender }),
      ...(bmi !== undefined && { bmi }),
    },
    create: {
      userId: session.user.id,
      bloodType, gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      bmi,
    },
  });

  return NextResponse.json({ profile });
}