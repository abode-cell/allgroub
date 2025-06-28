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
import { CalendarIcon, MoreHorizontal, CheckCircle, TrendingUp } from 'lucide-react';
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
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Textarea } from '../ui/textarea';
import type { Investor, Transaction, TransactionType, WithdrawalMethod } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


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
  const { role } = useAuth();
  const { borrowers, updateInvestor, withdrawFromInvestor, approveInvestor, requestCapitalIncrease } = useData();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);

  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
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

  const handleSaveChanges = () => {
    if (!selectedInvestor) return;
    const { defaultedFunds, transactionHistory, ...updatableInvestor } = selectedInvestor;
    updateInvestor(updatableInvestor);
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
      date: format(withdrawal.date, 'yyyy-MM-dd'),
      withdrawalMethod: withdrawal.withdrawalMethod,
    });

    setIsWithdrawDialogOpen(false);
    setWithdrawal({ amount: '', description: '', type: 'سحب أرباح', date: new Date(), withdrawalMethod: 'بنكي' });
    setSelectedInvestor(null);
  }

  const canPerformActions = role === 'مدير النظام' || role === 'مدير المكتب' || role === 'مستثمر';
  const canEdit = role === 'مدير النظام' || role === 'مدير المكتب';
      
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
                <TableHead>الأموال المتعثرة</TableHead>
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
                  <TableCell>{hideFunds ? '*****' : formatCurrency(investor.amount)}</TableCell>
                  <TableCell>{investor.date}</TableCell>
                   <TableCell className="text-destructive font-medium">
                    {hideFunds ? '*****' : formatCurrency(investor.defaultedFunds || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant[investor.status] || 'default'}
                    >
                      {investor.status === 'معلق' ? 'طلب معلق' : investor.status}
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
                         {canPerformActions && investor.status === 'معلق' && (
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
                        {canEdit && (
                            <DropdownMenuItem
                              onSelect={() => handleEditClick(investor)}
                              disabled={investor.status === 'معلق'}
                            >
                              تعديل
                            </DropdownMenuItem>
                        )}
                        {canPerformActions && (
                            <DropdownMenuItem
                              onSelect={() => handleWithdrawClick(investor)}
                              disabled={investor.status === 'معلق' || investor.amount <= 0}
                            >
                              سحب الأموال
                            </DropdownMenuItem>
                        )}
                         {investor.amount <= 0 && investor.status === 'نشط' && canPerformActions && (
                            <DropdownMenuItem onSelect={() => requestCapitalIncrease(investor.id)}>
                                <TrendingUp className="ml-2 h-4 w-4" />
                                طلب زيادة رأس المال
                            </DropdownMenuItem>
                        )}
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
            
            const idleFunds = selectedInvestor.amount;
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
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-base mb-2 mt-2">سجل العمليات</h4>
                    <ScrollArea className="h-72 border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>التاريخ</TableHead>
                                    <TableHead>النوع</TableHead>
                                    <TableHead>الوصف</TableHead>
                                    <TableHead>الطريقة</TableHead>
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
                                                <TableCell className="text-xs">{tx.date}</TableCell>
                                                <TableCell><Badge variant={transactionTypeVariant[tx.type] || 'outline'}>{tx.type}</Badge></TableCell>
                                                <TableCell className="text-xs">{tx.description}</TableCell>
                                                <TableCell className="text-xs">{tx.withdrawalMethod || '-'}</TableCell>
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
    </>
  );
}
