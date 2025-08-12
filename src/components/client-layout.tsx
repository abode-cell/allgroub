
'use client';

import { useDataState } from '@/contexts/data-context';
import { AppHeader } from './app-header';
import { usePathname } from 'next/navigation';
import { PageLoader } from './page-loader';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, authLoading } = useDataState();
  
  const isPublicPage = pathname === '/login' || pathname === '/signup' || pathname === '/';

  useEffect(() => {
    if (!authLoading) {
      if (session && isPublicPage) {
        router.replace('/dashboard');
      } else if (!session && !isPublicPage) {
        router.replace('/login');
      }
    }
  }, [session, authLoading, isPublicPage, pathname, router]);

  if (authLoading) {
    return <PageLoader />;
  }
  
  if (session && isPublicPage) {
    return <PageLoader />;
  }
  
  if (!session && !isPublicPage) {
    return <PageLoader />;
  }

  if (session) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    );
  }
  
  return <main>{children}</main>;
}
