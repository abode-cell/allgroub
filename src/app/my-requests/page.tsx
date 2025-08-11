

'use client';

import { useDataState } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import type { Borrower, Investor } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
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
  const { borrowers, investors, currentUser } = useDataState();
  const router = useRouter();

  const role = currentUser?.role;
  const isEmployee = role === 'موظف';

  useEffect(() => {
    if (currentUser && !isEmployee) {
      router.replace('/');
    }
  }, [currentUser, isEmployee, router]);

  const myBorrowerRequests = useMemo(() => {
    if (!currentUser) return [];
    return borrowers.filter(b => b.submittedBy === currentUser?.id);
  }, [borrowers, currentUser]);

  const myInvestorRequests = useMemo(() => {
    if (!currentUser) return [];
    return investors.filter(i => i.submittedBy === currentUser?.id);
  }, [investors, currentUser]);
  
  if (!currentUser || !isEmployee) {
    return <PageSkeleton />;
  }
  
  const getInvestorInitialCapital = (investor: Investor): number => {
    const capitalDeposit = investor.transactionHistory?.find(
      (tx) => tx.type === 'إيداع رأس المال' && tx.description.includes('تأسيسي')
    );
    return capitalDeposit?.amount || 0;
  };


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
              <CardTitle>طلبات القروض</CardTitle>
              <CardDescription>
                قائمة بطلبات إضافة القروض التي قمت بتقديمها.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم القرض/العميل</TableHead>
                    <TableHead>المبلغ المطلوب</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead>سبب الرفض</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBorrowerRequests.length > 0 ? (
                    myBorrowerRequests.map((borrower) => (
                      <TableRow key={borrower.id}>
                        <TableCell className="font-medium">{borrower.name}</TableCell>
                        <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                        <TableCell className="text-center">
                           <Badge variant={statusVariant[borrower.status] || 'outline'}>
                                {getStatusText(borrower.status)}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-destructive">{borrower.rejectionReason || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        لم تقم بتقديم أي طلبات لإضافة قروض.
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
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead>سبب الرفض</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myInvestorRequests.length > 0 ? (
                    myInvestorRequests.map((investor) => (
                      <TableRow key={investor.id}>
                        <TableCell className="font-medium">{investor.name}</TableCell>
                        <TableCell>{formatCurrency(getInvestorInitialCapital(investor))}</TableCell>
                        <TableCell className="text-center">
                           <Badge variant={statusVariant[investor.status] || 'outline'}>
                                {getStatusText(investor.status)}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-destructive">{investor.rejectionReason || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
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