
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
  
  return <PageLoader />;
}
