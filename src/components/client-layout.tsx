'use client';

import { useAuth } from '@/contexts/auth-context';
import { AppHeader } from './app-header';
import { Skeleton } from './ui/skeleton';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AppSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
       <header className="sticky top-0 z-40 w-full border-b bg-card">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-16" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
       </header>
       <main className="flex-1 space-y-8 p-4 md:p-8">
            <div className="space-y-4">
                <Skeleton className="h-8 w-64 rounded-sm" />
                <Skeleton className="h-4 w-80 rounded-sm" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
            </div>
        </main>
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { userId, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !userId) {
            router.replace('/login');
        }
    }, [userId, loading, router]);

    if (loading || !userId) {
        return <AppSkeleton />;
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
  const { userId, loading } = useAuth();
  
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (!loading && userId && isAuthPage) {
        router.replace('/');
    }
  },[userId, loading, isAuthPage, router])

  if (isAuthPage) {
    if(loading || (!loading && userId)) return <AppSkeleton /> 
    return <>{children}</>;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}
