

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
  CheckCircle,
  Users,
  Edit,
  CalendarDays,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { useDataState } from '@/contexts/data-context';
import type { Borrower, BorrowerPaymentStatus, InstallmentStatus } from '@/lib/types';
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
import { LoanStatusInfo } from '@/components/borrowers/remaining-days';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

type Payment = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  status: InstallmentStatus;
};

const paymentStatusVariant: {
  [key in BorrowerPaymentStatus]: 'success' | 'default' | 'secondary' | 'destructive';
} = {
  'تم السداد': 'success',
  'مسدد جزئي': 'default',
  'تم الإمهال': 'secondary',
  'متعثر': 'destructive',
  'منتظم': 'default',
  'متأخر بقسط': 'destructive',
  'متأخر بقسطين': 'destructive',
  'تم اتخاذ الاجراءات القانونيه': 'destructive',
};

const paymentStatusTextColor: {
  [key in BorrowerPaymentStatus]: string;
} = {
  'تم السداد': 'text-success-foreground',
  'مسدد جزئي': 'text-primary-foreground',
  'تم الإمهال': 'text-secondary-foreground',
  'متعثر': 'text-destructive-foreground',
  'منتظم': 'text-primary-foreground',
  'متأخر بقسط': 'text-destructive-foreground',
  'متأخر بقسطين': 'text-destructive-foreground',
  'تم اتخاذ الاجراءات القانونيه': 'text-destructive-foreground',
};

const paymentStatusBgColor: {
  [key in BorrowerPaymentStatus]: string;
} = {
  'تم السداد': 'bg-success hover:bg-success/90',
  'مسدد جزئي': 'bg-primary hover:bg-primary/90',
  'تم الإمهال': 'bg-secondary hover:bg-secondary/80',
  'متعثر': 'bg-destructive hover:bg-destructive/90',
  'منتظم': 'bg-primary hover:bg-primary/90',
  'متأخر بقسط': 'bg-destructive hover:bg-destructive/90',
  'متأخر بقسطين': 'bg-destructive hover:bg-destructive/90',
  'تم اتخاذ الاجراءات القانونيه': 'bg-destructive hover:bg-destructive/90',
};

const installmentStatusTextColor: { [key in InstallmentStatus]: string } = {
  'تم السداد': 'text-success-foreground',
  'لم يسدد بعد': 'text-secondary-foreground',
  'متأخر': 'text-destructive-foreground',
};

const installmentStatusBgColor: { [key in InstallmentStatus]: string } = {
  'تم السداد': 'bg-success hover:bg-success/90',
  'لم يسدد بعد': 'bg-secondary hover:bg-secondary/80',
  'متأخر': 'bg-destructive hover:bg-destructive/90',
};


export function BorrowersTable({
  borrowers,
}: {
  borrowers: Borrower[];
}) {
  const { currentUser, investors, visibleUsers: users, updateBorrower, updateBorrowerPaymentStatus, markBorrowerAsNotified, updateInstallmentStatus, deleteBorrower, handlePartialPayment } = useDataState();
  const { toast } = useToast();
  const role = currentUser?.role;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPartialPaymentDialogOpen, setIsPartialPaymentDialogOpen] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [borrowerForPartialPayment, setBorrowerForPartialPayment] = useState<Borrower | null>(null);
  const [partialPaidAmount, setPartialPaidAmount] = useState('');
  const [borrowerToDelete, setBorrowerToDelete] = useState<Borrower | null>(null);

  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [paymentSchedule, setPaymentSchedule] = useState<Payment[]>([]);
  const isGracePeriodTable = borrowers[0]?.loanType === 'مهلة';
  
  const isOfficeManager = role === 'مدير المكتب';
  const isAssistantWithPerms = role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageBorrowers;
  const isEmployee = role === 'موظف';
  
  const manager = isEmployee ? users.find((u) => u.id === currentUser?.managedBy) : null;
  const canEmployeeEdit = isEmployee && !!manager?.allowEmployeeLoanEdits;

  const canEdit = isOfficeManager || isAssistantWithPerms || canEmployeeEdit;
  const canDelete = isOfficeManager || isAssistantWithPerms;
  const canUpdatePaymentStatus = canEdit;
  const canViewSchedule = canEdit;
  const canApprove = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageRequests);
  const canSendSms = role === 'مدير المكتب' || role === 'مساعد مدير المكتب' || role === 'موظف';

  const installmentPaymentOptions: BorrowerPaymentStatus[] = ['منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'تم السداد'];
  const gracePaymentOptions: BorrowerPaymentStatus[] = ['مسدد جزئي', 'تم الإمهال', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'تم السداد'];

  const handleEditClick = (borrower: Borrower) => {
    // Always get the freshest data from the source when opening
    const freshBorrower = borrowers.find(b => b.id === borrower.id);
    setSelectedBorrower(freshBorrower ? { ...freshBorrower } : null);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (borrower: Borrower) => {
    setBorrowerToDelete(borrower);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (borrowerToDelete) {
      deleteBorrower(borrowerToDelete.id);
      setIsDeleteDialogOpen(false);
      setBorrowerToDelete(null);
    }
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

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrower) return;
    
    setIsSaving(true);
    updateBorrower(selectedBorrower);
    setIsSaving(false);

    setIsEditDialogOpen(false);
    setSelectedBorrower(null);
  };
  
  const handleConfirmPartialPayment = () => {
    if (!borrowerForPartialPayment || !partialPaidAmount) return;
    const paidAmount = Number(partialPaidAmount);

    if (paidAmount <= 0 || paidAmount >= borrowerForPartialPayment.amount) {
        toast({
            variant: 'destructive',
            title: 'مبلغ غير صالح',
            description: 'المبلغ المسدد يجب أن يكون أكبر من صفر وأقل من إجمالي القرض.',
        });
        return;
    }

    handlePartialPayment(borrowerForPartialPayment.id, paidAmount);

    setIsPartialPaymentDialogOpen(false);
    setBorrowerForPartialPayment(null);
    setPartialPaidAmount('');
  };

  const generatePaymentSchedule = (borrower: Borrower): Payment[] => {
    if (borrower.loanType !== 'اقساط' || !borrower.term || !borrower.rate || borrower.term <= 0) {
      return [];
    }

    const principal = borrower.amount;
    const totalInterest = principal * (borrower.rate / 100) * borrower.term;
    const totalPayment = principal + totalInterest;
    const numberOfPayments = borrower.term * 12;

    if (numberOfPayments <= 0) return [];

    const monthlyPayment = totalPayment / numberOfPayments;
    const principalPerMonth = principal / numberOfPayments;
    const interestPerMonth = totalInterest / numberOfPayments;
    
    let balance = totalPayment;
    const schedule: Payment[] = [];

    const installmentStatuses = borrower.installments || [];

    for (let i = 1; i <= numberOfPayments; i++) {
        balance -= monthlyPayment;
        const installment = installmentStatuses.find(inst => inst.month === i);
        schedule.push({
            month: i,
            payment: monthlyPayment,
            principal: principalPerMonth,
            interest: interestPerMonth,
            balance: balance > 0 ? balance : 0,
            status: installment ? installment.status : 'لم يسدد بعد',
        });
    }

    return schedule;
  };

  const handleViewScheduleClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setPaymentSchedule(generatePaymentSchedule(borrower));
    setIsScheduleDialogOpen(true);
  };

  const handleInstallmentStatusChange = (month: number, newStatus: InstallmentStatus) => {
    if (!selectedBorrower) return;

    updateInstallmentStatus(selectedBorrower.id, month, newStatus);
    
    const numberOfPayments = (selectedBorrower.term || 0) * 12;
    if (selectedBorrower.loanType !== 'اقساط' || numberOfPayments === 0) return;

    const currentInstallments = selectedBorrower.installments || [];
    const installmentsMap = new Map(currentInstallments.map(i => [i.month, i]));

    const fullInstallments = Array.from({ length: numberOfPayments }, (_, i) => {
        const monthNum = i + 1;
        return installmentsMap.get(monthNum) || { month: monthNum, status: 'لم يسدد بعد' as InstallmentStatus };
    });
    
    const newInstallments = fullInstallments.map(inst => 
        inst.month === month ? { ...inst, status: newStatus } : inst
    );

    const updatedBorrower: Borrower = {
        ...selectedBorrower,
        installments: newInstallments,
    };

    setSelectedBorrower(updatedBorrower);
    setPaymentSchedule(generatePaymentSchedule(updatedBorrower));
  };
  
  const handlePaymentStatusChange = (borrower: Borrower, newPaymentStatus?: BorrowerPaymentStatus) => {
      if (borrower.loanType === 'مهلة' && newPaymentStatus === 'مسدد جزئي') {
          setBorrowerForPartialPayment(borrower);
          setPartialPaidAmount('');
          setIsPartialPaymentDialogOpen(true);
          return;
      }
      
      if (borrower.lastStatusChange) {
        const lastChangeTime = new Date(borrower.lastStatusChange).getTime();
        const now = new Date().getTime();
        if (now - lastChangeTime < 60 * 1000) {
          toast({
            variant: 'destructive',
            title: 'الرجاء الانتظار',
            description: 'يجب الانتظار دقيقة واحدة قبل تغيير حالة هذا القرض مرة أخرى.',
          });
          return;
        }
      }
      updateBorrowerPaymentStatus(borrower.id, newPaymentStatus);
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
                {isGracePeriodTable && <TableHead>الخصم</TableHead>}
                <TableHead className="text-center">نوع التمويل</TableHead>
                <TableHead className="text-center">المستثمر</TableHead>
                <TableHead className="text-center">حالة السداد</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead className="text-center">المدة المتبقية / تاريخ السداد</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowers.length > 0 ? (
                borrowers.map((borrower) => {
                  const fundedByOneInvestor = borrower.fundedBy && borrower.fundedBy.length === 1;
                  const fundedByMultipleInvestors = borrower.fundedBy && borrower.fundedBy.length > 1;
                  const singleInvestor = fundedByOneInvestor ? investors.find(i => i.id === borrower.fundedBy![0].investorId) : null;
                  const singleInvestorUser = singleInvestor ? users.find(u => u.id === singleInvestor.id) : null;
                  
                  const isTerminalStatus = borrower.status === 'مرفوض' || borrower.paymentStatus === 'تم السداد';
                  const isEditableStatus = !isTerminalStatus;
                  const paymentOptions = borrower.loanType === 'اقساط' ? installmentPaymentOptions : gracePaymentOptions;
                  const canBeDeleted = borrower.status === 'معلق' || borrower.status === 'مرفوض';


                  return (
                  <TableRow key={borrower.id}>
                    <TableCell className="font-medium">
                      {borrower.name}
                      {borrower.originalLoanId && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="mr-2 text-xs text-muted-foreground cursor-help">(متبقٍ)</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>هذا القرض هو المبلغ المتبقي من قرض سابق.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                    {isGracePeriodTable && (
                      <TableCell className="text-green-600 font-medium">
                          {borrower.discount && borrower.discount > 0 ? formatCurrency(borrower.discount) : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-center">{borrower.loanType}</TableCell>
                    <TableCell className="text-center">
                      {fundedByOneInvestor && singleInvestor ? (
                        <span>{singleInvestor.name} {singleInvestorUser?.status === 'محذوف' && <span className="text-xs text-destructive">(محذوف)</span>}</span>
                      ) : fundedByOneInvestor ? (
                        <span className="text-xs text-destructive">مستخدم محذوف</span>
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
                                  const investorUser = users.find(u => u.id === funder.investorId);
                                  return <li key={funder.investorId}>{investor?.name || 'مستخدم محذوف'} {investorUser?.status === 'محذوف' && <span className="text-xs text-destructive">(محذوف)</span>}</li>
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
                                    handlePaymentStatusChange(borrower, undefined);
                                } else {
                                    handlePaymentStatusChange(borrower, value as BorrowerPaymentStatus);
                                }
                            }}
                            disabled={!canUpdatePaymentStatus || borrower.status === 'معلق'}
                        >
                            <SelectTrigger className={cn(
                                "w-36", 
                                borrower.paymentStatus && `${paymentStatusBgColor[borrower.paymentStatus]} ${paymentStatusTextColor[borrower.paymentStatus]}`
                                )}>
                                <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">--</SelectItem>
                                {paymentOptions.map(option => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>{borrower.dueDate}</TableCell>
                    <TableCell className="text-center">
                      <LoanStatusInfo borrower={borrower} />
                    </TableCell>
                    <TableCell className="text-left flex items-center justify-start">
                       {borrower.isNotified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <CheckCircle className="h-5 w-5 text-green-600" />
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
                            <DropdownMenuItem asChild>
                              <Link href="/requests" className="flex items-center w-full cursor-pointer">
                                  <ExternalLink className="ml-2 h-4 w-4" />
                                  <span>الموافقة من صفحة الطلبات</span>
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => handleEditClick(borrower)}
                            disabled={!canEdit || !isEditableStatus}
                          >
                            <Edit className="ml-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleViewScheduleClick(borrower)}
                            disabled={!canViewSchedule || borrower.loanType === 'مهلة' || (borrower.term || 0) <= 0}
                          >
                            <CalendarDays className="ml-2 h-4 w-4" />
                            عرض جدول السداد
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onSelect={() => handleDeleteClick(borrower)}
                            disabled={!canDelete || !canBeDeleted}
                          >
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف القرض
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
                <TableRow>
                    <TableCell colSpan={isGracePeriodTable ? 9 : 8} className="h-24 text-center">
                      لا توجد قروض لعرضها.
                    </TableCell>
                </TableRow>
            )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isPartialPaymentDialogOpen} onOpenChange={setIsPartialPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل سداد جزئي لـ {borrowerForPartialPayment?.name}</DialogTitle>
            <DialogDescription>
              إجمالي مبلغ القرض هو {formatCurrency(borrowerForPartialPayment?.amount ?? 0)}. أدخل المبلغ الذي تم سداده. سيتم إنشاء طلب قرض جديد بالمبلغ المتبقي للموافقة عليه.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="partial-payment-amount">المبلغ المسدد</Label>
            <Input
              id="partial-payment-amount"
              type="number"
              value={partialPaidAmount}
              onChange={(e) => setPartialPaidAmount(e.target.value)}
              placeholder="أدخل المبلغ المسدد"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" onClick={() => setPartialPaidAmount('')}>إلغاء</Button>
            </DialogClose>
            <Button onClick={handleConfirmPartialPayment}>تأكيد السداد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveChanges}>
            <DialogHeader>
              <DialogTitle>تعديل القرض</DialogTitle>
              <DialogDescription>
                قم بتحديث تفاصيل القرض هنا. لا يمكن تعديل البيانات المالية بعد الموافقة على القرض. انقر على حفظ عند الانتهاء.
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
                  <Label htmlFor="nationalId-edit" className="text-right">
                    رقم الهوية
                  </Label>
                  <Input
                    id="nationalId-edit"
                    value={selectedBorrower.nationalId}
                    onChange={(e) =>
                      setSelectedBorrower({
                        ...selectedBorrower,
                        nationalId: e.target.value,
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
                     className={cn("col-span-3", selectedBorrower.status !== 'معلق' && 'bg-muted/50 cursor-not-allowed')}
                    onChange={(e) =>
                      setSelectedBorrower({
                        ...selectedBorrower,
                        amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">نوع التمويل</Label>
                      <RadioGroup
                          value={selectedBorrower.loanType}
                          disabled={selectedBorrower.status !== 'معلق'}
                          onValueChange={(value) => {
                            if (selectedBorrower.status === 'معلق') {
                                const newType = value as 'اقساط' | 'مهلة';
                                setSelectedBorrower(prev => {
                                    if (!prev) return null;
                                    const updated: Partial<Borrower> = { ...prev, loanType: newType };
                                    if (newType === 'اقساط') {
                                        delete updated.discount;
                                    } else {
                                        delete updated.rate;
                                        delete updated.term;
                                        delete updated.installments;
                                    }
                                    return updated as Borrower;
                                });
                            }
                          }}
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
                        value={selectedBorrower.rate || ''}
                        readOnly={selectedBorrower.status !== 'معلق'}
                        className={cn("col-span-3", selectedBorrower.status !== 'معلق' && 'bg-muted/50 cursor-not-allowed')}
                        onChange={(e) =>
                          setSelectedBorrower({
                            ...selectedBorrower,
                            rate: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="term-edit" className="text-right">
                        المدة (سنوات)
                      </Label>
                      <Input
                        id="term-edit"
                        type="number"
                        value={selectedBorrower.term || ''}
                        readOnly={selectedBorrower.status !== 'معلق'}
                        className={cn("col-span-3", selectedBorrower.status !== 'معلق' && 'bg-muted/50 cursor-not-allowed')}
                        onChange={(e) =>
                          setSelectedBorrower({
                            ...selectedBorrower,
                            term: Number(e.target.value),
                          })
                        }
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
                        readOnly={selectedBorrower.status !== 'معلق'}
                        className={cn("col-span-3", selectedBorrower.status !== 'معلق' && 'bg-muted/50 cursor-not-allowed')}
                        onChange={(e) =>
                          setSelectedBorrower({
                            ...selectedBorrower,
                            discount: Number(e.target.value),
                          })
                        }
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
                    readOnly={selectedBorrower.status !== 'معلق'}
                    className={cn("col-span-3", selectedBorrower.status !== 'معلق' && 'bg-muted/50 cursor-not-allowed')}
                    onChange={(e) =>
                      setSelectedBorrower({
                        ...selectedBorrower,
                        dueDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                >
                  إلغاء
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
               {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'حفظ التغييرات'}
              </Button>
            </DialogFooter>
          </form>
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
              تفاصيل الأقساط الشهرية للقرض. يمكنك تحديث حالة كل قسط.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشهر</TableHead>
                  <TableHead>القسط الشهري</TableHead>
                  <TableHead>الأصل</TableHead>
                  <TableHead>الفائدة</TableHead>
                  <TableHead>الرصيد المتبقي</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSchedule.length > 0 ? (
                  paymentSchedule.map((payment) => (
                    <TableRow key={payment.month}>
                      <TableCell>{payment.month}</TableCell>
                      <TableCell>{formatCurrency(payment.payment)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(payment.principal)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(payment.interest)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(payment.balance)}</TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={payment.status}
                          onValueChange={(newStatus: InstallmentStatus) => handleInstallmentStatusChange(payment.month, newStatus)}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className={cn(
                            "w-[120px]", 
                            installmentStatusBgColor[payment.status],
                            installmentStatusTextColor[payment.status]
                            )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="لم يسدد بعد">لم يسدد بعد</SelectItem>
                            <SelectItem value="تم السداد">تم السداد</SelectItem>
                            <SelectItem value="متأخر">متأخر</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
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
                {selectedBorrower.partialPayment && (
                  <Alert variant="default" className="bg-primary/10 border-primary/20">
                      <AlertCircle className="h-4 w-4 !text-primary" />
                      <AlertTitle className="text-primary">سداد جزئي</AlertTitle>
                      <AlertDescription>
                          تم سداد مبلغ {formatCurrency(selectedBorrower.partialPayment.paidAmount)} من هذا القرض. تم إنشاء طلب قرض جديد بالمبلغ المتبقي.
                      </AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                    <div>
                        <span className='text-muted-foreground'>اسم المقترض:</span>
                        <span className='font-bold float-left'>{selectedBorrower.name}</span>
                    </div>
                     <div>
                        <span className='text-muted-foreground'>رقم الهوية:</span>
                        <span className='font-bold float-left'>{selectedBorrower.nationalId}</span>
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
                  (() => {
                    const principal = selectedBorrower.amount;
                    const rate = selectedBorrower.rate || 0;
                    const term = selectedBorrower.term || 0;

                    if (term === 0) return null;

                    const totalInterest = principal * (rate / 100) * term;
                    const totalPayment = principal + totalInterest;
                    const numberOfPayments = term * 12;
                    const monthlyPayment = numberOfPayments > 0 ? totalPayment / numberOfPayments : 0;
                    
                    return (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                          <div>
                              <span className='text-muted-foreground'>نسبة الفائدة:</span>
                              <span className='font-bold float-left'>{rate}%</span>
                          </div>
                          <div>
                              <span className='text-muted-foreground'>المدة (سنوات):</span>
                              <span className='font-bold float-left'>{term}</span>
                          </div>
                           <div>
                              <span className='text-muted-foreground'>القسط الشهري:</span>
                              <span className='font-bold float-left text-primary'>{formatCurrency(monthlyPayment)}</span>
                          </div>
                           <div>
                              <span className='text-muted-foreground'>الإجمالي مع الفوائد:</span>
                              <span className='font-bold float-left'>{formatCurrency(totalPayment)}</span>
                          </div>
                      </div>
                    )
                  })()
                )}

                {selectedBorrower.loanType === 'مهلة' && selectedBorrower.discount && selectedBorrower.discount > 0 && (
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد حذف طلب قرض "{borrowerToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء. سيتم حذف الطلبات المعلقة أو المرفوضة فقط.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBorrowerToDelete(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className={buttonVariants({ variant: 'destructive' })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
