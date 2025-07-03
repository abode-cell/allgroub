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
        <header>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
        </header>
        <div className='grid gap-8 grid-cols-1 max-w-2xl mx-auto'>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    </div>
);


export default function PoliciesPage() {
  const { currentUser } = useDataState();
  const router = useRouter();
  const { toast } = useToast();
  
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

  const handleSaveChanges = () => {
    // In a real app, you would save these values.
    // Here, we just show a toast.
    toast({
      title: 'تم الحفظ',
      description: 'تم حفظ إعدادات السياسة (تجريبيًا).',
    });
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
        
        <div className='grid gap-8 grid-cols-1 max-w-2xl mx-auto'>
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
        </div>
      </main>
    </div>
  );
}
