'use client';

import { CircleDollarSign, TrendingUp, ShieldX, Wallet } from 'lucide-react';
import { KpiCard } from './kpi-card';
import { ProfitChart } from './profit-chart';
import { investorsData } from '@/app/investors/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);


export function InvestorDashboard() {
  // Simulate fetching data for the logged-in investor
  const investor = investorsData.find(i => i.id === 'inv_003');

  if (!investor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>لم يتم العثور على بيانات المستثمر.</p>
      </div>
    );
  }

  const totalInvestment = investor.amount;
  const dueProfits = totalInvestment * 0.12; // Simulated
  const idleFunds = totalInvestment * 0.15; // Simulated

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            لوحة التحكم الخاصة بك، {investor.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            نظرة عامة على أداء استثماراتك.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="إجمالي الاستثمار"
            value={formatCurrency(totalInvestment)}
            change="+2.5٪"
            icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
            changeColor="text-green-500"
          />
          <KpiCard
            title="الأرباح المستحقة"
            value={formatCurrency(dueProfits)}
            change="+5٪"
            icon={<TrendingUp className="size-6 text-muted-foreground" />}
            changeColor="text-green-500"
          />
          <KpiCard
            title="الأموال الخاملة"
            value={formatCurrency(idleFunds)}
            change=""
            icon={<Wallet className="size-6 text-muted-foreground" />}
          />
          <KpiCard
            title="الأموال المتعثرة"
            value={formatCurrency(investor.defaultedFunds)}
            change=""
            icon={<ShieldX className="size-6 text-muted-foreground" />}
            changeColor="text-red-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader>
                        <CardTitle>سجل عمليات السحب</CardTitle>
                        <CardDescription>قائمة بآخر المبالغ المسحوبة من حسابك.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {investor.withdrawalHistory.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>التاريخ</TableHead>
                                        <TableHead>المبلغ</TableHead>
                                        <TableHead>السبب</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {investor.withdrawalHistory.slice(0, 5).map(w => (
                                        <TableRow key={w.id}>
                                            <TableCell>{w.date}</TableCell>
                                            <TableCell>{formatCurrency(w.amount)}</TableCell>
                                            <TableCell>{w.reason}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className='text-sm text-muted-foreground text-center py-4'>لا توجد عمليات سحب.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="col-span-12 lg:col-span-3">
                 <ProfitChart />
            </div>
        </div>
      </main>
    </div>
  );
}
