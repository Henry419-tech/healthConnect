// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AuthProvider from '@/components/providers/SessionProvider'
import { DarkModeProvider } from '@/contexts/DarkModeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { FontSizeProvider } from '@/contexts/FontSizeContext'
import { FontStyleProvider } from '@/contexts/FontStyleContext'
import { NotificationsProvider } from '@/contexts/NotificationsContext'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Pre-populate SessionProvider with the server session so useSession()
  // returns status='authenticated' immediately on the client — no loading
  // flash, no hydration mismatch from server=loading / client=authenticated.
  const session = await getServerSession(authOptions);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Accessibility font styles (Section 6.2) — Georgia ('Reading') is
            system-available and needs no webfont; Atkinson Hyperlegible
            ('Clear') and Nunito ('Bold') are loaded here so they're ready
            the moment a user picks them in Profile > Settings. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Nunito:wght@400;600;700;800&display=swap"
        />
        {/* Service worker — registered passively for every visitor so it's
            ready when needed (offline caching, push, etc). Registration
            alone never subscribes anyone to push — that only happens when
            the "Push notifications" toggle in Profile → Settings is
            switched on (see subscribeToPush() in src/lib/pushClient.ts).
            Deliberately no fetch('/api/push/subscribe') here: that would
            fire the browser's native permission prompt for every visitor
            on page load, not just people who asked for it. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (!('serviceWorker' in navigator)) return;

            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(reg) {
                  console.log('[SW] Registered, scope:', reg.scope);
                })
                .catch(function(err) {
                  console.warn('[SW] Registration failed:', err);
                });
            });
          })();
        `}} />
      </head>
      <body suppressHydrationWarning>
        {/* Pre-paint theme script — runs synchronously before any CSS is applied.
            Reads localStorage and applies 'dark-mode' class to <html> immediately,
            preventing a flash of wrong theme on hard refresh.
            This is the ONLY place we read localStorage before hydration.
            DarkModeContext always starts with isDarkMode=false (matching server)
            then reads the real preference in a useEffect after hydration.

            suppressHydrationWarning is required here because some routes
            (via BodyPageAttribute) can inject an inline <script> that calls
            document.body.setAttribute('data-page', ...) synchronously before
            hydration. That's an intentional, harmless mutation outside
            React's render output — but without this prop, React's hydration
            diff flags the resulting attribute mismatch as an error.
            suppressHydrationWarning only affects this one element's
            own attributes; it does not silence mismatches in its children. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('hc-theme');if(s==='dark'||(s===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark-mode')}}catch(e){}})();` }} />
        {/* Pre-paint font-size/font-style script — same rationale as the
            theme script above: applies the saved class synchronously before
            first paint so there's no flash of the wrong size/typeface.
            FontSizeContext/FontStyleContext always start at their defaults
            (matching server) then confirm the real value in a useEffect. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var sz=localStorage.getItem('hc-font-size');if(sz==='medium'||sz===null){document.documentElement.classList.add('fs-medium')}else if(sz==='large'){document.documentElement.classList.add('fs-large')}else if(sz==='xl'){document.documentElement.classList.add('fs-xl')}var st=localStorage.getItem('hc-font-style');if(st==='reading'){document.documentElement.classList.add('font-reading')}else if(st==='clear'){document.documentElement.classList.add('font-clear')}else if(st==='bold'){document.documentElement.classList.add('font-bold')}}catch(e){}})();` }} />
        <AuthProvider session={session}>
          <DarkModeProvider>
            <FontSizeProvider>
              <FontStyleProvider>
                <LanguageProvider>
                  <NotificationsProvider>
                    {children}
                  </NotificationsProvider>
                </LanguageProvider>
              </FontStyleProvider>
            </FontSizeProvider>
          </DarkModeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}