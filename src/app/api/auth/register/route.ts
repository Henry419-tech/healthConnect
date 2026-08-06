// src/app/api/auth/register/route.ts
//
// Single registration endpoint used by the signup page.
// The duplicate /api/auth/signup/route.ts has been removed — this is the only registration endpoint.
//
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, gender } = body

    // ── Validation ───────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 },
      )
    }

    const VALID_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']
    if (gender && !VALID_GENDERS.includes(gender)) {
      return NextResponse.json(
        { error: 'Invalid gender value.' },
        { status: 400 },
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 },
      )
    }

    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one letter and one number.' },
        { status: 400 },
      )
    }

    // ── Duplicate check ──────────────────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },  // 409 Conflict is more accurate than 400
      )
    }

    // ── Create user + HealthProfile in one transaction ──────────
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name:     name.trim(),
          email:    email.trim().toLowerCase(),
          password: hashedPassword,
        },
        select: {
          id:        true,
          name:      true,
          email:     true,
          createdAt: true,
        },
      })

      // Always create the HealthProfile row immediately so downstream
      // pages (dashboard, cycle tracker, etc.) never have to race against
      // the auto-create in the GET /api/health-profile endpoint.
      await tx.healthProfile.create({
        data: {
          userId: created.id,
          gender: gender || null,
        },
      })

      return created
    })

    // Fire the welcome email after the transaction commits — sendWelcomeEmail
    // never throws (it catches internally, see src/lib/email.ts), so a
    // Resend outage or bad API key can't fail account creation. Awaited
    // rather than fire-and-forget since serverless functions can be frozen
    // as soon as the response is sent, which would otherwise race the send.
    const welcomeName = user.name ?? 'there'
    await sendWelcomeEmail(user.email, welcomeName)

    return NextResponse.json(
      { message: 'Account created successfully.', user },
      { status: 201 },
    )

  } catch (error: unknown) {
    console.error('Registration error:', error)

    // Prisma unique constraint (race condition — two requests at once)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}