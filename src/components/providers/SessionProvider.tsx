// src/components/providers/SessionProvider.tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  // Server session passed from RootLayout via getServerSession().
  // Providing this means useSession() returns status='authenticated'
  // immediately on the client — no loading flash, no hydration mismatch.
  session?: Session | null
}

export default function AuthProvider({ children, session }: Props) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
