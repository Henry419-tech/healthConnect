// src/app/api/auth/passkey/signup-verify/route.ts
//
// Passkey-first account creation, step 2 of 2. See signup-options for why
// the pending signup lives in a signed token instead of the DB.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { sign, verify as jwtVerify } from 'jsonwebtoken';

const RP_ID   = process.env.WEBAUTHN_RP_ID  ?? 'localhost';
const ORIGIN  = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';
const SECRET  = process.env.PASSKEY_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-secret';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as
    (RegistrationResponseJSON & { signupToken?: string }) | null;
  if (!body?.signupToken) {
    return NextResponse.json({ error: 'Missing or expired signup session. Please try again.' }, { status: 400 });
  }

  let pending: { type: string; name: string; email: string; challenge: string };
  try {
    pending = jwtVerify(body.signupToken, SECRET) as typeof pending;
    if (pending.type !== 'passkey-signup') throw new Error('wrong token type');
  } catch {
    return NextResponse.json({ error: 'Missing or expired signup session. Please try again.' }, { status: 400 });
  }

  // Re-check for a race: someone could have registered this email in the
  // few minutes between signup-options and signup-verify.
  const existing = await prisma.user.findUnique({ where: { email: pending.email } });
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Try signing in instead.' },
      { status: 409 },
    );
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });
  } catch (err) {
    console.error('Passkey signup verify error:', err);
    return NextResponse.json({ error: 'Verification failed', detail: String(err) }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // Create the account, its HealthProfile, and the passkey credential
  // together — mirrors the transaction in /api/auth/register so downstream
  // pages (dashboard, cycle tracker, etc.) never race an auto-create.
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: pending.name, email: pending.email },
        select: { id: true, name: true, email: true, image: true },
      });

      await tx.healthProfile.create({ data: { userId: created.id } });

      await tx.passkeyCredential.create({
        data: {
          userId:       created.id,
          credentialId: Buffer.from(credential.id).toString('base64url'),
          publicKey:    Buffer.from(credential.publicKey),
          counter:      BigInt(credential.counter),
          deviceType:   credentialDeviceType,
          backedUp:     credentialBackedUp,
          transports:   body.response.transports?.join(',') ?? null,
          lastUsedAt:   new Date(),
        },
      });

      return created;
    });
  } catch (err: unknown) {
    // Lost the email-uniqueness race between the check above and this
    // write — same P2002 handling as /api/auth/register.
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 },
      );
    }
    console.error('Passkey signup account-creation error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  // Same short-lived exchange token the sign-in flow uses, so the client
  // can immediately call signIn('passkey', { passkeyToken }).
  const passkeyToken = sign({ userId: user.id, type: 'passkey' }, SECRET, { expiresIn: '2m' });

  return NextResponse.json({ verified: true, passkeyToken, userId: user.id });
}
