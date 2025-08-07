

'use client';

import { useDataState, useDataActions } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Borrower, Investor } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { calculateInvestorFinancials } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';


const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);


const statusVariant: {
  [key: string]: 'default' | 'secondary' | 'destructive' | 'outline';
} = {
  منتظم: 'default',
  نشط: 'default',
  معلق: 'secondary',
  مرفوض: 'destructive',
  'مسدد بالكامل': 'default',
  متأخر: 'destructive',
  متعثر: 'destructive',
  'غير نشط': 'secondary',
};


export default function RequestsPage() {
  const router = useRouter();
  const { 
    borrowers, 
    investors: allInvestors, 
    users,
    currentUser,
  } = useDataState();
  const {
    approveBorrower, 
    approveInvestor,
    rejectBorrower,
    rejectInvestor,
  } = useDataActions();
  const { toast } = useToast();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageRequests);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);


  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [itemToReject, setItemToReject] = useState<{id: string; type: 'borrower' | 'investor'} | null>(null);
  
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [loanToApprove, setLoanToApprove] = useState<Borrower | null>(null);
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [isInsufficientFundsDialogOpen, setIsInsufficientFundsDialogOpen] = useState(false);
  const [availableFunds, setAvailableFunds] = useState(0);

  const manager = useMemo(() => {
    if (!currentUser) return null;
    return role === 'مدير المكتب' ? currentUser : users.find(u => u.id === currentUser.managedBy);
  }, [currentUser, users, role]);
  
  const investors = useMemo(() => {
    if (!manager) return [];
    return allInvestors.filter(i => {
        const investorUser = users.find(u => u.id === i.id);
        return investorUser?.managedBy === manager.id;
    });
  }, [manager, allInvestors, users]);

  const handleRejectClick = (id: string, type: 'borrower' | 'investor') => {
    setItemToReject({ id, type });
    setIsRejectDialogOpen(true);
  }

  const handleConfirmRejection = () => {
    if (!itemToReject || !rejectionReason) return;

    if (itemToReject.type === 'borrower') {
      rejectBorrower(itemToReject.id, rejectionReason);
    } else {
      rejectInvestor(itemToReject.id, rejectionReason);
    }
    
    // Reset state
    setIsRejectDialogOpen(false);
    setRejectionReason('');
    setItemToReject(null);
  };
  
  const handleApproveClick = (loan: Borrower) => {
    setLoanToApprove(loan);
    setIsApproveDialogOpen(true);
    setSelectedInvestors([]); // Reset selections
  };

  const proceedToApproveBorrower = (investorIds: string[]) => {
      if (loanToApprove) {
          approveBorrower(loanToApprove.id, investorIds);
          setIsApproveDialogOpen(false);
          setLoanToApprove(null);
          setSelectedInvestors([]);
      }
      setIsInsufficientFundsDialogOpen(false);
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
      e.preventDefault();
      if (!loanToApprove) return;

      if (selectedInvestors.length === 0) {
          toast({
              variant: 'destructive',
              title: 'خطأ',
              description: 'يجب اختيار مستثمر واحد على الأقل لتمويل هذا القرض.'
          });
          return;
      }

      const loanAmount = loanToApprove.amount;
      const totalAvailableFromSelected = investors
        .filter(inv => selectedInvestors.includes(inv.id))
        .reduce((sum, inv) => {
            const financials = calculateInvestorFinancials(inv, borrowers);
            const available = loanToApprove.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
            return sum + available;
        }, 0);

      if (totalAvailableFromSelected < loanAmount) {
          setAvailableFunds(totalAvailableFromSelected);
          setIsInsufficientFundsDialogOpen(true);
          return;
      }

      proceedToApproveBorrower(selectedInvestors);
  };

  const availableInvestorsForDropdown = useMemo(() => {
    if (!loanToApprove) return [];
    return investors
      .map(investor => {
        const financials = calculateInvestorFinancials(investor, borrowers);
        const capital = loanToApprove.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
        return {
          ...investor,
          availableCapital: capital,
        };
      })
      .filter(i => 
        i.status === 'نشط' && 
        i.availableCapital > 0
      );
  }, [investors, borrowers, loanToApprove]);


  const getStatusForBorrower = (borrower: Borrower) => {
    switch (borrower.status) {
      case 'معلق':
        return <Badge variant="secondary">معلق</Badge>;
      case 'مرفوض':
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="default">تمت الموافقة</Badge>;
    }
  };

  const getStatusForInvestor = (investor: Investor) => {
    switch (investor.status) {
      case 'معلق':
        return <Badge variant="secondary">معلق</Badge>;
      case 'مرفوض':
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="default">تمت الموافقة</Badge>;
    }
  };
  
  const requestsToDisplay = useMemo(() => {
    const allBorrowerRequests = borrowers.filter(b => b.submittedBy && b.status === 'معلق');
    const allInvestorRequests = investors.filter(i => i.submittedBy && i.status === 'معلق');

    if (!currentUser) return { borrowerRequests: [], investorRequests: [] };

    if (role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageRequests)) {
      const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
      const employeeIds = users.filter(u => u.managedBy === managerId).map(u => u.id);
      
      return {
        borrowerRequests: allBorrowerRequests.filter(b => b.submittedBy && employeeIds.includes(b.submittedBy)),
        investorRequests: allInvestorRequests.filter(i => i.submittedBy && employeeIds.includes(i.submittedBy))
      };
    }
    return { borrowerRequests: [], investorRequests: [] };
  }, [borrowers, investors, users, currentUser, role]);

  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  const { borrowerRequests, investorRequests } = requestsToDisplay;


  return (
    <>
      <div className="flex flex-col flex-1">
        <main className="flex-1 space-y-8 p-4 md:p-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">سجل الطلبات</h1>
            <p className="text-muted-foreground mt-1">
              عرض ومراجعة سجل طلبات إضافة القروض والمستثمرين.
            </p>
          </header>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>طلبات القروض</CardTitle>
                <CardDescription>
                  قائمة بجميع طلبات إضافة القروض وحالتها.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المقترض</TableHead>
                      <TableHead>المبلغ المطلوب</TableHead>
                      <TableHead className="text-center">نوع التمويل</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead className="text-left">الإجراء / ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowerRequests.length > 0 ? (
                      borrowerRequests.map((borrower) => (
                        <TableRow key={borrower.id}>
                          <TableCell className="font-medium">{borrower.name}</TableCell>
                          <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                          <TableCell className="text-center">{borrower.loanType}</TableCell>
                          <TableCell className="text-center">
                            {getStatusForBorrower(borrower)}
                          </TableCell>
                          <TableCell className="text-left">
                             {borrower.status === 'معلق' ? (
                              <div className="flex gap-2 justify-start">
                                <Button size="sm" onClick={() => handleApproveClick(borrower)}>
                                  <Check className="ml-2 h-4 w-4" />
                                  موافقة
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectClick(borrower.id, 'borrower')}>
                                  <X className="ml-2 h-4 w-4" />
                                  رفض
                                </Button>
                              </div>
                            ) : borrower.status === 'مرفوض' ? (
                               <span className="text-sm text-destructive">{borrower.rejectionReason || 'تم الرفض'}</span>
                            ) : (
                               <span className="text-sm text-muted-foreground">تمت المعالجة</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          لا توجد طلبات قروض.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>طلبات المستثمرين</CardTitle>
                <CardDescription>
                  قائمة بجميع طلبات إضافة المستثمرين وحالتها.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المستثمر</TableHead>
                      <TableHead>مبلغ الاستثمار</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead className="text-left">الإجراء / ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investorRequests.length > 0 ? (
                      investorRequests.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell className="font-medium">{investor.name}</TableCell>
                          <TableCell>{formatCurrency(investor.transactionHistory.find(tx => tx.description.includes('تأسيسي'))?.amount ?? 0)}</TableCell>
                          <TableCell className="text-center">
                            {getStatusForInvestor(investor)}
                          </TableCell>
                          <TableCell className="text-left">
                           {investor.status === 'معلق' ? (
                              <div className="flex gap-2 justify-start">
                                <Button size="sm" onClick={() => approveInvestor(investor.id)}>
                                  <Check className="ml-2 h-4 w-4" />
                                  موافقة
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectClick(investor.id, 'investor')}>
                                  <X className="ml-2 h-4 w-4" />
                                  رفض
                                </Button>
                              </div>
                            ) : investor.status === 'مرفوض' ? (
                               <span className="text-sm text-destructive">{investor.rejectionReason || 'تم الرفض'}</span>
                            ) : (
                               <span className="text-sm text-muted-foreground">تمت المعالجة</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          لا توجد طلبات مستثمرين.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>تأكيد الرفض</DialogTitle>
              <DialogDescription>
                الرجاء إدخال سبب الرفض. سيظهر هذا السبب للموظف.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">سبب الرفض</Label>
                <Textarea
                  id="reason"
                  placeholder="أدخل سبب الرفض هنا..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
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
              <Button variant="destructive" type="button" onClick={handleConfirmRejection} disabled={!rejectionReason}>
                تأكيد الرفض
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleConfirmApproval}>
                <DialogHeader>
                  <DialogTitle>الموافقة على القرض وتمويله</DialogTitle>
                  <DialogDescription>
                    للموافقة على قرض "{loanToApprove?.name}" بالمواصفات التالية:
                    مبلغ <strong className='text-primary'>{formatCurrency(loanToApprove?.amount ?? 0)}</strong>
                    {loanToApprove?.loanType === 'اقساط' && (
                        <span>
                            , بنسبة ربح <strong className='text-primary'>{loanToApprove?.rate ?? 0}%</strong> لمدة <strong className='text-primary'>{loanToApprove?.term ?? 0} سنوات</strong>.
                        </span>
                    )}
                     يرجى اختيار المستثمرين لتمويله.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="p-3 rounded-lg border bg-muted/50">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">المبلغ المطلوب:</span>
                            <span className="text-xl font-bold">{formatCurrency(loanToApprove?.amount ?? 0)}</span>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>اختر المستثمرين</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    <span>
                                        {selectedInvestors.length > 0
                                        ? `${selectedInvestors.length} مستثمرون محددون`
                                        : "اختر المستثمرين"}
                                    </span>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[380px]" align='end'>
                                <DropdownMenuLabel>المستثمرون المتاحون ({loanToApprove?.loanType})</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableInvestorsForDropdown.length > 0 ? (
                                    availableInvestorsForDropdown.map((investor) => (
                                    <DropdownMenuCheckboxItem
                                    key={investor.id}
                                    checked={selectedInvestors.includes(investor.id)}
                                    onSelect={(e) => e.preventDefault()}
                                    onCheckedChange={(checked) => {
                                        return checked
                                        ? setSelectedInvestors((prev) => [...prev, investor.id])
                                        : setSelectedInvestors((prev) =>
                                            prev.filter((id) => id !== investor.id)
                                            );
                                    }}
                                    >
                                        <div className='flex justify-between w-full'>
                                            <span>{investor.name}</span>
                                            <span className='text-muted-foreground text-xs'>{formatCurrency(investor.availableCapital)}</span>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))
                                ) : (
                                    <div className="text-center text-xs text-muted-foreground p-2">
                                        لا يوجد مستثمرون متاحون لهذا النوع.
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">إلغاء</Button>
                  </DialogClose>
                  <Button type="submit">تأكيد الموافقة والتمويل</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isInsufficientFundsDialogOpen} onOpenChange={setIsInsufficientFundsDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>رصيد المستثمر غير كافٍ</AlertDialogTitle>
                <AlertDialogDescription>
                    الرصيد المتاح من المستثمرين المختارين ({formatCurrency(availableFunds)}) لا يغطي مبلغ القرض المطلوب ({formatCurrency(loanToApprove?.amount ?? 0)}).
                    <br/><br/>
                    يمكنك المتابعة وسيتم إنشاء القرض بالمبلغ المتاح فقط، أو يمكنك العودة لتغيير اختيارك من المستثمرين.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>العودة للتعديل</AlertDialogCancel>
                <AlertDialogAction onClick={() => proceedToApproveBorrower(selectedInvestors)}>
                  المتابعة على أي حال
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
