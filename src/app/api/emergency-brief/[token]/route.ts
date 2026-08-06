// src/app/api/emergency-brief/[token]/route.ts
// PUBLIC — no authentication required by design.
// Returns a minimal medical summary for first responders.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;

  // Look up the brief record — includes user + health data
  const brief = await prisma.emergencyBrief.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          healthProfile: {
            include: {
              allergies:   true,
              medications: { where: { active: true } },
              conditions:  { where: { status: { in: ['active', 'managed'] } } },
            },
          },
        },
      },
    },
  });

  // Not found or expired
  if (!brief || brief.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'This emergency brief is not available or has expired.' },
      { status: 404 }
    );
  }

  const { user } = brief;
  const profile  = user.healthProfile;

  return NextResponse.json({
    name:      user.name ?? 'Unknown',
    bloodType: profile?.bloodType ?? null,
    allergies: (profile?.allergies ?? []).map(a => ({
      name:     a.name,
      severity: a.severity,
    })),
    medications: (profile?.medications ?? []).map(m => ({
      name:      m.name,
      dose:      m.dose      ?? null,
      frequency: m.frequency ?? null,
    })),
    conditions: (profile?.conditions ?? []).map(c => ({
      name:   c.name,
      status: c.status,
    })),
    expiresAt:   brief.expiresAt.toISOString(),
    generatedAt: new Date().toISOString(),
  });
}