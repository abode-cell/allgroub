
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
import {
  MoreHorizontal,
  Info,
  AlertCircle,
  MessageSquareText,
  MessageSquareCheck,
  CheckCircle,
  Users,
} from 'lucide-react';
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
  DialogClose,
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
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDataState, useDataActions } from '@/contexts/data-context';
import type { Borrower, BorrowerPaymentStatus, Payment } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { BorrowerStatusBadge } from '@/components/borrower-status-badge';
import { Textarea } from '@/components/ui/textarea';

const paymentStatusVariant: {
  [key in BorrowerPaymentStatus]: 'success' | 'default' | 'secondary' | 'destructive';
} = {
  'تم السداد': 'success',
  'مسدد جزئي': 'default', // primary color is blueish
  'تم الإمهال': 'secondary', // gray
  'متعثر': 'destructive',
};

const paymentStatusTextColor: {
  [key in BorrowerPaymentStatus]: string;
} = {
  'تم السداد': 'text-success-foreground',
  'مسدد جزئي': 'text-primary-foreground',
  'تم الإمهال': 'text-secondary-foreground',
  'متعثر': 'text-destructive-foreground',
};

const paymentStatusBgColor: {
  [key in BorrowerPaymentStatus]: string;
} = {
  'تم السداد': 'bg-success hover:bg-success/90',
  'مسدد جزئي': 'bg-primary hover:bg-primary/90',
  'تم الإمهال': 'bg-secondary hover:bg-secondary/80',
  'متعثر': 'bg-destructive hover:bg-destructive/90',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);


export function BorrowersTable({
  borrowers,
}: {
  borrowers: Borrower[];
}) {
  const { currentUser, investors } = useDataState();
  const { updateBorrower, approveBorrower, updateBorrowerPaymentStatus, markBorrowerAsNotified } = useDataActions();
  const role = currentUser?.role;
  const canSendSms = role === 'مدير المكتب' || role === 'مساعد مدير المكتب' || role === 'موظف';

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);

  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(
    null
  );
  const [smsMessage, setSmsMessage] = useState('');
  const [paymentSchedule, setPaymentSchedule] = useState<Payment[]>([]);
  const isGracePeriodTable = borrowers[0]?.loanType === 'مهلة';

  const handleEditClick = (borrower: Borrower) => {
    setSelectedBorrower({ ...borrower });
    setIsEditDialogOpen(true);
  };
  
  const handleViewDetailsClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setIsDetailsDialogOpen(true);
  };

  const handleSendSmsClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    const defaultMessage = `مرحباً ${borrower.name},\n\nنود إعلامكم بتفاصيل قرضكم البالغ ${formatCurrency(borrower.amount)}.\n\nطرق السداد المتاحة هي:\n- تحويل بنكي إلى حساب المؤسسة.\n- زيارة المكتب والدفع بشكل مباشر.\n\nنشكر لكم تعاونكم،\nإدارة الموقع`;
    setSmsMessage(defaultMessage);
    setIsSmsDialogOpen(true);
  };

  const handleConfirmSms = () => {
    if (!selectedBorrower || !smsMessage) return;
    markBorrowerAsNotified(selectedBorrower.id, smsMessage);
    setIsSmsDialogOpen(false);
    setSmsMessage('');
    setSelectedBorrower(null);
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
    if (borrower.loanType !== 'اقساط' || !borrower.term || !borrower.rate) {
      return [];
    }

    const principal = borrower.amount;
    const totalInterest = principal * (borrower.rate / 100) * borrower.term;
    const totalPayment = principal + totalInterest;
    const numberOfPayments = borrower.term * 12;

    if (numberOfPayments <= 0) return [];
    
    const monthlyPayment = totalPayment / numberOfPayments;
    let balance = totalPayment;
    const schedule: Payment[] = [];

    for (let i = 1; i <= numberOfPayments; i++) {
        balance -= monthlyPayment;
        schedule.push({
            month: i,
            payment: monthlyPayment,
            principal: 0, // Simplified for this view
            interest: 0, // Simplified for this view
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

  const canApprove = role === 'مدير المكتب';
  const isEmployee = role === 'موظف';
  const canEdit = role === 'مدير المكتب';

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المقترض</TableHead>
                <TableHead>مبلغ القرض</TableHead>
                {isGracePeriodTable && <TableHead>الخصم</TableHead>}
                <TableHead className="text-center">نوع التمويل</TableHead>
                <TableHead className="text-center">المستثمر</TableHead>
                <TableHead className="text-center">حالة السداد</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead className="text-center">حالة الاستحقاق</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowers.length > 0 ? (
                borrowers.map((borrower) => {
                  const fundedByOneInvestor = borrower.fundedBy && borrower.fundedBy.length === 1;
                  const fundedByMultipleInvestors = borrower.fundedBy && borrower.fundedBy.length > 1;
                  const singleInvestor = fundedByOneInvestor ? investors.find(i => i.id === borrower.fundedBy![0].investorId) : null;

                  return (
                  <TableRow key={borrower.id}>
                    <TableCell className="font-medium">{borrower.name}</TableCell>
                    <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                    {isGracePeriodTable && (
                      <TableCell className="text-green-600 font-medium">
                          {borrower.discount && borrower.discount > 0 ? formatCurrency(borrower.discount) : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-center">{borrower.loanType}</TableCell>
                    <TableCell className="text-center">
                      {fundedByOneInvestor && singleInvestor ? (
                        <span>{singleInvestor.name}</span>
                      ) : fundedByMultipleInvestors ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-1 cursor-pointer">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{borrower.fundedBy!.length}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-right">
                                <p className='font-bold mb-2'>المستثمرون:</p>
                              <ul className="list-disc mr-4">
                                {borrower.fundedBy!.map(funder => {
                                  const investor = investors.find(i => i.id === funder.investorId);
                                  return <li key={funder.investorId}>{investor?.name || 'غير معروف'}</li>
                                })}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-muted-foreground">غير ممول</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className='flex justify-center'>
                        <Select
                            value={borrower.paymentStatus || 'none'}
                            onValueChange={(value: string) => {
                                if (value === 'none') {
                                    updateBorrowerPaymentStatus(borrower.id, undefined);
                                } else {
                                    updateBorrowerPaymentStatus(borrower.id, value as BorrowerPaymentStatus);
                                }
                            }}
                            disabled={!canEdit || borrower.status === 'معلق' || borrower.status === 'مرفوض'}
                        >
                            <SelectTrigger className={cn(
                                "w-32", 
                                borrower.paymentStatus && `${paymentStatusBgColor[borrower.paymentStatus]} ${paymentStatusTextColor[borrower.paymentStatus]}`
                                )}>
                                <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">--</SelectItem>
                                <SelectItem value="تم السداد">تم السداد</SelectItem>
                                <SelectItem value="مسدد جزئي">مسدد جزئي</SelectItem>
                                <SelectItem value="تم الإمهال">تم الإمهال</SelectItem>
                                <SelectItem value="متعثر">متعثر</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>{borrower.dueDate}</TableCell>
                    <TableCell className="text-center">
                      <BorrowerStatusBadge borrower={borrower} />
                    </TableCell>
                    <TableCell className="text-left flex items-center justify-start">
                       {borrower.isNotified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <MessageSquareCheck className="h-5 w-5 text-green-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>تم تبليغ العميل</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">فتح القائمة</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleViewDetailsClick(borrower)}>
                              <Info className="ml-2 h-4 w-4" />
                              عرض التفاصيل
                          </DropdownMenuItem>
                          {canSendSms && (
                            <DropdownMenuItem onSelect={() => handleSendSmsClick(borrower)} disabled={borrower.isNotified}>
                                <MessageSquareText className="ml-2 h-4 w-4" />
                                إرسال رسالة نصية
                            </DropdownMenuItem>
                          )}
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
                            disabled={!canEdit}
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
                  </TableRow>
                )
              })
            ) : (
                <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      لا توجد قروض لعرضها.
                    </TableCell>
                </TableRow>
            )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل القرض</DialogTitle>
            <DialogDescription>
              قم بتحديث تفاصيل القرض هنا. انقر على حفظ عند الانتهاء.
            </DialogDescription>
          </DialogHeader>
          {selectedBorrower && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name-edit" className="text-right">
                  الاسم
                </Label>
                <Input
                  id="name-edit"
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
                <Label htmlFor="phone-edit" className="text-right">
                  الجوال
                </Label>
                <Input
                  id="phone-edit"
                  value={selectedBorrower.phone}
                  onChange={(e) =>
                    setSelectedBorrower({
                      ...selectedBorrower,
                      phone: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount-edit" className="text-right">
                  المبلغ
                </Label>
                <Input
                  id="amount-edit"
                  type="number"
                  value={selectedBorrower.amount}
                   readOnly={selectedBorrower.status !== 'معلق'}
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
                    <Label htmlFor="rate-edit" className="text-right">
                      الفائدة
                    </Label>
                    <Input
                      id="rate-edit"
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
                    <Label htmlFor="term-edit" className="text-right">
                      المدة (سنوات)
                    </Label>
                    <Input
                      id="term-edit"
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
               {selectedBorrower.loanType === 'مهلة' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="discount-edit" className="text-right">
                      الخصم
                    </Label>
                    <Input
                      id="discount-edit"
                      type="number"
                      value={selectedBorrower.discount || ''}
                      onChange={(e) =>
                        setSelectedBorrower({
                          ...selectedBorrower,
                          discount: Number(e.target.value),
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
               )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate-edit" className="text-right">
                  تاريخ الاستحقاق
                </Label>
                <Input
                  id="dueDate-edit"
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
                <Label htmlFor="status-edit" className="text-right">
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
                  <SelectTrigger id="status-edit" className="col-span-3">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="منتظم">منتظم</SelectItem>
                    <SelectItem value="متأخر">متأخر</SelectItem>
                    <SelectItem value="معلق">طلب معلق</SelectItem>
                    {/* Critical statuses are handled by payment status dropdown */}
                    <SelectItem value="متعثر" disabled>متعثر (يتم تحديده من حالة السداد)</SelectItem>
                    <SelectItem value="مسدد بالكامل" disabled>مسدد بالكامل (يتم تحديده من حالة السداد)</SelectItem>
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>جدول السداد لـ {selectedBorrower?.name}</DialogTitle>
            <DialogDescription>
              تفاصيل الأقساط الشهرية للقرض (تقديرية).
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشهر</TableHead>
                  <TableHead>القسط الشهري</TableHead>
                  <TableHead>الرصيد المتبقي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSchedule.length > 0 ? (
                  paymentSchedule.map((payment) => (
                    <TableRow key={payment.month}>
                      <TableCell>{payment.month}</TableCell>
                      <TableCell>{formatCurrency(payment.payment)}</TableCell>
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

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل القرض</DialogTitle>
            <DialogDescription>
              عرض تفصيلي لمعلومات قرض المقترض {selectedBorrower?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedBorrower && (() => {
            const totalFunded = selectedBorrower.fundedBy?.reduce((sum, funder) => sum + funder.amount, 0) || 0;
            const isPartiallyFunded = totalFunded < selectedBorrower.amount;
            
            return (
              <div className="grid gap-4 py-4 text-sm">
                {isPartiallyFunded && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>تمويل غير مكتمل</AlertTitle>
                    <AlertDescription>
                      تم تمويل {formatCurrency(totalFunded)} من أصل {formatCurrency(selectedBorrower.amount)}.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                    <div>
                        <span className='text-muted-foreground'>اسم المقترض:</span>
                        <span className='font-bold float-left'>{selectedBorrower.name}</span>
                    </div>
                     <div>
                        <span className='text-muted-foreground'>رقم الجوال:</span>
                        <span className='font-bold float-left'>{selectedBorrower.phone}</span>
                    </div>
                    <div>
                        <span className='text-muted-foreground'>مبلغ القرض:</span>
                        <span className='font-bold float-left'>{formatCurrency(selectedBorrower.amount)}</span>
                    </div>
                    <div>
                        <span className='text-muted-foreground'>نوع التمويل:</span>
                        <span className='font-bold float-left'>{selectedBorrower.loanType}</span>
                    </div>
                    <div>
                        <span className='text-muted-foreground'>تاريخ الاستحقاق:</span>
                        <span className='font-bold float-left'>{selectedBorrower.dueDate}</span>
                    </div>
                    <div>
                        <span className='text-muted-foreground'>الحالة:</span>
                        <span className='font-bold float-left'>
                           <BorrowerStatusBadge borrower={selectedBorrower} />
                        </span>
                    </div>
                </div>
                
                {selectedBorrower.loanType === 'اقساط' && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                      <div>
                          <span className='text-muted-foreground'>نسبة الفائدة:</span>
                          <span className='font-bold float-left'>{selectedBorrower.rate}%</span>
                      </div>
                      <div>
                          <span className='text-muted-foreground'>المدة (سنوات):</span>
                          <span className='font-bold float-left'>{selectedBorrower.term}</span>
                      </div>
                  </div>
                )}

                {selectedBorrower.loanType === 'مهلة' && (
                  <div className="grid grid-cols-1 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                       <div>
                          <span className='text-muted-foreground'>مبلغ الخصم:</span>
                          <span className='font-bold float-left text-green-600'>{formatCurrency(selectedBorrower.discount || 0)}</span>
                      </div>
                  </div>
                )}

                <div>
                    <h4 className="font-semibold mb-2">المستثمرون</h4>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>المبلغ الممول</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedBorrower.fundedBy && selectedBorrower.fundedBy.length > 0 ? (
                                    selectedBorrower.fundedBy.map(funder => {
                                        const investor = investors.find(i => i.id === funder.investorId);
                                        return (
                                            <TableRow key={funder.investorId}>
                                                <TableCell>{investor?.name || 'غير معروف'}</TableCell>
                                                <TableCell>{formatCurrency(funder.amount)}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24">لم يتم تمويل هذا القرض بعد.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                إغلاق
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال رسالة إلى {selectedBorrower?.name}</DialogTitle>
            <DialogDescription>
              قم بتحرير محتوى الرسالة أدناه. سيتم إرسالها إلى الرقم {selectedBorrower?.phone}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="sms-message">محتوى الرسالة</Label>
            <Textarea
              id="sms-message"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              className="min-h-48 mt-2"
              dir="rtl"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">إلغاء</Button>
            </DialogClose>
            <Button onClick={handleConfirmSms}>إرسال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
