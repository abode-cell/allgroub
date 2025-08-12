
'use client';

import { useDataState } from '@/contexts/data-context';
import { AppHeader } from './app-header';
import { PageLoader } from './page-loader';
import React from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { session, authLoading } = useDataState();

  if (authLoading) {
    return <PageLoader />;
  }

  if (session) {
    return (
      <div className="flex flex-col min-h-screen bg-muted/40">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return <main>{children}</main>;
}
