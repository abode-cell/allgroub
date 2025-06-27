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

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppSkeleton />;
  }

  // Since Supabase is disconnected, we assume the user is always logged in via the mock provider.
  // If the mock user is removed for any reason, this would be a fallback,
  // but in the current setup, `user` will always be populated.
  if (!user) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
                <h1 className="text-2xl font-bold">تم تسجيل الخروج (وضع تجريبي)</h1>
                <p className="text-muted-foreground">أعد تحميل الصفحة لتسجيل الدخول مرة أخرى.</p>
            </div>
      </div>
    );
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
