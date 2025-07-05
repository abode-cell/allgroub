
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

  const metrics: ServiceMetrics | null = useMemo(() => {
    if (!currentUser) return null;
    setError('');
    try {
      const result = calculateAllDashboardMetrics({
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
      return result;
    } catch (e) {
      console.error("Failed to calculate dashboard metrics for summary:", e);
      setError("حدث خطأ أثناء حساب بيانات الملخص. قد تكون بعض البيانات غير متناسقة.");
      return null;
    }
  }, [allBorrowers, allInvestors, users, currentUser, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage]);

  const fetchSummary = useCallback(() => {
    if (!currentUser || !metrics) return;

    startTransition(async () => {
      setError('');
      setSummary('');

      try {
        const isAdmin = metrics.role === 'مدير النظام';
        
        // Data for the prompt is now taken from the unified metrics object
        const { admin, manager } = metrics;
        
        // These are calculated here as they depend on data not included in the main service for performance reasons.
        const adminNewSupportTicketsCount = supportTickets.filter(t => !t.isRead).length;
        const adminTotalActiveLoansCount = allBorrowers.filter(b => b.status === 'منتظم' || b.status === 'متأخر').length;

        const payload: GenerateDailySummaryInput = {
            isAdmin: isAdmin,
            userName: currentUser.name,
            userRole: currentUser.role,
            
            // Admin data - will be zeroed out from service if not admin
            adminTotalUsersCount: admin.totalUsersCount,
            adminActiveManagersCount: admin.activeManagersCount,
            adminPendingManagersCount: admin.pendingManagersCount,
            adminTotalCapital: formatCurrency(admin.totalCapital),
            adminTotalActiveLoansCount: adminTotalActiveLoansCount,
            adminNewSupportTicketsCount: adminNewSupportTicketsCount,

            // Manager data - will be zeroed out from service if admin
            officeManagerTotalBorrowers: manager.installments.loans.length + manager.gracePeriod.loans.length,
            officeManagerTotalInvestors: manager.filteredInvestors.length,
            officeManagerTotalLoansGranted: formatCurrency(manager.installments.loansGranted + manager.gracePeriod.loansGranted),
            officeManagerTotalInvestments: formatCurrency(manager.totalInvestments),
            officeManagerPendingRequestsCount: manager.pendingRequestsCount,
            officeManagerTotalNetProfit: formatCurrency(manager.installments.netProfit + manager.gracePeriod.netProfit),
            officeManagerDefaultedLoansCount: manager.installments.defaultedLoans.length + manager.gracePeriod.defaultedLoans.length,
            officeManagerActiveCapital: formatCurrency(manager.capital.active),
            officeManagerIdleCapital: formatCurrency(manager.idleFunds.totalIdleFunds),
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
