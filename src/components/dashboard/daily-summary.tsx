'use client';

import {
  generateDailySummary,
  type GenerateDailySummaryOutput,
} from '@/ai/flows/generate-daily-summary';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useDataState } from '@/contexts/data-context';
import { formatCurrency } from '@/lib/utils';
import type { DashboardMetricsOutput as ServiceMetrics } from '@/services/dashboard-service';

export function DailySummary({ metrics }: { metrics: ServiceMetrics | null }) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { currentUser, supportTickets, borrowers: allBorrowers } = useDataState();

  const fetchSummary = useCallback(() => {
    if (!currentUser || !metrics) return;

    startTransition(async () => {
      setError('');
      setSummary('');

      try {
        const isAdmin = metrics.role === 'مدير النظام';
        const { admin, manager } = metrics;
        
        let contextString = '';

        if (isAdmin) {
            contextString = `
ملخص مدير النظام:
- إجمالي المستخدمين: ${admin.totalUsersCount}
- مدراء المكاتب النشطون: ${admin.activeManagersCount}
- الحسابات التي تنتظر التفعيل: ${admin.pendingManagersCount}
- إجمالي رأس المال في النظام: ${formatCurrency(admin.totalCapital)}
- إجمالي القروض النشطة: ${allBorrowers.filter(b => b.status === 'منتظم' || b.status === 'متأخر').length}
- طلبات الدعم الجديدة: ${supportTickets.filter(t => !t.isRead).length}
            `;
        } else {
            contextString = `
ملخص مدير المكتب لـ ${currentUser.name} (${currentUser.role}):
- إجمالي المقترضين: ${manager.installments.loans.length + manager.gracePeriod.loans.length}
- إجمالي المستثمرين: ${manager.filteredInvestors.length}
- إجمالي مبالغ القروض: ${formatCurrency(manager.installments.loansGranted + manager.gracePeriod.loansGranted)}
- إجمالي مبالغ الاستثمارات: ${formatCurrency(manager.totalInvestments)}
- الطلبات المعلقة للمراجعة: ${manager.pendingRequestsCount}
- الأرباح الصافية: ${formatCurrency(manager.installments.netProfit + manager.gracePeriod.netProfit)}
- القروض المتعثرة: ${manager.installments.defaultedLoans.length + manager.gracePeriod.defaultedLoans.length}
- رأس المال النشط: ${formatCurrency(manager.capital.active)}
- رأس المال الخامل: ${formatCurrency(manager.idleFunds.totalIdleFunds)}
            `;
        }
        
        const result = await generateDailySummary(contextString.trim());
        
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
  }, [currentUser, metrics, supportTickets, allBorrowers]);

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
