
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataActions } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Eye, EyeOff, MailCheck, Hourglass } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useDataActions();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isPendingReview, setIsPendingReview] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setError('');
    setIsLoading(true);
    setNeedsConfirmation(false);
    setIsPendingReview(false);
    
    const result = await signIn(email, password);

    setIsLoading(false);
    if (result.success) {
      // The ClientLayout component will handle redirection to the dashboard.
    } else {
      if (result.reason === 'unconfirmed_email') {
        setNeedsConfirmation(true);
      } else if (result.reason === 'pending_review') {
        setIsPendingReview(true);
      } else {
        setError(result.message);
      }
    }
  };

  if (isPendingReview) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <div className="mb-6">
            <Logo />
          </div>
          <Card className="w-full max-w-md text-center">
            <CardHeader className="items-center">
                <Hourglass className="h-16 w-16 text-primary mb-4" />
                <CardTitle className="text-2xl">الحساب قيد المراجعة</CardTitle>
                <CardDescription className="text-base/relaxed pt-2">
                    شكرًا لتسجيلك. حسابك يخضع حاليًا للمراجعة من قبل فريقنا.
                    <br />
                    سيتم إعلامك عبر البريد الإلكتروني بمجرد تفعيله.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => setIsPendingReview(false)}>
                    العودة إلى صفحة تسجيل الدخول
                </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  if (needsConfirmation) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <div className="mb-6">
            <Logo />
          </div>
          <Card className="w-full max-w-md text-center">
            <CardHeader className="items-center">
                <MailCheck className="h-16 w-16 text-primary mb-4" />
                <CardTitle className="text-2xl">الرجاء تأكيد بريدك الإلكتروني</CardTitle>
                <CardDescription className="text-base/relaxed pt-2">
                    لقد أرسلنا رابط تأكيد إلى <strong className="text-foreground">{email}</strong>.
                    <br />
                    الرجاء الضغط على الرابط في البريد الإلكتروني لتفعيل حسابك قبل تسجيل الدخول.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => setNeedsConfirmation(false)}>
                    العودة إلى صفحة تسجيل الدخول
                </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-6">
        <Logo />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني وكلمة المرور للمتابعة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">كلمة المرور</Label>
                     <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => toast({ title: 'ميزة غير متاحة', description: 'لاستعادة كلمة المرور، يرجى التواصل مع الدعم الفني.' })}
                    >
                        نسيت كلمة المرور؟
                    </Button>
                </div>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                    />
                     <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}</span>
                    </button>
                </div>
            </div>
            {error && <p className="text-sm text-center text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="ml-2 h-4 w-4" />
              )}
              تسجيل الدخول
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-center text-sm">
            <p className="text-muted-foreground">
                ليس لديك حساب؟{' '}
                <Link href="/signup" className="underline text-primary hover:text-primary/80">
                    إنشاء حساب جديد
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
