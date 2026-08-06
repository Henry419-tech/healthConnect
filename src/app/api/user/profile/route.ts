// app/api/user/profile/route.ts
//
// GET   — slim profile fields for the /profile page: name, email, image.
//         Session only carries name/email/image, so the page still needs
//         a dedicated fetch on mount.
// PATCH — updates name and/or image.
//
// NOTE: a `phone` field used to live here (own-account phone number,
// separate from /api/emergency-contacts). Removed — it was collected at
// onboarding and editable on /profile but never read anywhere downstream
// (not by SOS alerts, not by the Medical ID PDF, no provider/patient
// contact flow exists). If a real use for it shows up later, re-add here.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/* ── GET /api/user/profile ─────────────────────────────────────── */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { name: true, email: true, image: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/* ── PATCH /api/user/profile ───────────────────────────────────── */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, image } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
    };

    // Include image if provided (either base64 or URL)
    if (image) {
      updateData.image = image;
    }

    // Update user in database
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}