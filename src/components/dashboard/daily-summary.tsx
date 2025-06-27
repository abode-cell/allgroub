'use client';

import { generateDailySummary } from '@/ai/flows/generate-daily-summary';
import { useData } from '@/contexts/data-context';
import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function DailySummary() {
  const { borrowers, investors } = useData();
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const fetchSummary = () => {
    startTransition(async () => {
      setError('');
      try {
        // For this mock app, "daily" will mean "all time" stats from our data file
        const newBorrowersCount = borrowers.filter(b => b.status !== 'معلق').length;
        const newInvestorsCount = investors.filter(i => i.status === 'نشط').length;
        const totalLoansGranted = borrowers.filter(b => b.status !== 'معلق').reduce((acc, b) => acc + b.amount, 0);
        const totalNewInvestments = investors.filter(i => i.status === 'نشط').reduce((acc, i) => acc + i.amount, 0);
        const pendingRequestsCount = borrowers.filter(b => b.status === 'معلق').length + investors.filter(i => i.status === 'معلق').length;
        
        const result = await generateDailySummary({
          newBorrowersCount,
          newInvestorsCount,
          totalLoansGranted,
          totalNewInvestments,
          pendingRequestsCount
        });

        if (result.summary) {
          setSummary(result.summary);
        } else {
          setError('لم يتمكن الذكاء الاصطناعي من إنشاء ملخص.');
        }
      } catch (e) {
        console.error(e);
        setError('حدث خطأ أثناء إنشاء الملخص. يرجى المحاولة مرة أخرى.');
      }
    });
  };

  useEffect(() => {
    fetchSummary();
  }, []); // Run only on initial mount

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
        {isPending ? (
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
