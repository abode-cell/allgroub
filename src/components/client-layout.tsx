
'use client';

import { useAuth } from '@/contexts/auth-context';
import { AppHeader } from './app-header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDataState } from '@/contexts/data-context';
import { PageLoader } from './page-loader';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { userId, signOutUser } = useAuth();
    const { currentUser, isLoading: isDataLoading } = useDataState();
    const router = useRouter();
    
    useEffect(() => {
        // If auth is loaded and there's no user, redirect to login.
        if (!userId) {
            router.replace('/login');
        }
    }, [userId, router]);

    useEffect(() => {
        // After data has finished loading, if we have a userId but no matching currentUser,
        // it means the session is invalid (e.g., user was deleted or data is corrupt).
        // We should sign out to clear the invalid state and redirect to login.
        if (!isDataLoading && userId && !currentUser) {
            signOutUser();
        }
    }, [isDataLoading, userId, currentUser, signOutUser]);
    
    // While data is loading OR if the currentUser object is not yet available for a valid userId, show loader.
    if (isDataLoading || !currentUser) {
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
  const { userId, loading: authLoading } = useAuth();
  const { isLoading: isDataLoading } = useDataState();
  
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    // If auth has finished loading and we have a user, redirect from public pages to the dashboard.
    if (!authLoading && userId && isPublicPage) {
        router.replace('/dashboard');
    }
  },[userId, authLoading, isPublicPage, router]);

  // The initial loading phase for the entire app.
  // It waits for both authentication and core data to be resolved.
  const isAppLoading = authLoading || isDataLoading;

  // Show a loader for public pages too during the initial check, to prevent flashes of content.
  if (isAppLoading && (isPublicPage || !userId)) {
      return <PageLoader />;
  }

  if (isPublicPage) {
    return <>{children}</>;
  }
  
  // If it's a protected page, userId must be present. If not, the ProtectedLayout will handle redirection.
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
