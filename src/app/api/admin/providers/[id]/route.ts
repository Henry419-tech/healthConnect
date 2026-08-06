// src/app/api/admin/providers/[id]/route.ts
//
// PATCH  — admin only. Change a provider's status: PENDING -> VERIFIED
//          (approve), VERIFIED -> SUSPENDED (delist), SUSPENDED -> VERIFIED
//          (reinstate). Also settable directly to PENDING to pull a listing
//          back into the queue without losing the record.
// DELETE — admin only. Hard delete (cascades ProviderReview / ProviderView
//          per schema.prisma onDelete: Cascade) — use for spam/duplicate
//          submissions, not routine delisting (suspend for that instead).
//
// Both gated by requiresAdminAuth() in middleware.ts (HTTP Basic Auth
// against ADMIN_PASSWORD) — this route trusts that check already ran.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['PENDING', 'VERIFIED', 'SUSPENDED'] as const;
type Status = (typeof VALID_STATUSES)[number];

/* ── PATCH /api/admin/providers/[id] ────────────────────────────── */
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

  const existing = await prisma.provider.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  try {
    const provider = await prisma.provider.update({
      where: { id },
      data: {
        status: status as Status,
        // Stamp verifiedAt the first time a listing goes live. There is no
        // admin User row in this app's single-password auth model (see
        // middleware.ts requiresAdminAuth), so verifiedById records a
        // fixed marker rather than a real User.id foreign key.
        ...(status === 'VERIFIED' && !existing.verifiedAt
          ? { verifiedAt: new Date(), verifiedById: 'admin' }
          : {}),
      },
    });

    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Error in PATCH /api/admin/providers/[id]:', error);
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}

/* ── DELETE /api/admin/providers/[id] ───────────────────────────── */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.provider.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  try {
    await prisma.provider.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/providers/[id]:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}
