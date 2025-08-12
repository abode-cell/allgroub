
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
  }, [authLoading, session, isPublicPage, router]);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!session && !isPublicPage) {
    return <PageLoader />;
  }

  if (session && isPublicPage) {
    router.replace('/dashboard');
    return <PageLoader />;
  }
  
  if (isPublicPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
