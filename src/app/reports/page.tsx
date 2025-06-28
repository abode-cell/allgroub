'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Borrower } from '@/lib/types';
import { useData } from '@/contexts/data-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
};

const ReportTable = ({ loans, getInvestorNameForLoan }: { loans: Borrower[], getInvestorNameForLoan: (loanId: string) => string }) => (
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
            loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.name}</TableCell>
                <TableCell>{formatCurrency(loan.amount)}</TableCell>
                <TableCell>{loan.date}</TableCell>
                <TableCell>{loan.dueDate}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[loan.status] || 'outline'}>
                    {loan.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getInvestorNameForLoan(loan.id)}
                </TableCell>
              </TableRow>
            ))
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
  const { borrowers, investors } = useData();

  const getInvestorNameForLoan = (loanId: string) => {
    const investor = investors.find(inv => inv.fundedLoanIds.includes(loanId));
    return investor ? investor.name : 'غير محدد';
  };

  const loansForReport = borrowers.filter(b => 
    b.status === 'متعثر' || 
    b.status === 'معلق' ||
    b.status === 'منتظم' ||
    b.status === 'متأخر'
  );

  const installmentLoans = loansForReport.filter(b => b.loanType === 'اقساط');
  const gracePeriodLoans = loansForReport.filter(b => b.loanType === 'مهلة');

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
            <header>
            <h1 className="text-3xl font-bold tracking-tight">تقرير حالة القروض</h1>
            <p className="text-muted-foreground mt-1">
                نظرة شاملة على جميع القروض النشطة، المعلقة، والمتعثرة.
            </p>
            </header>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة القروض</CardTitle>
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
                  <ReportTable loans={installmentLoans} getInvestorNameForLoan={getInvestorNameForLoan} />
              </TabsContent>
              <TabsContent value="grace-period" className="mt-4">
                  <ReportTable loans={gracePeriodLoans} getInvestorNameForLoan={getInvestorNameForLoan} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
