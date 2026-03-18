// app/api/chat-sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chat-sessions/[id] — load all messages for a session
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session: chatSession });
}

// PATCH /api/chat-sessions/[id] — update session (e.g. mark as completed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const { status: newStatus, riskLevel } = body;

  const updateData: any = { updatedAt: new Date() };
  if (newStatus === 'completed') {
    updateData.status = 'completed';
    updateData.completedAt = new Date();
  }
  if (riskLevel) updateData.riskLevel = riskLevel;

  const updated = await prisma.chatSession.updateMany({
    where: { id: params.id, userId: user.id },
    data: updateData,
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/chat-sessions/[id] — delete a session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.chatSession.deleteMany({
    where: { id: params.id, userId: user.id },
  });

  return NextResponse.json({ success: true });
}