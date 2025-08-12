

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
    if (!authLoading && !session && !isPublicPage) {
      router.replace('/login');
    }
    if (!authLoading && session && isPublicPage && pathname !== '/') {
        router.replace('/dashboard');
    }
  }, [session, authLoading, isPublicPage, pathname, router]);


  if (authLoading) {
    return <PageLoader />;
  }

  if (!session && !isPublicPage) {
    return <PageLoader />;
  }

  if (session && isPublicPage && pathname !== '/') {
      return <PageLoader />;
  }
  
  if (session && !isPublicPage) {
      return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <AppHeader />
            <main className="flex-1">{children}</main>
        </div>
      )
  }

  // For public pages, just render the children
  return <main>{children}</main>;
}
