// src/app/api/notifications/route.ts
//
// Server-owned read-state for the bell pipeline (NotificationsContext.tsx),
// replacing the client-only localStorage "seen" set for global-scope
// notifications. Content itself still comes from GET /api/health-alerts
// plus the client-computed NHIS-expiry check — this route only tracks which
// of those notification ids the signed-in user has already seen, so
// read/unread state syncs across devices.
//
// GET  — returns every notification id this user has marked read.
// POST — marks one or more ids read (idempotent — re-marking an already-read
//        id is a no-op, not an error). Used both for "open the bell panel"
//        (mark everything currently visible as read) and any future
//        click-to-read-one-item interaction.
//
// Both require a session — unlike /api/health-alerts, read-state is
// inherently per-user. No PUBLIC_PREFIXES entry needed in middleware.ts.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_IDS_PER_REQUEST = 50; // panel never realistically shows more than a handful at once

/* ── GET /api/notifications ─────────────────────────────────────── */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const reads = await prisma.notificationRead.findMany({
    where: { userId: user.id },
    select: { notificationId: true },
  });

  return NextResponse.json({ readIds: reads.map(r => r.notificationId) });
}

/* ── POST /api/notifications ────────────────────────────────────── */
// Body: { ids: string[] }
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'ids must be a non-empty string array' }, { status: 400 });
  }
  if (ids.length > MAX_IDS_PER_REQUEST) {
    return NextResponse.json({ error: `ids exceeds max of ${MAX_IDS_PER_REQUEST}` }, { status: 400 });
  }

  await prisma.notificationRead.createMany({
    data: ids.map(notificationId => ({ userId: user.id, notificationId })),
    skipDuplicates: true, // already-read ids are a no-op, not an error
  });

  const reads = await prisma.notificationRead.findMany({
    where: { userId: user.id },
    select: { notificationId: true },
  });

  return NextResponse.json({ readIds: reads.map(r => r.notificationId) });
}