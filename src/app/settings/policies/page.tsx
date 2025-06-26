'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export default function PoliciesPage() {
  const { role } = useAuth();
  const router = useRouter();

  const canViewPage = role === 'مدير النظام' || role === 'مدير المكتب';

  useEffect(() => {
    if (!canViewPage) {
      router.replace('/');
    }
  }, [role, canViewPage, router]);

  if (!canViewPage) {
    return null;
  }

  // Placeholder state for policies
  const [daysUntilDefault, setDaysUntilDefault] = useState(90);
  const [lateFeePercentage, setLateFeePercentage] = useState(5);

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            إعدادات سياسات التعثر
          </h1>
          <p className="text-muted-foreground mt-1">
            تحديد القواعد التلقائية للتعامل مع القروض المتأخرة والمتعثرة.
          </p>
        </header>

        <Card className="max-w-2xl mx-auto">
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
             <Button disabled className="w-full">
                <Save className="ml-2 h-4 w-4" />
                حفظ التغييرات (قريبًا)
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
