'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/data-context';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { users, supportEmail, supportPhone } = useData();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('الرجاء إدخال البريد الإلكتروني/رقم الجوال وكلمة المرور.');
      return;
    }
    setError('');
    setIsLoading(true);
    const result = await signIn({ identifier, password }, users, { email: supportEmail, phone: supportPhone });
    if (result.success) {
      router.replace('/');
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex items-center gap-3">
            <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
            >
                <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M12 11L7 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M12 11L17 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M8.5 18H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span className="font-bold text-3xl">مجموعة عال</span>
          </div>
          <p className="text-sm text-muted-foreground">
            إدارة, تمويل, تطوير ,وأكثر...
          </p>
        </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني أو رقم جوالك للمتابعة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">البريد الإلكتروني أو رقم الجوال</Label>
              <Input
                id="identifier"
                placeholder="email@example.com أو 05xxxxxxxx"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">كلمة المرور</Label>
                     <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => toast({ title: 'ميزة غير متاحة', description: 'ميزة استعادة كلمة المرور غير متاحة في الوضع التجريبي.' })}
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
