'use client';

import {
  generateDailySummary,
} from '@/ai/flows/generate-daily-summary';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import type { DashboardMetricsOutput as ServiceMetrics } from '@/services/dashboard-service';
import { formatCurrency } from '@/lib/utils';

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
        const { role, admin, manager } = metrics;
        let summaryContext = '';

        if (role === 'مدير النظام') {
          summaryContext += `# ملخص مدير النظام\n`;
          summaryContext += `*   **المستخدمون:** لديك ما مجموعه **${admin.totalUsersCount}** مستخدمًا في النظام.\n`;
          summaryContext += `*   **مدراء المكاتب:** هناك **${admin.activeManagersCount}** مدير مكتب نشط، مع **${admin.pendingManagersCount}** حسابًا في انتظار التفعيل.\n`;
          summaryContext += `*   **المالية:** إجمالي رأس المال في النظام هو **${formatCurrency(admin.totalCapital)}**.\n`;
          summaryContext += `*   **العمليات:** يوجد **${admin.totalActiveLoans}** قرضًا نشطًا حاليًا، و**${admin.newSupportTickets}** طلب دعم جديد في انتظار المراجعة.\n`;
        } else if (['مدير المكتب', 'مساعد مدير المكتب', 'موظف'].includes(role)) {
          const totalLoanAmount = (manager.installments?.loansGranted ?? 0) + (manager.gracePeriod?.loansGranted ?? 0);
          const netProfit = (manager.installments?.netProfit ?? 0) + (manager.gracePeriod?.netProfit ?? 0);
          const defaultedLoansCount = (manager.installments?.defaultedLoans?.length ?? 0) + (manager.gracePeriod?.defaultedLoans?.length ?? 0);
          const idleCapital = manager.idleFunds?.totalIdleFunds ?? 0;
          
          summaryContext += `# ملخص المكتب لـ ${manager.managerName}\n`;
          summaryContext += `*   **الحافظة:** تدير حاليًا **${manager.totalBorrowers}** مقترضًا و**${manager.filteredInvestors?.length ?? 0}** مستثمرًا.\n`;
          summaryContext += `*   **المالية:** إجمالي قيمة القروض الممنوحة هو **${formatCurrency(totalLoanAmount)}**، بينما يبلغ إجمالي الاستثمارات **${formatCurrency(manager.totalInvestments)}**.\n`;
          summaryContext += `*   **الأداء:** صافي الربح المحقق هو **${formatCurrency(netProfit)}**.\n`;
          summaryContext += `*   **السيولة:** رأس المال النشط (المستثمر) هو **${formatCurrency(manager.capital.active)}**، بينما رأس المال الخامل المتاح للاستثمار هو **${formatCurrency(idleCapital)}**.\n`;
          summaryContext += `*   **المهام:** لديك **${manager.pendingRequestsCount}** طلبات جديدة في انتظار المراجعة.\n`;
          summaryContext += `*   **المخاطر:** هناك **${defaultedLoansCount}** قرضًا متعثرًا يتطلب المتابعة.\n`;
        }
        
        if (summaryContext.trim() === '') {
          setError('لا يوجد بيانات كافية لإنشاء ملخص لهذا الدور.');
          return;
        }

        const result = await generateDailySummary({ context: summaryContext });
        
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
