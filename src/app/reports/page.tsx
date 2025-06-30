'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Borrower } from '@/lib/types';
import { useData } from '@/contexts/data-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import React, { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToPrintableHtml } from '@/lib/html-export';
import { getBorrowerStatus } from '@/lib/utils';
import { BorrowerStatusBadge } from '@/components/borrower-status-badge';


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

const statusVariant: {
  [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
} = {
  منتظم: 'default',
  متأخر: 'destructive',
  متعثر: 'destructive',
  معلق: 'secondary',
  'مسدد بالكامل': 'success',
  مرفوض: 'destructive',
  'نشط': 'success',
  'غير نشط': 'secondary',
  'جديد': 'default',
  'منتصف المدة': 'outline',
  'اقترب السداد': 'default',
  'متأخر السداد': 'destructive',
  'طلب معلق': 'secondary',
  'تم السداد': 'success',
  'مسدد جزئي': 'default',
  'تم الإمهال': 'secondary',
};

const ReportTable = ({ loans, getInvestorInfoForLoan }: { loans: Borrower[], getInvestorInfoForLoan: (loan: Borrower) => React.ReactNode }) => (
     <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المقترض</TableHead>
            <TableHead>مبلغ القرض</TableHead>
            <TableHead>تاريخ القرض</TableHead>
            <TableHead>تاريخ الاستحقاق</TableHead>
            <TableHead className="text-center">الحالة</TableHead>
            <TableHead className="text-center">المستثمر الممول</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length > 0 ? (
            loans.map((loan) => {
              return (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.name}</TableCell>
                  <TableCell>{formatCurrency(loan.amount)}</TableCell>
                  <TableCell>{new Date(loan.date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{loan.dueDate}</TableCell>
                  <TableCell className="text-center">
                    <BorrowerStatusBadge borrower={loan} />
                  </TableCell>
                  <TableCell className="text-center">
                    {getInvestorInfoForLoan(loan)}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                لا توجد قروض من هذا النوع لعرضها في التقرير.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
);


export default function ReportsPage() {
  const { borrowers, investors, users, currentUser } = useData();
  const router = useRouter();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);


  const displayedInvestors = useMemo(() => {
    if (!currentUser) return [];
    if (role === 'مدير المكتب') {
        return investors.filter(i => i.submittedBy === currentUser.id);
    }
    if (role === 'مساعد مدير المكتب' && currentUser.managedBy) {
        return investors.filter(i => i.submittedBy === currentUser.managedBy || i.submittedBy === currentUser.id);
    }
    return investors;
  }, [investors, currentUser, role]);

  const displayedBorrowers = useMemo(() => {
    if (!currentUser) return [];
    if (role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser.managedBy)) {
        const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
        const subordinateIds = users.filter(u => u.managedBy === managerId).map(u => u.id);
        const relevantIds = [managerId, ...subordinateIds].filter(Boolean);
        return borrowers.filter(b => b.submittedBy && relevantIds.includes(b.submittedBy));
    }
    return borrowers;
  }, [borrowers, users, currentUser, role]);

  const getInvestorInfoForLoan = (loan: Borrower): React.ReactNode => {
    if (!loan.fundedBy || loan.fundedBy.length === 0) {
      return <span className="text-xs text-muted-foreground">غير ممول</span>;
    }
    if (loan.fundedBy.length === 1) {
      const investor = investors.find(inv => inv.id === loan.fundedBy![0].investorId);
      return investor ? investor.name : 'غير محدد';
    }
    return `${loan.fundedBy.length} مستثمرون`;
  };

  const loansForReport = displayedBorrowers.filter(b => 
    b.status === 'متعثر' || 
    b.status === 'معلق' ||
    b.status === 'منتظم' ||
    b.status === 'متأخر'
  );
  
  const activeInvestors = displayedInvestors.filter(i => i.status === 'نشط' || i.status === 'غير نشط');

  const installmentLoans = loansForReport.filter(b => b.loanType === 'اقساط');
  const gracePeriodLoans = loansForReport.filter(b => b.loanType === 'مهلة');

  const handleExportInstallments = () => {
    if (!currentUser) return;
    const title = "تقرير قروض الأقساط";
    const columns = ["اسم المقترض", "مبلغ القرض", "تاريخ القرض", "تاريخ الاستحقاق", "الحالة", "الممول"];
    const today = new Date();
    const rows = installmentLoans.map(loan => {
      const borrowerStatus = getBorrowerStatus(loan, today);
      return [loan.name, loan.amount, new Date(loan.date).toLocaleDateString('ar-SA'), loan.dueDate, borrowerStatus.text, getInvestorInfoForLoan(loan) as string];
    });
    exportToPrintableHtml(title, columns, rows, currentUser);
  };

  const handleExportGracePeriod = () => {
    if (!currentUser) return;
    const title = "تقرير قروض المهلة";
    const columns = ["اسم المقترض", "مبلغ القرض", "تاريخ القرض", "تاريخ الاستحقاق", "الحالة", "الممول"];
    const today = new Date();
    const rows = gracePeriodLoans.map(loan => {
      const borrowerStatus = getBorrowerStatus(loan, today);
      return [loan.name, loan.amount, new Date(loan.date).toLocaleDateString('ar-SA'), loan.dueDate, borrowerStatus.text, getInvestorInfoForLoan(loan) as string];
    });
    exportToPrintableHtml(title, columns, rows, currentUser);
  };

  const handleExportInvestors = () => {
    if (!currentUser) return;
    const title = "تقرير المستثمرين";
    const columns = ["اسم المستثمر", "إجمالي الاستثمار", "الأموال النشطة", "الأموال الخاملة", "الأموال المتعثرة", "الحالة"];
    const rows = activeInvestors.map(investor => {
        const totalInvestment = investor.transactionHistory
            .filter(tx => tx.type === 'إيداع رأس المال')
            .reduce((acc, tx) => acc + tx.amount, 0);
        
        const activeInvestment = displayedBorrowers
            .filter(b => b.fundedBy?.some(f => f.investorId === investor.id) && (b.status === 'منتظم' || b.status === 'متأخر'))
            .reduce((total, loan) => {
                const funding = loan.fundedBy?.find(f => f.investorId === investor.id);
                return total + (funding?.amount || 0);
            }, 0);
        
        const idleFunds = investor.amount;
        const defaultedFunds = investor.defaultedFunds || 0;

        return [
            investor.name,
            totalInvestment,
            activeInvestment,
            idleFunds,
            defaultedFunds,
            investor.status
        ];
    });
    exportToPrintableHtml(title, columns, rows, currentUser);
  };


  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <header>
            <h1 className="text-3xl font-bold tracking-tight">التقارير الشاملة</h1>
            <p className="text-muted-foreground mt-1">
                نظرة شاملة على أداء القروض والمستثمرين في النظام.
            </p>
            </header>
            <div className="flex flex-wrap gap-2">
                <Button onClick={handleExportInstallments} variant="outline"><Download className="ml-2 h-4 w-4" /> تصدير الأقساط </Button>
                <Button onClick={handleExportGracePeriod} variant="outline"><Download className="ml-2 h-4 w-4" /> تصدير المهلة </Button>
                <Button onClick={handleExportInvestors} variant="outline"><Download className="ml-2 h-4 w-4" /> تصدير المستثمرين </Button>
            </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>تقرير حالة القروض</CardTitle>
            <CardDescription>
              قائمة بجميع القروض النشطة، المعلقة، والمتعثرة في النظام حسب نوع التمويل.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="installments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="installments">
                  قروض الأقساط ({installmentLoans.length})
                </TabsTrigger>
                <TabsTrigger value="grace-period">
                  قروض المهلة ({gracePeriodLoans.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="installments" className="mt-4">
                  <ReportTable loans={installmentLoans} getInvestorInfoForLoan={getInvestorInfoForLoan} />
              </TabsContent>
              <TabsContent value="grace-period" className="mt-4">
                  <ReportTable loans={gracePeriodLoans} getInvestorInfoForLoan={getInvestorInfoForLoan} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>تقارير المستثمرين</CardTitle>
                        <CardDescription>
                            تقارير فردية لكل مستثمر توضح أداء استثماراتهم.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                {activeInvestors.map(investor => {
                const fundedLoans = borrowers.filter(b => 
                    b.fundedBy?.some(f => f.investorId === investor.id)
                );
                const installmentLoansFunded = fundedLoans.filter(l => l.loanType === 'اقساط');
                const gracePeriodLoansFunded = fundedLoans.filter(l => l.loanType === 'مهلة');

                const totalInvestment = investor.transactionHistory
                    .filter(tx => tx.type === 'إيداع رأس المال')
                    .reduce((acc, tx) => acc + tx.amount, 0);
                const activeInvestment = fundedLoans
                    .filter(b => b.status === 'منتظم' || b.status === 'متأخر')
                    .reduce((total, loan) => {
                        const funding = loan.fundedBy?.find(f => f.investorId === investor.id);
                        return total + (funding?.amount || 0);
                    }, 0);
                const idleFunds = investor.amount;
                const defaultedFunds = investor.defaultedFunds || 0;

                return (
                    <AccordionItem value={investor.id} key={investor.id}>
                    <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4 items-center">
                        <span className="font-medium">{investor.name}</span>
                        <Badge variant={statusVariant[investor.status] || 'default'}>{investor.status}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 bg-muted/30 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="p-3 rounded-md border bg-background shadow-sm">
                                <p className="text-muted-foreground">إجمالي الاستثمار</p>
                                <p className="font-bold text-lg">{formatCurrency(totalInvestment)}</p>
                            </div>
                            <div className="p-3 rounded-md border bg-background shadow-sm">
                                <p className="text-muted-foreground">الأموال النشطة</p>
                                <p className="font-bold text-lg text-green-600">{formatCurrency(activeInvestment)}</p>
                            </div>
                            <div className="p-3 rounded-md border bg-background shadow-sm">
                                <p className="text-muted-foreground">الأموال الخاملة</p>
                                <p className="font-bold text-lg">{formatCurrency(idleFunds)}</p>
                            </div>
                            <div className="p-3 rounded-md border bg-background shadow-sm">
                                <p className="text-muted-foreground">الأموال المتعثرة</p>
                                <p className="font-bold text-lg text-destructive">{formatCurrency(defaultedFunds)}</p>
                            </div>
                        </div>
                        
                        <div>
                        <h4 className="font-semibold mb-2">قروض الأقساط الممولة ({installmentLoansFunded.length})</h4>
                        <div className="border rounded-md bg-background overflow-hidden">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>اسم المقترض</TableHead>
                                <TableHead>مبلغ التمويل</TableHead>
                                <TableHead>تاريخ الاستحقاق</TableHead>
                                <TableHead className="text-center">الحالة</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {installmentLoansFunded.length > 0 ? (
                                installmentLoansFunded.map(loan => {
                                const fundingAmount = loan.fundedBy?.find(f => f.investorId === investor.id)?.amount || 0;
                                return (
                                    <TableRow key={loan.id}>
                                    <TableCell>{loan.name}</TableCell>
                                    <TableCell>{formatCurrency(fundingAmount)}</TableCell>
                                    <TableCell>{loan.dueDate}</TableCell>
                                    <TableCell className="text-center"><BorrowerStatusBadge borrower={loan} /></TableCell>
                                    </TableRow>
                                )
                                })
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">لا توجد قروض أقساط ممولة.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                        </div>
                        </div>

                        <div>
                        <h4 className="font-semibold mb-2">قروض المهلة الممولة ({gracePeriodLoansFunded.length})</h4>
                        <div className="border rounded-md bg-background overflow-hidden">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>اسم المقترض</TableHead>
                                <TableHead>مبلغ التمويل</TableHead>
                                <TableHead>تاريخ الاستحقاق</TableHead>
                                <TableHead className="text-center">الحالة</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {gracePeriodLoansFunded.length > 0 ? (
                                gracePeriodLoansFunded.map(loan => {
                                const fundingAmount = loan.fundedBy?.find(f => f.investorId === investor.id)?.amount || 0;
                                return (
                                    <TableRow key={loan.id}>
                                    <TableCell>{loan.name}</TableCell>
                                    <TableCell>{formatCurrency(fundingAmount)}</TableCell>
                                    <TableCell>{loan.dueDate}</TableCell>
                                    <TableCell className="text-center"><BorrowerStatusBadge borrower={loan} /></TableCell>
                                    </TableRow>
                                )
                                })
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">لا توجد قروض مهلة ممولة.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                        </div>
                        </div>

                    </AccordionContent>
                    </AccordionItem>
                )
                })}
                {activeInvestors.length === 0 && (
                    <div className="text-center text-muted-foreground py-16">
                        <p>لا يوجد مستثمرون لعرض تقاريرهم.</p>
                    </div>
                )}
                </Accordion>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
