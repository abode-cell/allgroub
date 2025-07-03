
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
        // This should theoretically not be hit if ClientLayout logic is correct, but serves as a final safety net.
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
  const { userId, loading: authLoading } = useAuth();
  const { isLoading: isDataLoading, currentUser } = useDataState();
  
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup';
  const isAppLoading = authLoading || isDataLoading;

  useEffect(() => {
    // If auth has finished loading and we have a valid user, redirect from public pages to the dashboard.
    // The `currentUser` check ensures we don't redirect with an invalid session.
    if (!isAppLoading && userId && currentUser && isPublicPage) {
        router.replace('/dashboard');
    }
  },[userId, currentUser, isAppLoading, isPublicPage, router]);
  
  // The critical change: Always show a loader until both auth and data state are fully resolved.
  // This prevents race conditions on public pages like login/signup where they might get incomplete data.
  if (isAppLoading) {
      return <PageLoader />;
  }

  // After loading, if the page is public, render it.
  // Redirection for logged-in users is handled by the useEffect above.
  if (isPublicPage) {
    return <>{children}</>;
  }
  
  // If it's a protected page, render the ProtectedLayout.
  // It contains its own logic to handle invalid sessions and redirect if necessary.
  return <ProtectedLayout>{children}</ProtectedLayout>;
}

