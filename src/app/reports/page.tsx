
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
import { useAuth } from '@/contexts/auth-context';
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


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
};


const getDynamicStatus = (borrower: Borrower): { text: string; variant: keyof typeof statusVariant } => {
    // Priority statuses that are manually set or are terminal
    if (borrower.status === 'مسدد بالكامل') return { text: 'مسدد بالكامل', variant: 'success' };
    if (borrower.status === 'متعثر') return { text: 'متعثر', variant: 'destructive' };
    if (borrower.status === 'معلق') return { text: 'طلب معلق', variant: 'secondary' };
    if (borrower.status === 'مرفوض') return { text: 'مرفوض', variant: 'destructive' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(borrower.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const startDate = new Date(borrower.date);
    startDate.setHours(0, 0, 0, 0);

    // Automatic 'Late' status if due date is passed
    if (today > dueDate) {
        return { text: 'متأخر', variant: 'destructive' };
    }
    
    // If the loan is manually marked as late, respect that.
    if (borrower.status === 'متأخر') {
         return { text: 'متأخر', variant: 'destructive' };
    }

    // Lifecycle statuses for ongoing loans (i.e., status is 'منتظم')
    const totalDuration = dueDate.getTime() - startDate.getTime();
    if (totalDuration <= 0) {
        return { text: borrower.status, variant: statusVariant[borrower.status] || 'default' };
    }

    const elapsedDuration = today.getTime() - startDate.getTime();
    const progress = elapsedDuration / totalDuration;

    if (progress < 0.25) { 
        return { text: 'جديد', variant: 'default' };
    }
    if (progress < 0.80) { 
        return { text: 'منتصف المدة', variant: 'default' };
    }
    return { text: 'اقترب السداد', variant: 'outline' };
};


const ReportTable = ({ loans, getInvestorInfoForLoan }: { loans: Borrower[], getInvestorInfoForLoan: (loan: Borrower) => React.ReactNode }) => (
     <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المقترض</TableHead>
            <TableHead>مبلغ القرض</TableHead>
            <TableHead>تاريخ القرض</TableHead>
            <TableHead>تاريخ الاستحقاق</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>المستثمر الممول</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length > 0 ? (
            loans.map((loan) => {
              const dynamicStatus = getDynamicStatus(loan);
              return (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.name}</TableCell>
                  <TableCell>{formatCurrency(loan.amount)}</TableCell>
                  <TableCell>{loan.date}</TableCell>
                  <TableCell>{loan.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant={dynamicStatus.variant}>
                      {dynamicStatus.text}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
  const { borrowers, investors, users } = useData();
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('installments');

  const displayedInvestors = useMemo(() => {
    if (role === 'مدير المكتب') {
      return investors.filter(i => i.submittedBy === user?.id);
    }
    return investors;
  }, [investors, user, role]);

  const displayedBorrowers = useMemo(() => {
    if (role === 'مدير المكتب') {
      const myEmployeeIds = users.filter(u => u.managedBy === user?.id).map(u => u.id);
      const myIds = [user?.id, ...myEmployeeIds].filter(Boolean);
      return borrowers.filter(b => b.submittedBy && myIds.includes(b.submittedBy));
    }
    return borrowers;
  }, [borrowers, users, user, role]);

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

  const getInvestorNamesForExport = (loan: Borrower): string => {
    if (!loan.fundedBy || loan.fundedBy.length === 0) {
      return 'غير ممول';
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

  const exportLoans = (format: 'xlsx' | 'pdf') => {
    const loansToExport = activeTab === 'installments' ? installmentLoans : gracePeriodLoans;
    const reportName = `تقرير-القروض-${activeTab === 'installments' ? 'الأقساط' : 'المهلة'}`;
    const headers = ['اسم المقترض', 'مبلغ القرض', 'تاريخ القرض', 'تاريخ الاستحقاق', 'الحالة', 'المستثمر الممول'];
    
    const data = loansToExport.map(loan => ({
      name: loan.name,
      amount: formatCurrency(loan.amount),
      date: loan.date,
      dueDate: loan.dueDate,
      status: getDynamicStatus(loan).text,
      funder: getInvestorNamesForExport(loan),
    }));

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'القروض');
      XLSX.writeFile(workbook, `${reportName}.xlsx`);
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [headers],
        body: data.map(d => Object.values(d)),
        styles: { font: 'Helvetica', halign: 'right' },
        headStyles: { halign: 'right', fillColor: [22, 163, 74] },
      });
      doc.save(`${reportName}.pdf`);
    }
  }

  const exportInvestors = (format: 'xlsx' | 'pdf') => {
    const reportName = 'تقرير-المستثمرين';
    const headers = ['اسم المستثمر', 'إجمالي الاستثمار', 'الأموال النشطة', 'الأموال الخاملة', 'الأموال المتعثرة', 'الحالة'];
    
    const data = activeInvestors.map(investor => {
        const fundedLoans = borrowers.filter(b => b.fundedBy?.some(f => f.investorId === investor.id));
        const totalInvestment = investor.transactionHistory.filter(tx => tx.type === 'إيداع رأس المال').reduce((acc, tx) => acc + tx.amount, 0);
        const activeInvestment = fundedLoans.filter(b => b.status === 'منتظم' || b.status === 'متأخر').reduce((total, loan) => {
            const funding = loan.fundedBy?.find(f => f.investorId === investor.id);
            return total + (funding?.amount || 0);
        }, 0);
        
        return {
            name: investor.name,
            totalInvestment: formatCurrency(totalInvestment),
            activeInvestment: formatCurrency(activeInvestment),
            idleFunds: formatCurrency(investor.amount),
            defaultedFunds: formatCurrency(investor.defaultedFunds || 0),
            status: investor.status,
        };
    });

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'المستثمرون');
      XLSX.writeFile(workbook, `${reportName}.xlsx`);
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [headers],
        body: data.map(d => Object.values(d)),
        styles: { font: 'Helvetica', halign: 'right' },
        headStyles: { halign: 'right', fillColor: [22, 163, 74] },
      });
      doc.save(`${reportName}.pdf`);
    }
  };


  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
            <header>
            <h1 className="text-3xl font-bold tracking-tight">التقارير الشاملة</h1>
            <p className="text-muted-foreground mt-1">
                نظرة شاملة على أداء القروض والمستثمرين في النظام.
            </p>
            </header>
        </div>

        <Card>
          <CardHeader>
             <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>تقرير حالة القروض</CardTitle>
                <CardDescription>
                  قائمة بجميع القروض النشطة، المعلقة، والمتعثرة في النظام حسب نوع التمويل.
                </CardDescription>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button onClick={() => exportLoans('xlsx')} variant="outline" size="sm">
                  <FileDown className="ml-2 h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={() => exportLoans('pdf')} variant="outline" size="sm">
                  <FileDown className="ml-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="installments" className="w-full" onValueChange={(value) => setActiveTab(value)}>
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
              <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>تقارير المستثمرين</CardTitle>
                    <CardDescription>
                    تقارير فردية لكل مستثمر توضح أداء استثماراتهم.
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button onClick={() => exportInvestors('xlsx')} variant="outline" size="sm">
                      <FileDown className="ml-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button onClick={() => exportInvestors('pdf')} variant="outline" size="sm">
                      <FileDown className="ml-2 h-4 w-4" />
                      PDF
                    </Button>
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
                                <TableHead>الحالة</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {installmentLoansFunded.length > 0 ? (
                                installmentLoansFunded.map(loan => {
                                const fundingAmount = loan.fundedBy?.find(f => f.investorId === investor.id)?.amount || 0;
                                const dynamicStatus = getDynamicStatus(loan);
                                return (
                                    <TableRow key={loan.id}>
                                    <TableCell>{loan.name}</TableCell>
                                    <TableCell>{formatCurrency(fundingAmount)}</TableCell>
                                    <TableCell>{loan.dueDate}</TableCell>
                                    <TableCell><Badge variant={dynamicStatus.variant}>{dynamicStatus.text}</Badge></TableCell>
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
                                <TableHead>الحالة</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {gracePeriodLoansFunded.length > 0 ? (
                                gracePeriodLoansFunded.map(loan => {
                                const fundingAmount = loan.fundedBy?.find(f => f.investorId === investor.id)?.amount || 0;
                                const dynamicStatus = getDynamicStatus(loan);
                                return (
                                    <TableRow key={loan.id}>
                                    <TableCell>{loan.name}</TableCell>
                                    <TableCell>{formatCurrency(fundingAmount)}</TableCell>
                                    <TableCell>{loan.dueDate}</TableCell>
                                    <TableCell><Badge variant={dynamicStatus.variant}>{dynamicStatus.text}</Badge></TableCell>
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
