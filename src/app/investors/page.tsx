'use client';

import { useEffect, useState } from 'react';
import { InvestorsTable } from '@/components/investors/investors-table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import type { Investor } from '@/lib/types';
import { useRouter } from 'next/navigation';


export default function InvestorsPage() {
  const { role } = useAuth();
  const router = useRouter();
  const { investors, addInvestor } = useData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInvestor, setNewInvestor] = useState({ name: '', amount: '' });
  
  const isEmployee = role === 'موظف';

  useEffect(() => {
    // Redirect employees away from this page
    if (isEmployee) {
      router.replace('/');
    }
  }, [role, isEmployee, router]);

  if (isEmployee) {
    return null; // Or a loading/access denied component
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewInvestor((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvestor.name || !newInvestor.amount) {
      return;
    }
    
    // For managers, the status is immediately 'active'
    const status: Investor['status'] = 'نشط';
    
    addInvestor({
      name: newInvestor.name,
      amount: Number(newInvestor.amount),
      status: status,
    });
    setIsAddDialogOpen(false);
    setNewInvestor({ name: '', amount: '' });
  };
  
  const showAddButton = role === 'مدير النظام' || role === 'مدير المكتب';

  const displayedInvestors =
    role === 'مستثمر'
      ? investors.filter((i) => i.id === 'inv_003') // Simulate showing only the logged-in investor
      : investors;

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المستثمرين</h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة قائمة المستثمرين في المنصة.
            </p>
          </header>
          {showAddButton && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة مستثمر
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddInvestor}>
                <DialogHeader>
                  <DialogTitle>إضافة مستثمر جديد</DialogTitle>
                  <DialogDescription>
                    أدخل تفاصيل المستثمر الجديد هنا. انقر على حفظ عند الانتهاء.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      الاسم
                    </Label>
                    <Input
                      id="name"
                      placeholder="اسم المستثمر"
                      className="col-span-3"
                      value={newInvestor.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      المبلغ
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="مبلغ الاستثمار"
                      className="col-span-3"
                      value={newInvestor.amount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      إلغاء
                    </Button>
                  </DialogClose>
                  <Button type="submit">حفظ</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
        <InvestorsTable investors={displayedInvestors} />
      </main>
    </div>
  );
}
