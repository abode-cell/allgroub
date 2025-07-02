
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataActions } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';


export default function SignUpPage() {
  const router = useRouter();
  const { registerNewOfficeManager } = useDataActions();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      setError('الرجاء تعبئة جميع الحقول.');
      return;
    }
     if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
      return;
    }
    setError('');
    setIsLoading(true);
    
    const result = await registerNewOfficeManager({ name, email, phone, password });
    
    setIsLoading(false);
    if (result.success) {
        setSuccess(true);
        toast({
            title: 'نجاح!',
            description: result.message,
        });
    } else {
      setError(result.message);
    }
  };

  if(success) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-sm text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">تم استلام طلبك</CardTitle>
                    <CardDescription>
                        تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة من قبل مدير النظام. سيتم إعلامك عند تفعيله.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/login">العودة إلى صفحة تسجيل الدخول</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <Link href="/" className="flex flex-col items-center gap-2 mb-6 text-foreground hover:text-primary transition-colors">
          <div className="flex items-center gap-3">
             <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary h-12 w-12"
            >
                <path
                    d="M12 2L4.5 17.5H19.5L12 2Z"
                    fill="currentColor"
                    fillOpacity="0.1"
                />
                <path
                    d="M12 2L2 22H22L12 2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 11.5L8 19.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 11.5L16 19.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <span className="font-bold text-3xl">مجموعة عال</span>
          </div>
          <p className="text-sm text-muted-foreground tracking-wide">
            إدارة • تمويل • تطوير • وأكثر...
          </p>
        </Link>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">إنشاء حساب مدير مكتب</CardTitle>
          <CardDescription>
            أدخل بياناتك لإنشاء حساب جديد. سيتم مراجعة حسابك قبل التفعيل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" placeholder="اسمك الكامل" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" placeholder="email@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الجوال</Label>
              <Input id="phone" type="tel" placeholder="05xxxxxxxx" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-center text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="ml-2 h-4 w-4" />
              )}
              إنشاء حساب
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-center text-sm">
            <p className="text-muted-foreground">
                لديك حساب بالفعل؟{' '}
                <Link href="/login" className="underline text-primary hover:text-primary/80">
                    تسجيل الدخول
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
