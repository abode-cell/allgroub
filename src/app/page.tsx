
'use client';

import { CircleDollarSign, Landmark, ShieldAlert, ShieldX, TrendingUp, Users, BadgePercent, Wallet, UserCheck, UserCog, CheckCircle } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ProfitChart } from '@/components/dashboard/profit-chart';
import { LoansStatusChart } from '@/components/dashboard/loans-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { InvestorDashboard } from '@/components/dashboard/investor-dashboard';
import { useData } from '@/contexts/data-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Borrower, Investor } from '@/lib/types';
import { DailySummary } from '@/components/dashboard/daily-summary';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const InstallmentsDashboard = ({ borrowers }: { borrowers: Borrower[] }) => {
  const { currentUser, investorSharePercentage } = useData();
  const role = currentUser?.role;

  const {
    installmentLoans,
    installmentLoansGranted,
    installmentDefaultedFunds,
    installmentDefaultRate,
    netProfit,
    totalInstitutionProfit,
    totalInvestorsProfit,
    dueDebts,
    profitableInstallmentLoans,
  } = useMemo(() => {
    const installmentLoans = borrowers.filter(b => b.loanType === 'اقساط');
    const installmentLoansGranted = installmentLoans.reduce((acc, b) => acc + b.amount, 0);
    const installmentDefaultedLoans = installmentLoans.filter(b => b.status === 'متعثر');
    const installmentDefaultedFunds = installmentDefaultedLoans.reduce((acc, b) => acc + b.amount, 0);
    const installmentDefaultRate = installmentLoansGranted > 0 ? (installmentDefaultedFunds / installmentLoansGranted) * 100 : 0;
    
    const profitableInstallmentLoans = installmentLoans.filter(
      b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل'
    );
    
    const netProfit = profitableInstallmentLoans.reduce((acc, loan) => {
      if (!loan.rate || !loan.term) return acc;
      return acc + (loan.amount * (loan.rate / 100) * loan.term);
    }, 0);

    const totalInstitutionProfit = netProfit * ((100 - investorSharePercentage) / 100);
    const totalInvestorsProfit = netProfit * (investorSharePercentage / 100);

    const dueDebts = installmentLoans
      .filter(b => b.status === 'متأخر')
      .reduce((acc, b) => acc + b.amount, 0); 

    return {
      installmentLoans,
      installmentLoansGranted,
      installmentDefaultedFunds,
      installmentDefaultRate,
      netProfit,
      totalInstitutionProfit,
      totalInvestorsProfit,
      dueDebts,
      profitableInstallmentLoans,
    };
  }, [borrowers, investorSharePercentage]);

  const showSensitiveData = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports);


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
        {showSensitiveData && (
          <div className="col-span-12 lg:col-span-4">
            <Card>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline">
                            <div className="flex w-full items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <TrendingUp className="h-8 w-8 text-primary" />
                                    <div className="text-right">
                                        <h3 className="text-lg font-semibold">إجمالي صافي الأرباح (أقساط)</h3>
                                        <p className="text-2xl font-bold">{formatCurrency(netProfit)}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">انقر لعرض التفاصيل</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-0">
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
                                    <TableRow>
                                        <TableCell className="font-medium">ربح المستثمرين</TableCell>
                                        <TableCell className="text-left font-semibold">{formatCurrency(totalInvestorsProfit)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>
          </div>
        )}
        <div className={cn("col-span-12", showSensitiveData ? "lg:col-span-3" : "lg:col-span-7")}>
          <LoansStatusChart borrowers={installmentLoans} />
        </div>
      </div>

      <div>
        <RecentTransactions />
      </div>

      {showSensitiveData && (
        <Card>
            <CardHeader>
                <CardTitle>تفصيل أرباح المؤسسة (الأقساط)</CardTitle>
                <CardDescription>عرض تفصيلي لربح المؤسسة من كل قرض أقساط.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {profitableInstallmentLoans.map(loan => {
                        if (!loan.rate || !loan.term) return null;
                        const totalInterest = (loan.amount * (loan.rate / 100) * loan.term);
                        const institutionProfit = totalInterest * ((100 - investorSharePercentage) / 100);
                        const investorProfit = totalInterest - institutionProfit;

                        return (
                            <AccordionItem value={loan.id} key={loan.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between w-full pr-4 items-center">
                                        <span className="font-medium">{loan.name}</span>
                                        <span className="font-bold text-primary">{formatCurrency(institutionProfit)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2 bg-muted/30 p-4">
                                    <div className="flex justify-between"><span>أصل القرض:</span> <span className="font-semibold">{formatCurrency(loan.amount)}</span></div>
                                    <div className="flex justify-between"><span>إجمالي الربح الكلي:</span> <span className="font-semibold">{formatCurrency(totalInterest)}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>حصة المستثمر:</span> <span>{formatCurrency(investorProfit)}</span></div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    }).filter(Boolean)}
                    {profitableInstallmentLoans.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <p>لا توجد قروض أقساط مربحة لعرض تفاصيلها.</p>
                        </div>
                    )}
                </Accordion>
            </CardContent>
        </Card>
      )}
    </div>
  );
};


const GracePeriodDashboard = ({ borrowers, investors }: { borrowers: Borrower[], investors: Investor[] }) => {
    const { currentUser, graceTotalProfitPercentage, graceInvestorSharePercentage } = useData();
    const role = currentUser?.role;

    const {
        gracePeriodLoans,
        profitableLoans,
        gracePeriodLoansGranted,
        gracePeriodDefaultedFunds,
        gracePeriodDefaultRate,
        totalDiscounts,
        dueDebts,
        totalInstitutionProfit,
        investorProfitsArray,
        netProfit,
    } = useMemo(() => {
        const gracePeriodLoans = borrowers.filter(b => b.loanType === 'مهلة');
        const profitableLoans = gracePeriodLoans.filter(
          b => b.status === 'منتظم' || b.status === 'متأخر' || b.status === 'مسدد بالكامل'
        );

        const gracePeriodLoansGranted = gracePeriodLoans.reduce((acc, b) => acc + b.amount, 0);
        const gracePeriodDefaultedFunds = gracePeriodLoans.filter(b => b.status === 'متعثر').reduce((acc, b) => acc + b.amount, 0);
        const gracePeriodDefaultRate = gracePeriodLoansGranted > 0 ? (gracePeriodDefaultedFunds / gracePeriodLoansGranted) * 100 : 0;
        const totalDiscounts = gracePeriodLoans.reduce((acc, b) => acc + (b.discount || 0), 0);
        const dueDebts = gracePeriodLoans.filter(b => b.status === 'متأخر').reduce((acc, b) => acc + b.amount, 0);
        
        let totalInstitutionProfit = 0;
        const investorProfits: { [investorId: string]: { name: string, profit: number } } = {};

        profitableLoans.forEach(loan => {
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
        });

        const investorProfitsArray = Object.values(investorProfits);
        const netProfit = totalInstitutionProfit + investorProfitsArray.reduce((acc, inv) => acc + inv.profit, 0);
        
        return {
            gracePeriodLoans,
            profitableLoans,
            gracePeriodLoansGranted,
            gracePeriodDefaultedFunds,
            gracePeriodDefaultRate,
            totalDiscounts,
            dueDebts,
            totalInstitutionProfit,
            investorProfitsArray,
            netProfit,
        };
    }, [borrowers, investors, graceTotalProfitPercentage, graceInvestorSharePercentage]);
    
    const showSensitiveData = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports);

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
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="p-6 hover:no-underline">
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <TrendingUp className="h-8 w-8 text-primary" />
                                            <div className="text-right">
                                                <h3 className="text-lg font-semibold">إجمالي صافي الأرباح (المهلة)</h3>
                                                <p className="text-2xl font-bold">{formatCurrency(netProfit)}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">انقر لعرض التفاصيل</p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 pt-0">
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
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
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

            {showSensitiveData && (
              <Card>
                  <CardHeader>
                      <CardTitle>تفصيل أرباح المؤسسة (المهلة)</CardTitle>
                      <CardDescription>عرض تفصيلي لربح المؤسسة من كل قرض مهلة.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                          {profitableLoans.map(loan => {
                              const loanTotalProfit = loan.amount * (graceTotalProfitPercentage / 100);
                              const loanInvestorShareAmount = loanTotalProfit * (graceInvestorSharePercentage / 100);
                              const institutionProfit = loanTotalProfit - loanInvestorShareAmount;

                              return (
                                  <AccordionItem value={loan.id} key={loan.id}>
                                      <AccordionTrigger>
                                          <div className="flex justify-between w-full pr-4 items-center">
                                              <span className="font-medium">{loan.name}</span>
                                              <span className="font-bold text-primary">{formatCurrency(institutionProfit)}</span>
                                          </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="space-y-2 bg-muted/30 p-4">
                                          <div className="flex justify-between"><span>أصل القرض:</span> <span className="font-semibold">{formatCurrency(loan.amount)}</span></div>
                                          <div className="flex justify-between"><span>إجمالي الربح الكلي:</span> <span className="font-semibold">{formatCurrency(loanTotalProfit)}</span></div>
                                          <div className="flex justify-between text-muted-foreground"><span>حصة المستثمر:</span> <span>{formatCurrency(loanInvestorShareAmount)}</span></div>
                                      </AccordionContent>
                                  </AccordionItem>
                              )
                          })}
                          {profitableLoans.length === 0 && (
                              <div className="text-center text-muted-foreground py-8">
                                  <p>لا توجد قروض مهلة مربحة لعرض تفاصيلها.</p>
                              </div>
                          )}
                      </Accordion>
                  </CardContent>
              </Card>
            )}
        </div>
    );
};

const IdleFundsCard = ({ investors }: { investors: Investor[] }) => {
    const { idleInvestors, totalIdleFunds } = useMemo(() => {
        const idleInvestors = investors.filter(i => i.amount > 0 && i.status === 'نشط');
        const totalIdleFunds = idleInvestors.reduce((sum, i) => sum + i.amount, 0);
        return { idleInvestors, totalIdleFunds };
    }, [investors]);

    return (
        <Card>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="p-6 hover:no-underline">
                        <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Wallet className="h-8 w-8 text-primary" />
                                <div className="text-right">
                                    <h3 className="text-lg font-semibold">الأموال الخاملة</h3>
                                    <p className="text-2xl font-bold">{formatCurrency(totalIdleFunds)}</p>
                                </div>
                            </div>
                             <p className="text-xs text-muted-foreground">انقر لعرض التفاصيل</p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-0">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>اسم المستثمر</TableHead>
                                    <TableHead className="text-left">المبلغ الخامل</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {idleInvestors.length > 0 ? (
                                    idleInvestors.map(investor => (
                                        <TableRow key={investor.id}>
                                            <TableCell className="font-medium">{investor.name}</TableCell>
                                            <TableCell className="text-left font-semibold">{formatCurrency(investor.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            لا توجد أموال خاملة حاليًا.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
};


const SystemAdminDashboard = () => {
    const { users, allUsers, investors, updateUserStatus } = useData();

    const { pendingManagers, activeManagersCount, totalCapital, totalUsersCount } = useMemo(() => {
        const pendingManagers = users.filter(u => u.role === 'مدير المكتب' && u.status === 'معلق');
        const activeManagersCount = users.filter(u => u.role === 'مدير المكتب' && u.status === 'نشط').length;
        
        const totalCapital = investors.reduce((total, investor) => {
            const capitalDeposits = investor.transactionHistory
                .filter(tx => tx.type === 'إيداع رأس المال')
                .reduce((sum, tx) => sum + tx.amount, 0);
            return total + capitalDeposits;
        }, 0);
        
        const totalUsersCount = allUsers.length;
        return { pendingManagers, activeManagersCount, totalCapital, totalUsersCount };
    }, [users, allUsers, investors]);
    
    return (
        <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
             <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                    لوحة تحكم مدير النظام
                    </h1>
                    <p className="text-muted-foreground mt-1">
                    نظرة عامة على صحة المنصة والمستخدمين.
                    </p>
                </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="إجمالي رأس المال"
                    value={formatCurrency(totalCapital)}
                    change="في جميع المحافظ"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                <KpiCard
                    title="إجمالي المستخدمين"
                    value={String(totalUsersCount)}
                    change=""
                    icon={<Users className="size-6 text-muted-foreground" />}
                />
                <KpiCard
                    title="مدراء المكاتب النشطون"
                    value={String(activeManagersCount)}
                    change=""
                    icon={<UserCheck className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="طلبات التفعيل المعلقة"
                    value={String(pendingManagers.length)}
                    change=""
                    icon={<UserCog className="size-6 text-muted-foreground" />}
                    changeColor={pendingManagers.length > 0 ? 'text-red-500' : ''}
                />
            </div>
            
            <DailySummary users={users} />
            
            <Card>
                <CardHeader>
                    <CardTitle>طلبات تفعيل مدراء المكاتب</CardTitle>
                    <CardDescription>
                       مراجعة وتفعيل الحسابات الجديدة لمدراء المكاتب.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>الاسم</TableHead>
                                <TableHead>البريد الإلكتروني</TableHead>
                                <TableHead>تاريخ التسجيل</TableHead>
                                <TableHead className="text-left">الإجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingManagers.length > 0 ? (
                                pendingManagers.map(manager => (
                                    <TableRow key={manager.id}>
                                        <TableCell className="font-medium">{manager.name}</TableCell>
                                        <TableCell>{manager.email}</TableCell>
                                        <TableCell>{manager.registrationDate ? new Date(manager.registrationDate).toLocaleDateString('ar-SA') : 'غير محدد'}</TableCell>
                                        <TableCell className="text-left">
                                            <Button size="sm" onClick={() => updateUserStatus(manager.id, 'نشط')}>
                                                <CheckCircle className="ml-2 h-4 w-4" />
                                                تفعيل الحساب
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        لا توجد طلبات تفعيل معلقة.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}

export default function DashboardPage() {
  const { borrowers, investors, currentUser } = useData();
  
  const role = currentUser?.role;

  if (!currentUser) {
      return <PageSkeleton />;
  }

  if (role === 'مدير النظام') {
    return <SystemAdminDashboard />;
  }

  if (role === 'مستثمر') {
    return <InvestorDashboard />;
  }
  
  const totalCapital = useMemo(() => {
    return investors.reduce((total, investor) => {
        const capitalDeposits = investor.transactionHistory
            .filter(tx => tx.type === 'إيداع رأس المال')
            .reduce((sum, tx) => sum + tx.amount, 0);
        return total + capitalDeposits;
    }, 0);
  }, [investors]);

  const showSensitiveData = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports);
  const showIdleFundsReport = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewIdleFundsReport);
  
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

        {showSensitiveData && <DailySummary borrowers={borrowers} investors={investors} />}
        
        {showIdleFundsReport && <IdleFundsCard investors={investors} />}

        <Tabs defaultValue="grace-period" className="w-full">
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
