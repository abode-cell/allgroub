
'use client';

import { useDataState } from '@/contexts/data-context';
import { AppHeader } from './app-header';
import { PageLoader } from './page-loader';
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { session, authLoading } = useDataState();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = ['/login', '/signup', '/'].includes(pathname);

  // While loading, just show the loader
  if (authLoading) {
    return <PageLoader />;
  }

  // After loading, decide what to do
  if (!session && !isPublicPage) {
    // If not logged in and on a protected page, redirect
    router.replace('/login');
    // Show loader while redirecting
    return <PageLoader />;
  }
  
  if (session && (pathname === '/login' || pathname === '/signup')) {
      router.replace('/dashboard');
      return <PageLoader />;
  }
  
  // Render the appropriate layout based on session status
  if (session && !isPublicPage) {
      return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <AppHeader />
            <main className="flex-1">{children}</main>
        </div>
      )
  }

  // For public pages (logged out) or the landing page (logged in)
  return <main>{children}</main>;
}
