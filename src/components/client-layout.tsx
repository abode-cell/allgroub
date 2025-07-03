'use client';

import { useAuth } from '@/contexts/auth-context';
import { AppHeader } from './app-header';
import { Skeleton } from './ui/skeleton';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDataState } from '@/contexts/data-context';
import { PageLoader } from './page-loader';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { userId } = useAuth();
    const { currentUser } = useDataState();
    const router = useRouter();
    const pathname = usePathname();
    
    useEffect(() => {
        if (!userId) {
            router.replace('/login');
        }
    }, [userId, router]);
    
    useEffect(() => {
      if (currentUser) {
        const role = currentUser.role;
        const isSystemAdmin = role === 'مدير النظام';
  
        const adminRestrictedPages = [
          '/borrowers',
          '/investors',
          '/import',
          '/my-requests',
          '/calculator',
          '/reports',
          '/requests',
        ];
  
        if (isSystemAdmin && adminRestrictedPages.some(p => pathname.startsWith(p))) {
          router.replace('/dashboard');
        }
      }
    }, [currentUser, pathname, router]);

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
  const { isLoading: isDataLoading } = useDataState();
  
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (!authLoading && userId && isPublicPage) {
        router.replace('/dashboard');
    }
  },[userId, authLoading, isPublicPage, router]);

  const isLoading = authLoading || isDataLoading;

  if (isLoading) {
    return <PageLoader />;
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}
