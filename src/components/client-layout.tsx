

'use client';

import { useDataState } from '@/contexts/data-context';
import { AppHeader } from './app-header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoader } from './page-loader';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <AppHeader />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, authLoading } = useDataState();
  const router = useRouter();
  
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (authLoading) {
      return; // Do nothing while loading
    }

    if (!session && !isPublicPage) {
      router.replace('/login');
    }
    
    if (session && isPublicPage) {
      router.replace('/dashboard');
    }

  }, [session, authLoading, isPublicPage, pathname, router]);
  
  if (authLoading || (!session && !isPublicPage) || (session && isPublicPage)) {
      return <PageLoader />;
  }
  
  if (session && !isPublicPage) {
      return <ProtectedLayout>{children}</ProtectedLayout>;
  }

  // Render public pages for users without a session
  if (!session && isPublicPage) {
    return <>{children}</>;
  }

  // Fallback loader if none of the conditions are met (should be rare)
  return <PageLoader />;
}
