// src/app/api/push/unsubscribe/route.ts
//
// Removes a browser's PushSubscription row. Called right after
// subscription.unsubscribe() — see unsubscribeFromPush() in
// src/lib/pushClient.ts — when the "Push notifications" toggle switches
// off. Scoped to endpoint AND the signed-in user's id, so a request can
// only ever delete that user's own subscription, never anyone else's.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const endpoint = body?.endpoint;
  if (typeof endpoint !== 'string') {
    return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });

  return NextResponse.json({ success: true });
}
