'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import type { DashboardMetricsOutput as ServiceMetrics } from '@/services/dashboard-service';
import { getDailySummary } from '@/app/dashboard/actions';

export function DailySummary({ metrics }: { metrics: ServiceMetrics | null }) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const fetchSummary = useCallback(() => {
    if (!metrics) return;

    startTransition(async () => {
      setError('');
      setSummary('');

      try {
        const result = await getDailySummary(metrics);
        
        if (result.error) {
          setError(result.error);
        } else if (result.summary) {
          setSummary(result.summary);
        } else {
          setError('حدث خطأ غير متوقع أثناء معالجة الملخص.');
        }
      } catch (e: any) {
        console.error("An unexpected error occurred in DailySummary component:", e);
        setError('حدث خطأ أثناء الاتصال بالخادم لإنشاء الملخص.');
      }
    });
  }, [metrics]);

  useEffect(() => {
    if (metrics) {
        fetchSummary();
    }
  }, [metrics, fetchSummary]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="text-primary" />
            الملخص اليومي
          </CardTitle>
          <CardDescription>
            ملخص سريع ومفصل لأهم أحداث اليوم مدعوم بالذكاء الاصطناعي.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchSummary} disabled={isPending || !metrics}>
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          <span className="sr-only">تحديث الملخص</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isPending && !summary && !error ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error ? (
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : summary ? (
          <div
            className="prose prose-sm max-w-none text-foreground dark:prose-invert whitespace-pre-wrap p-4 bg-muted rounded-md border text-right"
            dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }}
          />
        ) : (
            <div className="flex items-center justify-center h-[100px] bg-muted rounded-md">
                <p className="text-muted-foreground text-center">
                في انتظار البيانات لبدء إنشاء الملخص...
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
