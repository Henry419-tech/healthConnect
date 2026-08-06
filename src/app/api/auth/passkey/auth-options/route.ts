// src/app/api/auth/passkey/auth-options/route.ts
// Returns WebAuthn PublicKeyCredentialRequestOptions for authentication.
// Does NOT require an active session — this is used before sign-in.
// Challenge is stored against the email query-param so verify can find it.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { passkeys: { select: { credentialId: true, transports: true } } },
  });

  if (!user) {
    // Return generic options so we don't leak whether an email exists
    const opts = await generateAuthenticationOptions({ rpID: RP_ID, userVerification: 'preferred' });
    return NextResponse.json(opts);
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials: user.passkeys.map(pk => ({
      id: pk.credentialId,
      transports: pk.transports ? (pk.transports.split(',') as AuthenticatorTransportFuture[]) : undefined,
    })),
  });

  // Persist challenge
  await prisma.user.update({
    where: { id: user.id },
    data: { passkeyChallenge: options.challenge },
  });

  return NextResponse.json(options);
}