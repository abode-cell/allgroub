

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
import { Loader2, PlusCircle, AlertCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDataState } from '@/contexts/data-context';
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
import { calculateInvestorFinancials, formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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
  const { addBorrower, borrowers: allBorrowers, investors: allInvestors, users, baseInterestRate, currentUser, transactions } = useDataState();
  const { toast } = useToast();
  const router = useRouter();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageBorrowers) || role === 'موظف';

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  const borrowers = useMemo(() => {
    if (!currentUser || !allBorrowers) return [];
    if (role === 'مدير النظام' || role === 'مستثمر') return [];

    return allBorrowers.filter(b => b.office_id === currentUser.office_id);
  }, [currentUser, allBorrowers, role]);

  const investors = useMemo(() => {
    if (!currentUser || !allInvestors) return [];
    if (role === 'مدير النظام' || role === 'مستثمر') return [];
    
    return allInvestors.filter(i => i.office_id === currentUser.office_id);
  }, [currentUser, allInvestors, role]);


  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialBorrowerState = {
    name: '',
    phone: '',
    nationalId: '',
    amount: '',
    rate: '',
    term: '',
    loanType: 'اقساط' as 'اقساط' | 'مهلة',
    status: 'منتظم' as Borrower['status'],
    dueDate: '',
    discount: '',
  };
  
  const [newBorrower, setNewBorrower] = useState(initialBorrowerState);
  
  const [isInsufficientFundsDialogOpen, setIsInsufficientFundsDialogOpen] = useState(false);
  const [availableFunds, setAvailableFunds] = useState(0);

  const [isDuplicateBorrowerDialogOpen, setIsDuplicateBorrowerDialogOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ borrowerName: string; managerName: string; managerPhone: string } | null>(null);

  
  const isEmployee = role === 'موظف';
  const isAssistant = role === 'مساعد مدير المكتب';

  const manager = users.find((u) => u.office_id === currentUser?.office_id && u.role === 'مدير المكتب');
  
  const canAddLoan = role === 'مدير المكتب' || (isAssistant && currentUser?.permissions?.manageBorrowers) || (isEmployee && manager?.allowEmployeeSubmissions);

  const isPendingRequest = (isEmployee || isAssistant) && !manager?.allowEmployeeSubmissions;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewBorrower((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleLoanTypeChange = (value: 'اقساط' | 'مهلة') => {
    setSelectedInvestors([]);
    setNewBorrower((prev) => ({ ...prev, loanType: value, rate: '', term: '', dueDate: '', discount: '' }));
  };
  
  const resetForm = () => {
    setNewBorrower(initialBorrowerState);
    setSelectedInvestors([]);
  };

  const proceedToAddBorrower = (force: boolean = false) => {
    setIsSubmitting(true);
    const isInstallments = newBorrower.loanType === 'اقساط';
    const finalStatus = isPendingRequest ? 'معلق' : 'منتظم';

    addBorrower({
      ...newBorrower,
      amount: Number(newBorrower.amount),
      rate: (isEmployee || isAssistant) && isInstallments ? baseInterestRate : Number(newBorrower.rate),
      term: Number(newBorrower.term) || 0,
      status: finalStatus,
      discount: Number(newBorrower.discount) || 0,
      nationalId: newBorrower.nationalId,
    }, finalStatus === 'معلق' ? [] : selectedInvestors, force).then(result => {
        if(result.success) {
            setIsAddDialogOpen(false);
            resetForm();
        } else if (result.isDuplicate && result.duplicateInfo) {
            setDuplicateInfo(result.duplicateInfo);
            setIsDuplicateBorrowerDialogOpen(true);
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

    if (!newBorrower.name || !newBorrower.amount || !newBorrower.phone || !newBorrower.nationalId || !newBorrower.dueDate || (isInstallments && (!rateForValidation || !newBorrower.term))) {
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
        const financials = calculateInvestorFinancials(inv, allBorrowers, transactions);
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

  const handleForceAddBorrower = () => {
    setIsDuplicateBorrowerDialogOpen(false);
    proceedToAddBorrower(true);
  };
  
  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  const installmentBorrowers = useMemo(() => borrowers.filter((b) => b.loanType === 'اقساط'), [borrowers]);
  const gracePeriodBorrowers = useMemo(() => borrowers.filter((b) => b.loanType === 'مهلة'), [borrowers]);

  const getDialogTitle = () => {
    if (role === 'مدير المكتب') return 'إضافة قرض جديد';
    return isPendingRequest ? 'رفع طلب إضافة قرض جديد' : 'إضافة قرض جديد';
  };

  const getDialogDescription = () => {
    if (role === 'مدير المكتب') return 'أدخل تفاصيل القرض الجديد، ثم اختر المستثمرين لتمويله.';
    return isPendingRequest
        ? 'سيتم مراجعة طلب القرض الجديد من قبل مديرك.'
        : 'أدخل تفاصيل القرض الجديد، ثم اختر المستثمرين لتمويله.';
  };
  
  const getSubmitButtonText = () => {
    if (role === 'مدير المكتب') return 'حفظ وإضافة';
    return isPendingRequest ? 'إرسال الطلب' : 'حفظ وإضافة';
  };
  
  const availableInvestorsForDropdown = useMemo(() => {
    return investors
      .map(investor => {
        const financials = calculateInvestorFinancials(investor, allBorrowers, transactions);
        const capital = newBorrower.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
        return {
          ...investor,
          availableCapital: capital,
        };
      })
      .filter(i => 
        i.status === 'نشط' && 
        typeof i.availableCapital !== 'undefined' &&
        i.availableCapital > 0
      );
  }, [investors, allBorrowers, newBorrower.loanType, transactions]);
  
  const canAddAnyLoan = isPendingRequest || investors.some(i => i.status === 'نشط');
  
  const hideInvestorFunds = (isEmployee || isAssistant) ? manager?.hideEmployeeInvestorFunds ?? false : false;

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
          {canAddLoan && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddDialogOpen(open); }}>
            <DialogTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <span tabIndex={canAddAnyLoan ? undefined : 0}>
                        <Button disabled={!canAddAnyLoan}>
                            <PlusCircle className="ml-2 h-4 w-4" />
                            {isPendingRequest ? 'رفع طلب إضافة قرض' : 'إضافة قرض'}
                        </Button>
                      </span>
                  </TooltipTrigger>
                  {!canAddAnyLoan && (
                    <TooltipContent>
                        <p>لا يوجد مستثمرون نشطون لإضافة قرض جديد.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (isSubmitting) e.preventDefault(); }}>
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
                    <Label htmlFor="nationalId" className="text-right">
                      رقم الهوية
                    </Label>
                    <Input
                      id="nationalId"
                      placeholder="رقم الهوية"
                      className="col-span-3"
                      value={newBorrower.nationalId}
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
                        <RadioGroupItem value="اقساط" id="r1" />
                        <Label htmlFor="r1">أقساط</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="مهلة" id="r2" />
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
                                            {!hideInvestorFunds && (
                                              <span className='text-muted-foreground text-xs'>{formatCurrency(investor.availableCapital)}</span>
                                            )}
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
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                    }} disabled={isSubmitting}>
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
                <AlertDialogAction onClick={() => proceedToAddBorrower(true)}>
                  المتابعة على أي حال
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isDuplicateBorrowerDialogOpen} onOpenChange={setIsDuplicateBorrowerDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="text-amber-500" />
                  تحذير: عميل مسجل مسبقًا
                </AlertDialogTitle>
                <AlertDialogDescription className="pt-2">
                    العميل "{duplicateInfo?.borrowerName}" مسجل بالفعل لدى مكتب آخر:
                    <div className="font-medium text-foreground my-2 p-2 bg-muted rounded-md">
                        <p>اسم المكتب: {duplicateInfo?.managerName}</p>
                        <p>جوال المكتب: {duplicateInfo?.managerPhone}</p>
                    </div>
                    هل ترغب في المتابعة وإضافة هذا العميل إلى مكتبك على أي حال؟
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDuplicateBorrowerDialogOpen(false)}>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleForceAddBorrower}>
                  المتابعة على أي حال
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    

    