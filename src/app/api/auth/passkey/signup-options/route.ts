// src/app/api/auth/passkey/signup-options/route.ts
//
// Passkey-first account creation, step 1 of 2.
//
// Unlike /register-options, there is no session yet — this is how a brand
// new visitor signs up without ever setting a password. We don't write a
// User row here: if the person cancels the WebAuthn prompt (very common —
// it's a native browser dialog with no server round-trip on cancel), a
// half-created, password-less, passkey-less account would otherwise sit in
// the DB forever and permanently block that email address from signing up
// again. Instead the pending name/email/challenge travel in a short-lived
// signed token; the User row is only created in signup-verify, atomically
// with the passkey credential, once the attestation actually checks out.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { sign } from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const RP_NAME = 'HealthConnect Navigator';
const RP_ID   = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const SECRET  = process.env.PASSKEY_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-secret';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { name?: string; email?: string } | null;
  const name  = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();

  if (!name) return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Try signing in instead.' },
      { status: 409 },
    );
  }

  // WebAuthn requires a userID (userHandle) up to 64 bytes. It only needs to
  // be unique for this ceremony — it does not have to match the eventual
  // Prisma user id, which is assigned when the row is actually created.
  const webauthnUserId = randomUUID();

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(webauthnUserId),
    userName: email,
    userDisplayName: name,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  // Short-lived, server-signed — the client can't tamper with name/email/
  // challenge without invalidating the signature.
  const signupToken = sign(
    { type: 'passkey-signup', name, email, challenge: options.challenge },
    SECRET,
    { expiresIn: '5m' },
  );

  return NextResponse.json({ options, signupToken });
}
