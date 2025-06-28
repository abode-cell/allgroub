'use client';

import { CircleDollarSign, Landmark, ShieldAlert, ShieldX, TrendingUp, Users, BadgePercent } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ProfitChart } from '@/components/dashboard/profit-chart';
import { LoansStatusChart } from '@/components/dashboard/loans-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { useAuth } from '@/contexts/auth-context';
import { InvestorDashboard } from '@/components/dashboard/investor-dashboard';
import { useData } from '@/contexts/data-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Borrower, Investor } from '@/lib/types';
import { DailySummary } from '@/components/dashboard/daily-summary';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const InstallmentsDashboard = ({ borrowers }: { borrowers: Borrower[] }) => {
  const { role } = useAuth();
  const installmentLoans = borrowers.filter(b => b.loanType === 'اقساط');
  const installmentLoansGranted = installmentLoans.reduce((acc, b) => acc + b.amount, 0);
  const installmentDefaultedLoans = installmentLoans.filter(b => b.status === 'متعثر');
  const installmentDefaultedFunds = installmentDefaultedLoans.reduce((acc, b) => acc + b.amount, 0);
  const installmentDefaultRate = installmentLoansGranted > 0 ? (installmentDefaultedFunds / installmentLoansGranted) * 100 : 0;
  
  const netProfit = 0; // REMOVED mock data, should be calculated from real data
  const dueDebts = installmentLoans
    .filter(b => b.status === 'متأخر')
    .reduce((acc, b) => acc + b.amount, 0); // Calculated from data

  const showSensitiveData = role === 'مدير النظام' || role === 'مدير المكتب';
  const showProfitChart = role === 'مدير النظام' || role === 'مدير المكتب';


  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="القروض الممنوحة (أقساط)"
          value={formatCurrency(installmentLoansGranted)}
          change=""
          icon={<Landmark className="size-6 text-muted-foreground" />}
        />
        {showSensitiveData && (
             <KpiCard
                title="صافي الربح"
                value={formatCurrency(netProfit)}
                change=""
                icon={<TrendingUp className="size-6 text-muted-foreground" />}
            />
        )}
        <KpiCard
          title="الديون المستحقة"
          value={formatCurrency(dueDebts)}
          change=""
          icon={<Users className="size-6 text-muted-foreground" />}
          changeColor="text-red-500"
        />
        <KpiCard
          title="الأموال المتعثرة (أقساط)"
          value={formatCurrency(installmentDefaultedFunds)}
          change=""
          icon={<ShieldX className="size-6 text-muted-foreground" />}
          changeColor="text-red-500"
        />
        <KpiCard
          title="نسبة التعثر (أقساط)"
          value={`${installmentDefaultRate.toFixed(1)}%`}
          change=""
          icon={<ShieldAlert className="size-6 text-muted-foreground" />}
          changeColor="text-red-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        {showProfitChart && (
          <div className="col-span-12 lg:col-span-4">
            <ProfitChart />
          </div>
        )}
        <div className={cn("col-span-12", showProfitChart ? "lg:col-span-3" : "lg:col-span-7")}>
          <LoansStatusChart borrowers={installmentLoans} />
        </div>
      </div>

      <div>
        <RecentTransactions />
      </div>
    </div>
  );
};


const GracePeriodDashboard = ({ borrowers, investors }: { borrowers: Borrower[], investors: Investor[] }) => {
    const { role } = useAuth();
    const { graceTotalProfitPercentage, graceInvestorSharePercentage } = useData();

    const gracePeriodLoans = borrowers.filter(b => b.loanType === 'مهلة');
    const activeGraceLoans = gracePeriodLoans.filter(b => b.status === 'منتظم' || b.status === 'متأخر');

    const gracePeriodLoansGranted = gracePeriodLoans.reduce((acc, b) => acc + b.amount, 0);
    const gracePeriodDefaultedFunds = gracePeriodLoans.filter(b => b.status === 'متعثر').reduce((acc, b) => acc + b.amount, 0);
    const gracePeriodDefaultRate = gracePeriodLoansGranted > 0 ? (gracePeriodDefaultedFunds / gracePeriodLoansGranted) * 100 : 0;
    const gracePeriodProfit = activeGraceLoans.reduce((acc, b) => acc + b.amount, 0) * (graceTotalProfitPercentage / 100);
    const totalDiscounts = gracePeriodLoans.reduce((acc, b) => acc + (b.discount || 0), 0);
    const dueDebts = gracePeriodLoans.filter(b => b.status === 'متأخر').reduce((acc, b) => acc + b.amount, 0);
    
    const showSensitiveData = role === 'مدير النظام' || role === 'مدير المكتب';

    let totalInstitutionProfit = 0;
    const investorProfits: { [investorId: string]: { name: string, profit: number } } = {};

    activeGraceLoans.forEach(loan => {
        if (loan.status === 'منتظم' || loan.status === 'متأخر') {
            const loanTotalProfit = loan.amount * (graceTotalProfitPercentage / 100);
            const loanInvestorShareAmount = loanTotalProfit * (graceInvestorSharePercentage / 100);
            const loanInstitutionShareAmount = loanTotalProfit - loanInvestorShareAmount;

            totalInstitutionProfit += loanInstitutionShareAmount;

            if (loan.fundedBy && loan.fundedBy.length > 0) {
                loan.fundedBy.forEach(funder => {
                    const funderShareRatio = funder.amount / loan.amount;
                    const funderProfit = loanInvestorShareAmount * funderShareRatio;

                    if (!investorProfits[funder.investorId]) {
                        const investorDetails = investors.find(i => i.id === funder.investorId);
                        investorProfits[funder.investorId] = {
                            name: investorDetails ? investorDetails.name : 'مستثمر غير معروف',
                            profit: 0
                        };
                    }
                    investorProfits[funder.investorId].profit += funderProfit;
                });
            }
        }
    });

    const investorProfitsArray = Object.values(investorProfits);
    const netProfit = totalInstitutionProfit + investorProfitsArray.reduce((acc, inv) => acc + inv.profit, 0);


    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <KpiCard
                    title="التمويل الممنوح (مهلة)"
                    value={formatCurrency(gracePeriodLoansGranted)}
                    change=""
                    icon={<Landmark className="size-6 text-muted-foreground" />}
                />
                 {showSensitiveData && (
                    <KpiCard
                        title="صافي الأرباح"
                        value={formatCurrency(netProfit)}
                        change={`${graceTotalProfitPercentage.toFixed(1)}% من الأصل`}
                        icon={<TrendingUp className="size-6 text-muted-foreground" />}
                        changeColor='text-green-500'
                    />
                 )}
                 <KpiCard
                    title="الديون المستحقة"
                    value={formatCurrency(dueDebts)}
                    change=""
                    icon={<Users className="size-6 text-muted-foreground" />}
                    changeColor="text-red-500"
                 />
                 <KpiCard
                    title="إجمالي الخصومات"
                    value={formatCurrency(totalDiscounts)}
                    change="على قروض المهلة"
                    icon={<BadgePercent className="size-6 text-muted-foreground" />}
                    changeColor="text-blue-500"
                 />
                 <KpiCard
                    title="الأموال المتعثرة (مهلة)"
                    value={formatCurrency(gracePeriodDefaultedFunds)}
                    change={`${gracePeriodDefaultRate.toFixed(1)}% نسبة التعثر`}
                    icon={<ShieldX className="size-6 text-muted-foreground" />}
                    changeColor="text-red-500"
                />
            </div>
            
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
              {showSensitiveData && (
                 <div className="col-span-12 lg:col-span-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>تفاصيل صافي الأرباح (المهلة)</CardTitle>
                            <CardDescription>توزيع الأرباح المتوقعة من القروض النشطة.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الجهة</TableHead>
                                        <TableHead className="text-left">الأرباح</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">ربح المؤسسة</TableCell>
                                        <TableCell className="text-left font-semibold">{formatCurrency(totalInstitutionProfit)}</TableCell>
                                    </TableRow>
                                    {investorProfitsArray.map(inv => (
                                        <TableRow key={inv.name}>
                                            <TableCell>{inv.name}</TableCell>
                                            <TableCell className="text-left">{formatCurrency(inv.profit)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
              )}
              <div className={cn("col-span-12", showSensitiveData ? "lg:col-span-3" : "lg:col-span-7")}>
                <LoansStatusChart borrowers={gracePeriodLoans} />
              </div>
            </div>

            <div>
              <RecentTransactions />
            </div>
        </div>
    );
};

export default function DashboardPage() {
  const { role } = useAuth();
  const { borrowers, investors } = useData();

  if (role === 'مستثمر') {
    return <InvestorDashboard />;
  }

  const totalCapital = investors.reduce((acc, inv) => acc + inv.amount + (inv.defaultedFunds || 0), 0);
  const showSensitiveData = role === 'مدير النظام' || role === 'مدير المكتب';
  
  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              الرئيسية
            </h1>
            <p className="text-muted-foreground mt-1">
              نظرة عامة على أداء منصتك المالية.
            </p>
          </div>
          {showSensitiveData && (
            <div className="min-w-[250px]">
                <KpiCard
                    title="إجمالي رأس المال"
                    value={formatCurrency(totalCapital)}
                    change=""
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
            </div>
          )}
        </header>

        {showSensitiveData && <DailySummary />}

        <Tabs defaultValue="installments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="installments">قروض الأقساط</TabsTrigger>
                <TabsTrigger value="grace-period">قروض المهلة</TabsTrigger>
            </TabsList>
            <TabsContent value="installments" className="mt-6">
                <InstallmentsDashboard borrowers={borrowers} />
            </TabsContent>
            <TabsContent value="grace-period" className="mt-6">
                <GracePeriodDashboard borrowers={borrowers} investors={investors} />
            </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
