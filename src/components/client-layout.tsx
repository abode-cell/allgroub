

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
    if (authLoading) return; // Wait until authentication state is resolved

    if (session && isPublicPage) {
      router.replace('/dashboard');
    }
    
    if (!session && !isPublicPage) {
      router.replace('/login');
    }

  }, [session, authLoading, isPublicPage, pathname, router]);
  
  // Show a loader while auth state is being determined, or if a redirect is imminent
  if (authLoading || (!session && !isPublicPage) || (session && isPublicPage)) {
      return <PageLoader />;
  }
  
  // Render the appropriate layout
  if (!session && isPublicPage) {
      return <>{children}</>;
  }

  if (session && !isPublicPage) {
    return <ProtectedLayout>{children}</ProtectedLayout>;
  }

  // Fallback for edge cases, might be momentarily visible during transitions
  return <PageLoader />;
}
