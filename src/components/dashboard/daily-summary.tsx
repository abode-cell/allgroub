
'use client';

import { generateDailySummary } from '@/ai/flows/generate-daily-summary';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useDataState } from '@/contexts/data-context';
import type { Borrower, Investor } from '@/lib/types';

export function DailySummary({ borrowers: propsBorrowers, investors: propsInvestors }: { borrowers?: Borrower[], investors?: Investor[]}) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { currentUser, borrowers: allBorrowers, investors: allInvestors, users } = useDataState();
  const role = currentUser?.role;

  const borrowers = propsBorrowers ?? allBorrowers;
  const investors = propsInvestors ?? allInvestors;

  const fetchSummary = useCallback(() => {
    if (!currentUser) return;
    startTransition(async () => {
      setError('');
      try {
        if (role === 'مدير النظام') {
           const totalUsersCount = users.length;
           const newOfficeManagersCount = users.filter(u => u.role === 'مدير المكتب').length;
           const pendingActivationsCount = users.filter(u => u.role === 'مدير المكتب' && u.status === 'معلق').length;
           
            const result = await generateDailySummary({
              userName: currentUser.name,
              userRole: currentUser.role,
              totalUsersCount,
              newOfficeManagersCount,
              pendingActivationsCount
            });
            if (result.summary) setSummary(result.summary);
            else setError('لم يتمكن الذكاء الاصطناعي من إنشاء ملخص.');

        } else {
            const newBorrowersCount = borrowers.filter(b => b.status !== 'معلق').length;
            const newInvestorsCount = investors.filter(i => i.status === 'نشط').length;
            const totalLoansGranted = borrowers.filter(b => b.status !== 'معلق').reduce((acc, b) => acc + b.amount, 0);
            
            const totalNewInvestments = investors
              .filter(i => i.status === 'نشط')
              .reduce((total, investor) => {
                const capitalDeposits = investor.transactionHistory
                  .filter(tx => tx.type === 'إيداع رأس المال')
                  .reduce((sum, tx) => sum + tx.amount, 0);
                return total + capitalDeposits;
              }, 0);

            const pendingRequestsCount = borrowers.filter(b => b.status === 'معلق').length + investors.filter(i => i.status === 'معلق').length;
            
            const result = await generateDailySummary({
              userName: currentUser.name,
              userRole: currentUser.role,
              newBorrowersCount,
              newInvestorsCount,
              totalLoansGranted,
              totalNewInvestments,
              pendingRequestsCount
            });
            if (result.summary) setSummary(result.summary);
            else setError('لم يتمكن الذكاء الاصطناعي من إنشاء ملخص.');
        }

      } catch (e) {
        console.error(e);
        setError('حدث خطأ أثناء إنشاء الملخص. يرجى المحاولة مرة أخرى.');
      }
    });
  }, [borrowers, investors, users, role, currentUser]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="text-primary" />
            الملخص اليومي
          </CardTitle>
          <CardDescription>
            ملخص سريع لأهم أحداث اليوم مدعوم بالذكاء الاصطناعي.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchSummary} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          <span className="sr-only">تحديث الملخص</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isPending && !summary ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : error ? (
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">{summary}</p>
        )}
      </CardContent>
    </Card>
  );
}
