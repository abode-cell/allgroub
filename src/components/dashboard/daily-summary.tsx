'use client';

import { generateDailySummary, type GenerateDailySummaryInput } from '@/ai/flows/generate-daily-summary';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useDataState } from '@/contexts/data-context';
import { formatCurrency } from '@/lib/utils';
import { calculateInvestorFinancials } from '@/services/dashboard-service';


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
  } = useDataState();
  const role = currentUser?.role;

  const fetchSummary = useCallback(() => {
    if (!currentUser) return;

    startTransition(async () => {
      setError('');
      setSummary('');

      try {
        let payload: GenerateDailySummaryInput;

        if (role === 'مدير النظام') {
           const adminNewSupportTicketsCount = supportTickets.filter(t => !t.isRead).length;
           const adminTotalActiveLoansCount = allBorrowers.filter(b => b.status === 'منتظم' || b.status === 'متأخر').length;
           const officeManagers = users.filter(u => u.role === 'مدير المكتب');
           const pendingManagers = officeManagers.filter(u => u.status === 'معلق');
           const activeManagersCount = officeManagers.length - pendingManagers.length;

           const totalCapital = allInvestors.reduce((acc, investor) => {
               const financials = calculateInvestorFinancials(investor, allBorrowers);
               return acc + financials.totalCapitalInSystem;
           }, 0);
          
          payload = {
            isAdmin: true,
            userName: currentUser.name,
            userRole: currentUser.role,
            adminTotalUsersCount: users.length,
            adminActiveManagersCount: activeManagersCount,
            adminPendingManagersCount: pendingManagers.length,
            adminTotalCapital: formatCurrency(totalCapital),
            adminTotalActiveLoansCount: adminTotalActiveLoansCount,
            adminNewSupportTicketsCount: adminNewSupportTicketsCount,
          };

        } else { // Office Manager or assistant
            const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
            if (!managerId) {
                setError('لم يتم العثور على مدير مسؤول.');
                return;
            }

            const relevantUserIds = new Set(users.filter(u => u.managedBy === managerId || u.id === managerId).map(u => u.id));
            relevantUserIds.add(currentUser.id);

            const filteredBorrowers = allBorrowers.filter(b => b.submittedBy && relevantUserIds.has(b.submittedBy));
            const filteredInvestors = allInvestors.filter(i => {
                const investorUser = users.find(u => u.id === i.id);
                return investorUser?.managedBy === managerId;
            });

            const officeManagerTotalBorrowers = filteredBorrowers.length;
            const officeManagerTotalInvestors = filteredInvestors.length;
            const officeManagerTotalLoansGranted = filteredBorrowers.reduce((acc, b) => acc + b.amount, 0);

            const officeManagerTotalInvestments = filteredInvestors.reduce((total, investor) => {
                const capitalDeposits = (investor.transactionHistory || [])
                  .filter(tx => tx.type === 'إيداع رأس المال')
                  .reduce((sum, tx) => sum + tx.amount, 0);
                return total + capitalDeposits;
            }, 0);

            const employeeIds = users.filter(u => u.managedBy === managerId).map(u => u.id);
            const pendingBorrowerRequests = allBorrowers.filter(b => b.status === 'معلق' && b.submittedBy && employeeIds.includes(b.submittedBy));
            const pendingInvestorRequests = allInvestors.filter(i => i.status === 'معلق' && i.submittedBy && employeeIds.includes(i.submittedBy));
            const officeManagerPendingRequestsCount = pendingBorrowerRequests.length + pendingInvestorRequests.length;
            const officeManagerDefaultedLoansCount = filteredBorrowers.filter(b => b.status === 'متعثر' || b.paymentStatus === 'متعثر' || b.paymentStatus === 'تم اتخاذ الاجراءات القانونيه').length;
            
            const financials = filteredInvestors.reduce((acc, investor) => {
                const invFinancials = calculateInvestorFinancials(investor, allBorrowers); // Corrected to use allBorrowers
                
                const fundedLoans = allBorrowers.filter(b => (b.fundedBy || []).some(f => f.investorId === investor.id)); // Corrected to use allBorrowers

                fundedLoans.forEach(loan => {
                  const funding = (loan.fundedBy || []).find(f => f.investorId === investor.id);
                  if (!funding) return;

                  if (loan.loanType === 'اقساط' && loan.rate && loan.term) {
                      const totalInterest = funding.amount * (loan.rate / 100) * loan.term;
                      const investorShare = totalInterest * ((investor.installmentProfitShare ?? 70) / 100);
                      acc.totalNetProfit += investorShare + (totalInterest - investorShare);
                  } else if (loan.loanType === 'مهلة') {
                      const totalProfit = funding.amount * (30 / 100); // Assuming 30% grace profit from config
                      const investorShare = totalProfit * ((investor.gracePeriodProfitShare ?? 33.3) / 100);
                      acc.totalNetProfit += investorShare + (totalProfit - investorShare - (loan.discount || 0));
                  }
                });
                
                acc.idleCapital += invFinancials.idleInstallmentCapital + invFinancials.idleGraceCapital;
                acc.activeCapital += invFinancials.activeCapital;

                return acc;
            }, { totalNetProfit: 0, idleCapital: 0, activeCapital: 0 });

            payload = {
              isAdmin: false,
              userName: currentUser.name,
              userRole: currentUser.role,
              officeManagerTotalBorrowers,
              officeManagerTotalInvestors,
              officeManagerTotalLoansGranted: formatCurrency(officeManagerTotalLoansGranted),
              officeManagerTotalInvestments: formatCurrency(officeManagerTotalInvestments),
              officeManagerPendingRequestsCount,
              officeManagerTotalNetProfit: formatCurrency(financials.totalNetProfit),
              officeManagerDefaultedLoansCount,
              officeManagerActiveCapital: formatCurrency(financials.activeCapital),
              officeManagerIdleCapital: formatCurrency(financials.idleCapital),
            };
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
  }, [allBorrowers, allInvestors, users, role, currentUser, supportTickets]);

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
