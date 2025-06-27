'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CalculatorPage() {
  const { role } = useAuth();
  // States for Installments Tab
  const [loanAmount, setLoanAmount] = useState(100000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [loanTerm, setLoanTerm] = useState(5);
  const [investorShare, setInvestorShare] = useState(70);

  // State for Grace Period Tab
  const [graceLoanAmount, setGraceLoanAmount] = useState(100000);
  
  // States for By Salary Tab
  const [salary, setSalary] = useState(5000);
  const [salaryRepaymentPercentage, setSalaryRepaymentPercentage] = useState(30);


  const calculateInstallments = () => {
    if (!loanAmount || !loanTerm) {
      return { monthlyPayment: 0, totalInterest: 0, totalPayment: 0, institutionProfit: 0, investorProfit: 0 };
    }

    const principal = parseFloat(loanAmount.toString());
    const annualRate = parseFloat(interestRate.toString() || '0') / 100;
    const termInYears = parseFloat(loanTerm.toString());

    if (principal <= 0 || termInYears <= 0 || annualRate < 0) {
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

    const institutionProfit = totalInterest * ((100 - investorShare) / 100);
    const investorProfit = totalInterest * (investorShare / 100);

    return {
      monthlyPayment: isFinite(monthlyPayment) ? monthlyPayment : 0,
      totalInterest: isFinite(totalInterest) ? totalInterest : 0,
      totalPayment: isFinite(totalPayment) ? totalPayment : 0,
      institutionProfit: isFinite(institutionProfit) ? institutionProfit : 0,
      investorProfit: isFinite(investorProfit) ? investorProfit : 0,
    };
  };

  const calculateGracePeriod = () => {
    const principal = parseFloat(graceLoanAmount.toString());
    if (principal <= 0) {
      return { institutionProfit: 0, investorProfit: 0, totalProfit: 0 };
    }

    const institutionProfit = principal * 0.20;
    const investorProfit = principal * 0.10;
    const totalProfit = institutionProfit + investorProfit;

    return { institutionProfit, investorProfit, totalProfit };
  }
  
   const calculateBySalary = () => {
        const monthlySalary = parseFloat(salary.toString());
        
        if (monthlySalary <= 0) {
            return { maxGraceLoanAmount: 0, totalRepayment: 0, profit: 0 };
        }

        const maxRepayment = monthlySalary * (salaryRepaymentPercentage / 100); 
        const graceProfitFactor = 1.3; 
        const maxLoanAmount = maxRepayment / graceProfitFactor;
        const profit = maxRepayment - maxLoanAmount;

        return {
            maxGraceLoanAmount: isFinite(maxLoanAmount) ? maxLoanAmount : 0,
            totalRepayment: isFinite(maxRepayment) ? maxRepayment : 0,
            profit: isFinite(profit) ? profit : 0,
        };
    };

  const installmentResults = calculateInstallments();
  const gracePeriodResults = calculateGracePeriod();
  const bySalaryResults = calculateBySalary();
  
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
    }).format(value);
    
  const showProfitDetails = role === 'مدير النظام' || role === 'مدير المكتب';

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">حاسبة القروض والأرباح</h1>
          <p className="text-muted-foreground mt-1">
            تقدير أقساط القروض والأرباح حسب نوع الحساب.
          </p>
        </header>

        <Tabs defaultValue="installments" className="w-full">
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
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      placeholder="أدخل مبلغ القرض"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interestRate">نسبة الربح السنوية (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      placeholder="أدخل نسبة الربح"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loanTerm">مدة القرض (سنوات)</Label>
                    <Input
                      id="loanTerm"
                      type="number"
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(Number(e.target.value))}
                      placeholder="أدخل مدة القرض"
                    />
                  </div>
                  {showProfitDetails && (
                    <div className="space-y-4 pt-4">
                      <Label htmlFor="investorShare">
                        حصة المستثمر من الأرباح: {investorShare}%
                      </Label>
                      <Slider
                        id="investorShare"
                        min={0}
                        max={100}
                        step={5}
                        value={[investorShare]}
                        onValueChange={(value) => setInvestorShare(value[0])}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>نتائج الأقساط</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">القسط الشهري</p>
                        <p className="text-2xl font-bold">{formatCurrency(installmentResults.monthlyPayment)}</p>
                    </div>
                     <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">إجمالي المبلغ المسدد</p>
                        <p className="text-2xl font-bold">{formatCurrency(installmentResults.totalPayment)}</p>
                    </div>
                     <div className="p-4 bg-muted rounded-lg col-span-1 md:col-span-2">
                        <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                        <p className="text-2xl font-bold">{formatCurrency(installmentResults.totalInterest)}</p>
                    </div>
                    {showProfitDetails && (
                      <>
                        <div className="p-4 bg-accent/10 rounded-lg">
                            <p className="text-sm text-accent-foreground/80">ربح المؤسسة</p>
                            <p className="text-2xl font-bold text-accent-foreground">{formatCurrency(installmentResults.institutionProfit)}</p>
                        </div>
                         <div className="p-4 bg-primary/10 rounded-lg">
                            <p className="text-sm text-primary/80">ربح المستثمرين</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(installmentResults.investorProfit)}</p>
                        </div>
                      </>
                    )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="grace-period">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mt-4">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>تمويل المهلة</CardTitle>
                    {showProfitDetails && <CardDescription>
                      يتم احتساب ربح ثابت للمؤسسة بنسبة 20% وربح ثابت للمستثمر بنسبة 10% من أصل مبلغ القرض.
                     </CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="graceLoanAmount">مبلغ القرض (ر.س)</Label>
                      <Input
                        id="graceLoanAmount"
                        type="number"
                        value={graceLoanAmount}
                        onChange={(e) => setGraceLoanAmount(Number(e.target.value))}
                        placeholder="أدخل مبلغ القرض"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>نتائج أرباح المهلة</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-6 text-center">
                       <div className="p-4 bg-muted rounded-lg col-span-1">
                          <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                          <p className="text-2xl font-bold">{formatCurrency(gracePeriodResults.totalProfit)}</p>
                      </div>
                      {showProfitDetails ? (
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="p-4 bg-accent/10 rounded-lg">
                              <p className="text-sm text-accent-foreground/80">ربح المؤسسة (20%)</p>
                              <p className="text-2xl font-bold text-accent-foreground">{formatCurrency(gracePeriodResults.institutionProfit)}</p>
                          </div>
                           <div className="p-4 bg-primary/10 rounded-lg">
                              <p className="text-sm text-primary/80">ربح المستثمر (10%)</p>
                              <p className="text-2xl font-bold text-primary">{formatCurrency(gracePeriodResults.investorProfit)}</p>
                          </div>
                        </div>
                      ) : (
                         <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">تفاصيل الأرباح متاحة للمدراء فقط.</p>
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
                      يعتمد التقدير على أن إجمالي السداد (أصل القرض + الربح) لا يتجاوز {salaryRepaymentPercentage}% من راتبك الشهري.
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
                      onChange={(e) => setSalary(Number(e.target.value))}
                      placeholder="أدخل راتبك الشهري"
                    />
                  </div>
                   {showProfitDetails && (
                    <div className="space-y-4 pt-4">
                      <Label htmlFor="salaryRepaymentPercentage">
                        نسبة السداد من الراتب: {salaryRepaymentPercentage}%
                      </Label>
                      <Slider
                        id="salaryRepaymentPercentage"
                        min={10}
                        max={50}
                        step={1}
                        value={[salaryRepaymentPercentage]}
                        onValueChange={(value) => setSalaryRepaymentPercentage(value[0])}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>أقصى مبلغ تمويل مقترح</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 text-center">
                  <div className="p-6 bg-accent/10 rounded-lg space-y-4">
                    <div>
                      <p className="text-sm text-accent-foreground/80">
                        أقصى مبلغ تمويل يمكنك الحصول عليه
                      </p>
                      <p className="text-4xl font-bold text-accent-foreground">
                        {formatCurrency(bySalaryResults.maxGraceLoanAmount)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm border-t border-accent/20 pt-4">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">أصل القرض</span>
                        <span className="font-semibold">{formatCurrency(bySalaryResults.maxGraceLoanAmount)}</span>
                      </div>
                       <div className="flex flex-col">
                        <span className="text-muted-foreground">الربح (30%)</span>
                        <span className="font-semibold">{formatCurrency(bySalaryResults.profit)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">إجمالي السداد</span>
                        <span className="font-semibold">{formatCurrency(bySalaryResults.totalRepayment)}</span>
                      </div>
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
