'use client';

import { useAuth } from '@/contexts/auth-context';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import LoginPage from '@/app/login/page';
import { Loader2, Terminal } from 'lucide-react';
import { AppHeader } from './app-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function FirebaseErrorDisplay() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-2xl">
              <Terminal className="h-4 w-4" />
              <AlertTitle>خطأ في إعداد Firebase</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                    فشل الاتصال بـ Firebase. يبدو أن بيانات اعتماد مشروعك مفقودة في ملف <code>.env</code>.
                </p>
                <p className="mb-3">
                    لإصلاح هذا، يرجى نسخ بيانات اعتماد مشروعك من لوحة تحكم Firebase ولصقها في ملف <code>.env</code>. هذه المفاتيح سرية ولا يمكنني إضافتها بالنيابة عنك.
                </p>
                <div className="mb-4 rounded-md bg-muted p-3 text-muted-foreground">
                    <p className="mb-1 font-mono text-xs">
                        NEXT_PUBLIC_FIREBASE_API_KEY="..."
                    </p>
                    <p className="mb-1 font-mono text-xs">
                        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
                    </p>
                    <p className="mb-1 font-mono text-xs">
                        NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
                    </p>
                     <p className="font-mono text-xs">
                        ...وغيرها
                    </p>
                </div>
                <p>
                    بعد تحديث الملف، قد تحتاج إلى إعادة تشغيل خادم التطوير.
                </p>
              </AlertDescription>
            </Alert>
        </div>
    );
}


export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirebaseReady } = useAuth();

  if (!isFirebaseReady) {
    return <FirebaseErrorDisplay />;
  }

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
