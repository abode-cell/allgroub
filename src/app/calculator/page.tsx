'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useRole } from '@/contexts/role-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CalculatorPage() {
  const { role } = useRole();
  const [loanAmount, setLoanAmount] = useState(100000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [loanTerm, setLoanTerm] = useState(5);
  const [investorShare, setInvestorShare] = useState(70);

  // For Grace Period
  const [graceLoanAmount, setGraceLoanAmount] = useState(100000);

  const calculateInstallments = () => {
    if (!loanAmount || !interestRate || !loanTerm) {
      return { monthlyPayment: 0, totalInterest: 0, totalPayment: 0 };
    }

    const principal = parseFloat(loanAmount.toString());
    const rate = parseFloat(interestRate.toString()) / 100 / 12;
    const term = parseFloat(loanTerm.toString()) * 12;

    if (principal <= 0 || rate < 0 || term <= 0) {
      return { monthlyPayment: 0, totalInterest: 0, totalPayment: 0, institutionProfit: 0, investorProfit: 0 };
    }

    const monthlyPayment = (principal * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
    const totalPayment = monthlyPayment * term;
    const totalInterest = totalPayment - principal;
    const institutionProfit = totalInterest * ((100 - investorShare) / 100);
    const investorProfit = totalInterest * (investorShare / 100);

    return {
      monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
      totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
      totalPayment: isNaN(totalPayment) ? 0 : totalPayment,
      institutionProfit: isNaN(institutionProfit) ? 0 : institutionProfit,
      investorProfit: isNaN(investorProfit) ? 0 : investorProfit,
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

  const installmentResults = calculateInstallments();
  const gracePeriodResults = calculateGracePeriod();
  
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(value);
    
  const showProfitDetails = role === 'مدير النظام' || role === 'مدير المكتب';

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">حاسبة القروض والأرباح</h1>
          <p className="text-muted-foreground mt-1">
            تقدير أقساط القروض والأرباح حسب نوع الحساب.
          </p>
        </header>

        <Tabs defaultValue="installments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="installments">الأقساط</TabsTrigger>
            <TabsTrigger value="grace-period">المهلة</TabsTrigger>
          </TabsList>
          <TabsContent value="installments">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mt-4">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>إدخال بيانات القسط</CardTitle>
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
                    <Label htmlFor="interestRate">نسبة الفائدة السنوية (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      placeholder="أدخل نسبة الفائدة"
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
                    <div className="space-y-4">
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
                        <p className="text-sm text-muted-foreground">إجمالي الفوائد (الأرباح)</p>
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
                    <CardTitle>إدخال بيانات المهلة</CardTitle>
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
                     <p className='text-xs text-muted-foreground pt-4'>
                      يتم احتساب ربح ثابت للمؤسسة بنسبة 20% وربح ثابت للمستثمر بنسبة 10% من أصل مبلغ القرض.
                     </p>
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
        </Tabs>
      </main>
    </div>
  );
}
