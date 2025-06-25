'use client';

import { useState } from 'react';
import { InvestorsTable, type Investor } from '@/components/investors/investors-table';
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

const investorsData: Investor[] = [
  {
    id: 'inv_001',
    name: 'شركة الاستثمار الرائدة',
    amount: 500000,
    date: '٢٠٢٣-٠١-١٥',
    status: 'نشط',
  },
  {
    id: 'inv_002',
    name: 'صندوق النمو المستدام',
    amount: 250000,
    date: '٢٠٢٣-٠٢-٢٠',
    status: 'نشط',
  },
  {
    id: 'inv_003',
    name: 'أحمد عبدالله',
    amount: 100000,
    date: '٢٠٢٣-٠٣-١٠',
    status: 'نشط',
  },
  {
    id: 'inv_004',
    name: 'نورة السعد',
    amount: 300000,
    date: '٢٠٢٣-٠٤-٠٥',
    status: 'غير نشط',
  },
  {
    id: 'inv_005',
    name: 'مجموعة الأفق القابضة',
    amount: 1000000,
    date: '٢٠٢٣-٠٥-٠١',
    status: 'نشط',
  },
];


export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>(investorsData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInvestor, setNewInvestor] = useState({ name: '', amount: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewInvestor((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvestor.name || !newInvestor.amount) {
      return;
    }
    const newEntry: Investor = {
      id: `inv_${Date.now()}`,
      name: newInvestor.name,
      amount: Number(newInvestor.amount),
      status: 'نشط',
      date: new Date().toISOString().split('T')[0],
    };
    setInvestors((prev) => [...prev, newEntry]);
    setIsAddDialogOpen(false);
    setNewInvestor({ name: '', amount: '' });
  };

  const handleUpdateInvestor = (updatedInvestor: Investor) => {
    setInvestors(investors.map((i) => (i.id === updatedInvestor.id ? updatedInvestor : i)));
  };

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
        </div>
        <InvestorsTable investors={investors} onUpdateInvestor={handleUpdateInvestor}/>
      </main>
    </div>
  );
}
