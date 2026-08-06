// src/app/api/admin/providers/route.ts
//
// GET /api/admin/providers?status=PENDING|VERIFIED|SUSPENDED|ALL
//
// Admin only — gated by requiresAdminAuth() in middleware.ts (HTTP Basic
// Auth against ADMIN_PASSWORD, same as /admin/alerts and /api/health-alerts
// writes). This route trusts that the request already passed that check.
//
// Powers /admin/providers — the verification queue referenced in
// api/providers/register/route.ts ("There is no admin UI yet to flip
// PENDING -> VERIFIED"). Unlike /api/providers (patient-facing, VERIFIED +
// active only), this returns every status so the admin can see the queue,
// the live roster, and anything suspended.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['PENDING', 'VERIFIED', 'SUSPENDED'] as const;

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get('status');

  const where =
    statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)
      ? { status: statusParam as (typeof VALID_STATUSES)[number] }
      : {};

  try {
    const providers = await prisma.provider.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        name: true,
        bio: true,
        licenceNumber: true,
        phone: true,
        whatsapp: true,
        email: true,
        address: true,
        district: true,
        region: true,
        languages: true,
        insuranceAccepted: true,
        photos: true,
        createdAt: true,
        verifiedAt: true,
        specialty: { select: { name: true, slug: true, icon: true } },
        _count: { select: { reviews: true } },
      },
      // Oldest pending submissions first (queue order); newest-first
      // otherwise so recently-touched records surface at the top.
      orderBy: statusParam === 'PENDING' ? { createdAt: 'asc' } : { createdAt: 'desc' },
    });

    const counts = await prisma.provider.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const countsByStatus = { PENDING: 0, VERIFIED: 0, SUSPENDED: 0 } as Record<string, number>;
    counts.forEach((c: { status: string; _count: { _all: number } }) => {
      countsByStatus[c.status] = c._count._all;
    });

    return NextResponse.json({ providers, counts: countsByStatus, total: providers.length });
  } catch (error) {
    console.error('Error in GET /api/admin/providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
