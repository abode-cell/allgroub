
'use client';

import { generateDailySummary } from '@/ai/flows/generate-daily-summary';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useDataState } from '@/contexts/data-context';
import { calculateAllDashboardMetrics } from '@/services/dashboard-service';

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

  const fetchSummary = useCallback(() => {
    if (!currentUser) return;
    startTransition(async () => {
      setError('');
      try {
        const metricsInput = {
          borrowers: allBorrowers,
          investors: allInvestors,
          users,
          currentUser,
          config: { investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage }
        };

        let metrics;
        try {
          metrics = calculateAllDashboardMetrics(metricsInput);
        } catch (e) {
          console.error("Failed to calculate dashboard metrics:", e);
          setError("حدث خطأ أثناء حساب مقاييس لوحة التحكم. قد تكون بعض البيانات غير متناسقة. يرجى مراجعة البيانات أو التواصل مع الدعم الفني.");
          return;
        }

        if (role === 'مدير النظام') {
          if (metrics.role !== 'مدير النظام') {
              setError('حدث خطأ في حساب المقاييس.');
              return;
          }

          const adminNewSupportTicketsCount = supportTickets.filter(t => !t.isRead).length;
          const adminTotalActiveLoansCount = allBorrowers.filter(b => b.status === 'منتظم' || b.status === 'متأخر').length;

          const result = await generateDailySummary({
            userName: currentUser.name,
            userRole: currentUser.role,
            isAdmin: true,
            adminTotalUsersCount: metrics.admin.totalUsersCount,
            adminActiveManagersCount: metrics.admin.activeManagersCount,
            adminPendingActivationsCount: metrics.admin.pendingManagersCount,
            adminTotalCapitalInSystem: metrics.admin.totalCapital,
            adminTotalActiveLoansCount: adminTotalActiveLoansCount,
            adminNewSupportTicketsCount: adminNewSupportTicketsCount,
          });
          if (result.summary) setSummary(result.summary);
          else setError('لم يتمكن الذكاء الاصطناعي من إنشاء ملخص.');

        } else { // Office Manager or assistant
            if (metrics.role === 'مدير النظام' || metrics.role === 'مستثمر') {
                setError('لا يمكن إنشاء ملخص لهذا الدور.');
                return;
            }

            const { filteredBorrowers, filteredInvestors } = metrics;
            const officeManagerTotalBorrowers = filteredBorrowers.length;
            const officeManagerTotalInvestors = filteredInvestors.length;
            const officeManagerTotalLoansGranted = filteredBorrowers.reduce((acc, b) => acc + b.amount, 0);
            const officeManagerTotalInvestments = filteredInvestors.reduce((total, investor) => {
                const capitalDeposits = (investor.transactionHistory || [])
                  .filter(tx => tx.type === 'إيداع رأس المال')
                  .reduce((sum, tx) => sum + tx.amount, 0);
                return total + capitalDeposits;
            }, 0);

            const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
            const employeeIds = users.filter(u => u.managedBy === managerId).map(u => u.id);

            const pendingBorrowerRequests = allBorrowers.filter(b => b.status === 'معلق' && b.submittedBy && employeeIds.includes(b.submittedBy));
            const pendingInvestorRequests = allInvestors.filter(i => i.status === 'معلق' && i.submittedBy && employeeIds.includes(i.submittedBy));
            const pendingRequestsCount = pendingBorrowerRequests.length + pendingInvestorRequests.length;


            const defaultedLoansCount = filteredBorrowers.filter(b => b.status === 'متعثر' || b.paymentStatus === 'متعثر' || b.paymentStatus === 'تم اتخاذ الاجراءات القانونيه').length;
            const totalNetProfit = metrics.installments.netProfit + metrics.gracePeriod.netProfit;
            const idleCapital = metrics.idleFunds.totalIdleFunds;
            const activeCapital = metrics.capital.total - idleCapital;
            
            const result = await generateDailySummary({
              userName: currentUser.name,
              userRole: currentUser.role,
              isAdmin: false,
              officeManagerTotalBorrowers,
              officeManagerTotalInvestors,
              officeManagerTotalLoansGranted,
              officeManagerTotalInvestments,
              officeManagerPendingRequestsCount: pendingRequestsCount,
              officeManagerDefaultedLoansCount: defaultedLoansCount,
              officeManagerTotalNetProfit: totalNetProfit,
              officeManagerIdleCapital: idleCapital,
              officeManagerActiveCapital: activeCapital,
            });
            if (result.summary) setSummary(result.summary);
            else setError('لم يتمكن الذكاء الاصطناعي من إنشاء ملخص.');
        }

      } catch (e) {
        console.error(e);
        setError('حدث خطأ أثناء إنشاء الملخص. يرجى المحاولة مرة أخرى.');
      }
    });
  }, [allBorrowers, allInvestors, users, role, currentUser, supportTickets, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage]);

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
            ملخص سريع ومفصل لأهم أحداث اليوم مدعوم بالذكاء الاصطناعي.
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
