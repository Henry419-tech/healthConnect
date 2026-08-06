// src/app/api/push/subscribe/route.ts
//
// Stores a browser's PushSubscription (endpoint + keys) against the
// signed-in user. Called from ProfileContent.tsx right after
// pushManager.subscribe() succeeds — see subscribeToPush() in
// src/lib/pushClient.ts — when the "Push notifications" toggle switches on.
//
// Upserts by endpoint (unique on PushSubscription) rather than always
// creating: re-enabling the toggle in the same browser resubscribes to the
// same endpoint, and that should update the existing row rather than fail
// on the unique constraint or pile up duplicate rows sendHealthAlertPush()
// would then double-send to.

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

  // Shape matches PushSubscription.toJSON() from the browser:
  // { endpoint, keys: { p256dh, auth } }
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return NextResponse.json(
      { error: 'endpoint and keys.p256dh/keys.auth are required' },
      { status: 400 }
    );
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh, auth },
    create: { userId: user.id, endpoint, p256dh, auth },
  });

  return NextResponse.json({ success: true });
}
