import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type');

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query
    const whereClause: any = { userId: user.id };
    if (type) {
      whereClause.activityType = type;
    }

    // Fetch activities
    const activities = await prisma.userActivity.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Get activity counts
    const counts = await prisma.userActivity.groupBy({
      by: ['activityType'],
      where: { userId: user.id },
      _count: true
    });

    const activityCounts = {
      facilities: counts.find((c: any) => c.activityType === 'facility_found')?._count || 0,
      symptoms: counts.find((c: any) => c.activityType === 'symptom_checked')?._count || 0,
      emergency: counts.find((c: any) => c.activityType === 'emergency_accessed')?._count || 0
    };

    return NextResponse.json({
      activities,
      counts: activityCounts,
      success: true
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: String(error) },
      { status: 500 }
    );
  }
}

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
        { error: 'Activity type and title are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create activity
    const activity = await prisma.userActivity.create({
      data: {
        userId: user.id,
        activityType,
        title,
        description,
        metadata: metadata || {}
      }
    });

    return NextResponse.json({ activity, success: true });

  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity', details: String(error) },
      { status: 500 }
    );
  }
}