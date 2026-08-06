// src/app/api/emergency-brief/status/route.ts
// Returns the current user's active emergency brief token (if any).
// Used by the Emergency page on mount to restore the QR display
// without auto-generating a new token.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brief = await prisma.emergencyBrief.findUnique({
    where: { userId: (await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }))!.id },
  });

  if (!brief || brief.expiresAt < new Date()) {
    // No active brief — return empty
    return NextResponse.json({ url: null, expiresAt: null });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? '';

  return NextResponse.json({
    url:       `${baseUrl}/emergency-brief/${brief.token}`,
    expiresAt: brief.expiresAt.toISOString(),
  });
}