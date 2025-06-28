'use client';

import { useState, useMemo } from 'react';
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
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useData } from '@/contexts/data-context';
import type { Borrower, Investor } from '@/lib/types';
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


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);


export default function BorrowersPage() {
  const { role, user: currentUser } = useAuth();
  const { borrowers, investors, addBorrower, users, baseInterestRate } = useData();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [newBorrower, setNewBorrower] = useState<{
    name: string;
    amount: string;
    rate: string;
    term: string;
    loanType: 'اقساط' | 'مهلة';
    status: Borrower['status'];
    dueDate: string;
    discount: string;
  }>({
    name: '',
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
  const manager = isEmployee ? users.find((u) => u.id === currentUser?.managedBy) : null;
  const isDirectAdditionEnabled = isEmployee ? manager?.allowEmployeeSubmissions ?? false : false;
  const hideInvestorFunds = isEmployee ? manager?.hideEmployeeInvestorFunds ?? false : false;
  const showAddButton = role === 'مدير النظام' || role === 'مدير المكتب' || isEmployee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewBorrower((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleStatusChange = (value: Borrower['status']) => {
    setNewBorrower((prev) => ({ ...prev, status: value }));
  };
  
  const handleLoanTypeChange = (value: 'اقساط' | 'مهلة') => {
    setNewBorrower((prev) => ({ ...prev, loanType: value, rate: '', term: '', dueDate: '', discount: '' }));
  };

  const proceedToAddBorrower = () => {
    const isInstallments = newBorrower.loanType === 'اقساط';
    // If an employee isn't allowed direct additions, force status to 'معلق'
    // Otherwise, use the status selected in the form.
    const finalStatus = (isEmployee && !isDirectAdditionEnabled) ? 'معلق' : newBorrower.status;

    addBorrower({
      ...newBorrower,
      amount: Number(newBorrower.amount),
      rate: isEmployee && isInstallments ? baseInterestRate : Number(newBorrower.rate),
      term: Number(newBorrower.term) || 0,
      status: finalStatus,
      discount: Number(newBorrower.discount) || 0,
    }, finalStatus === 'معلق' ? [] : selectedInvestors);

    // Reset all dialogs and forms
    setIsAddDialogOpen(false);
    setNewBorrower({ name: '', amount: '', rate: '', term: '', loanType: 'اقساط', status: 'منتظم', dueDate: '', discount: '' });
    setSelectedInvestors([]);
    setIsInsufficientFundsDialogOpen(false);
  };

  const handleAddBorrower = (e: React.FormEvent) => {
    e.preventDefault();
    const isInstallments = newBorrower.loanType === 'اقساط';
    const rateForValidation = isEmployee && isInstallments ? baseInterestRate : newBorrower.rate;
    const isPendingRequest = (isEmployee && !isDirectAdditionEnabled);

    if (!newBorrower.name || !newBorrower.amount || !newBorrower.dueDate || (isInstallments && (!rateForValidation || !newBorrower.term))) {
      return;
    }
    
    // If it's a pending request, no need to check for investors or funds.
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
        return;
    }
    
    const loanAmount = Number(newBorrower.amount);
    const totalAvailableFromSelected = investors
      .filter(inv => selectedInvestors.includes(inv.id))
      .reduce((sum, inv) => sum + inv.amount, 0);

    if (totalAvailableFromSelected < loanAmount) {
      setAvailableFunds(totalAvailableFromSelected);
      setIsInsufficientFundsDialogOpen(true);
      return; // Stop and show dialog
    }

    proceedToAddBorrower();
  };
  
  const displayedBorrowers = useMemo(() => {
    if (role === 'مدير المكتب') {
      const myEmployeeIds = users.filter(u => u.managedBy === currentUser?.id).map(u => u.id);
      const myIds = [currentUser?.id, ...myEmployeeIds].filter(Boolean);
      return borrowers.filter(b => b.submittedBy && myIds.includes(b.submittedBy));
    }
    return borrowers;
  }, [borrowers, users, currentUser, role]);

  const installmentBorrowers = displayedBorrowers.filter((b) => b.loanType === 'اقساط');
  const gracePeriodBorrowers = displayedBorrowers.filter((b) => b.loanType === 'مهلة');

  const getDialogTitle = () => {
    if (isEmployee) {
      return isDirectAdditionEnabled ? 'إضافة قرض جديد' : 'رفع طلب إضافة قرض جديد';
    }
    return 'إضافة قرض جديد';
  };

  const getDialogDescription = () => {
    if (isEmployee) {
      return isDirectAdditionEnabled
        ? 'أدخل تفاصيل القرض الجديد هنا. انقر على حفظ عند الانتهاء.'
        : 'أدخل تفاصيل القرض الجديد وسيتم مراجعة الطلب من قبل مديرك.';
    }
    return 'أدخل تفاصيل القرض الجديد هنا. انقر على حفظ عند الانتهاء.';
  };

  const getSubmitButtonText = () => {
    if (isEmployee) {
      return isDirectAdditionEnabled ? 'حفظ' : 'إرسال الطلب';
    }
    return 'حفظ';
  };

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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="ml-2 h-4 w-4" />
                {isEmployee ? (isDirectAdditionEnabled ? 'إضافة قرض' : 'رفع طلب إضافة قرض') : 'إضافة قرض'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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
                        {isEmployee ? (
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
                  {(!isEmployee || isDirectAdditionEnabled) && (
                     <>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="status" className="text-right">
                            الحالة
                          </Label>
                           <Select
                              value={newBorrower.status}
                              onValueChange={(value: Borrower['status']) => handleStatusChange(value)}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الحالة" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="منتظم">منتظم</SelectItem>
                                <SelectItem value="متأخر">متأخر</SelectItem>
                                 <SelectItem value="متعثر">متعثر</SelectItem>
                                 <SelectItem value="معلق">معلق</SelectItem>
                                <SelectItem value="مسدد بالكامل" className="text-green-600">مسدد بالكامل</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                        {newBorrower.status !== 'معلق' && (
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
                                    <DropdownMenuLabel>المستثمرون المتاحون</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {investors.filter(i => i.status === 'نشط' && i.amount > 0).map((investor) => (
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
                                                  <span className='text-muted-foreground text-xs'>{formatCurrency(investor.amount)}</span>
                                                )}
                                            </div>
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                     </>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" onClick={() => {
                        setIsAddDialogOpen(false);
                        setSelectedInvestors([]);
                    }}>
                      إلغاء
                    </Button>
                  </DialogClose>
                  <Button type="submit">{getSubmitButtonText()}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
        <Tabs defaultValue="grace-period" className="w-full">
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
                <AlertDialogAction onClick={() => proceedToAddBorrower()}>
                  المتابعة على أي حال
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
