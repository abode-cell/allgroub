'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";


const profileSchema = z.object({
  name: z.string().min(3, { message: 'يجب أن يكون الاسم 3 أحرف على الأقل.' }),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(6, { message: 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين.',
  path: ['confirmPassword'],
});


export default function ProfilePage() {
  const { user, updateUserIdentity } = useAuth();
  const { toast } = useToast();
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user, profileForm]);

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    setIsProfileSubmitting(true);
    const result = await updateUserIdentity({ name: values.name, phone: values.phone });
    if (result.success) {
      toast({ title: 'نجاح', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.message });
    }
    setIsProfileSubmitting(false);
  };
  
  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsPasswordSubmitting(true);
    const result = await updateUserIdentity({ password: values.password });
    if (result.success) {
      toast({ title: 'نجاح', description: result.message });
      passwordForm.reset();
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.message });
    }
    setIsPasswordSubmitting(false);
  };

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">الملف الشخصي والإعدادات</h1>
          <p className="text-muted-foreground mt-1">
            إدارة معلومات حسابك الشخصي وتفضيلات الأمان.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>المعلومات الشخصية</CardTitle>
                    <CardDescription>تحديث اسمك ورقم هاتفك.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                            <FormField
                                control={profileForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>الاسم الكامل</FormLabel>
                                        <FormControl>
                                            <Input placeholder="اسمك الكامل" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>رقم الجوال (اختياري)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="05xxxxxxxx" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isProfileSubmitting}>
                                {isProfileSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                حفظ التغييرات
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card>
                <CardHeader>
                    <CardTitle>تغيير كلمة المرور</CardTitle>
                    <CardDescription>اختر كلمة مرور قوية وآمنة.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                             <FormField
                                control={passwordForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>كلمة المرور الجديدة</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>تأكيد كلمة المرور الجديدة</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <Button type="submit" disabled={isPasswordSubmitting}>
                                {isPasswordSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                تحديث كلمة المرور
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

             {/* Change Email Card */}
             <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>تغيير البريد الإلكتروني</CardTitle>
                    <CardDescription>
                       البريد الإلكتروني الحالي الخاص بك هو <span className="font-semibold text-primary">{user.email}</span>. لتغييره، سيتم إرسال رابط تأكيد إلى كل من عنوانك القديم والجديد.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button disabled>تغيير البريد الإلكتروني (قريبًا)</Button>
                </CardContent>
             </Card>
        </div>
      </main>
    </div>
  );
}
