import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ClientLayout } from '@/components/client-layout';
import { DataProvider } from '@/contexts/data-context';
import { ThemeProvider } from '@/components/theme-provider';
import { Tajawal } from 'next/font/google';
import { cn } from '@/lib/utils';
import { logoSvg } from '@/components/logo';

export const dynamic = 'force-dynamic';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'منصة تمويل وإدارة استثمار متكاملة',
  description: 'منصة متكاملة لإدارة التمويل والاستثمارات والقروض.',
};

const favicon = `data:image/svg+xml;base64,${btoa(logoSvg)}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
          <link rel="icon" href={favicon} type="image/svg+xml" />
      </head>
      <body className={cn('font-sans antialiased', tajawal.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DataProvider>
            <ClientLayout>{children}</ClientLayout>
          </DataProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

    