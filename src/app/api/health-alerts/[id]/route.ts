// src/app/api/health-alerts/[id]/route.ts
//
// PATCH  — admin only. Edit an alert, or deactivate it (active: false).
// DELETE — admin only. Hard delete.
// Both gated by requiresAdminAuth() in middleware.ts (non-GET requests to
// /api/health-alerts* require HTTP Basic Auth against ADMIN_PASSWORD).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_TYPES = ['public_health', 'facility', 'calendar'] as const;
const VALID_SEVERITIES = ['info', 'warning', 'critical'] as const;

/* ── PATCH /api/health-alerts/[id] ──────────────────────────────── */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const existing = await prisma.healthAlert.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });

  if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }
  if (body.severity !== undefined && !VALID_SEVERITIES.includes(body.severity)) {
    return NextResponse.json({ error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` }, { status: 400 });
  }

  const alert = await prisma.healthAlert.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.severity !== undefined ? { severity: body.severity } : {}),
      ...(body.region !== undefined ? { region: body.region || null } : {}),
      ...(body.source !== undefined ? { source: body.source } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(body.expiresAt !== undefined
        ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
        : {}),
    },
  });

  return NextResponse.json({ alert });
}

/* ── DELETE /api/health-alerts/[id] ─────────────────────────────── */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.healthAlert.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });

  await prisma.healthAlert.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
