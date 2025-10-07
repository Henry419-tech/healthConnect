// src/lib/auth.ts
import { getServerSession } from 'next-auth/next'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // NO adapter when using CredentialsProvider with JWT
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Return minimal data to keep JWT small
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: null, // Don't store image in JWT
        }
      }
    })
  ],
  session: {
    strategy: 'jwt', // REQUIRED for CredentialsProvider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in - store ONLY user ID
      if (user) {
        token.sub = user.id // Only store ID in JWT to minimize size
      }

      // Handle session updates
      if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            name: true,
            email: true,
            image: true,
          }
        })

        if (dbUser) {
          token.name = dbUser.name
          token.email = dbUser.email
          token.picture = dbUser.image
        }
      }

      return token
    },
    async session({ session, token }) {
      // Fetch fresh user data from database on each session check
      // This keeps JWT tiny (only ID) but provides full user data
      if (token.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        })

        if (user && session.user) {
          session.user.id = user.id
          session.user.name = user.name
          session.user.email = user.email
          session.user.image = user.image
        }
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Optimize cookie settings
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
}

export const getAuthSession = () => getServerSession(authOptions)