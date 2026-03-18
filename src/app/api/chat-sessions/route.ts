// app/api/chat-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chat-sessions — list all sessions for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const sessions = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      riskLevel: true,
      messageCount: true,
      status: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ sessions });
}

// POST /api/chat-sessions — create a new session
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { title } = await request.json();

  const chatSession = await prisma.chatSession.create({
    data: {
      userId: user.id,
      title: title || 'New Conversation',
    },
  });

  return NextResponse.json({ session: chatSession });
}