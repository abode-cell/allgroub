'use client';

import { TrendingUp } from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartData = [
  { month: 'يناير', profit: 18600 },
  { month: 'فبراير', profit: 30500 },
  { month: 'مارس', profit: 23700 },
  { month: 'أبريل', profit: 7300 },
  { month: 'مايو', profit: 20900 },
  { month: 'يونيو', profit: 21400 },
];

const chartConfig = {
  profit: {
    label: 'الربح',
    color: 'hsl(var(--chart-1))',
  },
};

export function ProfitChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الأرباح الشهرية</CardTitle>
        <CardDescription>
          الربح الصافي على مدى الأشهر الستة الماضية.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
            dir="rtl"
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
             <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value / 1000} ألف`}
              />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Line
              dataKey="profit"
              type="natural"
              stroke="var(--color-profit)"
              strokeWidth={2}
              dot={true}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          تظهر زيادة بنسبة ١٥٪ هذا الشهر <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          عرض تفصيلي للأرباح الشهرية
        </div>
      </CardFooter>
    </Card>
  );
}
