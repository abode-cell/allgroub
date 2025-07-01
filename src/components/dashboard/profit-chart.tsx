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
import { useDataState } from '@/contexts/data-context';
import { useMemo } from 'react';

const chartConfig = {
  profit: {
    label: 'الربح',
    color: 'hsl(var(--chart-1))',
  },
};

export function ProfitChart() {
  const { currentUser, borrowers, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage } = useDataState();

  const chartData = useMemo(() => {
    if (!currentUser || currentUser.role !== 'مستثمر') return [];
    
    const monthlyProfits: { [key: string]: number } = {};

    const myFundedLoans = borrowers.filter(b => 
      b.fundedBy?.some(f => f.investorId === currentUser.id) &&
      (b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل')
    );

    myFundedLoans.forEach(loan => {
      const date = new Date(loan.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const fundingDetails = loan.fundedBy?.find(f => f.investorId === currentUser.id);
      if (!fundingDetails) return;
      
      let profit = 0;
      let loanTotalInvestorProfit = 0;

      if (loan.loanType === 'اقساط' && loan.rate && loan.term) {
        const totalInterest = loan.amount * (loan.rate / 100) * loan.term;
        loanTotalInvestorProfit = totalInterest * (investorSharePercentage / 100);
      } else if (loan.loanType === 'مهلة') {
        const totalProfit = loan.amount * (graceTotalProfitPercentage / 100);
        loanTotalInvestorProfit = totalProfit * (graceInvestorSharePercentage / 100);
      }
      
      if (loanTotalInvestorProfit > 0) {
        const investorShareOfLoan = fundingDetails.amount / loan.amount;
        profit = loanTotalInvestorProfit * investorShareOfLoan;
      }
      
      if (profit > 0) {
        monthlyProfits[monthKey] = (monthlyProfits[monthKey] || 0) + profit;
      }
    });

    const sortedMonths = Object.keys(monthlyProfits).sort();
    const lastSixMonths = sortedMonths.slice(-6);

    return lastSixMonths.map(monthKey => ({
      month: monthKey,
      profit: monthlyProfits[monthKey],
    }));

  }, [currentUser, borrowers, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>أرباحك الشهرية</CardTitle>
        <CardDescription>
          الأرباح الشهرية المتوقعة من استثماراتك النشطة.
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
          عرض تفصيلي لأرباحك الشهرية المتوقعة.
        </div>
      </CardFooter>
    </Card>
  );
}
