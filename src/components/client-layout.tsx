
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

  // While loading authentication state, show a full-screen loader.
  // This is the most important part of the fix to prevent race conditions.
  if (authLoading) {
    return <PageLoader />;
  }

  // After loading, if the user is not logged in and trying to access a protected page,
  // redirect them to the login page.
  if (!session && !isPublicPage) {
    router.replace('/login');
    // Also show a loader while redirecting to prevent flickering.
    return <PageLoader />;
  }
  
  // If the user is logged in, show the main app layout with the header.
  if (session) {
    return (
      <div className="flex flex-col min-h-screen bg-muted/40">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // For public pages when not logged in, just render the content.
  return <main>{children}</main>;
}
