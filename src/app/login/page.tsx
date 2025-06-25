'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 25.5 169.3 67.8L346.6 128.9c-29.1-28.1-66.5-45.1-107.9-45.1-84.1 0-152.2 68.2-152.2 152.2s68.1 152.2 152.2 152.2c91.3 0 135.2-63.5 139.7-96.1H248v-67.3h239.1c1.3 12.2 2.9 24.4 2.9 36.8z"></path>
    </svg>
);

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
        await signInWithGoogle();
        router.replace('/');
    } catch (error) {
        console.error("Error during sign in:", error);
    }
  }

  if (loading || (!loading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <CardTitle className="text-2xl">منصة تمويل وإدارة استثمار متكاملة</CardTitle>
          <CardDescription>قم بتسجيل الدخول للمتابعة إلى لوحة التحكم</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} className="w-full">
            <GoogleIcon />
            تسجيل الدخول باستخدام جوجل
          </Button>
           <p className="text-xs text-center text-muted-foreground mt-4 px-4">
             لا يتم إنشاء حسابات المستثمرين والموظفين من هنا. يتم إنشاؤها بواسطة المسؤول.
           </p>
        </CardContent>
      </Card>
    </div>
  );
}
