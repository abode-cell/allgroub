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

type Borrower = {
  id: string;
  name: string;
  amount: number;
  rate: number;
  status: 'منتظم' | 'متأخر' | 'مسدد بالكامل';
  next_due: string;
};

const borrowersData: Borrower[] = [
  {
    id: 'bor_001',
    name: 'خالد الغامدي',
    amount: 75000,
    rate: 5.5,
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-١٥',
  },
  {
    id: 'bor_002',
    name: 'فاطمة الزهراء',
    amount: 30000,
    rate: 6,
    status: 'متأخر',
    next_due: '٢٠٢٤-٠٦-٢٥',
  },
  {
    id: 'bor_003',
    name: 'مؤسسة البناء الحديث',
    amount: 250000,
    rate: 4.8,
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-٠١',
  },
  {
    id: 'bor_004',
    name: 'سارة إبراهيم',
    amount: 15000,
    rate: 7.2,
    status: 'مسدد بالكامل',
    next_due: '-',
  },
  {
    id: 'bor_005',
    name: 'عبدالرحمن الشهري',
    amount: 120000,
    rate: 5,
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-١٠',
  },
];

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
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
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);

  const handleEditClick = (borrower: Borrower) => {
    setSelectedBorrower({ ...borrower });
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (!selectedBorrower) return;
    setBorrowers(borrowers.map(b => b.id === selectedBorrower.id ? selectedBorrower : b));
    setIsEditDialogOpen(false);
    setSelectedBorrower(null);
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
                        <DropdownMenuItem onSelect={() => handleEditClick(borrower)}>تعديل</DropdownMenuItem>
                        <DropdownMenuItem>عرض جدول السداد</DropdownMenuItem>
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
                  onChange={(e) => setSelectedBorrower({ ...selectedBorrower, name: e.target.value })}
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
                  onChange={(e) => setSelectedBorrower({ ...selectedBorrower, amount: Number(e.target.value) })}
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
                  onChange={(e) => setSelectedBorrower({ ...selectedBorrower, rate: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleSaveChanges}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
