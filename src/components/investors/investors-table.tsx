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
import { MoreHorizontal, CheckCircle } from 'lucide-react';
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
import type { Investor } from '@/lib/types';


type InvestorsTableProps = {
  investors: Investor[];
};

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
  نشط: 'default',
  'غير نشط': 'secondary',
  'معلق': 'secondary',
  'مرفوض': 'destructive',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

export function InvestorsTable({
  investors,
}: InvestorsTableProps) {
  const { role } = useAuth();
  const { borrowers, updateInvestor, withdrawFromInvestor, approveInvestor } = useData();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);

  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [withdrawal, setWithdrawal] = useState({ amount: '', reason: '' });

  const handleEditClick = (investor: Investor) => {
    setSelectedInvestor({ ...investor });
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (!selectedInvestor) return;
    const { defaultedFunds, ...updatableInvestor } = selectedInvestor;
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
    if (!selectedInvestor || !withdrawal.amount || !withdrawal.reason) return;
    
    withdrawFromInvestor(selectedInvestor.id, {
      amount: Number(withdrawal.amount),
      reason: withdrawal.reason
    });

    setIsWithdrawDialogOpen(false);
    setWithdrawal({ amount: '', reason: '' });
    setSelectedInvestor(null);
  }

  const canPerformActions = role === 'مدير النظام' || role === 'مدير المكتب';
  const canEdit = role === 'مدير النظام' || role === 'مدير المكتب';
      
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
                  <TableCell>{formatCurrency(investor.amount)}</TableCell>
                  <TableCell>{investor.date}</TableCell>
                   <TableCell className="text-destructive font-medium">
                    {formatCurrency(investor.defaultedFunds || 0)}
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
                              disabled={investor.status === 'معلق'}
                            >
                              سحب الأموال
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل المستثمر: {selectedInvestor?.name}</DialogTitle>
            <DialogDescription>
              نظرة سريعة على الأداء المالي للمستثمر.
            </DialogDescription>
          </DialogHeader>
          {selectedInvestor && (() => {
             const defaultedFunds = selectedInvestor.defaultedFunds || 0;
            const activeInvestment = borrowers
              .filter(b => selectedInvestor.fundedLoanIds.includes(b.id) && (b.status === 'منتظم' || b.status === 'متأخر'))
              .reduce((acc, b) => acc + b.amount, 0);

            const idleFunds = selectedInvestor.amount - activeInvestment;

            return (
              <div className="grid gap-4 pt-4 text-sm">
                <h4 className="font-semibold">الملخص المالي</h4>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-md border bg-muted/50">
                    <div>
                        <span className='text-muted-foreground'>إجمالي الاستثمار:</span>
                        <span className='font-bold text-base float-left'>{formatCurrency(selectedInvestor.amount + defaultedFunds)}</span>
                    </div>
                    <div>
                        <span className='text-muted-foreground'>الأموال النشطة:</span>
                        <span className='font-bold text-base float-left text-green-600'>{formatCurrency(activeInvestment)}</span>
                    </div>
                    <div>
                        <span className='text-muted-foreground'>الأموال الخاملة:</span>
                        <span className='font-bold text-base float-left'>{formatCurrency(idleFunds)}</span>
                    </div>
                     <div>
                        <span className='text-muted-foreground'>الأموال المتعثرة:</span>
                        <span className='font-bold text-base float-left text-destructive'>{formatCurrency(defaultedFunds)}</span>
                    </div>
                </div>

                {selectedInvestor.withdrawalHistory.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2 mt-2">آخر 3 عمليات سحب</h4>
                        <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>التاريخ</TableHead>
                                    <TableHead className="text-left">المبلغ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedInvestor.withdrawalHistory.slice(0, 3).map(w => (
                                    <TableRow key={w.id}>
                                        <TableCell>{w.date}</TableCell>
                                        <TableCell className="text-left">{formatCurrency(w.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </div>
                )}
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
                أدخل المبلغ والسبب لعملية السحب.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                <Label htmlFor="reason">السبب</Label>
                <Textarea
                  id="reason"
                  placeholder="أدخل سبب السحب"
                  value={withdrawal.reason}
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
