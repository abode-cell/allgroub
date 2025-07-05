
'use client';

import { generateDailySummary, type GenerateDailySummaryInput } from '@/ai/flows/generate-daily-summary';
import { useCallback, useEffect, useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useDataState } from '@/contexts/data-context';
import { formatCurrency } from '@/lib/utils';
import { calculateAllDashboardMetrics } from '@/services/dashboard-service';
import type { DashboardMetricsOutput as ServiceMetrics } from '@/services/dashboard-service';


export function DailySummary() {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { 
    currentUser, 
    borrowers: allBorrowers, 
    investors: allInvestors, 
    users, 
    supportTickets,
    investorSharePercentage,
    graceTotalProfitPercentage,
    graceInvestorSharePercentage,
  } = useDataState();
  const role = currentUser?.role;

  const metrics = useMemo(() => {
    if (!currentUser) return null;
    try {
        return calculateAllDashboardMetrics({
            borrowers: allBorrowers,
            investors: allInvestors,
            users,
            currentUser,
            config: {
                investorSharePercentage,
                graceTotalProfitPercentage,
                graceInvestorSharePercentage,
            }
        });
    } catch (e) {
        console.error("Error calculating summary metrics:", e);
        setError("حدث خطأ أثناء حساب بيانات الملخص.");
        return null;
    }
  }, [allBorrowers, allInvestors, users, currentUser, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage]);

  const fetchSummary = useCallback(() => {
    if (!currentUser || !metrics) return;

    startTransition(async () => {
      setError('');
      setSummary('');

      try {
        let payload: GenerateDailySummaryInput;

        if (metrics.role === 'مدير النظام') {
           const adminMetrics = metrics.admin;
           const adminNewSupportTicketsCount = supportTickets.filter(t => !t.isRead).length;
           const adminTotalActiveLoansCount = allBorrowers.filter(b => b.status === 'منتظم' || b.status === 'متأخر').length;
          
          payload = {
            isAdmin: true,
            userName: currentUser.name,
            userRole: currentUser.role,
            adminTotalUsersCount: adminMetrics.totalUsersCount,
            adminActiveManagersCount: adminMetrics.activeManagersCount,
            adminPendingManagersCount: adminMetrics.pendingManagersCount,
            adminTotalCapital: formatCurrency(adminMetrics.totalCapital),
            adminTotalActiveLoansCount: adminTotalActiveLoansCount,
            adminNewSupportTicketsCount: adminNewSupportTicketsCount,
          };

        } else if (metrics.role === 'مدير المكتب' || metrics.role === 'مساعد مدير المكتب' || metrics.role === 'موظف') {
            const { installments, gracePeriod, idleFunds } = metrics;
            const officeManagerDefaultedLoansCount = (installments?.defaultedLoans?.length ?? 0) + (gracePeriod?.defaultedLoans?.length ?? 0);
            
            payload = {
              isAdmin: false,
              userName: currentUser.name,
              userRole: currentUser.role,
              officeManagerTotalBorrowers: (installments?.loans?.length ?? 0) + (gracePeriod?.loans?.length ?? 0),
              officeManagerTotalInvestors: metrics.filteredInvestors.length,
              officeManagerTotalLoansGranted: formatCurrency((installments?.loansGranted ?? 0) + (gracePeriod?.loansGranted ?? 0)),
              officeManagerTotalInvestments: formatCurrency(metrics.totalInvestments),
              officeManagerPendingRequestsCount: metrics.pendingRequestsCount,
              officeManagerTotalNetProfit: formatCurrency((installments?.netProfit ?? 0) + (gracePeriod?.netProfit ?? 0)),
              officeManagerDefaultedLoansCount: officeManagerDefaultedLoansCount,
              officeManagerActiveCapital: formatCurrency((metrics.capital?.total ?? 0) - (idleFunds?.totalIdleFunds ?? 0)),
              officeManagerIdleCapital: formatCurrency(idleFunds?.totalIdleFunds ?? 0),
            };
        } else {
             setError('دور المستخدم غير مدعوم للملخص اليومي.');
             return;
        }
        
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
  }, [currentUser, metrics, allBorrowers, supportTickets]);

  useEffect(() => {
    // We only fetch when metrics are available.
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
