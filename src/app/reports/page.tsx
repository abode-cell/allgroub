'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { borrowersData, investorsData, defaultedLoanInvestorMap } from '@/lib/data';
import type { Borrower } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const getInvestorNameById = (investorId: string) => {
  const investor = investorsData.find(inv => inv.id === investorId);
  return investor ? investor.name : 'غير محدد';
};

export default function ReportsPage() {
  const [defaultedLoans] = useState<Borrower[]>(
    borrowersData.filter(b => b.status === 'متعثر' || b.status === 'معلق')
  );

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">تقارير المخاطر والتعثر</h1>
          <p className="text-muted-foreground mt-1">
            نظرة تفصيلية على القروض المتعثرة والمعلقة والمستثمرين المتأثرين.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>القروض المتعثرة والمعلقة</CardTitle>
            <CardDescription>
              قائمة بجميع القروض التي تم تحديدها كمتعثرة أو معلقة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المقترض</TableHead>
                  <TableHead>مبلغ القرض</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المستثمر المتأثر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaultedLoans.length > 0 ? (
                  defaultedLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.name}</TableCell>
                      <TableCell>{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={loan.status === 'متعثر' ? 'destructive' : 'secondary'}>
                          {loan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getInvestorNameById(defaultedLoanInvestorMap[loan.id])}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      لا توجد قروض متعثرة أو معلقة حاليًا.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
