
'use client';

import { useDataState } from '@/contexts/data-context';
import { AppHeader } from './app-header';
import { usePathname } from 'next/navigation';
import { PageLoader } from './page-loader';
import React from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, authLoading } = useDataState();

  const isPublicPage = pathname === '/login' || pathname === '/signup';

  if (authLoading) {
    return <PageLoader />;
  }

  if (session && !isPublicPage) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  if (!session && isPublicPage) {
    return <>{children}</>;
  }
  
  // This case handles the redirect implicitly by rendering nothing while
  // the middleware in next.config.js handles the redirect.
  // It also prevents rendering protected pages when not logged in.
  if (!session && !isPublicPage) {
     return <PageLoader />;
  }

  // This handles the case where a logged-in user tries to access a public page.
  // The middleware will redirect them from '/', but this catches /login and /signup.
  if (session && isPublicPage) {
      return <PageLoader />;
  }

  return <PageLoader />;
}

    