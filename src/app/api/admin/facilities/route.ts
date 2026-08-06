// src/app/api/admin/facilities/route.ts
//
// GET /api/admin/facilities?status=PENDING|VERIFIED|SUSPENDED|ALL
//
// Admin only — gated by requiresAdminAuth() in middleware.ts, same as
// /api/admin/providers. Mirrors that route's shape closely so
// /admin/facilities can reuse the same page pattern.
//
// One real difference from providers: this table already has 3,438
// pre-VERIFIED rows from the Phase 9 seed (source: 'datagovgh'), so the
// VERIFIED/ALL tabs return far more rows here on day one than /admin/
// providers ever did. PENDING starts empty until real user submissions
// come in via /api/facilities/submit — same as providers did initially.

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
    const facilities = await prisma.facility.findMany({
      where,
      select: {
        id: true,
        status: true,
        source: true,
        name: true,
        type: true,
        typeLabel: true,
        phone: true,
        whatsapp: true,
        website: true,
        address: true,
        city: true,
        region: true,
        district: true,
        lat: true,
        lng: true,
        emergencyServices: true,
        hours: true,
        nhis: true,
        services: true,
        createdAt: true,
        verifiedAt: true,
        submittedById: true,
      },
      // Oldest pending submissions first (queue order); newest-first
      // otherwise — same convention as /api/admin/providers. For the
      // VERIFIED tab this puts the 3,438-row seed batch (all created at
      // roughly the same moment) below anything more recently touched.
      orderBy: statusParam === 'PENDING' ? { createdAt: 'asc' } : { createdAt: 'desc' },
      // Seed batch alone is 3,438 rows — cap the query so the admin UI
      // stays responsive; the search box on the page filters within this
      // page of results. Revisit with real pagination if this becomes a
      // bottleneck once user submissions grow the PENDING queue.
      take: 500,
    });

    const counts = await prisma.facility.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const countsByStatus = { PENDING: 0, VERIFIED: 0, SUSPENDED: 0 } as Record<string, number>;
    counts.forEach((c: { status: string; _count: { _all: number } }) => {
      countsByStatus[c.status] = c._count._all;
    });

    return NextResponse.json({ facilities, counts: countsByStatus, total: facilities.length });
  } catch (error) {
    console.error('Error in GET /api/admin/facilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilities', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}