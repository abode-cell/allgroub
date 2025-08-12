
'use client';

import { useDataState } from '@/contexts/data-context';
import { AppHeader } from './app-header';
import { usePathname } from 'next/navigation';
import { PageLoader } from './page-loader';
import React from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, authLoading } = useDataState();
  
  const isPublicPage = pathname === '/login' || pathname === '/signup' || pathname === '/';

  if (authLoading) {
    return <PageLoader />;
  }
  
  if (session && !isPublicPage) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    );
  }
  
  if (!session && isPublicPage) {
     return <main>{children}</main>;
  }

  // Fallback for edge cases (e.g., trying to access protected page while logged out)
  // The redirects in next.config.js should handle this, but this is a safeguard.
  if (!session && !isPublicPage) {
    return <PageLoader />; // Show loader while redirecting
  }

  return <main>{children}</main>;
}
