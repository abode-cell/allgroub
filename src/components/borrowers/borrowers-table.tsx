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
import { MoreHorizontal, ShieldAlert, CheckCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import type { Borrower, Payment } from '@/lib/types';

type BorrowersTableProps = {
  borrowers: Borrower[];
};

const statusVariant: {
  [key: string]: 'default' | 'secondary' | 'destructive' | 'outline';
} = {
  منتظم: 'default',
  متأخر: 'destructive',
  متعثر: 'destructive',
  معلق: 'secondary',
  'مسدد بالكامل': 'secondary',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

export function BorrowersTable({
  borrowers,
}: BorrowersTableProps) {
  const { role } = useAuth();
  const { updateBorrower, approveBorrower } = useData();
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

    const borrowerToUpdate = { ...selectedBorrower };
    if (borrowerToUpdate.loanType === 'مهلة') {
      borrowerToUpdate.rate = 0;
      borrowerToUpdate.term = 0;
    }
    
    updateBorrower(borrowerToUpdate);
    setIsEditDialogOpen(false);
    setSelectedBorrower(null);
  };
  
  const handleApproveClick = (borrower: Borrower) => {
    approveBorrower(borrower.id);
  };

  const generatePaymentSchedule = (borrower: Borrower): Payment[] => {
    const principal = borrower.amount;
    const monthlyRate = borrower.rate / 100 / 12;
    const numberOfPayments = borrower.term * 12;

    if (principal <= 0 || monthlyRate < 0 || numberOfPayments <= 0 || borrower.loanType === 'مهلة') {
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

  const canPerformActions = role === 'مدير النظام' || role === 'مدير المكتب' || role === 'موظف';
  const canApprove = role === 'مدير النظام' || role === 'مدير المكتب';
  const isEmployee = role === 'موظف';

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المقترض</TableHead>
                <TableHead>مبلغ القرض</TableHead>
                <TableHead>نوع التمويل</TableHead>
                <TableHead>نسبة الفائدة</TableHead>
                <TableHead>حالة السداد</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                {canPerformActions && (
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowers.map((borrower) => (
                <TableRow key={borrower.id}>
                  <TableCell className="font-medium">{borrower.name}</TableCell>
                  <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                  <TableCell>{borrower.loanType}</TableCell>
                  <TableCell>{borrower.loanType === 'اقساط' ? `${borrower.rate}%` : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[borrower.status] || 'outline'}>
                      {borrower.status === 'متعثر' && <ShieldAlert className='w-3 h-3 ml-1' />}
                      {borrower.status === 'معلق' ? 'طلب معلق' : borrower.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{borrower.dueDate}</TableCell>
                  {canPerformActions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">فتح القائمة</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canApprove && borrower.status === 'معلق' && (
                           <DropdownMenuItem
                            onSelect={() => handleApproveClick(borrower)}
                          >
                            <CheckCircle className="ml-2 h-4 w-4" />
                            الموافقة على الطلب
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onSelect={() => handleEditClick(borrower)}
                          disabled={isEmployee}
                        >
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleViewScheduleClick(borrower)}
                          disabled={borrower.loanType === 'مهلة'}
                        >
                          عرض جدول السداد
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  )}
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
                    <Label className="text-right">نوع التمويل</Label>
                    <RadioGroup
                        value={selectedBorrower.loanType}
                        onValueChange={(value) =>
                            setSelectedBorrower({
                            ...selectedBorrower,
                            loanType: value as 'اقساط' | 'مهلة',
                            })
                        }
                        className="col-span-3 flex gap-4 rtl:space-x-reverse"
                        >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="اقساط" id="edit-r1" />
                            <Label htmlFor="edit-r1">أقساط</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="مهلة" id="edit-r2" />
                            <Label htmlFor="edit-r2">مهلة</Label>
                        </div>
                    </RadioGroup>
                </div>

               {selectedBorrower.loanType === 'اقساط' && (
                 <>
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
                 </>
               )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  تاريخ الاستحقاق
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={selectedBorrower.dueDate}
                  onChange={(e) =>
                    setSelectedBorrower({
                      ...selectedBorrower,
                      dueDate: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  الحالة
                </Label>
                <Select
                  value={selectedBorrower.status}
                  onValueChange={(value) =>
                    setSelectedBorrower({
                      ...selectedBorrower,
                      status: value as Borrower['status'],
                    })
                  }
                  disabled={isEmployee && selectedBorrower.status === 'معلق'}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="منتظم">منتظم</SelectItem>
                    <SelectItem value="متأخر">متأخر</SelectItem>
                    <SelectItem value="متعثر">متعثر</SelectItem>
                    <SelectItem value="معلق">طلب معلق</SelectItem>
                    <SelectItem value="مسدد بالكامل">مسدد بالكامل</SelectItem>
                  </SelectContent>
                </Select>
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
                {paymentSchedule.length > 0 ? (
                  paymentSchedule.map((payment) => (
                    <TableRow key={payment.month}>
                      <TableCell>{payment.month}</TableCell>
                      <TableCell>{formatCurrency(payment.payment)}</TableCell>
                      <TableCell>{formatCurrency(payment.principal)}</TableCell>
                      <TableCell>{formatCurrency(payment.interest)}</TableCell>
                      <TableCell>{formatCurrency(payment.balance)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      لا يوجد جدول سداد لهذا النوع من التمويل.
                    </TableCell>
                  </TableRow>
                )}
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
