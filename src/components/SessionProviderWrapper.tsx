'use client'

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function SessionProviderWrapper({ 
  children,
  session 
}: { 
  children: React.ReactNode;
  session: any;
}) {
  const pathname = usePathname();

  // Refresh session when navigating between pages
  useEffect(() => {
    // This will trigger a session check when the route changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('visibilitychange'));
    }
  }, [pathname]);

  return (
    <SessionProvider 
      session={session}
      refetchInterval={0} // Disable automatic polling
      refetchOnWindowFocus={true} // Refetch when window regains focus
    >
      {children}
    </SessionProvider>
  );
}