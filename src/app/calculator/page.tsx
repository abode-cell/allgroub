

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataState } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

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


export default function CalculatorPage() {
  const router = useRouter();
  const { 
    currentUser,
    users,
    borrowers,
    salaryRepaymentPercentage, 
    baseInterestRate,
    investorSharePercentage,
    graceTotalProfitPercentage,
    graceInvestorSharePercentage,
    updateSalaryRepaymentPercentage,
    updateBaseInterestRate,
    updateInvestorSharePercentage,
    updateGraceTotalProfitPercentage,
    updateGraceInvestorSharePercentage,
  } = useDataState();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير المكتب' || role === 'موظف' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.useCalculator);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  
  // States for Installments Tab
  const [loanAmount, setLoanAmount] = useState('100000');
  const [loanTerm, setLoanTerm] = useState('5');

  // State for Grace Period Tab
  const [graceLoanAmount, setGraceLoanAmount] = useState('100000');
  const [graceDiscount, setGraceDiscount] = useState('0');
  
  // States for By Salary Tab
  const [salary, setSalary] = useState('5000');

  // Local states for manager edits - use strings to handle partial input
  const [localBaseInterestRate, setLocalBaseInterestRate] = useState(String(baseInterestRate));
  const [localInvestorSharePercentage, setLocalInvestorSharePercentage] = useState(String(investorSharePercentage));
  const [localSalaryRepaymentPercentage, setLocalSalaryRepaymentPercentage] = useState(String(salaryRepaymentPercentage));
  const [localGraceTotalProfitPercentage, setLocalGraceTotalProfitPercentage] = useState(String(graceTotalProfitPercentage));
  const [localGraceInvestorSharePercentage, setLocalGraceInvestorSharePercentage] = useState(String(graceInvestorSharePercentage));


  useEffect(() => {
    setLocalBaseInterestRate(String(baseInterestRate));
  }, [baseInterestRate]);
  
  useEffect(() => {
    setLocalInvestorSharePercentage(String(investorSharePercentage));
  }, [investorSharePercentage]);

  useEffect(() => {
    setLocalSalaryRepaymentPercentage(String(salaryRepaymentPercentage));
  }, [salaryRepaymentPercentage]);
  
  useEffect(() => {
    setLocalGraceTotalProfitPercentage(String(graceTotalProfitPercentage));
  }, [graceTotalProfitPercentage]);

  useEffect(() => {
    setLocalGraceInvestorSharePercentage(String(graceInvestorSharePercentage));
  }, [graceInvestorSharePercentage]);


  const installmentResults = useMemo(() => {
    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(localBaseInterestRate || '0') / 100;
    const termInYears = parseFloat(loanTerm);

    if (isNaN(principal) || isNaN(annualRate) || isNaN(termInYears) || principal <= 0 || termInYears <= 0 || annualRate < 0) {
      return { monthlyPayment: 0, totalInterest: 0, totalPayment: 0, institutionProfit: 0, investorProfit: 0 };
    }
    
    const termInMonths = termInYears * 12;
    let totalPayment = principal;
    let totalInterest = 0;

    if (annualRate > 0) {
      totalInterest = principal * annualRate * termInYears;
      totalPayment = principal + totalInterest;
    }
    
    const monthlyPayment = termInMonths > 0 ? totalPayment / termInMonths : totalPayment;
    
    const currentInvestorShare = parseFloat(localInvestorSharePercentage || '0');
    const institutionProfit = totalInterest * ((100 - currentInvestorShare) / 100);
    const investorProfit = totalInterest * (currentInvestorShare / 100);

    return {
      monthlyPayment: isFinite(monthlyPayment) ? monthlyPayment : 0,
      totalInterest: isFinite(totalInterest) ? totalInterest : 0,
      totalPayment: isFinite(totalPayment) ? totalPayment : 0,
      institutionProfit: isFinite(institutionProfit) ? institutionProfit : 0,
      investorProfit: isFinite(investorProfit) ? investorProfit : 0,
    };
  }, [loanAmount, localBaseInterestRate, loanTerm, localInvestorSharePercentage]);

  const gracePeriodResults = useMemo(() => {
    const principal = parseFloat(graceLoanAmount);
    const discount = parseFloat(graceDiscount) || 0;
    if (isNaN(principal) || principal <= 0) {
      return { institutionProfit: 0, investorProfit: 0, totalProfit: 0, netProfit: 0 };
    }

    const totalProfitPercentage = parseFloat(localGraceTotalProfitPercentage || '0');
    const investorProfitPercentage = parseFloat(localGraceInvestorSharePercentage || '0');

    const totalProfit = principal * (totalProfitPercentage / 100);
    const netProfitAfterDiscount = Math.max(0, totalProfit - discount);

    const investorProfit = totalProfit * (investorProfitPercentage / 100);
    const institutionProfit = netProfitAfterDiscount - investorProfit;

    return { totalProfit, investorProfit, institutionProfit, netProfit: netProfitAfterDiscount };
  }, [graceLoanAmount, graceDiscount, localGraceTotalProfitPercentage, localGraceInvestorSharePercentage]);
  
   const bySalaryResults = useMemo(() => {
        const monthlySalary = parseFloat(salary);
        
        if (isNaN(monthlySalary) || monthlySalary <= 0) {
            return { maxGraceLoanAmount: 0, totalRepayment: 0, profit: 0 };
        }
        
        const currentSalaryRepaymentPercentage = parseFloat(localSalaryRepaymentPercentage || '0');
        const currentGraceTotalProfitPercentage = parseFloat(localGraceTotalProfitPercentage || '0');

        const maxRepayment = monthlySalary * (currentSalaryRepaymentPercentage / 100); 
        const graceProfitFactor = 1 + (currentGraceTotalProfitPercentage / 100);
        const maxLoanAmount = maxRepayment / graceProfitFactor;
        const profit = maxRepayment - maxLoanAmount;

        return {
            maxGraceLoanAmount: isFinite(maxLoanAmount) ? maxLoanAmount : 0,
            totalRepayment: isFinite(maxRepayment) ? maxRepayment : 0,
            profit: isFinite(profit) ? profit : 0,
        };
    }, [salary, localSalaryRepaymentPercentage, localGraceTotalProfitPercentage]);
    
  const showProfitDetails = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports);

  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">حاسبة القروض والأرباح</h1>
          <p className="text-muted-foreground mt-1">
            تقدير أقساط القروض والأرباح حسب نوع الحساب.
          </p>
        </header>

        <Tabs defaultValue="grace-period" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="installments">الأقساط</TabsTrigger>
            <TabsTrigger value="grace-period">المهلة</TabsTrigger>
            <TabsTrigger value="by-salary">حسب الراتب</TabsTrigger>
          </TabsList>
          <TabsContent value="installments">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mt-4">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>تمويل الأقساط</CardTitle>
                   <CardDescription>
                    يتم حساب إجمالي الربح كنسبة من أصل المبلغ وتوزيعه على الأقساط.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="loanAmount">مبلغ القرض (ر.س)</Label>
                    <Input
                      id="loanAmount"
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="أدخل مبلغ القرض"
                      style={{ direction: 'ltr' }}
                      className="text-right"
                    />
                  </div>
                   {showProfitDetails && (
                    <div className="space-y-2">
                        <div className="space-y-2">
                            <Label htmlFor="baseInterestRate">
                              نسبة الربح السنوية (%)
                            </Label>
                            <Input
                              id="baseInterestRate"
                              type="number"
                              step="0.1"
                              value={localBaseInterestRate}
                              onChange={(e) => setLocalBaseInterestRate(e.target.value)}
                              placeholder="نسبة الربح السنوية"
                              style={{ direction: 'ltr' }}
                              className="text-right"
                            />
                        </div>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            onClick={() => updateBaseInterestRate(parseFloat(localBaseInterestRate || '0'))}
                            disabled={parseFloat(localBaseInterestRate || String(baseInterestRate)) === baseInterestRate}
                        >
                            <Save className="ml-2 h-4 w-4" />
                            تأكيد النسبة
                        </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="loanTerm">مدة القرض (سنوات)</Label>
                    <Input
                      id="loanTerm"
                      type="number"
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(e.target.value)}
                      placeholder="أدخل مدة القرض"
                      style={{ direction: 'ltr' }}
                      className="text-right"
                    />
                  </div>
                  {showProfitDetails && (
                    <div className="space-y-2 pt-4">
                        <div className="space-y-2">
                           <Label htmlFor="investorShare">
                              حصة المستثمر من الأرباح (%)
                            </Label>
                            <Input
                              id="investorShare"
                              type="number"
                              step="1"
                              value={localInvestorSharePercentage}
                              onChange={(e) => setLocalInvestorSharePercentage(e.target.value)}
                              placeholder="حصة المستثمر"
                              style={{ direction: 'ltr' }}
                              className="text-right"
                            />
                        </div>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            onClick={() => updateInvestorSharePercentage(parseFloat(localInvestorSharePercentage || '0'))}
                            disabled={parseFloat(localInvestorSharePercentage || String(investorSharePercentage)) === investorSharePercentage}
                        >
                            <Save className="ml-2 h-4 w-4" />
                            تأكيد الحصة
                        </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>نتائج الأقساط</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between rounded-lg bg-muted p-4">
                        <p className="text-lg text-muted-foreground">القسط الشهري</p>
                        <p className="text-3xl font-bold">{formatCurrency(installmentResults.monthlyPayment)}</p>
                    </div>
                    <div className="space-y-2 rounded-lg border p-4">
                        <div className="flex justify-between">
                            <p className="text-muted-foreground">إجمالي المبلغ المسدد</p>
                            <p className="font-semibold">{formatCurrency(installmentResults.totalPayment)}</p>
                        </div>
                        {showProfitDetails && (
                            <>
                                <div className="flex justify-between">
                                    <p className="text-muted-foreground">إجمالي الأرباح</p>
                                    <p className="font-semibold">{formatCurrency(installmentResults.totalInterest)}</p>
                                </div>
                                <div className="my-2 border-t border-dashed"></div>
                                <div className="flex justify-between text-accent-foreground">
                                    <p>ربح المؤسسة</p>
                                    <p className="font-semibold">{formatCurrency(installmentResults.institutionProfit)}</p>
                                </div>
                                <div className="flex justify-between text-primary">
                                    <p>ربح المستثمرين</p>
                                    <p className="font-semibold">{formatCurrency(installmentResults.investorProfit)}</p>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="grace-period">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mt-4">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>تمويل المهلة</CardTitle>
                    <CardDescription>
                      {showProfitDetails 
                        ? 'يتم احتساب ربح إجمالي كنسبة من أصل القرض، ثم توزيعه على المؤسسة والمستثمر. يمكنك تعديل النسب أدناه.'
                        : 'يتم احتساب الأرباح كنسبة ثابتة من أصل القرض.'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="graceLoanAmount">مبلغ القرض (ر.س)</Label>
                      <Input
                        id="graceLoanAmount"
                        type="number"
                        value={graceLoanAmount}
                        onChange={(e) => setGraceLoanAmount(e.target.value)}
                        placeholder="أدخل مبلغ القرض"
                        style={{ direction: 'ltr' }}
                        className="text-right"
                      />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="graceDiscount">الخصم (ر.س)</Label>
                      <Input
                        id="graceDiscount"
                        type="number"
                        value={graceDiscount}
                        onChange={(e) => setGraceDiscount(e.target.value)}
                        placeholder="أدخل مبلغ الخصم (إن وجد)"
                        style={{ direction: 'ltr' }}
                        className="text-right"
                      />
                    </div>
                    {showProfitDetails && (
                      <>
                          <div className="space-y-2 pt-4">
                              <div className="space-y-2">
                                  <Label htmlFor="graceTotalProfit">
                                    إجمالي الربح (%)
                                  </Label>
                                  <Input
                                      id="graceTotalProfit"
                                      type="number"
                                      step="1"
                                      value={localGraceTotalProfitPercentage}
                                      onChange={(e) => setLocalGraceTotalProfitPercentage(e.target.value)}
                                      placeholder="نسبة الربح الإجمالية"
                                      style={{ direction: 'ltr' }}
                                      className="text-right"
                                  />
                              </div>
                              <Button
                                  size="sm" variant="outline" className="w-full"
                                  onClick={() => updateGraceTotalProfitPercentage(parseFloat(localGraceTotalProfitPercentage || '0'))}
                                  disabled={parseFloat(localGraceTotalProfitPercentage || String(graceTotalProfitPercentage)) === graceTotalProfitPercentage}
                              >
                                  <Save className="ml-2 h-4 w-4" />
                                  تأكيد نسبة الربح
                              </Button>
                          </div>
                          <div className="space-y-2">
                              <div className="space-y-2">
                                  <Label htmlFor="graceInvestorShare">
                                    حصة المستثمر من الربح (%)
                                  </Label>
                                  <Input
                                      id="graceInvestorShare"
                                      type="number"
                                      step="0.1"
                                      value={localGraceInvestorSharePercentage}
                                      onChange={(e) => setLocalGraceInvestorSharePercentage(e.target.value)}
                                      placeholder="حصة المستثمر من الربح"
                                      style={{ direction: 'ltr' }}
                                      className="text-right"
                                  />
                              </div>
                              <Button
                                  size="sm" variant="outline" className="w-full"
                                  onClick={() => updateGraceInvestorSharePercentage(parseFloat(localGraceInvestorSharePercentage || '0'))}
                                  disabled={parseFloat(localGraceInvestorSharePercentage || String(graceInvestorSharePercentage)) === graceInvestorSharePercentage}
                              >
                                  <Save className="ml-2 h-4 w-4" />
                                  تأكيد حصة المستثمر
                              </Button>
                          </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>نتائج أرباح المهلة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {showProfitDetails ? (
                        <>
                            <div className="flex items-baseline justify-between rounded-lg bg-muted p-4">
                                <p className="text-lg text-muted-foreground">صافي الربح بعد الخصم</p>
                                <p className="text-3xl font-bold">{formatCurrency(gracePeriodResults.netProfit)}</p>
                            </div>
                            <div className="space-y-2 rounded-lg border p-4">
                                <div className="flex justify-between">
                                    <p className="text-muted-foreground">إجمالي الربح قبل الخصم</p>
                                    <p className="font-semibold">{formatCurrency(gracePeriodResults.totalProfit)}</p>
                                </div>
                                <div className="flex justify-between text-destructive">
                                    <p className="text-muted-foreground">مبلغ الخصم</p>
                                    <p className="font-semibold">{formatCurrency(parseFloat(graceDiscount) || 0)}</p>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between text-accent-foreground">
                                    <p>ربح المؤسسة</p>
                                    <p className="font-semibold">{formatCurrency(gracePeriodResults.institutionProfit)}</p>
                                </div>
                                <div className="flex justify-between text-primary">
                                    <p>ربح المستثمر</p>
                                    <p className="font-semibold">{formatCurrency(gracePeriodResults.investorProfit)}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center rounded-lg bg-muted/50 p-4 min-h-[160px]">
                            <p className="text-center text-muted-foreground">تفاصيل الأرباح متاحة للمدراء فقط.</p>
                        </div>
                    )}
                </CardContent>
                </Card>
              </div>
          </TabsContent>
           <TabsContent value="by-salary">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mt-4">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>حساب تمويل المهلة حسب الراتب</CardTitle>
                  <CardDescription>
                    أدخل راتبك لتقدير أقصى مبلغ تمويل مهلة لمدة شهر واحد.
                    <br />
                    <small className="text-xs mt-2 block">
                      يعتمد التقدير على أن إجمالي السداد (أصل القرض + الربح بنسبة {localGraceTotalProfitPercentage || graceTotalProfitPercentage}%) لا يتجاوز {localSalaryRepaymentPercentage || salaryRepaymentPercentage}% من راتبك الشهري.
                    </small>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="salary">الراتب الشهري (ر.س)</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="أدخل راتبك الشهري"
                      style={{ direction: 'ltr' }}
                      className="text-right"
                    />
                  </div>
                   {showProfitDetails && (
                    <div className="space-y-2 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="salaryRepaymentPercentage">
                          نسبة السداد من الراتب (%)
                        </Label>
                        <Input
                          id="salaryRepaymentPercentage"
                          type="number"
                          step="1"
                          value={localSalaryRepaymentPercentage}
                          onChange={(e) => setLocalSalaryRepaymentPercentage(e.target.value)}
                          placeholder="نسبة السداد من الراتب"
                          style={{ direction: 'ltr' }}
                          className="text-right"
                        />
                      </div>
                       <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => updateSalaryRepaymentPercentage(parseFloat(localSalaryRepaymentPercentage || '0'))}
                        disabled={parseFloat(localSalaryRepaymentPercentage || String(salaryRepaymentPercentage)) === salaryRepaymentPercentage}
                      >
                        <Save className="ml-2 h-4 w-4" />
                        تأكيد النسبة
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>أقصى مبلغ تمويل مقترح</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-1 gap-4">
                    <div className="space-y-4 rounded-lg border bg-background p-6 text-center">
                        <p className="text-muted-foreground">
                            أقصى مبلغ تمويل يمكنك الحصول عليه
                        </p>
                        <p className="text-4xl font-bold text-primary">
                            {formatCurrency(bySalaryResults.maxGraceLoanAmount)}
                        </p>
                    </div>
                    <div className="space-y-2 rounded-lg border p-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">أصل القرض</span>
                            <span className="font-semibold">{formatCurrency(bySalaryResults.maxGraceLoanAmount)}</span>
                        </div>
                        {showProfitDetails && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">الربح ({localGraceTotalProfitPercentage || graceTotalProfitPercentage}%)</span>
                                <span className="font-semibold">{formatCurrency(bySalaryResults.profit)}</span>
                            </div>
                        )}
                        <div className="my-2 border-t border-dashed"></div>
                        <div className="flex justify-between text-lg">
                            <span className="text-muted-foreground">إجمالي السداد</span>
                            <span className="font-bold">{formatCurrency(bySalaryResults.totalRepayment)}</span>
                        </div>
                    </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
