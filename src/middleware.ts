// src/middleware.ts
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Exact public paths — always allowed through without a token
const PUBLIC_PATHS = ['/', '/reset-password', '/security']

// Prefix-based public paths — anything starting with these is allowed
const PUBLIC_PREFIXES = [
  '/api/auth',    // all NextAuth routes: /api/auth/callback/google, /session, /csrf …
  '/api/health-alerts', // GET is public — bell panel (NotificationsContext) reads this
                        // unauthenticated. Writes (POST/PATCH/DELETE) are still
                        // gated below by requireAdmin(), checked BEFORE this
                        // prefix list is consulted.
  '/auth/',       // sign in / sign up pages
  '/provider/register', // public provider self-registration page (Step 11)
  '/api/providers/register', // POST target for the page above — no patient
                              // session required to submit a listing
  '/_next',       // Next.js build assets
  '/favicon.ico',
  '/sw.js',       // service worker — must be served unauthenticated
  '/icons/',      // push notification icons
  '/emergency-brief/', // public first-responder medical brief
]

// Simple HTTP Basic Auth gate for the admin surface. Not a full admin user
// system — deliberately so, per HEALTHNAV handoff Section 9. One env var:
// ADMIN_PASSWORD. Username is not checked (any value accepted alongside the
// correct password) since there is exactly one admin for this v1 project.
//
// Protects:
//   • every /admin/* page (alerts / facilities / providers dashboards)
//   • every /api/admin/* route — GET included, not just writes, since these
//     responses carry PII (phone, email, licence number) that shouldn't be
//     patient-readable either. Added after finding this prefix wasn't
//     actually covered: /api/admin/providers, /api/admin/providers/[id],
//     /api/admin/facilities, and /api/admin/facilities/[id] all say in
//     their own file header "gated by requiresAdminAuth() in middleware.ts
//     — this route trusts that the request already passed that check", but
//     '/api/admin/...' doesn't start with '/admin' — it's a different
//     string — so none of them actually matched either check below. Any
//     signed-in patient (not just the admin) could call them directly and
//     verify/suspend/delete a provider or facility. Pages were fine — you
//     can't load /admin/providers without the password — it was only the
//     data endpoints underneath that were exposed to anyone with an
//     ordinary account.
//   • every non-GET call to /api/health-alerts and /api/health-alerts/[id]
//     (creating, editing, or deleting an alert) — GET stays public so the
//     bell panel can read active alerts without any session at all.
function requiresAdminAuth(pathname: string, method: string): boolean {
  if (pathname.startsWith('/admin')) return true
  if (pathname.startsWith('/api/admin')) return true
  if (pathname.startsWith('/api/health-alerts') && method !== 'GET') return true
  return false
}

function isAuthorizedAdmin(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  // Fail closed: if the env var isn't set, nothing can authenticate as admin
  // rather than accidentally leaving the panel open.
  if (!adminPassword) return false

  const header = req.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false

  try {
    const decoded = atob(header.slice('Basic '.length))
    const separatorIndex = decoded.indexOf(':')
    const password = separatorIndex === -1 ? '' : decoded.slice(separatorIndex + 1)
    return password === adminPassword
  } catch {
    return false
  }
}

function unauthorizedResponse() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="HealthConnect Admin"' },
  })
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 0. Admin surface — checked first, independent of patient NextAuth session.
  if (requiresAdminAuth(pathname, req.method)) {
    if (!isAuthorizedAdmin(req)) return unauthorizedResponse()
    return NextResponse.next()
  }

  // 1. Always pass through public prefixes (NextAuth callbacks live here)
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 2. Always pass through exact public pages
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  // 3. Read the JWT — getToken works with both dev and production cookie names
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName:
      process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
  })

  // 4. No valid token → send to landing page with sign-in panel open
  if (!token) {
    const url = new URL('/', req.url)
    url.searchParams.set('panel', 'signin')
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Run on every request except Next.js static assets.
  // The function above handles all allow/deny logic explicitly.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}