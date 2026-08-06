// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    // ── Input validation ─────────────────────────────────────────
    if (!token?.trim()) {
      return NextResponse.json(
        { error: 'Reset token is missing.' },
        { status: 400 },
      )
    }

    if (!password || password.length < 6) {
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

    // ── Look up the token ────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'This reset link is invalid. Please request a new one.' },
        { status: 400 },
      )
    }

    // ── Check expiry ─────────────────────────────────────────────
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      // Clear the expired token so it can't be reused
      await prisma.user.update({
        where: { id: user.id },
        data:  { resetToken: null, resetTokenExpiry: null },
      })

      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 },
      )
    }

    // ── Hash new password and clear token in one update ──────────
    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password:         hashedPassword,
        resetToken:       null,
        resetTokenExpiry: null,
      },
    })

    return NextResponse.json(
      { message: 'Password updated successfully. You can now sign in.' },
      { status: 200 },
    )

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}