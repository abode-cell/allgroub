'use client';

import { CircleDollarSign, TrendingUp, ShieldX, Wallet, Briefcase } from 'lucide-react';
import { KpiCard } from './kpi-card';
import { ProfitChart } from './profit-chart';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);


export function InvestorDashboard() {
  const { currentUser, investors, borrowers } = useData();

  // Fetch data for the logged-in investor
  const investor = investors.find(i => i.id === currentUser?.id);

  if (!investor) {
    return (
      <div className="flex flex-col flex-1">
        <main className="flex-1 space-y-8 p-4 md:p-8">
            <Card>
                <CardContent className='p-8 text-center text-muted-foreground'>
                   يبدو أنه لا يوجد ملف مستثمر مرتبط بحسابك. يرجى التواصل مع مدير النظام.
                </CardContent>
            </Card>
        </main>
      </div>
    );
  }

  const totalInvestment = investor.transactionHistory
    .filter(tx => tx.type === 'إيداع رأس المال')
    .reduce((acc, tx) => acc + tx.amount, 0);
  const defaultedFunds = investor.defaultedFunds || 0;
  
  const activeInvestment = borrowers
    .filter(b => investor.fundedLoanIds.includes(b.id) && (b.status === 'منتظم' || b.status === 'متأخر'))
    .reduce((total, loan) => {
      const funding = loan.fundedBy?.find(f => f.investorId === investor.id);
      return total + (funding?.amount || 0);
    }, 0);

  const idleFunds = investor.amount; // `amount` is now purely liquid funds
  const dueProfits = 0; // Simulated - consider calculating this from real data

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            صفحتك الرئيسية، {investor.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            نظرة عامة على أداء استثماراتك.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            title="إجمالي الاستثمار"
            value={formatCurrency(totalInvestment)}
            change=""
            icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
          />
          <KpiCard
            title="الأموال المستثمرة"
            value={formatCurrency(activeInvestment)}
            change="النشطة"
            icon={<Briefcase className="size-6 text-muted-foreground" />}
            changeColor="text-green-500"
          />
          <KpiCard
            title="الأموال الخاملة"
            value={formatCurrency(idleFunds)}
            change=""
            icon={<Wallet className="size-6 text-muted-foreground" />}
          />
           <KpiCard
            title="الأرباح المستحقة"
            value={formatCurrency(dueProfits)}
            change=""
            icon={<TrendingUp className="size-6 text-muted-foreground" />}
            changeColor="text-green-500"
          />
          <KpiCard
            title="الأموال المتعثرة"
            value={formatCurrency(defaultedFunds)}
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
                        {investor.transactionHistory.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>التاريخ</TableHead>
                                        <TableHead>المبلغ</TableHead>
                                        <TableHead>السبب</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {investor.transactionHistory
                                        .filter(tx => tx.type.includes('سحب'))
                                        .slice(0, 5).map(w => (
                                        <TableRow key={w.id}>
                                            <TableCell>{w.date}</TableCell>
                                            <TableCell>{formatCurrency(w.amount)}</TableCell>
                                            <TableCell>{w.description}</TableCell>
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
