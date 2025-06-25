'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

type Borrower = {
  id: string;
  name: string;
  amount: number;
  rate: number;
  term: number; // in years
  status: 'منتظم' | 'متأخر' | 'مسدد بالكامل';
  next_due: string;
};

type Payment = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

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

const statusVariant: {
  [key: string]: 'default' | 'secondary' | 'destructive' | 'outline';
} = {
  منتظم: 'default',
  متأخر: 'destructive',
  'مسدد بالكامل': 'secondary',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

export function BorrowersTable() {
  const [borrowers, setBorrowers] = useState<Borrower[]>(borrowersData);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(
    null
  );
  const [paymentSchedule, setPaymentSchedule] = useState<Payment[]>([]);

  const handleEditClick = (borrower: Borrower) => {
    setSelectedBorrower({ ...borrower });
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (!selectedBorrower) return;
    setBorrowers(
      borrowers.map((b) => (b.id === selectedBorrower.id ? selectedBorrower : b))
    );
    setIsEditDialogOpen(false);
    setSelectedBorrower(null);
  };

  const generatePaymentSchedule = (borrower: Borrower): Payment[] => {
    const principal = borrower.amount;
    const monthlyRate = borrower.rate / 100 / 12;
    const numberOfPayments = borrower.term * 12;

    if (principal <= 0 || monthlyRate < 0 || numberOfPayments <= 0) {
      return [];
    }

    const monthlyPayment =
      (principal *
        monthlyRate *
        Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    if (isNaN(monthlyPayment) || !isFinite(monthlyPayment)) {
      return [];
    }

    let balance = principal;
    const schedule: Payment[] = [];

    for (let i = 1; i <= numberOfPayments; i++) {
      const interest = balance * monthlyRate;
      const principalPaid = monthlyPayment - interest;
      balance -= principalPaid;

      schedule.push({
        month: i,
        payment: monthlyPayment,
        principal: principalPaid,
        interest: interest,
        balance: balance > 0 ? balance : 0,
      });
    }

    return schedule;
  };

  const handleViewScheduleClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setPaymentSchedule(generatePaymentSchedule(borrower));
    setIsScheduleDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المقترض</TableHead>
                <TableHead>مبلغ القرض</TableHead>
                <TableHead>نسبة الفائدة</TableHead>
                <TableHead>حالة السداد</TableHead>
                <TableHead>الدفعة التالية</TableHead>
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowers.map((borrower) => (
                <TableRow key={borrower.id}>
                  <TableCell className="font-medium">{borrower.name}</TableCell>
                  <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                  <TableCell>{borrower.rate}%</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[borrower.status] || 'outline'}>
                      {borrower.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{borrower.next_due}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">فتح القائمة</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => handleEditClick(borrower)}
                        >
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleViewScheduleClick(borrower)}
                        >
                          عرض جدول السداد
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل المقترض</DialogTitle>
            <DialogDescription>
              قم بتحديث تفاصيل المقترض هنا. انقر على حفظ عند الانتهاء.
            </DialogDescription>
          </DialogHeader>
          {selectedBorrower && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  الاسم
                </Label>
                <Input
                  id="name"
                  value={selectedBorrower.name}
                  onChange={(e) =>
                    setSelectedBorrower({
                      ...selectedBorrower,
                      name: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  المبلغ
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={selectedBorrower.amount}
                  onChange={(e) =>
                    setSelectedBorrower({
                      ...selectedBorrower,
                      amount: Number(e.target.value),
                    })
                  }
                  className="col-span-3"
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
                  value={selectedBorrower.rate}
                  onChange={(e) =>
                    setSelectedBorrower({
                      ...selectedBorrower,
                      rate: Number(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="term" className="text-right">
                  المدة (سنوات)
                </Label>
                <Input
                  id="term"
                  type="number"
                  value={selectedBorrower.term}
                  onChange={(e) =>
                    setSelectedBorrower({
                      ...selectedBorrower,
                      term: Number(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="button" onClick={handleSaveChanges}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isScheduleDialogOpen}
        onOpenChange={setIsScheduleDialogOpen}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>جدول السداد لـ {selectedBorrower?.name}</DialogTitle>
            <DialogDescription>
              تفاصيل الأقساط الشهرية للقرض.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشهر</TableHead>
                  <TableHead>القسط الشهري</TableHead>
                  <TableHead>أصل المبلغ المدفوع</TableHead>
                  <TableHead>الفائدة المدفوعة</TableHead>
                  <TableHead>الرصيد المتبقي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSchedule.map((payment) => (
                  <TableRow key={payment.month}>
                    <TableCell>{payment.month}</TableCell>
                    <TableCell>{formatCurrency(payment.payment)}</TableCell>
                    <TableCell>{formatCurrency(payment.principal)}</TableCell>
                    <TableCell>{formatCurrency(payment.interest)}</TableCell>
                    <TableCell>{formatCurrency(payment.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsScheduleDialogOpen(false)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
