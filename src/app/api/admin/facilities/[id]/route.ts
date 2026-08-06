// src/app/api/admin/facilities/[id]/route.ts
//
// PATCH  — admin only. Change a facility's status: PENDING -> VERIFIED
//          (approve, publishes it in /api/facilities/verified), VERIFIED ->
//          SUSPENDED (delist), SUSPENDED -> VERIFIED (reinstate). Also
//          settable back to PENDING to pull a listing back into the queue.
// DELETE — admin only. Hard delete — use for spam/duplicate submissions,
//          not routine delisting (suspend for that instead). No cascading
//          relations to worry about (unlike Provider -> ProviderReview),
//          since Facility has none.
//
// Both gated by requiresAdminAuth() in middleware.ts (HTTP Basic Auth
// against ADMIN_PASSWORD) — this route trusts that check already ran.
// Directly mirrors api/admin/providers/[id]/route.ts.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['PENDING', 'VERIFIED', 'SUSPENDED'] as const;
type Status = (typeof VALID_STATUSES)[number];

/* ── PATCH /api/admin/facilities/[id] ───────────────────────────── */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { status } = body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as Status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const existing = await prisma.facility.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Facility not found' }, { status: 404 });

  try {
    const facility = await prisma.facility.update({
      where: { id },
      data: {
        status: status as Status,
        // Same convention as Provider: no admin User row to reference in
        // this app's single-password auth model, so verifiedById records
        // a fixed marker rather than a real User.id foreign key. Only
        // stamped the first time a listing goes live — re-verifying after
        // a suspend/reinstate cycle doesn't overwrite the original date.
        ...(status === 'VERIFIED' && !existing.verifiedAt
          ? { verifiedAt: new Date(), verifiedById: 'admin' }
          : {}),
      },
    });

    return NextResponse.json({ facility });
  } catch (error) {
    console.error('Error in PATCH /api/admin/facilities/[id]:', error);
    return NextResponse.json({ error: 'Failed to update facility' }, { status: 500 });
  }
}

/* ── DELETE /api/admin/facilities/[id] ──────────────────────────── */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.facility.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Facility not found' }, { status: 404 });

  try {
    await prisma.facility.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/facilities/[id]:', error);
    return NextResponse.json({ error: 'Failed to delete facility' }, { status: 500 });
  }
}