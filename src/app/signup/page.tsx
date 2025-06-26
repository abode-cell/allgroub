'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, MailCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setRequiresConfirmation(false);
    setIsSubmitting(true);

    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signUp({ name, email, password });
      if (result.success) {
        setSuccess(result.message);
        if (result.requiresConfirmation) {
          setRequiresConfirmation(true);
        }
        setName('');
        setEmail('');
        setPassword('');
        if (!result.requiresConfirmation) {
            setTimeout(() => router.push('/login'), 5000);
        }
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء التسجيل.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
          <CardDescription>
            أدخل بياناتك لإنشاء حساب. سيتم تفعيله بواسطة مدير النظام.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>خطأ في التسجيل</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant='default' className='bg-primary/10 border-primary/20 text-primary'>
                {requiresConfirmation && <MailCheck className="h-4 w-4" />}
                <div>
                  <AlertTitle>
                    {requiresConfirmation ? 'الرجاء تأكيد بريدك الإلكتروني' : 'تم التسجيل بنجاح'}
                  </AlertTitle>
                  <AlertDescription>
                    {success}
                  </AlertDescription>
                </div>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                type="text"
                placeholder="مثال: خالد عبدالله"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting || !!success}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || !!success}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting || !!success}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !!success}
            >
              {isSubmitting ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : null}
              إنشاء حساب
            </Button>
            <div className="mt-4 text-center text-sm">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="underline">
                تسجيل الدخول
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
