'use client';

import { useDataState } from '@/contexts/data-context';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { LoansStatusChart } from '@/components/dashboard/loans-chart';
import { InvestorDashboard } from '@/components/dashboard/investor-dashboard';
import { 
  CircleDollarSign, 
  TrendingUp, 
  ShieldX, 
  Users, 
  Briefcase, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useMemo } from 'react';
import { calculateInvestorFinancials, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardSkeleton = () => (
  <div className="flex flex-col flex-1">
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <header>
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-96 mt-2" />
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-6" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="h-96 col-span-4" />
        <Skeleton className="h-96 col-span-3" />
      </div>
    </main>
  </div>
);

export default function DashboardPage() {
  const { 
    currentUser, 
    borrowers: allBorrowers, 
    investors: allInvestors, 
    transactions,
    authLoading,
    dataLoading
  } = useDataState();

  const role = currentUser?.role;

  // Show investor dashboard for investors
  if (role === 'مستثمر') {
    return <InvestorDashboard />;
  }

  // Filter data based on user role and office
  const { borrowers, investors } = useMemo(() => {
    if (!currentUser) return { borrowers: [], investors: [] };
    
    if (role === 'مدير النظام') {
      return { borrowers: allBorrowers, investors: allInvestors };
    }
    
    return { 
      borrowers: allBorrowers.filter(b => b.office_id === currentUser.office_id),
      investors: allInvestors.filter(i => i.office_id === currentUser.office_id)
    };
  }, [currentUser, allBorrowers, allInvestors, role]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalCapital = investors.reduce((sum, investor) => {
      const financials = calculateInvestorFinancials(investor, borrowers, transactions);
      return sum + financials.totalCapitalInSystem;
    }, 0);

    const totalLoansGranted = borrowers
      .filter(b => b.status !== 'معلق' && b.status !== 'مرفوض')
      .reduce((sum, b) => sum + b.amount, 0);

    const totalDefaultedFunds = investors.reduce((sum, investor) => {
      const financials = calculateInvestorFinancials(investor, borrowers, transactions);
      return sum + (financials.defaultedFunds || 0);
    }, 0);

    const activeInvestors = investors.filter(i => i.status === 'نشط').length;
    const totalInvestors = investors.length;

    const pendingLoans = borrowers.filter(b => b.status === 'معلق').length;

    return {
      totalCapital,
      totalLoansGranted,
      totalDefaultedFunds,
      activeInvestors,
      totalInvestors,
      pendingLoans
    };
  }, [borrowers, investors, transactions]);

  // Trial period check for office managers
  const trialWarning = useMemo(() => {
    if (role !== 'مدير المكتب' || !currentUser?.trialEndsAt) return null;
    
    const trialEnd = new Date(currentUser.trialEndsAt);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) {
      return { type: 'expired', message: 'انتهت فترتك التجريبية. يرجى التواصل مع الدعم لتفعيل حسابك.' };
    } else if (daysLeft <= 3) {
      return { type: 'warning', message: `تنتهي فترتك التجريبية خلال ${daysLeft} أيام.` };
    }
    
    return null;
  }, [role, currentUser]);

  if (authLoading || dataLoading) {
    return <DashboardSkeleton />;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col flex-1">
        <main className="flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا يمكن تحميل بيانات المستخدم.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex flex-col gap-4">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">
              مرحباً، {currentUser.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              نظرة عامة على أداء منصتك المالية.
            </p>
          </header>

          {/* Trial period warning */}
          {trialWarning && (
            <Alert variant={trialWarning.type === 'expired' ? 'destructive' : 'default'}>
              <Clock className="h-4 w-4" />
              <AlertDescription>{trialWarning.message}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            title="إجمالي رأس المال"
            value={formatCurrency(kpis.totalCapital)}
            change=""
            icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
          />
          <KpiCard
            title="القروض الممنوحة"
            value={formatCurrency(kpis.totalLoansGranted)}
            change=""
            icon={<Briefcase className="size-6 text-muted-foreground" />}
          />
          <KpiCard
            title="المستثمرون النشطون"
            value={`${kpis.activeInvestors}/${kpis.totalInvestors}`}
            change=""
            icon={<Users className="size-6 text-muted-foreground" />}
          />
          <KpiCard
            title="الأموال المتعثرة"
            value={formatCurrency(kpis.totalDefaultedFunds)}
            change=""
            icon={<ShieldX className="size-6 text-muted-foreground" />}
            changeColor="text-red-500"
          />
          <KpiCard
            title="الطلبات المعلقة"
            value={kpis.pendingLoans.toString()}
            change="قرض"
            icon={<AlertTriangle className="size-6 text-muted-foreground" />}
            changeColor="text-amber-500"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-12 lg:col-span-4">
            <RecentTransactions borrowers={borrowers} investors={investors} />
          </div>
          <div className="col-span-12 lg:col-span-3">
            <LoansStatusChart borrowers={borrowers} />
          </div>
        </div>

        {/* Quick Stats */}
        {role !== 'موظف' && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">قروض الأقساط</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {borrowers.filter(b => b.loanType === 'اقساط').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  إجمالي القروض بنظام الأقساط
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">قروض المهلة</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {borrowers.filter(b => b.loanType === 'مهلة').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  إجمالي القروض بنظام المهلة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل السداد</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {borrowers.length > 0 
                    ? Math.round((borrowers.filter(b => b.paymentStatus === 'تم السداد').length / borrowers.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  نسبة القروض المسددة
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}