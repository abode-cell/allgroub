'use client';

import { useState } from 'react';
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


export default function InvestorsPage() {
  const { user, role } = useAuth();
  const { investors, addInvestor } = useData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInvestor, setNewInvestor] = useState({ name: '', amount: '' });
  
  const isEmployee = role === 'موظف';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewInvestor((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvestor.name || !newInvestor.amount) {
      return;
    }
    
    // For managers, status is active. For employees, it's pending review.
    const status: Investor['status'] = isEmployee ? 'معلق' : 'نشط';
    
    addInvestor({
      name: newInvestor.name,
      amount: Number(newInvestor.amount),
      status: status,
    });
    setIsAddDialogOpen(false);
    setNewInvestor({ name: '', amount: '' });
  };
  
  const showAddButton = role === 'مدير النظام' || role === 'مدير المكتب' || role === 'موظف';

  const displayedInvestors =
    role === 'مستثمر'
      ? investors.filter((i) => i.id === user?.id)
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
                {isEmployee ? 'رفع طلب إضافة مستثمر' : 'إضافة مستثمر'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddInvestor}>
                <DialogHeader>
                  <DialogTitle>{isEmployee ? 'رفع طلب إضافة مستثمر جديد' : 'إضافة مستثمر جديد'}</DialogTitle>
                  <DialogDescription>
                    {isEmployee
                      ? 'أدخل تفاصيل المستثمر الجديد وسيتم مراجعة الطلب.'
                      : 'أدخل تفاصيل المستثمر الجديد هنا. انقر على حفظ عند الانتهاء.'}
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
                  <Button type="submit">{isEmployee ? 'إرسال الطلب' : 'حفظ'}</Button>
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
