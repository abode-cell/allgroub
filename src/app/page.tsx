import { CircleDollarSign, Landmark, TrendingUp, Users } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ProfitChart } from '@/components/dashboard/profit-chart';
import { LoansChart } from '@/components/dashboard/loans-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            لوحة التحكم المالية
          </h1>
          <p className="text-muted-foreground mt-1">
            نظرة عامة على أداء منصتك المالية.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <KpiCard
            title="صافي الربح"
            value="١٢٥٬٠٠٠ ر.س"
            change="+١٥٪"
            icon={<TrendingUp className="size-6 text-muted-foreground" />}
            changeColor="text-green-500"
          />
          <KpiCard
            title="الديون المستحقة"
            value="٧٥٬٠٠٠ ر.س"
            change="-٢.١٪"
            icon={<Users className="size-6 text-muted-foreground" />}
            changeColor="text-red-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-12 lg:col-span-4">
            <ProfitChart />
          </div>
          <div className="col-span-12 lg:col-span-3">
            <LoansChart />
          </div>
        </div>

        <div>
          <RecentTransactions />
        </div>
      </main>
    </div>
  );
}
