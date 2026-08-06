// src/app/api/health-alerts/route.ts
//
// GET  — public. Powers the bell panel (NotificationsContext.tsx). No session
//        required — see middleware.ts PUBLIC_PREFIXES.
// POST — admin only. Creates an alert and optionally emails every opted-in
//        user and/or pushes to every opted-in subscribed browser. Gated by
//        requiresAdminAuth() in middleware.ts (HTTP Basic Auth,
//        ADMIN_PASSWORD env var) — this route trusts that the request
//        already passed that check by the time it gets here.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendHealthAlertEmail } from '@/lib/email';
import { sendHealthAlertPush } from '@/lib/push';

const VALID_TYPES = ['public_health', 'facility', 'calendar'] as const;
const VALID_SEVERITIES = ['info', 'warning', 'critical'] as const;

/* ── GET /api/health-alerts ─────────────────────────────────────── */
export async function GET() {
  const now = new Date();

  const alerts = await prisma.healthAlert.findMany({
    where: {
      active: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ alerts });
}

/* ── POST /api/health-alerts ────────────────────────────────────── */
export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const {
    title,
    body: alertBody,
    type = 'public_health',
    severity = 'info',
    region = null,
    source = 'Ghana Health Service',
    expiresAt = null,
    sendEmail = false,
    sendPush = false,
  } = body;

  if (!title || !alertBody) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` }, { status: 400 });
  }

  const alert = await prisma.healthAlert.create({
    data: {
      title,
      body: alertBody,
      type,
      severity,
      region: region || null,
      source,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Email is opt-in per publish, and always respects the user-level
  // alertEmailsEnabled opt-out — see HEALTHNAV handoff Section 8.
  // v1 simplification: region-targeted alerts still go to every opted-in
  // user (no region column on User yet). Regional filtering is a v2 item.
  let emailResult: { sent: number; failed: number } | null = null;
  if (sendEmail) {
    const recipients = await prisma.user.findMany({
      where: { alertEmailsEnabled: true },
      select: { email: true, name: true, alertNamePersonalization: true },
    });

    const result = await sendHealthAlertEmail(
      recipients.map(u => ({
        email: u.email,
        name: u.name ?? 'there',
        personalize: u.alertNamePersonalization,
      })),
      { title: alert.title, body: alert.body, region: alert.region }
    );
    emailResult = { sent: result.sent, failed: result.failed };
  }

  // Same opt-in-per-publish / opt-out-per-user shape as email above.
  // privacyPrefs is a JSON blob (see /api/user/settings) rather than a
  // scalar column, so the pushEnabled check happens here in JS rather than
  // in the Prisma where-clause — same reason the settings route merges it
  // against DEFAULT_PRIVACY in application code instead of at the DB level.
  let pushResult: { sent: number; failed: number } | null = null;
  if (sendPush) {
    const usersWithPush = await prisma.user.findMany({
      where: { pushSubscriptions: { some: {} } },
      select: {
        privacyPrefs: true,
        pushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } },
      },
    });

    const subscriptions = usersWithPush
      .filter(u => (u.privacyPrefs as { pushEnabled?: boolean } | null)?.pushEnabled === true)
      .flatMap(u => u.pushSubscriptions);

    const result = await sendHealthAlertPush(subscriptions, { title: alert.title, body: alert.body });
    pushResult = { sent: result.sent, failed: result.failed };
  }

  return NextResponse.json({ alert, email: emailResult, push: pushResult }, { status: 201 });
}