// app/api/health-profile/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Resource = 'allergies' | 'medications' | 'conditions' | 'family-members' | 'reminders';

const MODEL_MAP: Record<Resource, keyof typeof prisma> = {
  'allergies':      'allergy',
  'medications':    'medication',
  'conditions':     'medicalCondition',
  'family-members': 'familyMember',
  'reminders':      'medReminder',
};

async function getOrCreateProfile(userId: string) {
  return prisma.healthProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrCreateProfile(session.user.id);
  const data = await req.json();
  const { resource } = await params;
  const model = MODEL_MAP[resource as Resource];
  if (!model) return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });

  const record = await (prisma[model] as any).create({
    data: { profileId: profile.id, ...data },
  });
  return NextResponse.json({ record });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.healthProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { id } = await req.json();
  const { resource } = await params;
  const model = MODEL_MAP[resource as Resource];
  if (!model) return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });

  await (prisma[model] as any).deleteMany({ where: { id, profileId: profile.id } });
  return NextResponse.json({ success: true });
}