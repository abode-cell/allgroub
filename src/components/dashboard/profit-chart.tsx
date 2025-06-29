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
import { useData } from '@/contexts/data-context';
import { useMemo } from 'react';

const chartConfig = {
  profit: {
    label: 'الربح',
    color: 'hsl(var(--chart-1))',
  },
};

export function ProfitChart() {
  const { borrowers, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage } = useData();

  const chartData = useMemo(() => {
    const monthlyProfits: { [key: string]: number } = {};

    const profitableLoans = borrowers.filter(
      b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل'
    );

    profitableLoans.forEach(loan => {
      // For simplicity, we'll assume the profit is realized at the loan start date.
      // A more complex model would distribute it over the loan term.
      const date = new Date(loan.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      let profit = 0;
      if (loan.loanType === 'اقساط' && loan.rate && loan.term) {
        const totalInterest = loan.amount * (loan.rate / 100) * loan.term;
        profit = totalInterest * ((100 - investorSharePercentage) / 100);
      } else if (loan.loanType === 'مهلة') {
        const totalProfit = loan.amount * (graceTotalProfitPercentage / 100);
        profit = totalProfit * ((100 - graceInvestorSharePercentage) / 100);
      }
      
      if (profit > 0) {
        monthlyProfits[monthKey] = (monthlyProfits[monthKey] || 0) + profit;
      }
    });

    const sortedMonths = Object.keys(monthlyProfits).sort();
    // Get last 6 months of data
    const lastSixMonths = sortedMonths.slice(-6);

    return lastSixMonths.map(monthKey => ({
      month: monthKey,
      profit: monthlyProfits[monthKey],
    }));

  }, [borrowers, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>أرباح المؤسسة الشهرية</CardTitle>
        <CardDescription>
          أرباح المؤسسة الصافية على مدى الأشهر القليلة الماضية.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
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
                tickFormatter={(value) => value.slice(5)} // Show only month part
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
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
        ) : (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            لا توجد بيانات أرباح لعرضها حاليًا.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          يتم تحديث البيانات بشكل دوري.
        </div>
        <div className="leading-none text-muted-foreground">
          عرض تفصيلي لأرباح المؤسسة الشهرية
        </div>
      </CardFooter>
    </Card>
  );
}
