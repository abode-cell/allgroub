'use client';

import { useDataState, useDataActions } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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


export default function PoliciesPage() {
  const { currentUser, users } = useDataState();
  const { updateTrialPeriod } = useDataActions();
  const router = useRouter();
  const { toast } = useToast();
  
  const systemAdmin = users.find(u => u.role === 'مدير النظام');
  const role = currentUser?.role;
  const canViewPage = role === 'مدير النظام' || role === 'مدير المكتب';

  useEffect(() => {
    if (currentUser && !canViewPage) {
      router.replace('/');
    }
  }, [currentUser, canViewPage, router]);

  // Placeholder state for policies
  const [daysUntilDefault, setDaysUntilDefault] = useState(90);
  const [lateFeePercentage, setLateFeePercentage] = useState(5);
  const [trialDays, setTrialDays] = useState(systemAdmin?.defaultTrialPeriodDays ?? 14);


  useEffect(() => {
    if (systemAdmin) {
      setTrialDays(systemAdmin.defaultTrialPeriodDays ?? 14);
    }
  }, [systemAdmin]);


  const handleSaveChanges = () => {
    // In a real app, you would save these values.
    // Here, we just show a toast.
    toast({
      title: 'تم الحفظ',
      description: 'تم حفظ إعدادات السياسة (تجريبيًا).',
    });
  };

  const handleSaveTrialChanges = () => {
    updateTrialPeriod(trialDays);
  };

  if (!currentUser || !canViewPage) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            إعدادات السياسات
          </h1>
          <p className="text-muted-foreground mt-1">
            تحديد القواعد التلقائية للتعامل مع القروض والفترات التجريبية.
          </p>
        </header>
        
        <div className='grid gap-8 md:grid-cols-2'>
            <Card>
            <CardHeader>
                <CardTitle>قواعد التعثر والرسوم</CardTitle>
                <CardDescription>
                سيتم تطبيق هذه الإعدادات على جميع القروض من نوع "أقساط".
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                <div className="space-y-2">
                <Label htmlFor="daysUntilDefault">أيام السماح بعد تاريخ الاستحقاق</Label>
                <Input
                    id="daysUntilDefault"
                    type="number"
                    value={daysUntilDefault}
                    onChange={(e) => setDaysUntilDefault(Number(e.target.value))}
                    placeholder="مثال: 90"
                />
                <p className="text-sm text-muted-foreground">
                    عدد الأيام قبل اعتبار القرض "متعثرًا" رسميًا.
                </p>
                </div>
                <div className="space-y-4">
                <Label htmlFor="lateFeePercentage">
                    رسوم التأخير (كنسبة مئوية من القسط): {lateFeePercentage}%
                </Label>
                <Slider
                    id="lateFeePercentage"
                    min={0}
                    max={20}
                    step={0.5}
                    value={[lateFeePercentage]}
                    onValueChange={(value) => setLateFeePercentage(value[0])}
                />
                <p className="text-sm text-muted-foreground">
                    النسبة التي تضاف كرسوم عند تأخر سداد القسط.
                </p>
                </div>
                <Button className="w-full" onClick={handleSaveChanges}>
                    <Save className="ml-2 h-4 w-4" />
                    حفظ التغييرات (تجريبي)
                </Button>
            </CardContent>
            </Card>
            
            {role === 'مدير النظام' && (
                <Card>
                    <CardHeader>
                        <CardTitle>إعدادات الفترة التجريبية</CardTitle>
                        <CardDescription>
                        تحديد المدة بالأيام للفترة التجريبية لحسابات مدراء المكاتب الجديدة.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="trialDays">مدة الفترة التجريبية (أيام)</Label>
                            <Input
                            id="trialDays"
                            type="number"
                            value={trialDays}
                            onChange={(e) => setTrialDays(Number(e.target.value))}
                            placeholder="مثال: 14"
                            />
                             <p className="text-sm text-muted-foreground">
                                سيتم تعليق الحسابات الجديدة تلقائيًا بعد انتهاء هذه المدة.
                            </p>
                        </div>
                        <Button className="w-full" onClick={handleSaveTrialChanges} disabled={trialDays === (systemAdmin?.defaultTrialPeriodDays ?? 14)}>
                            <Save className="ml-2 h-4 w-4" />
                            حفظ مدة التجربة
                        </Button>
                    </CardContent>
                </Card>
            )}

        </div>
      </main>
    </div>
  );
}
