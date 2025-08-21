
'use client';

import { useState, useEffect } from 'react';
import { useDataActions } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';


export default function SignUpPage() {
  const { registerNewOfficeManager } = useDataActions();
  const { toast } = useToast();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    setPasswordChecks({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[\W_]/.test(password), // Matches any non-word character
    });
  }, [password]);


  const validatePassword = (): boolean => {
    return Object.values(passwordChecks).every(Boolean);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !phone || !password || !officeName || !confirmPassword) {
      setError('الرجاء تعبئة جميع الحقول الإلزامية.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    if (!validatePassword()) {
      setError('كلمة المرور لا تفي بالمتطلبات الأمنية.');
      return;
    }

    setIsLoading(true);
    
    const result = await registerNewOfficeManager({ email, password, phone, name, officeName });
    
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
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">تم استلام طلبك بنجاح</CardTitle>
                    <CardDescription className='text-base/relaxed pt-2'>
                        تم إنشاء حسابك وهو الآن قيد المراجعة.
                        <br />
                        <strong className="text-primary mt-2 block">الرجاء تأكيد بريدك الإلكتروني من خلال الرابط الذي أرسلناه إليك للمتابعة.</strong>
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
       <div className="mb-6">
        <Logo />
       </div>
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
              <Label htmlFor="officeName">اسم المكتب</Label>
              <Input id="officeName" placeholder="اسم المكتب التجاري" required value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل للمدير</Label>
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
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                    />
                     <button
                        type="button"
                        className="absolute inset-y-0 left-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}</span>
                    </button>
                </div>
                 <div className="text-xs text-muted-foreground mt-2 px-1 space-y-1">
                    <p className={cn("flex items-center gap-2", passwordChecks.length ? "text-green-600" : "text-muted-foreground")}>
                        {passwordChecks.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>8 أحرف على الأقل</span>
                    </p>
                    <p className={cn("flex items-center gap-2", passwordChecks.uppercase ? "text-green-600" : "text-muted-foreground")}>
                        {passwordChecks.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>حرف كبير واحد على الأقل (A-Z)</span>
                    </p>
                    <p className={cn("flex items-center gap-2", passwordChecks.lowercase ? "text-green-600" : "text-muted-foreground")}>
                        {passwordChecks.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>حرف صغير واحد على الأقل (a-z)</span>
                    </p>
                    <p className={cn("flex items-center gap-2", passwordChecks.number ? "text-green-600" : "text-muted-foreground")}>
                        {passwordChecks.number ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>رقم واحد على الأقل (0-9)</span>
                    </p>
                    <p className={cn("flex items-center gap-2", passwordChecks.special ? "text-green-600" : "text-muted-foreground")}>
                        {passwordChecks.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>رمز خاص واحد على الأقل (!@#$...)</span>
                    </p>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                    <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                    />
                    <button
                        type="button"
                        className="absolute inset-y-0 left-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}</span>
                    </button>
                </div>
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