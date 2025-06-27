import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { ClientLayout } from '@/components/client-layout';
import { DataProvider } from '@/contexts/data-context';

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
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <DataProvider>
            <ClientLayout>{children}</ClientLayout>
          </DataProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
