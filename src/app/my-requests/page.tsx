'use client';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { Borrower, Investor } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const statusVariant: {
  [key: string]: 'default' | 'secondary' | 'destructive' | 'outline';
} = {
  منتظم: 'default',
  نشط: 'default',
  معلق: 'secondary',
  مرفوض: 'destructive',
};

const getStatusText = (status: Borrower['status'] | Investor['status']) => {
    switch (status) {
        case 'معلق': return 'معلق';
        case 'مرفوض': return 'مرفوض';
        default: return 'تمت الموافقة';
    }
}

export default function MyRequestsPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const { borrowers, investors } = useData();

  const isEmployee = role === 'موظف';

  useEffect(() => {
    if (!isEmployee) {
      router.replace('/');
    }
  }, [role, isEmployee, router]);

  if (!isEmployee) {
    return null;
  }
  
  // Use logged-in employee's ID
  const myBorrowerRequests = borrowers.filter(b => b.submittedBy === user?.id);
  const myInvestorRequests = investors.filter(i => i.submittedBy === user?.id);

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">طلباتي</h1>
          <p className="text-muted-foreground mt-1">
            تتبع حالة طلباتك التي قمت بتقديمها.
          </p>
        </header>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>طلبات المقترضين</CardTitle>
              <CardDescription>
                قائمة بطلبات إضافة المقترضين التي قمت بتقديمها.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المقترض</TableHead>
                    <TableHead>المبلغ المطلوب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>سبب الرفض</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBorrowerRequests.length > 0 ? (
                    myBorrowerRequests.map((borrower) => (
                      <TableRow key={borrower.id}>
                        <TableCell className="font-medium">{borrower.name}</TableCell>
                        <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                        <TableCell>
                           <Badge variant={statusVariant[borrower.status] || 'outline'}>
                                {getStatusText(borrower.status)}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-destructive">{borrower.rejectionReason || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        لم تقم بتقديم أي طلبات لإضافة مقترضين.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>طلبات المستثمرين</CardTitle>
              <CardDescription>
                قائمة بطلبات إضافة المستثمرين التي قمت بتقديمها.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المستثمر</TableHead>
                    <TableHead>مبلغ الاستثمار</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>سبب الرفض</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myInvestorRequests.length > 0 ? (
                    myInvestorRequests.map((investor) => (
                      <TableRow key={investor.id}>
                        <TableCell className="font-medium">{investor.name}</TableCell>
                        <TableCell>{formatCurrency(investor.amount)}</TableCell>
                        <TableCell>
                           <Badge variant={statusVariant[investor.status] || 'outline'}>
                                {getStatusText(investor.status)}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-destructive">{investor.rejectionReason || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        لم تقم بتقديم أي طلبات لإضافة مستثمرين.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
