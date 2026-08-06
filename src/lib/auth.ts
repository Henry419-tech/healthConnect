// src/lib/auth.ts
import { getServerSession } from 'next-auth/next'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'  // ← v4-compatible adapter
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verify as jwtVerify } from 'jsonwebtoken'

// ── Custom adapter ────────────────────────────────────────────────
// We override only the four session-table methods so CredentialsProvider
// (JWT-only) doesn't try to write DB session rows. Everything else —
// createUser, linkAccount, getUserByAccount — stays intact so Google
// OAuth account linking works correctly with the v4 adapter.
function buildAdapter() {
  const base = PrismaAdapter(prisma)
  return {
    ...base,
    createSession:     () => Promise.resolve(null as any),
    updateSession:     () => Promise.resolve(null as any),
    deleteSession:     () => Promise.resolve(null as any),
    getSessionAndUser: () => Promise.resolve(null as any),

    // Auto-link Google to an existing email/password account.
    // The v4 adapter's getUserByAccount returns null when no Account row
    // exists, which normally triggers OAuthAccountNotLinked. By returning
    // the existing user here (looked up by email via the profile),
    // NextAuth instead proceeds to linkAccount and connects them.
    async createUser(data: {
      name?: string | null
      email: string
      image?: string | null
      emailVerified?: Date | null
    }) {
      // If a user with this email already exists (email/password signup),
      // return them instead of creating a duplicate.
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existing) return existing

      // Create user + bare HealthProfile in one transaction.
      // Google OAuth users won't have a gender yet — they'll be prompted
      // to set it in their Health Profile.
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name:          data.name,
            email:         data.email,
            image:         data.image,
            emailVerified: data.emailVerified,
          },
        })
        await tx.healthProfile.create({
          data: { userId: user.id },
        })
        return user
      })
      return created
    },

    // Make linkAccount idempotent — safe even if called multiple times.
    async linkAccount(account: Record<string, unknown>) {
      const existing = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider:          account.provider as string,
            providerAccountId: account.providerAccountId as string,
          },
        },
      })
      if (existing) return existing as any

      return prisma.account.create({ data: account as any })
    },
  }
}

export const authOptions: NextAuthOptions = {
  adapter: buildAdapter() as any,

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { prompt: 'select_account' },
      },
    }),

    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) return null

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        )
        if (!isPasswordValid) return null

        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),

    // Passkey / WebAuthn provider — accepts a short-lived signed token that
    // the /api/auth/passkey/auth-verify route issues after verifying the
    // WebAuthn assertion. The token is JWT-signed with PASSKEY_TOKEN_SECRET.
    CredentialsProvider({
      id:   'passkey',
      name: 'Passkey',
      credentials: {
        passkeyToken: { label: 'Passkey Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.passkeyToken) return null
        try {
          const secret = process.env.PASSKEY_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-secret'
          const payload = jwtVerify(credentials.passkeyToken, secret) as { userId: string; type: string }
          if (payload.type !== 'passkey') return null
          const user = await prisma.user.findUnique({ where: { id: payload.userId } })
          if (!user) return null
          return { id: user.id, email: user.email, name: user.name, image: user.image }
        } catch {
          return null
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/',
    error:  '/?panel=signin',
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) token.sub = user.id

      // Hydrate gender from HealthProfile on first sign-in or explicit update
      if ((user || trigger === 'update') && token.sub) {
        const profile = await prisma.healthProfile.findUnique({
          where:  { userId: token.sub },
          select: { gender: true },
        })
        token.gender = profile?.gender ?? null
      }

      if (trigger === 'update' && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where:  { id: token.sub },
          select: { name: true, email: true, image: true },
        })
        if (dbUser) {
          token.name    = dbUser.name
          token.email   = dbUser.email
          token.picture = dbUser.image
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token.sub) {
        // Re-read gender on every session refresh so profile updates are
        // reflected without forcing the user to sign out and back in.
        const [user, profile] = await Promise.all([
          prisma.user.findUnique({
            where:  { id: token.sub },
            select: { id: true, name: true, email: true, image: true },
          }),
          prisma.healthProfile.findUnique({
            where:  { userId: token.sub },
            select: { gender: true },
          }),
        ])
        if (user && session.user) {
          session.user.id    = user.id
          session.user.name  = user.name
          session.user.email = user.email
          // Only forward image if it looks like a URL (Cloudinary), never raw base64.
          // This prevents HTTP 431 "Request Header Too Large" from bloated cookies.
          const img = user.image ?? ''
          session.user.image  = img.startsWith('http') ? img : null
          session.user.gender = profile?.gender ?? null
        }
      }
      return session
    },

    async signIn({ account }) {
      if (account?.provider === 'google') return true
      return true
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path:     '/',
        secure:   process.env.NODE_ENV === 'production',
        maxAge:   30 * 24 * 60 * 60,
      },
    },
  },
}

export const getAuthSession = () => getServerSession(authOptions)