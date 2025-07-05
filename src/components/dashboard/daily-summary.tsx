'use client';

import {
  generateDailySummary,
  type GenerateDailySummaryInput,
} from '@/ai/flows/generate-daily-summary';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import type { DashboardMetricsOutput as ServiceMetrics } from '@/services/dashboard-service';

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
        const isSystemAdmin = metrics.role === 'مدير النظام';
        const isOfficeRole = ['مدير المكتب', 'مساعد مدير المكتب', 'موظف'].includes(metrics.role);

        // This payload is now fortified with optional chaining (?.) and nullish coalescing (??)
        // to prevent any TypeError crashes if a nested property doesn't exist.
        const payload: GenerateDailySummaryInput = {
          isSystemAdmin,
          isOfficeRole,
          managerName: metrics.manager?.filteredInvestors[0]?.name,
          // Admin fields with safe fallbacks
          adminTotalUsersCount: metrics.admin?.totalUsersCount ?? 0,
          adminActiveManagersCount: metrics.admin?.activeManagersCount ?? 0,
          adminPendingManagersCount: metrics.admin?.pendingManagersCount ?? 0,
          adminTotalCapital: metrics.admin?.totalCapital ?? 0,
          adminTotalActiveLoans: metrics.admin?.totalActiveLoans ?? 0,
          adminNewSupportTickets: metrics.admin?.newSupportTickets ?? 0,
          // Manager fields with safe fallbacks
          managerTotalBorrowers: metrics.manager?.totalBorrowers ?? 0,
          managerTotalInvestors: metrics.manager?.filteredInvestors?.length ?? 0,
          managerTotalLoanAmount: (metrics.manager?.installments?.loansGranted ?? 0) + (metrics.manager?.gracePeriod?.loansGranted ?? 0),
          managerTotalInvestmentAmount: metrics.manager?.totalInvestments ?? 0,
          managerPendingRequests: metrics.manager?.pendingRequestsCount ?? 0,
          managerNetProfit: (metrics.manager?.installments?.netProfit ?? 0) + (metrics.manager?.gracePeriod?.netProfit ?? 0),
          managerDefaultedLoansCount: (metrics.manager?.installments?.defaultedLoans?.length ?? 0) + (metrics.manager?.gracePeriod?.defaultedLoans?.length ?? 0),
          managerActiveCapital: metrics.manager?.capital?.active ?? 0,
          managerIdleCapital: metrics.manager?.idleFunds?.totalIdleFunds ?? 0,
        };
        
        const result = await generateDailySummary(payload);
        
        if (result && result.summary) {
          setSummary(result.summary);
        } else {
          setError('لم يتمكن الذكاء الاصطناعي من إنشاء ملخص.');
        }

      } catch (e) {
        console.error(e);
        setError('حدث خطأ أثناء إنشاء الملخص. يرجى المحاولة مرة أخرى.');
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
        {isPending && !summary ? (
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
        ) : (
          <div className="prose prose-sm max-w-none text-foreground dark:prose-invert whitespace-pre-wrap p-4 bg-muted rounded-md border text-right">
            {summary.split('**').map((part, index) =>
              index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
