
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, Scale, ChevronLeft, Contact, KeyRound, Hourglass } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useDataState } from '@/contexts/data-context';
import { Skeleton } from '@/components/ui/skeleton';

const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);


export default function SettingsPage() {
  const { currentUser } = useDataState();
  const router = useRouter();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.accessSettings);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  // This specific permission relies on the actual user role.
  const canManageUsers = role === 'مدير النظام' || role === 'مدير المكتب';

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            الإعدادات الإدارية
          </h1>
          <p className="text-muted-foreground mt-1">
            التحكم في إعدادات النظام الأساسية وإدارة المستخدمين.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <UserCog className="h-8 w-8 text-primary mb-2" />
              <CardTitle>إدارة المستخدمين والأدوار</CardTitle>
              <CardDescription>
                إدارة وتفعيل المستخدمين المرتبطين بحسابك.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild disabled={!canManageUsers}>
                    <Link href="/users">
                        الانتقال إلى إدارة المستخدمين
                        <ChevronLeft className="mr-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Scale className="h-8 w-8 text-primary mb-2" />
              <CardTitle>إعدادات السياسات</CardTitle>
              <CardDescription>
                تحديد سياسات القروض المتعثرة، ومدة الفترة التجريبية للحسابات الجديدة.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <Button asChild>
                    <Link href="/settings/policies">
                        تعديل السياسات
                        <ChevronLeft className="mr-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
          </Card>

          {role === 'مدير النظام' && (
             <>
                <Card>
                    <CardHeader>
                    <KeyRound className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>بيانات دخول المستخدمين</CardTitle>
                    <CardDescription>
                        عرض وتعديل بيانات الدخول لجميع المستخدمين في النظام.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/credentials">
                                إدارة بيانات الدخول
                                <ChevronLeft className="mr-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                    <Contact className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>بيانات اتصال العملاء</CardTitle>
                    <CardDescription>
                        عرض قائمة بأسماء وأرقام جوالات جميع عملاء القروض.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/settings/contacts">
                                عرض بيانات الاتصال
                                <ChevronLeft className="mr-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                    <Contact className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>إعدادات الدعم الفني</CardTitle>
                    <CardDescription>
                        تحديث معلومات التواصل التي تظهر للمستخدمين في صفحة الدعم.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/settings/support">
                                تعديل معلومات الدعم
                                <ChevronLeft className="mr-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                    <Hourglass className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>إدارة الفترات التجريبية</CardTitle>
                    <CardDescription>
                        التحكم في مدة الفترة التجريبية ومتابعة الحسابات التجريبية وتفعيلها.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/settings/trial-periods">
                                إدارة الفترات التجريبية
                                <ChevronLeft className="mr-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
