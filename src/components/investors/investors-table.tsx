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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, Download } from 'lucide-react';
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
import { useRole } from '@/contexts/role-context';
import { Textarea } from '../ui/textarea';
import { borrowersData } from '@/app/borrowers/page';

export type Withdrawal = {
  id: string;
  amount: number;
  reason: string;
  date: string;
};

export type Investor = {
  id:string;
  name: string;
  amount: number;
  date: string;
  status: 'نشط' | 'غير نشط';
  defaultedFunds: number;
  withdrawalHistory: Withdrawal[];
};

type InvestorsTableProps = {
  investors: Investor[];
  onUpdateInvestor: (investor: Investor) => void;
};

const statusVariant: { [key: string]: 'default' | 'secondary' } = {
  نشط: 'default',
  'غير نشط': 'secondary',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

// Simulate mapping of defaulted loans to investors
const investorLoanMap: { [investorId: string]: string[] } = {
    'inv_001': ['bor_006'],
    'inv_005': ['bor_003'],
};

export function InvestorsTable({
  investors,
  onUpdateInvestor,
}: InvestorsTableProps) {
  const { role } = useRole();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);

  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(
    null
  );
  const [withdrawal, setWithdrawal] = useState({ amount: '', reason: '' });

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
    
    const newWithdrawal: Withdrawal = {
        id: `wd_${Date.now()}`,
        amount: Number(withdrawal.amount),
        reason: withdrawal.reason,
        date: new Date().toISOString().split('T')[0]
    };

    const updatedInvestor: Investor = {
        ...selectedInvestor,
        amount: selectedInvestor.amount - newWithdrawal.amount,
        withdrawalHistory: [...selectedInvestor.withdrawalHistory, newWithdrawal]
    };

    onUpdateInvestor(updatedInvestor);
    setIsWithdrawDialogOpen(false);
    setWithdrawal({ amount: '', reason: '' });
    setSelectedInvestor(null);
  }

  const canPerformActions = role === 'مدير النظام' || role === 'مدير المكتب';
  const canEdit = role === 'مدير النظام' || role === 'مدير المكتب' || role === 'موظف';
  const isEmployee = role === 'موظف';
  
  const displayedInvestors =
    role === 'مستثمر'
      ? investors.filter((i) => i.id === 'inv_003') // Simulate showing only the logged-in investor
      : investors;
      
  const getAssociatedDefaultedLoans = (investorId: string) => {
    const loanIds = investorLoanMap[investorId] || [];
    return borrowersData.filter(loan => loanIds.includes(loan.id));
  }

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
              {displayedInvestors.map((investor) => (
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
                          onSelect={() => handleViewDetailsClick(investor)}
                        >
                          عرض التفاصيل
                        </DropdownMenuItem>
                        {canEdit && (
                            <DropdownMenuItem
                              onSelect={() => handleEditClick(investor)}
                            >
                              {isEmployee ? 'رفع طلب تعديل' : 'تعديل'}
                            </DropdownMenuItem>
                        )}
                        {canPerformActions && (
                            <DropdownMenuItem
                              onSelect={() => handleWithdrawClick(investor)}
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
            <DialogTitle>{isEmployee ? 'رفع طلب تعديل مستثمر' : 'تعديل المستثمر'}</DialogTitle>
            <DialogDescription>
              {isEmployee
                ? 'قم بتحديث التفاصيل وسيتم مراجعة طلبك.'
                : 'قم بتحديث تفاصيل المستثمر هنا. انقر على حفظ عند الانتهاء.'}
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
              {isEmployee ? 'إرسال طلب التعديل' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المستثمر: {selectedInvestor?.name}</DialogTitle>
          </DialogHeader>
          {selectedInvestor && (
            <div className="grid gap-6 py-4">
               <Card>
                <CardHeader>
                  <CardTitle>الملخص المالي</CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-2 gap-4 text-sm'>
                   <div className="flex flex-col space-y-1">
                      <span className='text-muted-foreground'>إجمالي الاستثمار</span>
                      <span className='font-bold text-lg'>{formatCurrency(selectedInvestor.amount)}</span>
                   </div>
                    <div className="flex flex-col space-y-1">
                      <span className='text-muted-foreground'>الأرباح المستحقة</span>
                      <span className='font-bold text-lg text-green-600'>{formatCurrency(selectedInvestor.amount * 0.12)}</span>
                   </div>
                    <div className="flex flex-col space-y-1">
                      <span className='text-muted-foreground'>الأموال الخاملة</span>
                      <span className='font-bold text-lg'>{formatCurrency(selectedInvestor.amount * 0.15)}</span>
                   </div>
                    <div className="flex flex-col space-y-1">
                      <span className='text-muted-foreground'>الأموال المتعثرة</span>
                      <span className='font-bold text-lg text-destructive'>{formatCurrency(selectedInvestor.defaultedFunds)}</span>
                   </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>سجل عمليات السحب</CardTitle>
                  <CardDescription>قائمة بجميع المبالغ المسحوبة من الحساب.</CardDescription>
                </CardHeader>
                <CardContent>
                    {selectedInvestor.withdrawalHistory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>التاريخ</TableHead>
                                    <TableHead>المبلغ</TableHead>
                                    <TableHead>السبب</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedInvestor.withdrawalHistory.map(w => (
                                    <TableRow key={w.id}>
                                        <TableCell>{w.date}</TableCell>
                                        <TableCell>{formatCurrency(w.amount)}</TableCell>
                                        <TableCell>{w.reason}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className='text-sm text-muted-foreground text-center py-4'>لا توجد عمليات سحب.</p>
                    )}
                </CardContent>
              </Card>

              {getAssociatedDefaultedLoans(selectedInvestor.id).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>القروض المتعثرة المرتبطة</CardTitle>
                    <CardDescription>
                      قائمة بالقروض المتعثرة التي تؤثر على هذا الاستثمار.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>اسم المقترض</TableHead>
                          <TableHead>مبلغ القرض</TableHead>
                          <TableHead>الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getAssociatedDefaultedLoans(selectedInvestor.id).map(loan => (
                          <TableRow key={loan.id}>
                            <TableCell>{loan.name}</TableCell>
                            <TableCell>{formatCurrency(loan.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{loan.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

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
