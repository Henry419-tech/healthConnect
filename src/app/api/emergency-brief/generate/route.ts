// src/app/api/emergency-brief/generate/route.ts
// Requires the EmergencyBrief model in schema.prisma (see updated schema).
// Run: npx prisma migrate dev --name add_emergency_brief

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

async function getUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

// POST — generate (or regenerate) a 30-day emergency brief token
export async function POST(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const baseUrl   = process.env.NEXTAUTH_URL ?? '';

  await prisma.emergencyBrief.upsert({
    where:  { userId },
    update: { token, expiresAt, updatedAt: new Date() },
    create: { userId, token, expiresAt },
  });

  return NextResponse.json({
    token,
    url:       `${baseUrl}/emergency-brief/${token}`,
    expiresAt: expiresAt.toISOString(),
  });
}

// DELETE — revoke the user's emergency brief
export async function DELETE(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.emergencyBrief.deleteMany({ where: { userId } });

  return NextResponse.json({ success: true });
}