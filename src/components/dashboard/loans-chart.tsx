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
import { useData } from '@/contexts/data-context';

const statusColors: { [key: string]: string } = {
  منتظم: 'hsl(var(--chart-1))',
  متأخر: 'hsl(var(--chart-5))',
  متعثر: 'hsl(var(--destructive))',
  معلق: 'hsl(var(--chart-3))',
  'مسدد بالكامل': 'hsl(var(--chart-2))',
};

const statusTranslations: { [key: string]: string } = {
    'منتظم': 'Regular',
    'متأخر': 'Late',
    'متعثر': 'Defaulted',
    'معلق': 'Suspended',
    'مسدد بالكامل': 'Paid Off'
}


export function LoansStatusChart() {
  const { borrowers } = useData();

  const chartData = Object.entries(
    borrowers.reduce((acc, borrower) => {
      acc[borrower.status] = (acc[borrower.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number })
  ).map(([name, value]) => ({ name, value, fill: statusColors[name] }));
  
  const chartConfig = chartData.reduce((acc, item) => {
      acc[statusTranslations[item.name]] = {
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
