'use client';

import { useAuth } from '@/contexts/auth-context';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, Scale, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const { role } = useAuth();
  const router = useRouter();

  const canViewPage = role === 'مدير النظام' || role === 'مدير المكتب';

  useEffect(() => {
    // Redirect if role is loaded and user doesn't have permission
    if (role && !canViewPage) {
      router.replace('/');
    }
  }, [role, canViewPage, router]);

  // If the role is not yet loaded, or they don't have permission, don't render the page content
  if (!canViewPage) {
    return null;
  }

  // This specific permission relies on the actual user role.
  const canManageUsers = role === 'مدير النظام';

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

        <div className="grid gap-6 md:grid-cols-2">
          <Card className={!canManageUsers ? 'bg-muted/50' : ''}>
            <CardHeader>
              <UserCog className="h-8 w-8 text-primary mb-2" />
              <CardTitle>إدارة المستخدمين والأدوار</CardTitle>
              <CardDescription>
                إضافة وتفعيل المستخدمين. هذه الميزة متاحة لمدير النظام فقط.
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
              <CardTitle>إعدادات سياسات التعثر</CardTitle>
              <CardDescription>
                تحديد سياسات التعامل مع القروض المتعثرة، نسب الخصم، والمدد
                الزمنية.
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
        </div>
      </main>
    </div>
  );
}
