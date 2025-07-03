'use client';

import { useDataState, useDataActions } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, isPast } from 'date-fns';

const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <header>
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-4 w-96 mt-2" />
        </header>
        <div className='grid gap-8'>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4 pt-6 max-w-sm">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        </div>
    </div>
);

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } =
  {
    نشط: 'default',
    معلق: 'secondary',
  };

export default function TrialPeriodsPage() {
  const { currentUser, users } = useDataState();
  const { updateTrialPeriod, updateUserStatus } = useDataActions();
  const router = useRouter();
  
  const systemAdmin = useMemo(() => users.find(u => u.role === 'مدير النظام'), [users]);
  const role = currentUser?.role;
  const canViewPage = role === 'مدير النظام';

  useEffect(() => {
    if (currentUser && !canViewPage) {
      router.replace('/');
    }
  }, [currentUser, canViewPage, router]);

  const [trialDays, setTrialDays] = useState(systemAdmin?.defaultTrialPeriodDays ?? 14);

  useEffect(() => {
    if (systemAdmin) {
      setTrialDays(systemAdmin.defaultTrialPeriodDays ?? 14);
    }
  }, [systemAdmin]);

  const handleSaveTrialChanges = () => {
    updateTrialPeriod(trialDays);
  };
  
  const officeManagersOnTrial = useMemo(() => {
      return users
          .filter(u => u.role === 'مدير المكتب' && u.trialEndsAt)
          .map(user => {
              const trialEndDate = new Date(user.trialEndsAt!);
              const daysRemaining = differenceInDays(trialEndDate, new Date());
              const hasExpired = isPast(trialEndDate);
              return { ...user, daysRemaining, hasExpired };
          })
          .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [users]);


  if (!currentUser || !canViewPage) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            إدارة الفترات التجريبية
          </h1>
          <p className="text-muted-foreground mt-1">
            التحكم في مدة الفترة التجريبية ومتابعة الحسابات التجريبية وتفعيلها.
          </p>
        </header>
        
        <div className='grid gap-8'>
            <Card>
                <CardHeader>
                    <CardTitle>إعدادات الفترة التجريبية</CardTitle>
                    <CardDescription>
                    تحديد المدة بالأيام للفترة التجريبية لحسابات مدراء المكاتب الجديدة.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6 max-w-sm">
                    <div className="space-y-2">
                        <Label htmlFor="trialDays">مدة الفترة التجريبية (أيام)</Label>
                        <Input
                        id="trialDays"
                        type="number"
                        value={trialDays}
                        onChange={(e) => setTrialDays(Number(e.target.value))}
                        placeholder="مثال: 14"
                        />
                         <p className="text-xs text-muted-foreground">
                            سيتم تعليق الحسابات الجديدة تلقائيًا بعد انتهاء هذه المدة.
                        </p>
                    </div>
                    <Button className="w-full" onClick={handleSaveTrialChanges} disabled={trialDays === (systemAdmin?.defaultTrialPeriodDays ?? 14)}>
                        <Save className="ml-2 h-4 w-4" />
                        حفظ مدة التجربة
                    </Button>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>متابعة الحسابات التجريبية</CardTitle>
                    <CardDescription>
                       قائمة بجميع حسابات مدراء المكاتب التي لا تزال في الفترة التجريبية أو انتهت فترتها.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>اسم مدير المكتب</TableHead>
                              <TableHead>البريد الإلكتروني</TableHead>
                              <TableHead className="text-center">الحالة</TableHead>
                              <TableHead className="text-center">الأيام المتبقية</TableHead>
                              <TableHead className="text-left">الإجراء</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {officeManagersOnTrial.length > 0 ? (
                              officeManagersOnTrial.map(user => (
                                  <TableRow key={user.id}>
                                      <TableCell className="font-medium">{user.name}</TableCell>
                                      <TableCell>{user.email}</TableCell>
                                      <TableCell className="text-center">
                                         <Badge variant={statusVariant[user.status]}>{user.status}</Badge>
                                      </TableCell>
                                      <TableCell className="text-center">
                                          {user.hasExpired ? (
                                              <span className="text-destructive font-medium">منتهية</span>
                                          ) : (
                                              <span className="font-medium">{user.daysRemaining + 1} يوم</span>
                                          )}
                                      </TableCell>
                                      <TableCell className="text-left">
                                        <Button size="sm" onClick={() => updateUserStatus(user.id, 'نشط')}>
                                            <CheckCircle className="ml-2 h-4 w-4" />
                                            تفعيل الحساب
                                        </Button>
                                      </TableCell>
                                  </TableRow>
                              ))
                          ) : (
                              <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center">
                                      لا توجد حسابات في الفترة التجريبية حالياً.
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
