// src/app/layout.tsx
import type { Metadata } from 'next'
import AuthProvider from '@/components/providers/SessionProvider'
import { DarkModeProvider } from '@/contexts/DarkModeContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'HealthConnect Navigator',
  description: 'Your personal health management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>
        <AuthProvider>
          <DarkModeProvider>
            {children}
          </DarkModeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}