
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

  const isAuthPage = ['/login', '/signup'].includes(pathname);
  const isPublicPage = isAuthPage || pathname === '/';

  useEffect(() => {
    if (authLoading) return; // Wait until auth state is confirmed

    if (!session && !isPublicPage) {
      router.replace('/login');
    }
    if (session && isAuthPage) {
        router.replace('/dashboard');
    }
  }, [session, authLoading, isPublicPage, isAuthPage, pathname, router]);


  if (authLoading && !isPublicPage) {
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
  
  return <>{children}</>;
}
