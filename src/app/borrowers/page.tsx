'use client';

import { useState } from 'react';
import { BorrowersTable, type Borrower } from '@/components/borrowers/borrowers-table';
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

const borrowersData: Borrower[] = [
  {
    id: 'bor_001',
    name: 'خالد الغامدي',
    amount: 75000,
    rate: 5.5,
    term: 5,
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-١٥',
  },
  {
    id: 'bor_002',
    name: 'فاطمة الزهراء',
    amount: 30000,
    rate: 6,
    term: 3,
    status: 'متأخر',
    next_due: '٢٠٢٤-٠٦-٢٥',
  },
  {
    id: 'bor_003',
    name: 'مؤسسة البناء الحديث',
    amount: 250000,
    rate: 4.8,
    term: 10,
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-٠١',
  },
  {
    id: 'bor_004',
    name: 'سارة إبراهيم',
    amount: 15000,
    rate: 7.2,
    term: 2,
    status: 'مسدد بالكامل',
    next_due: '-',
  },
  {
    id: 'bor_005',
    name: 'عبدالرحمن الشهري',
    amount: 120000,
    rate: 5,
    term: 7,
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-١٠',
  },
];

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>(borrowersData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBorrower, setNewBorrower] = useState({ name: '', amount: '', rate: '', term: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewBorrower((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddBorrower = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBorrower.name || !newBorrower.amount || !newBorrower.rate || !newBorrower.term) {
      return;
    }
    const newEntry: Borrower = {
      id: `bor_${Date.now()}`,
      name: newBorrower.name,
      amount: Number(newBorrower.amount),
      rate: Number(newBorrower.rate),
      term: Number(newBorrower.term),
      status: 'منتظم',
      next_due: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    };
    setBorrowers((prev) => [...prev, newEntry]);
    setIsAddDialogOpen(false);
    setNewBorrower({ name: '', amount: '', rate: '', term: '' });
  };

  const handleUpdateBorrower = (updatedBorrower: Borrower) => {
    setBorrowers(borrowers.map((b) => (b.id === updatedBorrower.id ? updatedBorrower : b)));
  };


  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المقترضين</h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة قائمة المقترضين في المنصة.
            </p>
          </header>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة مقترض
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddBorrower}>
                <DialogHeader>
                  <DialogTitle>إضافة مقترض جديد</DialogTitle>
                  <DialogDescription>
                    أدخل تفاصيل المقترض الجديد هنا. انقر على حفظ عند الانتهاء.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      الاسم
                    </Label>
                    <Input
                      id="name"
                      placeholder="اسم المقترض"
                      className="col-span-3"
                      value={newBorrower.name}
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
                      placeholder="مبلغ القرض"
                      className="col-span-3"
                      value={newBorrower.amount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rate" className="text-right">
                      الفائدة
                    </Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.1"
                      placeholder="نسبة الفائدة %"
                      className="col-span-3"
                      value={newBorrower.rate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="term" className="text-right">
                     المدة (سنوات)
                    </Label>
                    <Input
                      id="term"
                      type="number"
                      placeholder="مدة القرض بالسنوات"
                      className="col-span-3"
                      value={newBorrower.term}
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
        <BorrowersTable borrowers={borrowers} onUpdateBorrower={handleUpdateBorrower} />
      </main>
    </div>
  );
}
