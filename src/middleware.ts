// src/middleware.ts
//
// Protects all app routes from unauthenticated access.
// Any request to a protected path that has no valid session token
// is redirected to /auth/signin with a callbackUrl so the user
// lands back where they were after signing in.
//
// Place this file at:  src/middleware.ts  (or project root if no src/)
//
// ─────────────────────────────────────────────────────────────────

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default withAuth(
  // This function runs ONLY when the user is authenticated.
  // If they're not authenticated, NextAuth redirects to the signIn page automatically.
  function middleware(req: NextRequest) {
    return NextResponse.next()
  },
  {
    callbacks: {
      // Return true  → user is allowed through
      // Return false → user is redirected to signIn page
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/signin',
    },
  },
)

// ── Which paths are protected ─────────────────────────────────────
//
// The matcher below protects EVERYTHING except:
//   • /auth/*             (signin, signup pages themselves)
//   • /api/auth/*         (NextAuth internal API routes)
//   • /api/auth/register  (user registration endpoint)
//   • /_next/*            (Next.js build assets)
//   • /favicon.ico        (browser icon request)
//   • /                   (public landing page — remove if you want
//                           the root to be protected too)
//
export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT the ones listed in the negative lookahead.
     * Add any other public paths (e.g. /about, /pricing) to the list.
     */
    '/((?!auth|api/auth|_next/static|_next/image|favicon.ico|$).*)',
  ],
}