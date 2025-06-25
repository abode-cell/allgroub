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

export type Investor = {
  id: string;
  name: string;
  amount: number;
  date: string;
  status: 'نشط' | 'غير نشط';
};

type InvestorsTableProps = {
    investors: Investor[];
    onUpdateInvestor: (investor: Investor) => void;
}

const statusVariant: { [key: string]: 'default' | 'secondary' } = {
  نشط: 'default',
  'غير نشط': 'secondary',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

export function InvestorsTable({ investors, onUpdateInvestor }: InvestorsTableProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(
    null
  );

  const handleEditClick = (investor: Investor) => {
    setSelectedInvestor({ ...investor });
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (!selectedInvestor) return;
    onUpdateInvestor(selectedInvestor);
    setIsEditDialogOpen(false);
    setSelectedInvestor(null);
  };

  const handleViewDetailsClick = (investor: Investor) => {
    setSelectedInvestor(investor);
    setIsDetailsDialogOpen(true);
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
                    <Badge
                      variant={statusVariant[investor.status] || 'default'}
                    >
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
                        <DropdownMenuItem
                          onSelect={() => handleEditClick(investor)}
                        >
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleViewDetailsClick(investor)}
                        >
                          عرض التفاصيل
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
                  onChange={(e) =>
                    setSelectedInvestor({
                      ...selectedInvestor,
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
                  value={selectedInvestor.amount}
                  onChange={(e) =>
                    setSelectedInvestor({
                      ...selectedInvestor,
                      amount: Number(e.target.value),
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
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تفاصيل المستثمر</DialogTitle>
            <DialogDescription>
              عرض معلومات المستثمر {selectedInvestor?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedInvestor && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <p className="text-muted-foreground">الاسم:</p>
                <p className="col-span-2 font-medium">
                  {selectedInvestor.name}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <p className="text-muted-foreground">مبلغ الاستثمار:</p>
                <p className="col-span-2 font-medium">
                  {formatCurrency(selectedInvestor.amount)}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <p className="text-muted-foreground">تاريخ البدء:</p>
                <p className="col-span-2 font-medium">
                  {selectedInvestor.date}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <p className="text-muted-foreground">الحالة:</p>
                <p className="col-span-2 font-medium">
                  <Badge
                    variant={statusVariant[selectedInvestor.status] || 'default'}
                  >
                    {selectedInvestor.status}
                  </Badge>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setIsDetailsDialogOpen(false)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
