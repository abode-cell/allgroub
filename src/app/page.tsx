
'use client';

import { CircleDollarSign, Landmark, ShieldAlert, ShieldX, TrendingUp, Users, BadgePercent, Wallet, UserCheck, UserCog, CheckCircle } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ProfitChart } from '@/components/dashboard/profit-chart';
import { LoansStatusChart } from '@/components/dashboard/loans-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { InvestorDashboard } from '@/components/dashboard/investor-dashboard';
import { useDataState, useDataActions } from '@/contexts/data-context';
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

const InstallmentsDashboard = ({ borrowers, investors }: { borrowers: Borrower[], investors: Investor[] }) => {
  const { currentUser, investorSharePercentage } = useDataState();
  const role = currentUser?.role;

  const {
    installmentLoans,
    installmentLoansGranted,
    installmentDefaultedFunds,
    installmentDefaultRate,
    netProfit,
    totalInstitutionProfit,
    totalInvestorsProfit,
    investorProfitsArray,
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
      
      let totalInstitutionProfit = 0;
      let totalInvestorsProfit = 0;
      const investorProfits: { [investorId: string]: { name: string, profit: number } } = {};

      profitableInstallmentLoans.forEach(loan => {
          if (!loan.rate || !loan.term || !loan.fundedBy) return;
          
          loan.fundedBy.forEach(funder => {
              const investorDetails = investors.find(i => i.id === funder.investorId);
              if (!investorDetails) return;

              const profitShare = investorDetails.installmentProfitShare ?? investorSharePercentage;
              const interestOnFundedAmount = funder.amount * (loan.rate / 100) * loan.term;
              
              const investorPortion = interestOnFundedAmount * (profitShare / 100);
              const institutionPortion = interestOnFundedAmount - investorPortion;
              
              totalInvestorsProfit += investorPortion;
              totalInstitutionProfit += institutionPortion;

              if (!investorProfits[funder.investorId]) {
                  investorProfits[funder.investorId] = { name: investorDetails.name, profit: 0 };
              }
              investorProfits[funder.investorId].profit += investorPortion;
          });
      });

      const netProfit = totalInstitutionProfit + totalInvestorsProfit;

      const investorProfitsArray = Object.entries(investorProfits).map(([id, data]) => ({
        id,
        ...data
      }));

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
        investorProfitsArray,
        dueDebts,
        profitableInstallmentLoans,
      };
    }, [borrowers, investors, investorSharePercentage]);

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
                                    {investorProfitsArray.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell>{inv.name}</TableCell>
                                            <TableCell className="text-left font-semibold">{formatCurrency(inv.profit)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="border-t-2 border-dashed bg-muted/50">
                                        <TableCell className="font-bold">إجمالي أرباح المستثمرين</TableCell>
                                        <TableCell className="text-left font-bold">{formatCurrency(totalInvestorsProfit)}</TableCell>
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
                        if (!loan.rate || !loan.term || !loan.fundedBy) return null;
                        
                        let totalInstitutionProfitOnLoan = 0;
                        let totalInvestorProfitOnLoan = 0;

                        loan.fundedBy.forEach(funder => {
                            const investorDetails = investors.find(i => i.id === funder.investorId);
                            if (!investorDetails) return;
                            const profitShare = investorDetails.installmentProfitShare ?? investorSharePercentage;
                            const interestOnFundedAmount = funder.amount * (loan.rate / 100) * loan.term;
                            const investorPortion = interestOnFundedAmount * (profitShare / 100);
                            const institutionPortion = interestOnFundedAmount - investorPortion;
                            totalInstitutionProfitOnLoan += institutionPortion;
                            totalInvestorProfitOnLoan += investorPortion;
                        });

                        const totalInterest = totalInstitutionProfitOnLoan + totalInvestorProfitOnLoan;

                        return (
                            <AccordionItem value={loan.id} key={loan.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between w-full pr-4 items-center">
                                        <span className="font-medium">{loan.name}</span>
                                        <span className="font-bold text-primary">{formatCurrency(totalInstitutionProfitOnLoan)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2 bg-muted/30 p-4">
                                    <div className="flex justify-between"><span>أصل القرض:</span> <span className="font-semibold">{formatCurrency(loan.amount)}</span></div>
                                    <div className="flex justify-between"><span>إجمالي الربح الكلي:</span> <span className="font-semibold">{formatCurrency(totalInterest)}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>حصة المستثمر:</span> <span>{formatCurrency(totalInvestorProfitOnLoan)}</span></div>
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
    const { currentUser, graceTotalProfitPercentage, graceInvestorSharePercentage } = useDataState();
    const role = currentUser?.role;

    const {
        gracePeriodLoans,
        gracePeriodLoansGranted,
        gracePeriodDefaultedFunds,
        gracePeriodDefaultRate,
        totalDiscounts,
        dueDebts,
        totalInstitutionProfit,
        investorProfitsArray,
        netProfit,
        profitableLoans,
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
            if (!loan.fundedBy) return;

            loan.fundedBy.forEach(funder => {
                const investorDetails = investors.find(i => i.id === funder.investorId);
                if (!investorDetails) return;

                const totalProfitOnFundedAmount = funder.amount * (graceTotalProfitPercentage / 100);
                const investorProfitShare = investorDetails.gracePeriodProfitShare ?? graceInvestorSharePercentage;
                const investorPortion = totalProfitOnFundedAmount * (investorProfitShare / 100);
                const institutionPortion = totalProfitOnFundedAmount - investorPortion;
                
                totalInstitutionProfit += institutionPortion;

                if (!investorProfits[funder.investorId]) {
                    investorProfits[funder.investorId] = { name: investorDetails.name, profit: 0 };
                }
                investorProfits[funder.investorId].profit += investorPortion;
            });
        });
        
        const totalInvestorsProfit = Object.values(investorProfits).reduce((sum, inv) => sum + inv.profit, 0);
        const netProfit = totalInstitutionProfit + totalInvestorsProfit;
        const investorProfitsArray = Object.values(investorProfits);
        
        return {
            gracePeriodLoans,
            profitableLoans,
            gracePeriodLoansGranted,
            gracePeriodDefaultedFunds,
            gracePeriodDefaultRate,
            totalDiscounts,
            dueDebts,
            totalInstitutionProfit,
            totalInvestorsProfit,
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
                              if (!loan.fundedBy) return null;
                              
                              let totalInstitutionProfitOnLoan = 0;
                              let totalInvestorProfitOnLoan = 0;
                              
                              loan.fundedBy.forEach(funder => {
                                const investorDetails = investors.find(i => i.id === funder.investorId);
                                if (!investorDetails) return;
                                
                                const totalProfitOnFundedAmount = funder.amount * (graceTotalProfitPercentage / 100);
                                const investorProfitShare = investorDetails.gracePeriodProfitShare ?? graceInvestorSharePercentage;
                                const investorPortion = totalProfitOnFundedAmount * (investorProfitShare / 100);
                                const institutionPortion = totalProfitOnFundedAmount - investorPortion;
                                
                                totalInstitutionProfitOnLoan += institutionPortion;
                                totalInvestorProfitOnLoan += investorPortion;
                              });

                              const totalProfit = totalInstitutionProfitOnLoan + totalInvestorProfitOnLoan;
                              
                              return (
                                  <AccordionItem value={loan.id} key={loan.id}>
                                      <AccordionTrigger>
                                          <div className="flex justify-between w-full pr-4 items-center">
                                              <span className="font-medium">{loan.name}</span>
                                              <span className="font-bold text-primary">{formatCurrency(totalInstitutionProfitOnLoan)}</span>
                                          </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="space-y-2 bg-muted/30 p-4">
                                          <div className="flex justify-between"><span>أصل القرض:</span> <span className="font-semibold">{formatCurrency(loan.amount)}</span></div>
                                          <div className="flex justify-between"><span>إجمالي الربح الكلي:</span> <span className="font-semibold">{formatCurrency(totalProfit)}</span></div>
                                          <div className="flex justify-between text-muted-foreground"><span>حصة المستثمر:</span> <span>{formatCurrency(totalInvestorProfitOnLoan)}</span></div>
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
        const idleInvestors = investors.filter(i => (i.installmentCapital > 0 || i.gracePeriodCapital > 0) && i.status === 'نشط');
        const totalIdleFunds = idleInvestors.reduce((sum, i) => sum + i.installmentCapital + i.gracePeriodCapital, 0);
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
                                    <TableHead>نوع الاستثمار</TableHead>
                                    <TableHead className="text-left">المبلغ الخامل</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {idleInvestors.length > 0 ? (
                                    idleInvestors.map(investor => (
                                        <TableRow key={investor.id}>
                                            <TableCell className="font-medium">{investor.name}</TableCell>
                                            <TableCell><Badge variant="outline">{investor.investmentType}</Badge></TableCell>
                                            <TableCell className="text-left font-semibold">{formatCurrency(investor.installmentCapital + investor.gracePeriodCapital)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
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
    const { users, investors } = useDataState();
    const { updateUserStatus } = useDataActions();

    const { pendingManagers, activeManagersCount, totalCapital, installmentCapital, graceCapital, totalUsersCount } = useMemo(() => {
        const officeManagers = users.filter(u => u.role === 'مدير المكتب');
        const pendingManagers = officeManagers.filter(u => u.status === 'معلق');
        const activeManagersCount = officeManagers.length - pendingManagers.length;
        
        const totalCapital = investors.reduce((total, investor) => total + investor.installmentCapital + investor.gracePeriodCapital, 0);
        const installmentCapital = investors.reduce((total, investor) => total + investor.installmentCapital, 0);
        const graceCapital = investors.reduce((total, investor) => total + investor.gracePeriodCapital, 0);
        
        const totalUsersCount = users.length;
        return { pendingManagers, activeManagersCount, totalCapital, installmentCapital, graceCapital, totalUsersCount };
    }, [users, investors]);
    
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                    title="إجمالي رأس المال"
                    value={formatCurrency(totalCapital)}
                    change="في جميع المحافظ"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال الأقساط"
                    value={formatCurrency(installmentCapital)}
                    change="مخصص لتمويل الأقساط"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال المهلة"
                    value={formatCurrency(graceCapital)}
                    change="مخصص لتمويل المهلة"
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
            
            <DailySummary />
            
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
  const { currentUser, users, borrowers, investors } = useDataState();
  const role = currentUser?.role;

  // Memoized filtering of data based on current user
  const filteredBorrowers = useMemo(() => {
    if (!currentUser || !borrowers) return [];
    if (role === 'مدير النظام') return []; // Admins see data in their own dashboard
    if (role === 'مستثمر') {
      return borrowers.filter(b => b.fundedBy?.some(f => f.investorId === currentUser.id));
    }
    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    const relevantUserIds = new Set(users.filter(u => u.managedBy === managerId || u.id === managerId).map(u => u.id));
    relevantUserIds.add(currentUser.id);
    return borrowers.filter(b => b.submittedBy && relevantUserIds.has(b.submittedBy));
  }, [currentUser, borrowers, users, role]);

  const filteredInvestors = useMemo(() => {
    if (!currentUser || !investors) return [];
    if (role === 'مدير النظام') return [];
    if (role === 'مستثمر') {
      return investors.filter(i => i.id === currentUser.id);
    }
    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    const relevantUserIds = new Set(users.filter(u => u.managedBy === managerId || u.id === managerId).map(u => u.id));
    relevantUserIds.add(currentUser.id);
    return investors.filter(i => i.submittedBy && relevantUserIds.has(i.submittedBy));
  }, [currentUser, investors, users, role]);

  if (!currentUser) {
      return <PageSkeleton />;
  }

  if (role === 'مدير النظام') {
    return <SystemAdminDashboard />;
  }

  if (role === 'مستثمر') {
    return <InvestorDashboard />;
  }
  
  const { totalCapital, installmentCapital, graceCapital } = useMemo(() => {
    const total = filteredInvestors.reduce((acc, inv) => acc + inv.installmentCapital + inv.gracePeriodCapital, 0);
    const installment = filteredInvestors.reduce((acc, inv) => acc + inv.installmentCapital, 0);
    const grace = filteredInvestors.reduce((acc, inv) => acc + inv.gracePeriodCapital, 0);
    return { totalCapital: total, installmentCapital: installment, graceCapital: grace };
  }, [filteredInvestors]);

  const showSensitiveData = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports);
  const showIdleFundsReport = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewIdleFundsReport);
  
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
        </header>

        {showSensitiveData && (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                    title="إجمالي رأس المال"
                    value={formatCurrency(totalCapital)}
                    change="في جميع المحافظ"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال الأقساط"
                    value={formatCurrency(installmentCapital)}
                    change="متاح لتمويل الأقساط"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال المهلة"
                    value={formatCurrency(graceCapital)}
                    change="متاح لتمويل المهلة"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
            </div>
        )}

        {showSensitiveData && <DailySummary />}
        
        {showIdleFundsReport && <IdleFundsCard investors={filteredInvestors} />}

        <Tabs defaultValue="grace-period" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="installments">قروض الأقساط</TabsTrigger>
                <TabsTrigger value="grace-period">قروض المهلة</TabsTrigger>
            </TabsList>
            <TabsContent value="installments" className="mt-6">
                <InstallmentsDashboard borrowers={filteredBorrowers} investors={filteredInvestors} />
            </TabsContent>
            <TabsContent value="grace-period" className="mt-6">
                <GracePeriodDashboard borrowers={filteredBorrowers} investors={filteredInvestors} />
            </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
