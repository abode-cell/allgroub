
'use client';

import { useDataState } from '@/contexts/data-context';
import { AppHeader } from './app-header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoader } from './page-loader';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { currentUser } = useDataState();
    
    // While the currentUser object is not yet available for a valid session, show loader.
    // This is the gatekeeper for all protected routes.
    if (!currentUser) {
        return <PageLoader />;
    }

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
  const router = useRouter();
  const { session, authLoading, currentUser } = useDataState();
  
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    // If auth is still loading, don't do anything yet.
    if (authLoading) {
      return;
    }

    // After loading, if there's a user session
    if (session) {
      // and they are on a public page, redirect to the dashboard.
      if (isPublicPage) {
        router.replace('/dashboard');
      }
    } else { // If no session
      // and they are on a protected page, redirect to login.
      if (!isPublicPage) {
        router.replace('/login');
      }
    }
  }, [session, authLoading, isPublicPage, router, currentUser]);
  
  // Show a global loader during the initial auth check.
  if (authLoading) {
      return <PageLoader />;
  }
  
  // If there's a session and we're on a protected page, render the protected layout.
  if (session && !isPublicPage) {
    return <ProtectedLayout>{children}</ProtectedLayout>;
  }

  // If there's no session and we are on a public page, render its content.
  if (!session && isPublicPage) {
    return <>{children}</>;
  }

  // Fallback loader for any intermediate states (e.g., during redirects).
  return <PageLoader />;
}
