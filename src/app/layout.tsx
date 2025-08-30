
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ClientLayout } from '@/components/client-layout';
import { DataProvider } from '@/contexts/data-context';
import { ThemeProvider } from '@/components/theme-provider';
import { Tajawal } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/error-boundary';

export const dynamic = 'force-dynamic';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'منصة عال',
  description: 'منصة متكاملة لإدارة التمويل والاستثمارات والقروض',
  keywords: ['تمويل', 'استثمار', 'قروض', 'إدارة مالية', 'السعودية'],
  authors: [{ name: 'مجموعة عال' }],
  creator: 'مجموعة عال',
  publisher: 'مجموعة عال',
  robots: {
    index: false,
    follow: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cn('font-sans antialiased', tajawal.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <DataProvider>
              <ClientLayout>{children}</ClientLayout>
            </DataProvider>
          </ErrorBoundary>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
