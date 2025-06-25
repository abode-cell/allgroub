import type { Metadata } from 'next';
import './globals.css';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { MainNav } from '@/components/main-nav';
import { RoleProvider } from '@/contexts/role-context';

export const metadata: Metadata = {
  title: 'منصة تمويل وإدارة استثمار متكاملة',
  description: 'منصة متكاملة لإدارة التمويل والاستثمارات والقروض.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="font-body antialiased">
        <RoleProvider>
          <SidebarProvider>
            <Sidebar
              side="right"
              variant="sidebar"
              collapsible="icon"
              className="border-l"
            >
              <MainNav />
            </Sidebar>
            <SidebarInset>
              {children}
              <Toaster />
            </SidebarInset>
          </SidebarProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
