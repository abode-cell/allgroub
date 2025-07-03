'use client';

import { Pie, PieChart, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { Borrower } from '@/lib/types';

const statusColors: { [key: string]: string } = {
  منتظم: 'hsl(var(--chart-1))',
  متأخر: 'hsl(var(--chart-5))',
  متعثر: 'hsl(var(--destructive))',
  معلق: 'hsl(var(--chart-3))',
  'مسدد بالكامل': 'hsl(var(--chart-2))',
};

const getChartDisplayStatus = (borrower: Borrower): string => {
    if (borrower.status === 'معلق') return 'معلق';
    if (borrower.status === 'مسدد بالكامل' || borrower.paymentStatus === 'تم السداد') return 'مسدد بالكامل';
    if (borrower.status === 'متعثر' || borrower.paymentStatus === 'متعثر' || borrower.paymentStatus === 'تم اتخاذ الاجراءات القانونيه') return 'متعثر';
    if (borrower.paymentStatus === 'متأخر بقسط' || borrower.paymentStatus === 'متأخر بقسطين') return 'متأخر';
    return 'منتظم';
};


export function LoansStatusChart({ borrowers }: { borrowers: Borrower[] }) {
  if (!borrowers || borrowers.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>حالة القروض</CardTitle>
                <CardDescription>توزيع القروض حسب حالة السداد</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-[250px] items-center justify-center">
                    <p className="text-muted-foreground">لا توجد بيانات لعرضها.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  const chartData = Object.entries(
    borrowers.reduce((acc, borrower) => {
      const displayStatus = getChartDisplayStatus(borrower);
      acc[displayStatus] = (acc[displayStatus] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number })
  ).map(([name, value]) => ({ name, value, fill: statusColors[name] || 'hsl(var(--muted))' }));
  
  const chartConfig = chartData.reduce((acc, item) => {
      acc[item.name] = {
          label: item.name,
          color: item.fill,
      };
      return acc;
  }, {} as any);


  return (
    <Card>
      <CardHeader>
        <CardTitle>حالة القروض</CardTitle>
        <CardDescription>توزيع القروض حسب حالة السداد</CardDescription>
      </CardHeader>
      <CardContent className='flex items-center justify-center'>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
                {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-translate-y-[2rem] flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
