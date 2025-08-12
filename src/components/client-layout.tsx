
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

  useEffect(() => {
    if (authLoading) {
      return; // Do nothing while loading
    }
    if (!session && !isPublicPage) {
      router.replace('/login');
    }
    if(session && isPublicPage) {
        router.replace('/dashboard');
    }
  }, [authLoading, session, isPublicPage, router, pathname]);

  if (authLoading) {
    return <PageLoader />;
  }
  
  if (!session && !isPublicPage) {
    return <PageLoader />;
  }

  if (session && isPublicPage) {
    return <PageLoader />;
  }
  
  // If we reach here, we are in a valid state to render the children.
  if (isPublicPage) {
    // Not logged in, on a public page
    return <main>{children}</main>;
  }

  // Logged in, on a protected page
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
