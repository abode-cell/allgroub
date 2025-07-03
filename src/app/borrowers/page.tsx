

'use client';

import { useState, useMemo, useEffect } from 'react';
import { BorrowersTable } from '@/components/borrowers/borrowers-table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDataState, useDataActions } from '@/contexts/data-context';
import type { Borrower } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateInvestorFinancials } from '@/services/dashboard-service';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';

const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>
            <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);


export default function BorrowersPage() {
  const { addBorrower } = useDataActions();
  const { borrowers: allBorrowers, investors: allInvestors, visibleUsers: users, baseInterestRate, currentUser } = useDataState();
  const { toast } = useToast();
  const router = useRouter();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير المكتب' || role === 'موظف' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageBorrowers);
  const isSubordinate = role === 'موظف' || role === 'مساعد مدير المكتب';

  useEffect(() => {
    if (currentUser && (!hasAccess || (isSubordinate && !currentUser.managedBy))) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, isSubordinate, router]);

  const borrowers = useMemo(() => {
    if (!currentUser || !allBorrowers) return [];
    if (role === 'مدير النظام') return [];

    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    if (!managerId) {
        return []; 
    }

    const relevantUserIds = new Set(users.filter(u => u.managedBy === managerId || u.id === managerId).map(u => u.id));
    relevantUserIds.add(currentUser.id);
    return allBorrowers.filter(b => b.submittedBy && relevantUserIds.has(b.submittedBy));
  }, [currentUser, allBorrowers, users, role]);

  const investors = useMemo(() => {
    if (!currentUser || !allInvestors) return [];
    if (role === 'مدير النظام') return [];
    
    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    if (!managerId) {
        return [];
    }
    
    return allInvestors.filter(i => {
        const investorUser = users.find(u => u.id === i.id);
        return investorUser?.managedBy === managerId;
    });
  }, [currentUser, allInvestors, users, role]);


  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBorrower, setNewBorrower] = useState<{
    name: string;
    phone: string;
    amount: string;
    rate: string;
    term: string;
    loanType: 'اقساط' | 'مهلة';
    status: Borrower['status'];
    dueDate: string;
    discount: string;
  }>({
    name: '',
    phone: '',
    amount: '',
    rate: '',
    term: '',
    loanType: 'اقساط',
    status: 'منتظم',
    dueDate: '',
    discount: '',
  });
  const [isInsufficientFundsDialogOpen, setIsInsufficientFundsDialogOpen] = useState(false);
  const [availableFunds, setAvailableFunds] = useState(0);
  
  const isEmployee = role === 'موظف';
  const isAssistant = role === 'مساعد مدير المكتب';

  const manager = (isEmployee || isAssistant) ? users.find((u) => u.id === currentUser?.managedBy) : null;
  const isDirectAdditionEnabled = (isEmployee || isAssistant) ? manager?.allowEmployeeSubmissions ?? false : false;
  const hideInvestorFunds = (isEmployee || isAssistant) ? manager?.hideEmployeeInvestorFunds ?? false : false;
  const showAddButton = role === 'مدير المكتب' || (isAssistant && currentUser?.permissions?.manageBorrowers) || isEmployee;
  
  const isPendingRequest = ((isEmployee || isAssistant) && !isDirectAdditionEnabled);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewBorrower((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleLoanTypeChange = (value: 'اقساط' | 'مهلة') => {
    setSelectedInvestors([]);
    setNewBorrower((prev) => ({ ...prev, loanType: value, rate: '', term: '', dueDate: '', discount: '' }));
  };
  
  const resetForm = () => {
    setNewBorrower({ name: '', phone: '', amount: '', rate: '', term: '', loanType: 'اقساط', status: 'منتظم', dueDate: '', discount: '' });
    setSelectedInvestors([]);
  };

  const proceedToAddBorrower = (finalAmount?: number) => {
    setIsSubmitting(true);
    const isInstallments = newBorrower.loanType === 'اقساط';
    const finalStatus = isPendingRequest ? 'معلق' : 'منتظم';

    addBorrower({
      ...newBorrower,
      amount: finalAmount ?? Number(newBorrower.amount),
      rate: (isEmployee || isAssistant) && isInstallments ? baseInterestRate : Number(newBorrower.rate),
      term: Number(newBorrower.term) || 0,
      status: finalStatus,
      discount: Number(newBorrower.discount) || 0,
    }, finalStatus === 'معلق' ? [] : selectedInvestors).then(result => {
        if(result.success) {
            setIsAddDialogOpen(false);
            resetForm();
        }
    }).finally(() => {
        setIsSubmitting(false);
        setIsInsufficientFundsDialogOpen(false);
    });
  };

  const handleAddBorrower = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const isInstallments = newBorrower.loanType === 'اقساط';
    const rateForValidation = (isEmployee || isAssistant) && isInstallments ? baseInterestRate : newBorrower.rate;

    if (!newBorrower.name || !newBorrower.amount || !newBorrower.phone || !newBorrower.dueDate || (isInstallments && (!rateForValidation || !newBorrower.term))) {
      setIsSubmitting(false);
      return;
    }
    
    if (isPendingRequest) {
      proceedToAddBorrower();
      return;
    }

    if (selectedInvestors.length === 0) {
        toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'يجب اختيار مستثمر واحد على الأقل لتمويل قرض نشط.'
        });
        setIsSubmitting(false);
        return;
    }
    
    const loanAmount = Number(newBorrower.amount);
    const totalAvailableFromSelected = investors
      .filter(inv => selectedInvestors.includes(inv.id))
      .reduce((sum, inv) => {
        const financials = calculateInvestorFinancials(inv, allBorrowers);
        const available = newBorrower.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
        return sum + available;
      }, 0);

    if (totalAvailableFromSelected < loanAmount) {
      setAvailableFunds(totalAvailableFromSelected);
      setIsInsufficientFundsDialogOpen(true);
      setIsSubmitting(false);
      return;
    }

    proceedToAddBorrower();
  };
  
  if (!currentUser || !hasAccess || (isSubordinate && !currentUser.managedBy)) {
    return <PageSkeleton />;
  }

  const installmentBorrowers = useMemo(() => borrowers.filter((b) => b.loanType === 'اقساط'), [borrowers]);
  const gracePeriodBorrowers = useMemo(() => borrowers.filter((b) => b.loanType === 'مهلة'), [borrowers]);

  const getDialogTitle = () => {
    if (isEmployee || isAssistant) {
      return isDirectAdditionEnabled ? 'إضافة قرض جديد' : 'رفع طلب إضافة قرض جديد';
    }
    return 'إضافة قرض جديد';
  };

  const getDialogDescription = () => {
    if (isEmployee || isAssistant) {
      return isDirectAdditionEnabled
        ? 'أدخل تفاصيل القرض الجديد هنا. انقر على حفظ عند الانتهاء.'
        : 'أدخل تفاصيل القرض الجديد وسيتم مراجعة الطلب من قبل مديرك.';
    }
    return 'أدخل تفاصيل القرض الجديد هنا. انقر على حفظ عند الانتهاء.';
  };

  const getSubmitButtonText = () => {
    if (isEmployee || isAssistant) {
      return isDirectAdditionEnabled ? 'حفظ' : 'إرسال الطلب';
    }
    return 'حفظ';
  };
  
  const availableInvestorsForDropdown = useMemo(() => {
    return investors
      .map(investor => {
        const financials = calculateInvestorFinancials(investor, allBorrowers);
        const capital = newBorrower.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
        return {
          ...investor,
          availableCapital: capital,
        };
      })
      .filter(i => 
        i.status === 'نشط' && 
        i.availableCapital > 0
      );
  }, [investors, allBorrowers, newBorrower.loanType]);
  
  const investorsForSelectedLoanType = useMemo(() => {
     return availableInvestorsForDropdown.filter(i => {
        const financials = calculateInvestorFinancials(i, allBorrowers);
        const capital = newBorrower.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
        return capital > 0;
     });
  }, [availableInvestorsForDropdown, newBorrower.loanType, allBorrowers]);

  const hasAvailableInvestorsForType = (type: 'اقساط' | 'مهلة') => {
    return investors.some(i => {
        if (i.status !== 'نشط') return false;
        const financials = calculateInvestorFinancials(i, allBorrowers);
        const capital = type === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
        return capital > 0;
    });
  };
  
  const canAddInstallmentLoan = hasAvailableInvestorsForType('اقساط');
  const canAddGraceLoan = hasAvailableInvestorsForType('مهلة');
  const canAddAnyLoan = canAddInstallmentLoan || canAddGraceLoan;

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">إدارة القروض</h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة قائمة القروض في المنصة حسب نوع التمويل.
            </p>
          </header>
          {showAddButton && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddDialogOpen(open); }}>
            <DialogTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <span tabIndex={isPendingRequest || canAddAnyLoan ? undefined : 0}>
                        <Button disabled={!isPendingRequest && !canAddAnyLoan}>
                            <PlusCircle className="ml-2 h-4 w-4" />
                            {isEmployee || isAssistant ? (isDirectAdditionEnabled ? 'إضافة قرض' : 'رفع طلب إضافة قرض') : 'إضافة قرض'}
                        </Button>
                      </span>
                  </TooltipTrigger>
                  {(!isPendingRequest && !canAddAnyLoan) && (
                    <TooltipContent>
                        <p>لا يوجد مستثمرون نشطون لديهم رأس مال متاح لإضافة قرض جديد.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
              <form onSubmit={handleAddBorrower}>
                <DialogHeader>
                  <DialogTitle>{getDialogTitle()}</DialogTitle>
                  <DialogDescription>
                    {getDialogDescription()}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      اسم المقترض
                    </Label>
                    <Input
                      id="name"
                      placeholder="اسم المقترض"
                      className="col-span-3"
                      value={newBorrower.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">
                      رقم الجوال
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05xxxxxxxx"
                      className="col-span-3"
                      value={newBorrower.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      المبلغ
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="مبلغ القرض"
                      className="col-span-3"
                      value={newBorrower.amount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">نوع التمويل</Label>
                    <RadioGroup
                      value={newBorrower.loanType}
                      onValueChange={handleLoanTypeChange}
                      className="col-span-3 flex gap-4 rtl:space-x-reverse"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="اقساط" id="r1" disabled={!isPendingRequest && !canAddInstallmentLoan} />
                        <Label htmlFor="r1">أقساط</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="مهلة" id="r2" disabled={!isPendingRequest && !canAddGraceLoan}/>
                        <Label htmlFor="r2">مهلة</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {newBorrower.loanType === 'اقساط' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rate" className="text-right">
                          الفائدة (%)
                        </Label>
                        {(isEmployee || isAssistant) ? (
                           <Input
                             id="rate"
                             type="number"
                             value={baseInterestRate}
                             readOnly
                             className="col-span-3 bg-muted/50"
                           />
                        ) : (
                           <Input
                             id="rate"
                             type="number"
                             step="0.1"
                             placeholder="نسبة الفائدة %"
                             className="col-span-3"
                             value={newBorrower.rate}
                             onChange={handleInputChange}
                             required={newBorrower.loanType === 'اقساط'}
                           />
                        )}
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="term" className="text-right">
                         المدة (سنوات)
                        </Label>
                        <Input
                          id="term"
                          type="number"
                          placeholder="مدة القرض بالسنوات"
                          className="col-span-3"
                          value={newBorrower.term}
                          onChange={handleInputChange}
                          required={newBorrower.loanType === 'اقساط'}
                        />
                      </div>
                    </>
                  )}
                  {newBorrower.loanType === 'مهلة' && (
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="discount" className="text-right">
                          الخصم
                        </Label>
                        <Input
                          id="discount"
                          type="number"
                          placeholder="مبلغ الخصم (إن وجد)"
                          className="col-span-3"
                          value={newBorrower.discount}
                          onChange={handleInputChange}
                        />
                      </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dueDate" className="text-right">
                      تاريخ الاستحقاق
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      className="col-span-3"
                      value={newBorrower.dueDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {!isPendingRequest && (
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right pt-2">
                        المستثمرون
                        </Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="col-span-3">
                                {selectedInvestors.length > 0
                                ? `${selectedInvestors.length} مستثمرون محددون`
                                : "اختر المستثمرين"}
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-64" align='end'>
                            <DropdownMenuLabel>المستثمرون المتاحون ({newBorrower.loanType})</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {investorsForSelectedLoanType.map((investor) => (
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
                                        {!hideInvestorFunds && (
                                          <span className='text-muted-foreground text-xs'>{formatCurrency(investor.availableCapital)}</span>
                                        )}
                                    </div>
                                </DropdownMenuCheckboxItem>
                            ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                    }}>
                      إلغاء
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {getSubmitButtonText()}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
        <Tabs defaultValue="installments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="installments">
                  قروض الأقساط ({installmentBorrowers.length})
                </TabsTrigger>
                <TabsTrigger value="grace-period">
                  قروض المهلة ({gracePeriodBorrowers.length})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="installments" className="mt-4">
                <BorrowersTable borrowers={installmentBorrowers} />
            </TabsContent>
            <TabsContent value="grace-period" className="mt-4">
                <BorrowersTable borrowers={gracePeriodBorrowers} />
            </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={isInsufficientFundsDialogOpen} onOpenChange={setIsInsufficientFundsDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>رصيد المستثمر غير كافٍ</AlertDialogTitle>
                <AlertDialogDescription>
                    الرصيد المتاح من المستثمرين المختارين ({formatCurrency(availableFunds)}) لا يغطي مبلغ القرض المطلوب ({formatCurrency(Number(newBorrower.amount))}).
                    <br/><br/>
                    يمكنك المتابعة على أي حال وسيتم إنشاء القرض بالمبلغ المتاح، أو العودة لتغيير اختيارك من المستثمرين.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>العودة للتعديل</AlertDialogCancel>
                <AlertDialogAction onClick={() => proceedToAddBorrower(availableFunds)}>
                  المتابعة على أي حال
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
