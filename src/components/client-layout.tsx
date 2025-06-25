'use client';

import { useAuth } from '@/contexts/auth-context';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import LoginPage from '@/app/login/page';
import { Loader2 } from 'lucide-react';
import { AppHeader } from './app-header';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
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
