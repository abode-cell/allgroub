'use client';

import { CircleDollarSign, Landmark, ShieldAlert, ShieldX, TrendingUp, Users } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ProfitChart } from '@/components/dashboard/profit-chart';
import { LoansStatusChart } from '@/components/dashboard/loans-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { useAuth } from '@/contexts/auth-context';
import { InvestorDashboard } from '@/components/dashboard/investor-dashboard';
import { borrowersData } from './borrowers/page';

export default function DashboardPage() {
  const { role } = useAuth();

  const totalCapital = 1250000;
  const loansGranted = 850000;
  const netProfit = 125000;
  const dueDebts = 75000;
  
  const defaultedFunds = borrowersData
    .filter((b) => b.status === 'متعثر' || b.status === 'معلق')
    .reduce((acc, b) => acc + b.amount, 0);
  
  const totalLoanAmount = borrowersData.reduce((acc, b) => acc + b.amount, 0);
  const defaultRate = totalLoanAmount > 0 ? (defaultedFunds / totalLoanAmount) * 100 : 0;


  if (role === 'مستثمر') {
    return <InvestorDashboard />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            لوحة التحكم المالية
          </h1>
          <p className="text-muted-foreground mt-1">
            نظرة عامة على أداء منصتك المالية.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            title="إجمالي رأس المال"
            value="١٬٢٥٠٬٠٠٠ ر.س"
            change="+١٢.٥٪"
            icon={<CircleDollarSign className="size-6 text-muted-foreground" />}
            changeColor="text-green-500"
          />
          <KpiCard
            title="القروض الممنوحة"
            value="٨٥٠٬٠٠٠ ر.س"
            change="+٨.٢٪"
            icon={<Landmark className="size-6 text-muted-foreground" />}
            changeColor="text-green-500"
          />
           {role !== 'موظف' && (
            <KpiCard
              title="صافي الربح"
              value="١٢٥٬٠٠٠ ر.س"
              change="+١٥٪"
              icon={<TrendingUp className="size-6 text-muted-foreground" />}
              changeColor="text-green-500"
            />
          )}
          <KpiCard
            title="الديون المستحقة"
            value="٧٥٬٠٠٠ ر.س"
            change="-٢.١٪"
            icon={<Users className="size-6 text-muted-foreground" />}
            changeColor="text-red-500"
          />
           <KpiCard
            title="الأموال المتعثرة"
            value={new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(defaultedFunds)}
            change="+5.1%"
            icon={<ShieldX className="size-6 text-muted-foreground" />}
            changeColor="text-red-500"
          />
           <KpiCard
            title="نسبة التعثر"
            value={`${defaultRate.toFixed(1)}%`}
            change=""
            icon={<ShieldAlert className="size-6 text-muted-foreground" />}
            changeColor="text-red-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-12 lg:col-span-4">
            <ProfitChart />
          </div>
          <div className="col-span-12 lg:col-span-3">
            <LoansStatusChart data={borrowersData} />
          </div>
        </div>

        <div>
          <RecentTransactions />
        </div>
      </main>
    </div>
  );
}
