
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
import { CalendarIcon, MoreHorizontal, CheckCircle, TrendingUp, MessageSquareText } from 'lucide-react';
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
import { useDataState, useDataActions } from '@/contexts/data-context';
import { Textarea } from '@/components/ui/textarea';
import type { Investor, Transaction, TransactionType, WithdrawalMethod, UpdatableInvestor } from '@/lib/types';
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


type InvestorsTableProps = {
  investors: Investor[];
  hideFunds?: boolean;
};

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
  نشط: 'default',
  'غير نشط': 'secondary',
  'معلق': 'secondary',
  'مرفوض': 'destructive',
};

const transactionTypeVariant: { [key in TransactionType]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    'إيداع رأس المال': 'default',
    'إيداع أرباح': 'default',
    'سحب أرباح': 'secondary',
    'سحب من رأس المال': 'destructive',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

export function InvestorsTable({
  investors,
  hideFunds = false,
}: InvestorsTableProps) {
  const { currentUser, borrowers, users, graceTotalProfitPercentage, graceInvestorSharePercentage, investorSharePercentage } = useDataState();
  const { updateInvestor, withdrawFromInvestor, approveInvestor, requestCapitalIncrease, markInvestorAsNotified } = useDataActions();
  const role = currentUser?.role;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);

  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(
    null
  );
  const [smsMessage, setSmsMessage] = useState('');
  const [withdrawal, setWithdrawal] = useState<{
    amount: string;
    description: string;
    type: TransactionType;
    date: Date | undefined;
    withdrawalMethod: WithdrawalMethod;
  }>({
    amount: '',
    description: '',
    type: 'سحب أرباح',
    date: new Date(),
    withdrawalMethod: 'بنكي',
  });

  const handleEditClick = (investor: Investor) => {
    setSelectedInvestor({ ...investor });
    setIsEditDialogOpen(true);
  };
  
  const handleSendSmsClick = (investor: Investor) => {
    const investorUser = users.find(u => u.id === investor.id);
    if (!investorUser || !investorUser.phone) {
        // In a real app, you might show a toast error.
        console.error("Investor phone number not found.");
        return;
    }
    
    // Calculate financial details for the message
    const myFundedLoans = borrowers.filter(b => investor.fundedLoanIds.includes(b.id));
    const totalProfits = myFundedLoans
        .filter(b => (b.status !== 'معلق' && b.status !== 'مرفوض'))
        .reduce((sum, loan) => {
          const fundingDetails = loan.fundedBy?.find(f => f.investorId === investor.id);
          if (!fundingDetails) return sum;

          let loanTotalProfit = 0;
          if (loan.loanType === 'اقساط' && loan.rate && loan.term) {
              const totalInterest = loan.amount * (loan.rate / 100) * loan.term;
              loanTotalProfit = totalInterest * (investorSharePercentage / 100);
          } else if (loan.loanType === 'مهلة') {
              const totalProfit = loan.amount * (graceTotalProfitPercentage / 100);
              loanTotalProfit = totalProfit * (graceInvestorSharePercentage / 100);
          }

          const myShareOfLoan = fundingDetails.amount / loan.amount;
          return sum + (loanTotalProfit * myShareOfLoan);
        }, 0);

    setSelectedInvestor(investor);
    const defaultMessage = `مرحباً ${investor.name},\n\nهذا ملخص لأداء استثماراتك معنا:\n- إجمالي الأرباح المتوقعة: ${formatCurrency(totalProfits)}\n- إجمالي الأموال المتعثرة: ${formatCurrency(investor.defaultedFunds || 0)}\n- الرصيد الخامل المتاح: ${formatCurrency(investor.investmentType === 'اقساط' ? investor.installmentCapital : investor.gracePeriodCapital)}\n\nنشكركم على ثقتكم،\nإدارة الموقع`;
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
    const { defaultedFunds, transactionHistory, isNotified, fundedLoanIds, ...updatableInvestor } = selectedInvestor;
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

  const handleWithdrawClick = (investor: Investor) => {
    setSelectedInvestor(investor);
    setIsWithdrawDialogOpen(true);
  };

  const handleWithdrawalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setWithdrawal(prev => ({...prev, [id]: value}));
  }

  const handleConfirmWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestor || !withdrawal.amount || !withdrawal.description || !withdrawal.date) return;
    
    withdrawFromInvestor(selectedInvestor.id, {
      amount: Number(withdrawal.amount),
      description: withdrawal.description,
      type: withdrawal.type,
      date: withdrawal.date.toISOString(),
      withdrawalMethod: withdrawal.withdrawalMethod,
    });

    setIsWithdrawDialogOpen(false);
    setWithdrawal({ amount: '', description: '', type: 'سحب أرباح', date: new Date(), withdrawalMethod: 'بنكي' });
    setSelectedInvestor(null);
  }

  const canEdit = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageInvestors);
  const canApprove = role === 'مدير المكتب';
  const canWithdraw = role === 'مدير المكتب' || role === 'مستثمر';
  const canRequestIncrease = role === 'مدير المكتب' || role === 'مستثمر';
  const canSendSms = role === 'مدير المكتب' || role === 'مساعد مدير المكتب' || role === 'موظف';

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
              {investors.length > 0 ? (
                investors.map((investor) => {
                  const availableCapital = investor.investmentType === 'اقساط' ? investor.installmentCapital : investor.gracePeriodCapital;
                  return (
                  <TableRow key={investor.id}>
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
                                تعديل
                              </DropdownMenuItem>
                          )}
                          {canWithdraw && (
                              <DropdownMenuItem
                                onSelect={() => handleWithdrawClick(investor)}
                                disabled={investor.status === 'معلق' || availableCapital <= 0}
                              >
                                سحب الأموال
                              </DropdownMenuItem>
                          )}
                          {availableCapital <= 0 && investor.status === 'نشط' && canRequestIncrease && (
                              <DropdownMenuItem onSelect={() => requestCapitalIncrease(investor.id)}>
                                  <TrendingUp className="ml-2 h-4 w-4" />
                                  طلب زيادة رأس المال
                              </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  الرصيد
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={selectedInvestor.investmentType === 'اقساط' ? selectedInvestor.installmentCapital : selectedInvestor.gracePeriodCapital}
                  onChange={(e) => {
                      const newCapital = Number(e.target.value);
                      setSelectedInvestor(prev => {
                        if (!prev) return null;
                        if (prev.investmentType === 'اقساط') {
                            return { ...prev, installmentCapital: newCapital };
                        } else {
                            return { ...prev, gracePeriodCapital: newCapital };
                        }
                      });
                  }}
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
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المستثمر: {selectedInvestor?.name}</DialogTitle>
            <DialogDescription>
              نظرة شاملة على الأداء المالي وسجل العمليات للمستثمر.
            </DialogDescription>
          </DialogHeader>
          {selectedInvestor && (() => {
            const activeInvestment = borrowers
              .filter(b => selectedInvestor.fundedLoanIds.includes(b.id) && (b.status === 'منتظم' || b.status === 'متأخر'))
              .reduce((total, loan) => {
                  const funding = loan.fundedBy?.find(f => f.investorId === selectedInvestor.id);
                  return total + (funding?.amount || 0);
              }, 0);
            
            const idleFunds = selectedInvestor.installmentCapital + selectedInvestor.gracePeriodCapital;
            const defaultedFunds = selectedInvestor.defaultedFunds || 0;
            const totalCapital = selectedInvestor.transactionHistory
              .filter(tx => tx.type === 'إيداع رأس المال')
              .reduce((acc, tx) => acc + tx.amount, 0);

            return (
              <div className="grid gap-6 pt-4 text-sm">
                <div>
                    <h4 className="font-semibold text-base mb-2">الملخص المالي</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                        <div>
                            <span className='text-muted-foreground'>إجمالي رأس المال:</span>
                            <span className='font-bold text-base float-left'>{hideFunds ? '*****' : formatCurrency(totalCapital)}</span>
                        </div>
                        <div>
                            <span className='text-muted-foreground'>الأموال النشطة:</span>
                            <span className='font-bold text-base float-left text-green-600'>{hideFunds ? '*****' : formatCurrency(activeInvestment)}</span>
                        </div>
                        <div>
                            <span className='text-muted-foreground'>الأموال الخاملة:</span>
                            <span className='font-bold text-base float-left'>{hideFunds ? '*****' : formatCurrency(idleFunds)}</span>
                        </div>
                        <div>
                            <span className='text-muted-foreground'>الأموال المتعثرة:</span>
                            <span className='font-bold text-base float-left text-destructive'>{hideFunds ? '*****' : formatCurrency(defaultedFunds)}</span>
                        </div>
                         <div>
                            <span className='text-muted-foreground'>حصة ربح الأقساط:</span>
                            <span className='font-bold text-base float-left'>{selectedInvestor.installmentProfitShare ?? 0}%</span>
                        </div>
                        <div>
                            <span className='text-muted-foreground'>حصة ربح المهلة:</span>
                            <span className='font-bold text-base float-left'>{selectedInvestor.gracePeriodProfitShare ?? 0}%</span>
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

      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleConfirmWithdrawal}>
            <DialogHeader>
              <DialogTitle>سحب أموال لـ {selectedInvestor?.name}</DialogTitle>
              <DialogDescription>
                أدخل المبلغ والسبب ونوع العملية لإتمام السحب.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">تاريخ السحب</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !withdrawal.date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {withdrawal.date ? format(withdrawal.date, 'PPP') : <span>اختر تاريخ</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={withdrawal.date}
                      onSelect={(date) => setWithdrawal(prev => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
               <div className="space-y-2">
                <Label htmlFor="withdrawalMethod">طريقة السحب</Label>
                <RadioGroup
                    id="withdrawalMethod"
                    value={withdrawal.withdrawalMethod}
                    onValueChange={(value: WithdrawalMethod) => setWithdrawal(prev => ({...prev, withdrawalMethod: value}))}
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
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="أدخل مبلغ السحب"
                  value={withdrawal.amount}
                  onChange={handleWithdrawalChange}
                  required
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="type">نوع السحب</Label>
                <Select
                    value={withdrawal.type}
                    onValueChange={(value: TransactionType) => setWithdrawal(prev => ({...prev, type: value}))}
                >
                    <SelectTrigger id="type">
                        <SelectValue placeholder="اختر نوع السحب" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="سحب أرباح">سحب أرباح</SelectItem>
                        <SelectItem value="سحب من رأس المال">سحب من رأس المال</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف (السبب)</Label>
                <Textarea
                  id="description"
                  placeholder="أدخل سبب السحب"
                  value={withdrawal.description}
                  onChange={handleWithdrawalChange}
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
              <Button type="submit">تأكيد السحب</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
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
