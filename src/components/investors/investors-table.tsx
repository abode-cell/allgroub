

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
import { CalendarIcon, MoreHorizontal, CheckCircle, TrendingUp, MessageSquareText, PlusCircle, AlertCircle, Mail, Phone, Edit, Info, ShieldX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React, { useState, useMemo } from 'react';
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
import { useDataState, useDataActions } from '@/contexts/data-context';
import { Textarea } from '@/components/ui/textarea';
import type { Investor, Transaction, TransactionType, WithdrawalMethod, UpdatableInvestor, NewInvestorPayload } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { calculateInvestorFinancials } from '@/services/dashboard-service';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { formatCurrency } from '@/lib/utils';
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


type InvestorsTableProps = {
  investors: Investor[];
  hideFunds?: boolean;
};

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  نشط: 'default',
  'غير نشط': 'secondary',
  'معلق': 'secondary',
  'مرفوض': 'destructive',
  'محذوف': 'outline',
};

const transactionTypeVariant: { [key in TransactionType]: 'default' | 'destructive' } = {
    'إيداع رأس المال': 'default',
    'سحب من رأس المال': 'destructive',
};

export function InvestorsTable({
  investors,
  hideFunds = false,
}: InvestorsTableProps) {
  const { currentUser, borrowers, visibleUsers: users, graceTotalProfitPercentage, graceInvestorSharePercentage, investorSharePercentage } = useDataState();
  const { updateInvestor, addInvestorTransaction, approveInvestor, requestCapitalIncrease, markInvestorAsNotified, deleteUser } = useDataActions();
  const { toast } = useToast();
  const role = currentUser?.role;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [investorToDelete, setInvestorToDelete] = useState<Investor | null>(null);

  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(
    null
  );
  const [smsMessage, setSmsMessage] = useState('');
  const [transactionDetails, setTransactionDetails] = useState<{
    amount: string;
    description: string;
    type: TransactionType;
    date: Date | undefined;
    withdrawalMethod?: WithdrawalMethod;
    capitalSource: 'installment' | 'grace';
  }>({
    amount: '',
    description: '',
    type: 'إيداع رأس المال',
    date: new Date(),
    withdrawalMethod: 'بنكي',
    capitalSource: 'installment',
  });
  
  const investorsWithFinancials = useMemo(() => {
    return investors.map(investor => {
        const financials = calculateInvestorFinancials(investor, borrowers);
        return {
            ...investor,
            ...financials,
        };
    });
  }, [investors, borrowers]);

  const availableWithdrawalSources = useMemo(() => {
    if (!selectedInvestor) return [];
    const financials = investorsWithFinancials.find(i => i.id === selectedInvestor.id);
    if (!financials) return [];

    const sources: {value: 'installment' | 'grace', label: string}[] = [];
    if (financials.idleInstallmentCapital > 0) {
      sources.push({ value: 'installment', label: 'محفظة الأقساط' });
    }
    if (financials.idleGraceCapital > 0) {
      sources.push({ value: 'grace', label: 'محفظة المهلة' });
    }
    return sources;
  }, [selectedInvestor, investorsWithFinancials]);
  
  const handleDeleteClick = (investor: Investor) => {
    setInvestorToDelete(investor);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (investorToDelete) {
      deleteUser(investorToDelete.id);
      setIsDeleteDialogOpen(false);
      setInvestorToDelete(null);
    }
  };

  const handleEditClick = (investor: Investor) => {
    setSelectedInvestor({ ...investor });
    setIsEditDialogOpen(true);
  };
  
  const handleSendSmsClick = (investor: Investor) => {
    const investorUser = users.find(u => u.id === investor.id);
    if (!investorUser || !investorUser.phone) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "رقم جوال المستثمر غير مسجل.",
        });
        return;
    }
    
    // Calculate financial details for the message
    const myFundedLoanIds = investor.fundedLoanIds || [];
    const myFundedLoans = borrowers.filter(b => myFundedLoanIds.includes(b.id));
    const totalProfits = myFundedLoans
        .filter(b => (b.status !== 'معلق' && b.status !== 'مرفوض'))
        .reduce((sum, loan) => {
          const fundingDetails = loan.fundedBy?.find(f => f.investorId === investor.id);
          if (!fundingDetails) return sum;

          let profitForInvestor = 0;
            if (loan.loanType === 'اقساط' && loan.rate && loan.term) {
                const profitShare = investor.installmentProfitShare ?? investorSharePercentage;
                const interestOnFundedAmount = fundingDetails.amount * (loan.rate / 100) * loan.term;
                profitForInvestor = interestOnFundedAmount * (profitShare / 100);
            } else if (loan.loanType === 'مهلة') {
                const profitShare = investor.gracePeriodProfitShare ?? graceInvestorSharePercentage;
                const totalProfitOnFundedAmount = fundingDetails.amount * (graceTotalProfitPercentage / 100);
                profitForInvestor = totalProfitOnFundedAmount * (profitShare / 100);
            }
          return sum + profitForInvestor;
        }, 0);
        
    const financials = calculateInvestorFinancials(investor, borrowers);

    setSelectedInvestor(investor);
    const defaultMessage = `مرحباً ${investor.name},\n\nهذا ملخص لأداء استثماراتك معنا:\n- إجمالي الأرباح المتوقعة: ${formatCurrency(totalProfits)}\n- إجمالي الأموال المتعثرة: ${formatCurrency(financials.defaultedFunds || 0)}\n- الرصيد الخامل المتاح: ${formatCurrency(financials.idleInstallmentCapital + financials.idleGraceCapital)}\n\nنشكركم على ثقتكم،\nإدارة الموقع`;
    setSmsMessage(defaultMessage);
    setIsSmsDialogOpen(true);
  };

  const handleConfirmSms = () => {
    if (!selectedInvestor || !smsMessage) return;
    markInvestorAsNotified(selectedInvestor.id, smsMessage);
    setIsSmsDialogOpen(false);
    setSmsMessage('');
    setSelectedInvestor(null);
  };

  const handleSaveChanges = () => {
    if (!selectedInvestor) return;
    const { ...updatableInvestor } = selectedInvestor;
    updateInvestor(updatableInvestor as UpdatableInvestor);
    setIsEditDialogOpen(false);
    setSelectedInvestor(null);
  };
  
  const handleApproveClick = (investor: Investor) => {
    approveInvestor(investor.id);
  };

  const handleViewDetailsClick = (investor: Investor) => {
    setSelectedInvestor(investor);
    setIsDetailsDialogOpen(true);
  };

  const handleAddTransactionClick = (investor: Investor) => {
    setSelectedInvestor(investor);
    setTransactionDetails({ amount: '', description: '', type: 'إيداع رأس المال', date: new Date(), withdrawalMethod: 'بنكي', capitalSource: 'installment' });
    setIsTransactionDialogOpen(true);
  };

  const handleTransactionDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setTransactionDetails(prev => ({...prev, [id]: value}));
  }

  const handleConfirmTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestor || !transactionDetails.amount || !transactionDetails.description || !transactionDetails.date) return;
    
    addInvestorTransaction(selectedInvestor.id, {
      amount: Number(transactionDetails.amount),
      description: transactionDetails.description,
      type: transactionDetails.type,
      date: transactionDetails.date.toISOString(),
      withdrawalMethod: transactionDetails.withdrawalMethod,
      capitalSource: transactionDetails.capitalSource,
    });

    setIsTransactionDialogOpen(false);
    setSelectedInvestor(null);
  }

  const canEdit = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageInvestors);
  const canApprove = role === 'مدير المكتب';
  const canAddTransaction = role === 'مدير المكتب' || role === 'مستثمر';
  const canRequestIncrease = role === 'مدير المكتب' || role === 'مستثمر';
  const canSendSms = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageInvestors) || (role === 'موظف' && currentUser?.permissions?.manageInvestors);
  const canDelete = role === 'مدير المكتب';
  const isWithdrawal = transactionDetails.type.includes('سحب');


  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المستثمر</TableHead>
                <TableHead>الرصيد المتاح</TableHead>
                <TableHead>تاريخ البدء</TableHead>
                <TableHead className="text-center">الأموال المتعثرة</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investorsWithFinancials.length > 0 ? (
                investorsWithFinancials.map((investor) => {
                  const availableCapital = investor.idleInstallmentCapital + investor.idleGraceCapital;
                  const isDeleted = investor.status === 'محذوف';
                  return (
                  <TableRow key={investor.id} className={cn(isDeleted && 'text-muted-foreground opacity-60')}>
                    <TableCell className="font-medium">{investor.name}</TableCell>
                    <TableCell>{hideFunds ? '*****' : formatCurrency(availableCapital)}</TableCell>
                    <TableCell>{new Date(investor.date).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell className="text-destructive font-medium text-center">
                      {hideFunds ? '*****' : formatCurrency(investor.defaultedFunds || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={statusVariant[investor.status] || 'default'}
                      >
                         {investor.status === 'محذوف' && <ShieldX className="ml-1 h-3 w-3" />}
                        {investor.status === 'معلق' ? 'طلب معلق' : investor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left flex items-center justify-start">
                        {investor.isNotified && (
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger>
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>تم تبليغ المستثمر</p>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                      {!isDeleted && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">فتح القائمة</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canApprove && investor.status === 'معلق' && (
                              <DropdownMenuItem
                                onSelect={() => handleApproveClick(investor)}
                              >
                                <CheckCircle className="ml-2 h-4 w-4" />
                                الموافقة على الطلب
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onSelect={() => handleViewDetailsClick(investor)}
                            >
                              <Info className="ml-2 h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            {canSendSms && (
                              <DropdownMenuItem onSelect={() => handleSendSmsClick(investor)} disabled={investor.isNotified}>
                                  <MessageSquareText className="ml-2 h-4 w-4" />
                                  إرسال رسالة نصية
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                                <DropdownMenuItem
                                  onSelect={() => handleEditClick(investor)}
                                  disabled={investor.status === 'معلق'}
                                >
                                  <Edit className="ml-2 h-4 w-4" />
                                  تعديل
                                </DropdownMenuItem>
                            )}
                            {canAddTransaction && (
                                <DropdownMenuItem
                                  onSelect={() => handleAddTransactionClick(investor)}
                                  disabled={investor.status === 'معلق'}
                                >
                                  <PlusCircle className="ml-2 h-4 w-4" />
                                  إضافة عملية مالية
                                </DropdownMenuItem>
                            )}
                            {availableCapital <= 0 && investor.status === 'نشط' && canRequestIncrease && (
                                <DropdownMenuItem onSelect={() => requestCapitalIncrease(investor.id)}>
                                    <TrendingUp className="ml-2 h-4 w-4" />
                                    طلب زيادة رأس المال
                                </DropdownMenuItem>
                            )}
                             {canDelete && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={() => handleDeleteClick(investor)}
                                >
                                    <Trash2 className="ml-2 h-4 w-4" />
                                    حذف
                                </DropdownMenuItem>
                             )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    لا يوجد مستثمرون لعرضهم.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم وضع علامة 'محذوف' على المستخدم <span className="font-bold text-destructive">{investorToDelete?.name}</span> وسيتم إلغاء وصوله. ستبقى بياناته التاريخية محفوظة. لا يمكن حذف مستثمر له قروض ممولة أو رصيد متبقٍ. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvestorToDelete(null)}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className={buttonVariants({ variant: 'destructive' })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) setSelectedInvestor(null); setIsEditDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المستثمر</DialogTitle>
            <DialogDescription asChild>
                <div className="space-y-2">
                    <p>قم بتحديث تفاصيل المستثمر هنا. انقر على حفظ عند الانتهاء.</p>
                     <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>ملاحظة هامة</AlertTitle>
                        <AlertDescription>
                          لا يمكن تعديل رأس المال من هنا. لإضافة أو سحب أموال، استخدم خيار "إضافة عملية مالية" من القائمة للحفاظ على سجل دقيق.
                        </AlertDescription>
                    </Alert>
                </div>
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
                    <Label htmlFor="installmentProfitShare-edit" className="text-right">
                        ربح الأقساط (%)
                    </Label>
                    <Input
                        id="installmentProfitShare"
                        type="number"
                        step="0.1"
                        value={selectedInvestor.installmentProfitShare ?? ''}
                        onChange={(e) => setSelectedInvestor(prev => prev ? { ...prev, installmentProfitShare: Number(e.target.value) } : null)}
                        className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gracePeriodProfitShare-edit" className="text-right">
                        ربح المهلة (%)
                    </Label>
                    <Input
                        id="gracePeriodProfitShare"
                        type="number"
                        step="0.1"
                        value={selectedInvestor.gracePeriodProfitShare ?? ''}
                        onChange={(e) => setSelectedInvestor(prev => prev ? { ...prev, gracePeriodProfitShare: Number(e.target.value) } : null)}
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
      <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => { if(!open) setSelectedInvestor(null); setIsDetailsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المستثمر: {selectedInvestor?.name}</DialogTitle>
            <DialogDescription>
              نظرة شاملة على الأداء المالي وسجل العمليات للمستثمر.
            </DialogDescription>
          </DialogHeader>
          {selectedInvestor && (() => {
            const financials = calculateInvestorFinancials(selectedInvestor, borrowers);
            const userDetails = users.find(u => u.id === selectedInvestor.id);

            return (
              <div className="grid gap-6 pt-4 text-sm">
                <div>
                    <h4 className="font-semibold text-base mb-2">الملخص المالي</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-md border bg-muted/50 space-y-2">
                            <h5 className="font-semibold text-center pb-2 border-b">محفظة الأقساط</h5>
                            <div className="flex justify-between"><span>إجمالي رأس المال:</span> <span className='font-bold'>{hideFunds ? '*****' : formatCurrency(financials.totalInstallmentCapital)}</span></div>
                            <div className="flex justify-between"><span>الأموال النشطة:</span> <span className='font-bold text-green-600'>{hideFunds ? '*****' : formatCurrency(financials.activeInstallmentCapital)}</span></div>
                            <div className="flex justify-between"><span>الأموال الخاملة:</span> <span className='font-bold'>{hideFunds ? '*****' : formatCurrency(financials.idleInstallmentCapital)}</span></div>
                            <div className="flex justify-between"><span>الأموال المتعثرة:</span> <span className='font-bold text-destructive'>{hideFunds ? '*****' : formatCurrency(financials.defaultedInstallmentFunds)}</span></div>
                        </div>
                        <div className="p-3 rounded-md border bg-muted/50 space-y-2">
                             <h5 className="font-semibold text-center pb-2 border-b">محفظة المهلة</h5>
                            <div className="flex justify-between"><span>إجمالي رأس المال:</span> <span className='font-bold'>{hideFunds ? '*****' : formatCurrency(financials.totalGraceCapital)}</span></div>
                            <div className="flex justify-between"><span>الأموال النشطة:</span> <span className='font-bold text-green-600'>{hideFunds ? '*****' : formatCurrency(financials.activeGraceCapital)}</span></div>
                            <div className="flex justify-between"><span>الأموال الخاملة:</span> <span className='font-bold'>{hideFunds ? '*****' : formatCurrency(financials.idleGraceCapital)}</span></div>
                            <div className="flex justify-between"><span>الأموال المتعثرة:</span> <span className='font-bold text-destructive'>{hideFunds ? '*****' : formatCurrency(financials.defaultedGraceFunds)}</span></div>
                        </div>
                    </div>
                </div>
                
                {userDetails && (
                    <div>
                        <h4 className="font-semibold text-base mb-2 mt-2">معلومات التواصل</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                            <div className='flex items-center gap-2'>
                                <Mail className='h-4 w-4 text-muted-foreground'/>
                                <span className='text-muted-foreground'>البريد:</span>
                                <span className='font-bold float-left'>{userDetails.email}</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Phone className='h-4 w-4 text-muted-foreground'/>
                                <span className='text-muted-foreground'>الجوال:</span>
                                <span className='font-bold float-left'>{userDetails.phone}</span>
                            </div>
                        </div>
                    </div>
                )}
                 <div>
                    <h4 className="font-semibold text-base mb-2 mt-2">حصص الأرباح</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                        <div className='flex items-center gap-2'>
                            <span className='text-muted-foreground'>ربح الأقساط:</span>
                            <span className='font-bold float-left text-primary'>{selectedInvestor.installmentProfitShare ?? investorSharePercentage}%</span>
                        </div>
                        <div className='flex items-center gap-2'>
                           <span className='text-muted-foreground'>ربح المهلة:</span>
                           <span className='font-bold float-left text-primary'>{selectedInvestor.gracePeriodProfitShare ?? graceInvestorSharePercentage}%</span>
                        </div>
                    </div>
                 </div>


                <div>
                    <h4 className="font-semibold text-base mb-2 mt-2">سجل العمليات</h4>
                    <ScrollArea className="h-72 border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>التاريخ</TableHead>
                                    <TableHead className="text-center">النوع</TableHead>
                                    <TableHead>الوصف</TableHead>
                                    <TableHead className="text-center">الطريقة</TableHead>
                                    <TableHead>المبلغ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedInvestor.transactionHistory && selectedInvestor.transactionHistory.length > 0 ? (
                                    selectedInvestor.transactionHistory
                                        .slice()
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(tx => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="text-xs">{new Date(tx.date).toLocaleDateString('ar-SA')}</TableCell>
                                                <TableCell className="text-center"><Badge variant={transactionTypeVariant[tx.type] || 'outline'}>{tx.type}</Badge></TableCell>
                                                <TableCell className="text-xs">{tx.description}</TableCell>
                                                <TableCell className="text-xs text-center">{tx.withdrawalMethod || '-'}</TableCell>
                                                <TableCell className={`font-medium ${tx.type.includes('إيداع') ? 'text-green-600' : 'text-destructive'}`}>
                                                    {tx.type.includes('إيداع') ? '+' : '-'}
                                                    {formatCurrency(tx.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            لا يوجد سجل عمليات لهذا المستثمر.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
              </div>
            )
          })()}
          <DialogFooter className="mt-4">
             <DialogClose asChild>
                <Button type="button" variant="secondary">
                إغلاق
                </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => { if(!open) setSelectedInvestor(null); setIsTransactionDialogOpen(open)}}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleConfirmTransaction}>
            <DialogHeader>
              <DialogTitle>عملية مالية جديدة لـ {selectedInvestor?.name}</DialogTitle>
              <DialogDescription>
                سجل عملية إيداع أو سحب جديدة. سيتم توثيق هذه العملية في سجل المستثمر.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
               <div className="space-y-2">
                <Label htmlFor="type">نوع العملية</Label>
                <Select
                    value={transactionDetails.type}
                    onValueChange={(value: TransactionType) => setTransactionDetails(prev => ({...prev, type: value}))}
                >
                    <SelectTrigger id="type">
                        <SelectValue placeholder="اختر نوع العملية" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="إيداع رأس المال">إيداع رأس المال</SelectItem>
                        <SelectItem value="سحب من رأس المال">سحب من رأس المال</SelectItem>
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">تاريخ العملية</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !transactionDetails.date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {transactionDetails.date ? format(transactionDetails.date, 'PPP') : <span>اختر تاريخ</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={transactionDetails.date}
                      onSelect={(date) => setTransactionDetails(prev => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
               {isWithdrawal && (
                <div className="space-y-2">
                    <Label htmlFor="withdrawalMethod">طريقة السحب</Label>
                    <RadioGroup
                        id="withdrawalMethod"
                        value={transactionDetails.withdrawalMethod}
                        onValueChange={(value: WithdrawalMethod) => setTransactionDetails(prev => ({...prev, withdrawalMethod: value}))}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <RadioGroupItem value="بنكي" id="bank" />
                            <Label htmlFor="bank">بنكي</Label>
                        </div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <RadioGroupItem value="نقدي" id="cash" />
                            <Label htmlFor="cash">نقدي</Label>
                        </div>
                    </RadioGroup>
                </div>
               )}
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="أدخل المبلغ"
                  value={transactionDetails.amount}
                  onChange={handleTransactionDetailsChange}
                  required
                />
              </div>
              <div className="space-y-2">
                  <Label>محفظة العملية</Label>
                  <RadioGroup
                      value={transactionDetails.capitalSource}
                      onValueChange={(value: 'installment' | 'grace') => setTransactionDetails(prev => ({...prev, capitalSource: value}))}
                      className="flex gap-4"
                  >
                      {isWithdrawal ? (
                      availableWithdrawalSources.map(source => (
                          <div className="flex items-center space-x-2 rtl:space-x-reverse" key={source.value}>
                          <RadioGroupItem value={source.value} id={`source-${source.value}`} />
                          <Label htmlFor={`source-${source.value}`}>{source.label}</Label>
                          </div>
                      ))
                      ) : (
                      <>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <RadioGroupItem value="installment" id="source-install" />
                              <Label htmlFor="source-install">محفظة الأقساط</Label>
                          </div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <RadioGroupItem value="grace" id="source-grace" />
                              <Label htmlFor="source-grace">محفظة المهلة</Label>
                          </div>
                      </>
                      )}
                  </RadioGroup>
                  {isWithdrawal && availableWithdrawalSources.length === 0 && (
                      <p className='text-xs text-destructive text-center p-2'>لا يوجد رصيد متاح للسحب.</p>
                  )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف (السبب)</Label>
                <Textarea
                  id="description"
                  placeholder="أدخل سبب العملية"
                  value={transactionDetails.description}
                  onChange={handleTransactionDetailsChange}
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
              <Button type="submit" disabled={isWithdrawal && availableWithdrawalSources.length === 0}>تأكيد العملية</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isSmsDialogOpen} onOpenChange={(open) => { if (!open) setSelectedInvestor(null); setIsSmsDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال رسالة إلى {selectedInvestor?.name}</DialogTitle>
            <DialogDescription>
              قم بتحرير محتوى الرسالة أدناه. سيتم إرسالها إلى رقم جوال المستثمر المسجل.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="sms-message-investor">محتوى الرسالة</Label>
            <Textarea
              id="sms-message-investor"
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
