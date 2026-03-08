import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ACTIVITY_CAP = 200;

// ── GET /api/activities ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const type  = searchParams.get('type') || undefined;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: any = {
      userId:    user.id,
      deletedAt: null,          // exclude soft-deleted entries
      ...(type && { activityType: type }),
    };

    // Fetch activities + counts + total in parallel
    const [activities, countGroups, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.userActivity.groupBy({
        by:    ['activityType'],
        where: { userId: user.id, deletedAt: null },
        _count: true,
      }),
      prisma.userActivity.count({
        where: { userId: user.id, deletedAt: null },
      }),
    ]);

    const counts = {
      facilities: countGroups.find((c: any) => c.activityType === 'facility_found')?._count    || 0,
      symptoms:   countGroups.find((c: any) => c.activityType === 'symptom_checked')?._count   || 0,
      emergency:  countGroups.find((c: any) => c.activityType === 'emergency_accessed')?._count || 0,
    };

    return NextResponse.json({ activities, counts, total, success: true });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: String(error) },
      { status: 500 },
    );
  }
}

// ── POST /api/activities ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { activityType, title, description, metadata } = body;

    if (!activityType || !title) {
      return NextResponse.json(
        { error: 'activityType and title are required' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create the new activity
    const activity = await prisma.userActivity.create({
      data: {
        userId: user.id,
        activityType,
        title,
        description: description ?? null,
        metadata:    metadata    ?? {},
      },
    });

    // ── Enforce 200-entry cap: soft-delete the oldest entries beyond the limit ──
    const total = await prisma.userActivity.count({
      where: { userId: user.id, deletedAt: null },
    });

    if (total > ACTIVITY_CAP) {
      const overflow = await prisma.userActivity.findMany({
        where:   { userId: user.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take:    total - ACTIVITY_CAP,
        select:  { id: true },
      });

      if (overflow.length > 0) {
        await prisma.userActivity.updateMany({
          where: { id: { in: overflow.map((o: any) => o.id) } },
          data:  { deletedAt: new Date() },
        });
      }
    }

    return NextResponse.json({ activity, success: true });

  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity', details: String(error) },
      { status: 500 },
    );
  }
}

// ── DELETE /api/activities ────────────────────────────────────────────────────
// Body options:
//   { id: string }              → soft-delete a single activity
//   { all: true }               → soft-delete ALL activities for this user
//   { all: true, type: string } → soft-delete all activities of a specific type
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, all, type } = body;

    // ── Delete all (optionally filtered by type) ──
    if (all === true) {
      const result = await prisma.userActivity.updateMany({
        where: {
          userId:    user.id,
          deletedAt: null,
          ...(type && { activityType: type }),
        },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }

    // ── Delete a single activity by id ──
    if (id && typeof id === 'string') {
      // Verify the activity belongs to this user before deleting
      const activity = await prisma.userActivity.findFirst({
        where: { id, userId: user.id, deletedAt: null },
      });
      if (!activity) {
        return NextResponse.json(
          { error: 'Activity not found or already deleted' },
          { status: 404 },
        );
      }
      await prisma.userActivity.update({
        where: { id },
        data:  { deletedAt: new Date() },
      });
      return NextResponse.json({ success: true, deleted: id });
    }

    return NextResponse.json(
      { error: 'Provide either { id } to delete one, or { all: true } to delete all.' },
      { status: 400 },
    );

  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity', details: String(error) },
      { status: 500 },
    );
  }
}