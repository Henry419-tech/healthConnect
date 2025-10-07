// middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Middleware logic
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Public routes - always allow
        const publicRoutes = ['/', '/auth/signin', '/auth/signup']
        if (publicRoutes.includes(pathname)) {
          return true
        }
        
        // Protected routes - require token
        return !!token
      },
    },
  }
)

// Only match protected routes, NOT the homepage
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/facilities/:path*',
    '/symptom-checker/:path*',
    '/emergency/:path*',
    // Explicitly exclude these:
    // NOT /
    // NOT /auth/*
  ],
}