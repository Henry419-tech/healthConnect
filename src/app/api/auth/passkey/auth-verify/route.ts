// src/app/api/auth/passkey/auth-verify/route.ts
// Verifies an authentication assertion, then exchanges it for a NextAuth
// session by calling signIn('credentials') with a special passkey token.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/server';
// (types re-exported from @simplewebauthn/server — @simplewebauthn/types not required)
import { sign } from 'jsonwebtoken';

const RP_ID  = process.env.WEBAUTHN_RP_ID  ?? 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as (AuthenticationResponseJSON & { email?: string }) | null;
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const email = body.email;
  if (!email) return NextResponse.json({ error: 'email is required in body' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { passkeys: true },
  });

  if (!user?.passkeyChallenge) {
    return NextResponse.json({ error: 'No challenge found. Please restart sign-in.' }, { status: 400 });
  }

  // Find matching credential
  const rawId = Buffer.from(body.rawId, 'base64url').toString('base64url');
  const credential = user.passkeys.find(pk => pk.credentialId === rawId);
  if (!credential) {
    return NextResponse.json({ error: 'Unknown credential' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: user.passkeyChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.counter),
        transports: credential.transports
          ? (credential.transports.split(',') as AuthenticatorTransportFuture[])
          : undefined,
      },
    });
  } catch (err) {
    console.error('Passkey auth verify error:', err);
    return NextResponse.json({ error: 'Verification failed', detail: String(err) }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  // Update counter and last-used timestamp
  await prisma.passkeyCredential.update({
    where: { id: credential.id },
    data: {
      counter:    BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  // Clear challenge
  await prisma.user.update({
    where: { id: user.id },
    data: { passkeyChallenge: null },
  });

  // Issue a short-lived signed token that the credentials provider will accept
  const secret = process.env.PASSKEY_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-secret';
  const token = sign({ userId: user.id, type: 'passkey' }, secret, { expiresIn: '2m' });

  return NextResponse.json({ verified: true, passkeyToken: token, userId: user.id });
}