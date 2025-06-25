'use client';

import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
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
} from '@/components/ui/chart';

const chartData = [
  { type: 'شخصي', amount: 275000 },
  { type: 'عقاري', amount: 350000 },
  { type: 'تجاري', amount: 150000 },
  { type: 'سيارات', amount: 75000 },
];

const chartConfig = {
  amount: {
    label: 'المبلغ',
    color: 'hsl(var(--chart-2))',
  },
};

export function LoansChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>توزيع القروض</CardTitle>
        <CardDescription>حسب نوع القرض</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ right: 10 }}
            dir="rtl"
          >
            <XAxis
              type="number"
              hide
              tickFormatter={(value) => `${value / 1000} ألف`}
            />
            <YAxis
              dataKey="type"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={60}
            />
            <Tooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
