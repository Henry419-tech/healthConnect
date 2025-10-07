// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = 'admin' } = await request.json()

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' }, 
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' }, 
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['doctor', 'nurse', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be doctor, nurse, or admin' }, 
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' }, 
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user for NextAuth
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    })

    return NextResponse.json(
      { 
        message: 'User created successfully', 
        user 
      }, 
      { status: 201 }
    )

  } catch (error: unknown) {
    console.error('Registration error:', error)
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'User already exists with this email' }, 
          { status: 400 }
        )
      }
    }

    // Generic error handling
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred'

    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    )
  }
}