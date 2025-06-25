import { InvestorsTable } from '@/components/investors/investors-table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function InvestorsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المستثمرين</h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة قائمة المستثمرين في المنصة.
            </p>
          </header>
          <Button>
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة مستثمر
          </Button>
        </div>
        <InvestorsTable />
      </main>
    </div>
  );
}
