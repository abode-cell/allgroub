'use client';

import { useAuth } from '@/contexts/auth-context';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { AppHeader } from './app-header';
import { Skeleton } from './ui/skeleton';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AppSkeleton() {
  return (
    <SidebarProvider>
      <Sidebar
        side="right"
        variant="sidebar"
        collapsible="icon"
        className="border-l hidden md:block"
      >
        <SidebarHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-16" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {[...Array(8)].map((_, i) => (
              <SidebarMenuItem key={i}>
                <div className="flex items-center gap-2 h-8 p-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 w-32 rounded-sm" />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="hidden md:flex flex-col gap-2">
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-3 w-32 rounded-sm" />
              </div>
            </div>
            <Skeleton className="h-9 w-9" />
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
      </SidebarInset>
    </SidebarProvider>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return <AppSkeleton />;
    }

    return (
        <SidebarProvider>
            <Sidebar side="right" variant="sidebar" collapsible="icon" className="border-l">
                <MainNav />
            </Sidebar>
            <SidebarInset>
                <AppHeader />
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (!loading && user && isAuthPage) {
        router.replace('/');
    }
  },[user, loading, isAuthPage, router])

  if (isAuthPage) {
    // While loading, if the user turns out to be logged in, show a skeleton during redirect.
    if(loading || (!loading && user)) return <AppSkeleton /> 
    // Otherwise, show the login page for logged-out users.
    return <>{children}</>;
  }

  // For all other pages, use the protected layout.
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
