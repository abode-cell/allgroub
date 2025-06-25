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

type Investor = {
  id: string;
  name: string;
  amount: number;
  date: string;
  status: 'نشط' | 'غير نشط';
};

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

const statusVariant: { [key: string]: 'default' | 'secondary' } = {
  نشط: 'default',
  'غير نشط': 'secondary',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

export function InvestorsTable() {
  const [investors, setInvestors] = useState<Investor[]>(investorsData);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);

  const handleEditClick = (investor: Investor) => {
    setSelectedInvestor({ ...investor });
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (!selectedInvestor) return;
    setInvestors(investors.map(i => i.id === selectedInvestor.id ? selectedInvestor : i));
    setIsEditDialogOpen(false);
    setSelectedInvestor(null);
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المستثمر</TableHead>
                <TableHead>مبلغ الاستثمار</TableHead>
                <TableHead>تاريخ البدء</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.map((investor) => (
                <TableRow key={investor.id}>
                  <TableCell className="font-medium">{investor.name}</TableCell>
                  <TableCell>{formatCurrency(investor.amount)}</TableCell>
                  <TableCell>{investor.date}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[investor.status] || 'default'}>
                      {investor.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">فتح القائمة</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEditClick(investor)}>تعديل</DropdownMenuItem>
                        <DropdownMenuItem>عرض التفاصيل</DropdownMenuItem>
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
            <DialogTitle>تعديل المستثمر</DialogTitle>
            <DialogDescription>
              قم بتحديث تفاصيل المستثمر هنا. انقر على حفظ عند الانتهاء.
            </DialogDescription>
          </DialogHeader>
          {selectedInvestor && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  الاسم
                </Label>
                <Input
                  id="name"
                  value={selectedInvestor.name}
                  onChange={(e) => setSelectedInvestor({ ...selectedInvestor, name: e.target.value })}
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
                  value={selectedInvestor.amount}
                  onChange={(e) => setSelectedInvestor({ ...selectedInvestor, amount: Number(e.target.value) })}
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
