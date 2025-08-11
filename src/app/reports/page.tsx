

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Borrower, Investor } from '@/lib/types';
import { useDataState } from '@/contexts/data-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToPrintableHtml } from '@/lib/html-export';
import { BorrowerStatusBadge } from '@/components/borrower-status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { calculateInvestorFinancials, getBorrowerStatus, formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';


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
  const { borrowers: allBorrowers, investors: allInvestors, currentUser, visibleUsers: users } = useDataState();
  const router = useRouter();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.viewReports);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  // Filter data based on user role
  const { borrowers, investors } = useMemo(() => {
    if (!currentUser) return { borrowers: [], investors: [] };
    if (role === 'مدير النظام') return { borrowers: allBorrowers, investors: allInvestors };
    
    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    if (!managerId) return { borrowers: [], investors: [] };

    const relevantUserIds = new Set(users.filter(u => u.managedBy === managerId || u.id === managerId).map(u => u.id));
    relevantUserIds.add(currentUser.id);

    const filteredBorrowers = allBorrowers.filter(b => b.submittedBy && relevantUserIds.has(b.submittedBy));
    const filteredInvestors = allInvestors.filter(i => {
        const investorUser = users.find(u => u.id === i.id);
        return investorUser?.managedBy === managerId;
    });

    return { borrowers: filteredBorrowers, investors: filteredInvestors };
  }, [currentUser, allBorrowers, allInvestors, users, role]);


  const getInvestorInfoForLoan = (loan: Borrower): React.ReactNode => {
    if (!loan.fundedBy || loan.fundedBy.length === 0) {
      return <span className="text-xs text-muted-foreground">غير ممول</span>;
    }
    if (loan.fundedBy.length === 1) {
      const investor = investors.find(inv => inv.id === loan.fundedBy![0].investorId);
      return investor ? investor.name : <span className="text-xs text-destructive">مستخدم محذوف</span>;
    }
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-1 cursor-pointer">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{loan.fundedBy.length}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="text-right">
                    <p className='font-bold mb-2'>المستثمرون:</p>
                    <ul className="list-disc mr-4">
                        {loan.fundedBy.map(funder => {
                        const investor = investors.find(i => i.id === funder.investorId);
                        return <li key={funder.investorId}>{investor?.name || 'مستخدم محذوف'}: {formatCurrency(funder.amount)}</li>
                        })}
                    </ul>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
  };
  
  const getInvestorInfoForLoanForExport = (loan: Borrower): string => {
    if (!loan.fundedBy || loan.fundedBy.length === 0) {
      return "غير ممول";
    }
    if (loan.fundedBy.length === 1) {
      const investor = investors.find(inv => inv.id === loan.fundedBy![0].investorId);
      return investor ? `${investor.name} (${formatCurrency(loan.fundedBy[0].amount)})` : 'مستخدم محذوف';
    }
    return `${loan.fundedBy.length} مستثمرون`;
  };

  const loansForReport = useMemo(() => borrowers.filter(b => 
    b.status === 'متعثر' || 
    b.status === 'معلق' ||
    b.status === 'منتظم' ||
    b.status === 'متأخر' ||
    b.status === 'مسدد بالكامل'
  ), [borrowers]);
  
  const activeInvestors = useMemo(() => investors.filter(i => i.status === 'نشط' || i.status === 'غير نشط'), [investors]);

  const investorsWithFinancials = useMemo(() => {
    return activeInvestors.map(investor => ({
      ...investor,
      ...calculateInvestorFinancials(investor, borrowers),
    }));
  }, [activeInvestors, borrowers]);

  const installmentLoans = useMemo(() => loansForReport.filter(b => b.loanType === 'اقساط'), [loansForReport]);
  const gracePeriodLoans = useMemo(() => loansForReport.filter(b => b.loanType === 'مهلة'), [loansForReport]);

  const handleExportInstallments = (filter: 'all' | 'defaulted' | 'paid') => {
    if (!currentUser) return;
    
    let loansToExport = installmentLoans;
    let title = "تقرير قروض الأقساط";
    
    if (filter === 'defaulted') {
      loansToExport = installmentLoans.filter(loan => loan.status === 'متعثر' || loan.paymentStatus === 'متعثر');
      title = "تقرير قروض الأقساط (المتعثرة)";
    } else if (filter === 'paid') {
      loansToExport = installmentLoans.filter(loan => loan.status === 'مسدد بالكامل' || loan.paymentStatus === 'تم السداد');
      title = "تقرير قروض الأقساط (المسددة)";
    }

    const columns = ["اسم المقترض", "مبلغ القرض", "تاريخ القرض", "تاريخ الاستحقاق", "الحالة", "الممول"];
    const today = new Date();
    const rows = loansToExport.map(loan => {
      const borrowerStatus = getBorrowerStatus(loan, today);
      return [loan.name, loan.amount, new Date(loan.date).toLocaleDateString('ar-SA'), loan.dueDate, borrowerStatus.text, getInvestorInfoForLoanForExport(loan)];
    });
    exportToPrintableHtml(title, currentUser, { columns, rows });
  };

  const handleExportGracePeriod = (filter: 'all' | 'defaulted' | 'paid') => {
    if (!currentUser) return;
    
    let loansToExport = gracePeriodLoans;
    let title = "تقرير قروض المهلة";
    
    if (filter === 'defaulted') {
      loansToExport = gracePeriodLoans.filter(loan => loan.status === 'متعثر' || loan.paymentStatus === 'متعثر');
      title = "تقرير قروض المهلة (المتعثرة)";
    } else if (filter === 'paid') {
      loansToExport = gracePeriodLoans.filter(loan => loan.status === 'مسدد بالكامل' || loan.paymentStatus === 'تم السداد');
      title = "تقرير قروض المهلة (المسددة)";
    }
    
    const columns = ["اسم المقترض", "مبلغ القرض", "تاريخ القرض", "تاريخ الاستحقاق", "الحالة", "الممول"];
    const today = new Date();
    const rows = loansToExport.map(loan => {
      const borrowerStatus = getBorrowerStatus(loan, today);
      return [loan.name, loan.amount, new Date(loan.date).toLocaleDateString('ar-SA'), loan.dueDate, borrowerStatus.text, getInvestorInfoForLoanForExport(loan)];
    });
    exportToPrintableHtml(title, currentUser, { columns, rows });
  };

  const handleExportInvestors = () => {
    if (!currentUser) return;
    const title = "تقرير المستثمرين";
    const columns = ["اسم المستثمر", "رأس مال الأقساط", "رأس مال المهلة", "إجمالي رأس المال", "الحالة"];
    const rows = investorsWithFinancials.map(investor => {
        return [
            investor.name,
            investor.totalInstallmentCapital,
            investor.totalGraceCapital,
            investor.totalCapitalInSystem,
            investor.status
        ];
    });
    exportToPrintableHtml(title, currentUser, { columns, rows });
  };
  
  const handleExportSingleInvestor = (investor: Investor) => {
    if (!currentUser) return;

    const financials = calculateInvestorFinancials(investor, borrowers);
    const { 
        totalInstallmentCapital, totalGraceCapital,
        activeInstallmentCapital, activeGraceCapital,
        idleInstallmentCapital, idleGraceCapital,
        defaultedInstallmentFunds, defaultedGraceFunds,
    } = financials;

    const fundedLoans = borrowers.filter(b => 
        b.fundedBy?.some(f => f.investorId === investor.id)
    );

    const title = `تقرير المستثمر: ${investor.name}`;
    
    const htmlBody = `
        <style>
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem; }
            .summary-card { padding: 1rem; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9; }
            .summary-card h3 { margin: 0 0 0.5rem 0; color: #555; font-size: 1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
            .summary-card p { margin: 0.25rem 0; font-size: 1rem; display: flex; justify-content: space-between; }
            .summary-card p span:last-child { font-weight: bold; }
            .section-title { font-size: 1.5rem; color: #0F2C59; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem; }
        </style>

        <h2 class="section-title">الملخص المالي</h2>
        <div class="summary-grid">
            <div class="summary-card">
              <h3>محفظة الأقساط</h3>
              <p><span>إجمالي رأس المال:</span> <span>${formatCurrency(totalInstallmentCapital)}</span></p>
              <p><span>الأموال النشطة:</span> <span style="color: #28a745;">${formatCurrency(activeInstallmentCapital)}</span></p>
              <p><span>الأموال الخاملة:</span> <span>${formatCurrency(idleInstallmentCapital)}</span></p>
              <p><span>الأموال المتعثرة:</span> <span style="color: #dc3545;">${formatCurrency(defaultedInstallmentFunds)}</span></p>
            </div>
             <div class="summary-card">
              <h3>محفظة المهلة</h3>
              <p><span>إجمالي رأس المال:</span> <span>${formatCurrency(totalGraceCapital)}</span></p>
              <p><span>الأموال النشطة:</span> <span style="color: #28a745;">${formatCurrency(activeGraceCapital)}</span></p>
              <p><span>الأموال الخاملة:</span> <span>${formatCurrency(idleGraceCapital)}</span></p>
              <p><span>الأموال المتعثرة:</span> <span style="color: #dc3545;">${formatCurrency(defaultedGraceFunds)}</span></p>
            </div>
        </div>

        <h2 class="section-title">القروض الممولة (${fundedLoans.length})</h2>
        <table>
            <thead>
                <tr><th>اسم المقترض</th><th>نوع القرض</th><th>مبلغ التمويل</th><th>تاريخ الاستحقاق</th><th>الحالة</th></tr>
            </thead>
            <tbody>
                ${fundedLoans.length > 0 ? fundedLoans.map(loan => {
                    const fundingAmount = loan.fundedBy?.find(f => f.investorId === investor.id)?.amount || 0;
                    const statusDetails = getBorrowerStatus(loan, new Date());
                    return `<tr>
                        <td>${loan.name}</td>
                        <td>${loan.loanType}</td>
                        <td>${formatCurrency(fundingAmount)}</td>
                        <td>${loan.dueDate}</td>
                        <td>${statusDetails.text}</td>
                    </tr>`;
                }).join('') : `<tr><td colspan="5" style="text-align: center; padding: 1rem;">لا توجد قروض ممولة.</td></tr>`}
            </tbody>
        </table>
        
        <h2 class="section-title">سجل العمليات</h2>
        <table>
            <thead>
                <tr><th>التاريخ</th><th>النوع</th><th>الوصف</th><th>المبلغ</th><th>طريقة السحب</th><th>مصدر رأس المال</th></tr>
            </thead>
            <tbody>
                 ${investor.transactionHistory.length > 0 ? [...investor.transactionHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
                    return `<tr>
                        <td>${new Date(tx.date).toLocaleDateString('ar-SA')}</td>
                        <td>${tx.type}</td>
                        <td>${tx.description}</td>
                        <td style="color: ${tx.type.includes('إيداع') ? '#28a745' : '#dc3545'}; font-weight: bold;">${tx.type.includes('إيداع') ? '+' : '-'} ${formatCurrency(tx.amount)}</td>
                        <td>${tx.withdrawalMethod || '-'}</td>
                        <td>${tx.capitalSource === 'installment' ? 'أقساط' : (tx.capitalSource === 'grace' ? 'مهلة' : '-')}</td>
                    </tr>`;
                 }).join('') : `<tr><td colspan="6" style="text-align: center; padding: 1rem;">لا يوجد سجل عمليات.</td></tr>`}
            </tbody>
        </table>
    `;

    exportToPrintableHtml(title, currentUser, { htmlBody });
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline"><Download className="ml-2 h-4 w-4" /> تصدير الأقساط</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleExportInstallments('all')}>تصدير الكل</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExportInstallments('defaulted')}>تصدير المتعثرين فقط</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExportInstallments('paid')}>تصدير المسددين فقط</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline"><Download className="ml-2 h-4 w-4" /> تصدير المهلة</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleExportGracePeriod('all')}>تصدير الكل</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExportGracePeriod('defaulted')}>تصدير المتعثرين فقط</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExportGracePeriod('paid')}>تصدير المسددين فقط</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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
                {investorsWithFinancials.map(investor => {
                    const fundedLoans = borrowers.filter(b => 
                        b.fundedBy?.some(f => f.investorId === investor.id)
                    );
                    const installmentLoansFunded = fundedLoans.filter(l => l.loanType === 'اقساط');
                    const gracePeriodLoansFunded = fundedLoans.filter(l => l.loanType === 'مهلة');

                    const {
                        totalInstallmentCapital, totalGraceCapital,
                        activeInstallmentCapital, activeGraceCapital,
                        idleInstallmentCapital, idleGraceCapital,
                        defaultedInstallmentFunds, defaultedGraceFunds
                    } = investor;

                    return (
                        <AccordionItem value={investor.id} key={investor.id}>
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4 items-center">
                            <span className="font-medium">{investor.name}</span>
                            <Badge variant={statusVariant[investor.status] || 'default'}>{investor.status}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6 bg-muted/30 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 rounded-md border bg-background shadow-sm space-y-1">
                                    <h5 className="font-semibold text-center pb-2 border-b">محفظة الأقساط</h5>
                                    <p className="flex justify-between"><span>إجمالي رأس المال:</span> <span className='font-bold'>{formatCurrency(totalInstallmentCapital)}</span></p>
                                    <p className="flex justify-between"><span>الأموال النشطة:</span> <span className='font-bold text-green-600'>{formatCurrency(activeInstallmentCapital)}</span></p>
                                    <p className="flex justify-between"><span>الأموال الخاملة:</span> <span className='font-bold'>{formatCurrency(idleInstallmentCapital)}</span></p>
                                    <p className="flex justify-between"><span>الأموال المتعثرة:</span> <span className='font-bold text-destructive'>{formatCurrency(defaultedInstallmentFunds)}</span></p>
                                </div>
                                <div className="p-3 rounded-md border bg-background shadow-sm space-y-1">
                                    <h5 className="font-semibold text-center pb-2 border-b">محفظة المهلة</h5>
                                    <p className="flex justify-between"><span>إجمالي رأس المال:</span> <span className='font-bold'>{formatCurrency(totalGraceCapital)}</span></p>
                                    <p className="flex justify-between"><span>الأموال النشطة:</span> <span className='font-bold text-green-600'>{formatCurrency(activeGraceCapital)}</span></p>
                                    <p className="flex justify-between"><span>الأموال الخاملة:</span> <span className='font-bold'>{formatCurrency(idleGraceCapital)}</span></p>
                                    <p className="flex justify-between"><span>الأموال المتعثرة:</span> <span className='font-bold text-destructive'>{formatCurrency(defaultedGraceFunds)}</span></p>
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
                            
                            <div className="flex justify-end pt-4">
                                <Button variant="outline" size="sm" onClick={() => handleExportSingleInvestor(investor)}>
                                    <Download className="ml-2 h-4 w-4" />
                                    تصدير تقرير المستثمر
                                </Button>
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