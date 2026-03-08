// src/app/api/auth/register/route.ts
//
// Single registration endpoint used by the signup page.
// The duplicate /api/auth/signup/route.ts should be DELETED.
//
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // ── Validation ───────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
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

    // ── Create user ──────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
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