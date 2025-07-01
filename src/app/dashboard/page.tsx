
'use client';

import { CircleDollarSign, Landmark, ShieldAlert, ShieldX, TrendingUp, Users, BadgePercent, Wallet, UserCheck, UserCog, CheckCircle } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
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
import { useEffect, useState, useTransition, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { calculateDashboardMetrics, type DashboardMetricsOutput } from '@/ai/flows/calculate-dashboard-metrics';

const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const InstallmentsDashboard = ({ metrics, showSensitiveData, borrowers, investors }: { metrics: DashboardMetricsOutput['installments'], showSensitiveData: boolean, borrowers: Borrower[], investors: Investor[] }) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="القروض الممنوحة (أقساط)"
          value={formatCurrency(metrics.loansGranted)}
          change=""
          icon={<Landmark className="size-6 text-muted-foreground" />}
        />
        {showSensitiveData && (
             <KpiCard
                title="صافي الربح"
                value={formatCurrency(metrics.netProfit)}
                change=""
                icon={<TrendingUp className="size-6 text-muted-foreground" />}
            />
        )}
        <KpiCard
          title="الديون المستحقة"
          value={formatCurrency(metrics.dueDebts)}
          change=""
          icon={<Users className="size-6 text-muted-foreground" />}
          changeColor="text-red-500"
        />
        <KpiCard
          title="الأموال المتعثرة (أقساط)"
          value={formatCurrency(metrics.defaultedFunds)}
          change=""
          icon={<ShieldX className="size-6 text-muted-foreground" />}
          changeColor="text-red-500"
        />
        <KpiCard
          title="نسبة التعثر (أقساط)"
          value={`${metrics.defaultRate.toFixed(1)}%`}
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
                                        <p className="text-2xl font-bold">{formatCurrency(metrics.netProfit)}</p>
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
                                        <TableCell className="text-left font-semibold">{formatCurrency(metrics.totalInstitutionProfit)}</TableCell>
                                    </TableRow>
                                    {metrics.investorProfitsArray.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell>{inv.name}</TableCell>
                                            <TableCell className="text-left font-semibold">{formatCurrency(inv.profit)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="border-t-2 border-dashed bg-muted/50">
                                        <TableCell className="font-bold">إجمالي أرباح المستثمرين</TableCell>
                                        <TableCell className="text-left font-bold">{formatCurrency(metrics.totalInvestorsProfit)}</TableCell>
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
          <LoansStatusChart borrowers={metrics.loans} />
        </div>
      </div>

      <div>
        <RecentTransactions borrowers={borrowers} investors={investors} />
      </div>

      {showSensitiveData && (
        <Card>
            <CardHeader>
                <CardTitle>تفصيل أرباح المؤسسة (الأقساط)</CardTitle>
                <CardDescription>عرض تفصيلي لربح المؤسسة من كل قرض أقساط.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {metrics.profitableLoansForAccordion.map(loan => (
                      <AccordionItem value={loan.id} key={loan.id}>
                          <AccordionTrigger>
                              <div className="flex justify-between w-full pr-4 items-center">
                                  <span className="font-medium">{loan.name}</span>
                                  <span className="font-bold text-primary">{formatCurrency(loan.institutionProfit)}</span>
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2 bg-muted/30 p-4">
                              <div className="flex justify-between"><span>أصل القرض:</span> <span className="font-semibold">{formatCurrency(loan.amount)}</span></div>
                              <div className="flex justify-between"><span>إجمالي الربح الكلي:</span> <span className="font-semibold">{formatCurrency(loan.totalInterest)}</span></div>
                              <div className="flex justify-between text-muted-foreground"><span>حصة المستثمر:</span> <span>{formatCurrency(loan.investorProfit)}</span></div>
                          </AccordionContent>
                      </AccordionItem>
                    ))}
                    {metrics.profitableLoansForAccordion.length === 0 && (
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


const GracePeriodDashboard = ({ metrics, showSensitiveData, config, borrowers, investors }: { metrics: DashboardMetricsOutput['gracePeriod'], showSensitiveData: boolean, config: any, borrowers: Borrower[], investors: Investor[] }) => {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <KpiCard
                    title="التمويل الممنوح (مهلة)"
                    value={formatCurrency(metrics.loansGranted)}
                    change=""
                    icon={<Landmark className="size-6 text-muted-foreground" />}
                />
                 {showSensitiveData && (
                    <KpiCard
                        title="صافي الأرباح"
                        value={formatCurrency(metrics.netProfit)}
                        change={`${config.graceTotalProfitPercentage.toFixed(1)}% من الأصل`}
                        icon={<TrendingUp className="size-6 text-muted-foreground" />}
                        changeColor='text-green-500'
                    />
                 )}
                 <KpiCard
                    title="الديون المستحقة"
                    value={formatCurrency(metrics.dueDebts)}
                    change=""
                    icon={<Users className="size-6 text-muted-foreground" />}
                    changeColor="text-red-500"
                 />
                 <KpiCard
                    title="إجمالي الخصومات"
                    value={formatCurrency(metrics.totalDiscounts)}
                    change="على قروض المهلة"
                    icon={<BadgePercent className="size-6 text-muted-foreground" />}
                    changeColor="text-blue-500"
                 />
                 <KpiCard
                    title="الأموال المتعثرة (مهلة)"
                    value={formatCurrency(metrics.defaultedFunds)}
                    change={`${metrics.defaultRate.toFixed(1)}% نسبة التعثر`}
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
                                                <p className="text-2xl font-bold">{formatCurrency(metrics.netProfit)}</p>
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
                                                <TableCell className="text-left font-semibold">{formatCurrency(metrics.totalInstitutionProfit)}</TableCell>
                                            </TableRow>
                                            {metrics.investorProfitsArray.map(inv => (
                                                <TableRow key={inv.id}>
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
                <LoansStatusChart borrowers={metrics.loans} />
              </div>
            </div>

            <div>
              <RecentTransactions borrowers={borrowers} investors={investors} />
            </div>

            {showSensitiveData && (
              <Card>
                  <CardHeader>
                      <CardTitle>تفصيل أرباح المؤسسة (المهلة)</CardTitle>
                      <CardDescription>عرض تفصيلي لربح المؤسسة من كل قرض مهلة.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                          {metrics.profitableLoansForAccordion.map(loan => (
                              <AccordionItem value={loan.id} key={loan.id}>
                                  <AccordionTrigger>
                                      <div className="flex justify-between w-full pr-4 items-center">
                                          <span className="font-medium">{loan.name}</span>
                                          <span className="font-bold text-primary">{formatCurrency(loan.institutionProfit)}</span>
                                      </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="space-y-2 bg-muted/30 p-4">
                                      <div className="flex justify-between"><span>أصل القرض:</span> <span className="font-semibold">{formatCurrency(loan.amount)}</span></div>
                                      <div className="flex justify-between"><span>إجمالي الربح الكلي:</span> <span className="font-semibold">{formatCurrency(loan.totalInterest)}</span></div>
                                      <div className="flex justify-between text-muted-foreground"><span>حصة المستثمر:</span> <span>{formatCurrency(loan.investorProfit)}</span></div>
                                  </AccordionContent>
                              </AccordionItem>
                          ))}
                          {metrics.profitableLoansForAccordion.length === 0 && (
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

const IdleFundsCard = ({ metrics }: { metrics: DashboardMetricsOutput['idleFunds'] }) => {
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
                                    <p className="text-2xl font-bold">{formatCurrency(metrics.totalIdleFunds)}</p>
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
                                {metrics.idleInvestors.length > 0 ? (
                                    metrics.idleInvestors.map(investor => (
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


const SystemAdminDashboard = ({ metrics }: { metrics: DashboardMetricsOutput['admin'] }) => {
    const { updateUserStatus } = useDataActions();
    
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
                    value={formatCurrency(metrics.totalCapital)}
                    change="في جميع المحافظ"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال الأقساط"
                    value={formatCurrency(metrics.installmentCapital)}
                    change="مخصص لتمويل الأقساط"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال المهلة"
                    value={formatCurrency(metrics.graceCapital)}
                    change="مخصص لتمويل المهلة"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                <KpiCard
                    title="إجمالي المستخدمين"
                    value={String(metrics.totalUsersCount)}
                    change=""
                    icon={<Users className="size-6 text-muted-foreground" />}
                />
                <KpiCard
                    title="مدراء المكاتب النشطون"
                    value={String(metrics.activeManagersCount)}
                    change=""
                    icon={<UserCheck className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="طلبات التفعيل المعلقة"
                    value={String(metrics.pendingManagersCount)}
                    change=""
                    icon={<UserCog className="size-6 text-muted-foreground" />}
                    changeColor={metrics.pendingManagersCount > 0 ? 'text-red-500' : ''}
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
                            {metrics.pendingManagers.length > 0 ? (
                                metrics.pendingManagers.map(manager => (
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
  const { currentUser, users, borrowers, investors, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage } = useDataState();
  const [isPending, startTransition] = useTransition();
  const [metrics, setMetrics] = useState<DashboardMetricsOutput | null>(null);

  const { filteredBorrowers, filteredInvestors } = useMemo(() => {
    if (!currentUser) return { filteredBorrowers: [], filteredInvestors: [] };
    const { role } = currentUser;

    if (role === 'مدير النظام' || role === 'مستثمر') {
        return { filteredBorrowers: borrowers, filteredInvestors: investors };
    }

    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    const relevantUserIds = new Set(users.filter(u => u.managedBy === managerId || u.id === managerId).map(u => u.id));
    relevantUserIds.add(currentUser.id);

    const fBorrowers = borrowers.filter(b => b.submittedBy && relevantUserIds.has(b.submittedBy));
    const fInvestors = investors.filter(i => i.submittedBy && relevantUserIds.has(i.submittedBy));

    return { filteredBorrowers: fBorrowers, filteredInvestors: fInvestors };
  }, [currentUser, users, borrowers, investors]);


  useEffect(() => {
    if (currentUser) {
      startTransition(async () => {
        try {
          const result = await calculateDashboardMetrics({
            borrowers,
            investors,
            users,
            currentUser,
            config: {
              investorSharePercentage,
              graceTotalProfitPercentage,
              graceInvestorSharePercentage,
            }
          });
          setMetrics(result);
        } catch (error) {
          console.error("Failed to calculate dashboard metrics:", error);
          setMetrics(null); 
        }
      });
    }
  }, [borrowers, investors, users, currentUser, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage]);

  if (!currentUser || isPending || !metrics) {
      return <PageSkeleton />;
  }

  if (metrics.role === 'مدير النظام') {
    return <SystemAdminDashboard metrics={metrics.admin} />;
  }

  if (metrics.role === 'مستثمر') {
    return <InvestorDashboard />;
  }
  
  const showSensitiveData = metrics.role === 'مدير المكتب' || (metrics.role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports);
  const showIdleFundsReport = metrics.role === 'مدير المكتب' || (metrics.role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewIdleFundsReport);
  
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
                    value={formatCurrency(metrics.capital.total)}
                    change="في جميع المحافظ"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال الأقساط"
                    value={formatCurrency(metrics.capital.installments)}
                    change="متاح لتمويل الأقساط"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
                 <KpiCard
                    title="رأس مال المهلة"
                    value={formatCurrency(metrics.capital.grace)}
                    change="متاح لتمويل المهلة"
                    icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                />
            </div>
        )}

        {showSensitiveData && <DailySummary borrowers={filteredBorrowers} investors={filteredInvestors} />}
        
        {showIdleFundsReport && <IdleFundsCard metrics={metrics.idleFunds} />}

        <Tabs defaultValue="grace-period" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="installments">قروض الأقساط</TabsTrigger>
                <TabsTrigger value="grace-period">قروض المهلة</TabsTrigger>
            </TabsList>
            <TabsContent value="installments" className="mt-6">
                <InstallmentsDashboard metrics={metrics.installments} showSensitiveData={showSensitiveData} borrowers={filteredBorrowers} investors={filteredInvestors} />
            </TabsContent>
            <TabsContent value="grace-period" className="mt-6">
                <GracePeriodDashboard 
                  metrics={metrics.gracePeriod} 
                  showSensitiveData={showSensitiveData} 
                  config={{ graceTotalProfitPercentage }} 
                  borrowers={filteredBorrowers} 
                  investors={filteredInvestors}
                />
            </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
