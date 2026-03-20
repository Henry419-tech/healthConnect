// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import AuthProvider from '@/components/providers/SessionProvider'
import { DarkModeProvider } from '@/contexts/DarkModeContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'HealthConnect Navigator',
  description: 'Your personal health management system',
}

// interactive-widget=resizes-content tells Android Chrome to shrink
// the layout when the virtual keyboard opens, instead of overlapping it.
// This is what makes 100dvh actually shrink with the keyboard so the
// input bar rises above it naturally without any JS.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
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