

'use client';

import { useState, useEffect, useMemo } from 'react';
import { InvestorsTable } from '@/components/investors/investors-table';
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
import { useDataState, useDataActions } from '@/contexts/data-context';
import type { Investor, NewInvestorPayload } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function InvestorsPage() {
  const { addInvestor } = useDataActions();
  const { investors: allInvestors, visibleUsers: users, currentUser, investorSharePercentage, graceInvestorSharePercentage } = useDataState();
  const { toast } = useToast();
  const router = useRouter();
  
  const role = currentUser?.role;
  const hasAccess = role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageInvestors) || (role === 'موظف' && currentUser?.permissions?.manageInvestors);
  const isSubordinate = role === 'موظف' || role === 'مساعد مدير المكتب';

  useEffect(() => {
    if (currentUser && (!hasAccess || (isSubordinate && !currentUser.managedBy))) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, isSubordinate, router]);

  const investors = useMemo(() => {
    if (!currentUser || !allInvestors) return [];
    if (role === 'مدير النظام') return [];
    if (role === 'مستثمر') {
      return allInvestors.filter(i => i.id === currentUser.id);
    }
    
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
  
  const getInitialNewInvestorState = () => ({
    name: '',
    installmentCapital: '',
    graceCapital: '',
    email: '',
    phone: '',
    password: '',
    installmentProfitShare: String(investorSharePercentage),
    gracePeriodProfitShare: String(graceInvestorSharePercentage),
  });

  const [newInvestor, setNewInvestor] = useState(getInitialNewInvestorState());
  
  useEffect(() => {
    // Keep local state in sync with global state from context when it changes
    setNewInvestor(prev => ({
      ...prev,
      installmentProfitShare: String(investorSharePercentage),
      gracePeriodProfitShare: String(graceInvestorSharePercentage),
    }));
  }, [investorSharePercentage, graceInvestorSharePercentage]);


  const isEmployee = role === 'موظف';
  const isOfficeManager = role === 'مدير المكتب';
  const isAssistant = role === 'مساعد مدير المكتب';

  const manager = isEmployee || isAssistant ? users.find((u) => u.id === currentUser?.managedBy) : currentUser;
  
  const investorsAddedByManager = useMemo(() => {
    if (!manager) return 0;
    return allInvestors.filter(i => {
      const investorUser = users.find(u => u.id === i.id);
      return investorUser?.managedBy === manager.id;
    }).length;
  }, [allInvestors, users, manager]);

  const canAddMoreInvestors = manager ? investorsAddedByManager < (manager.investorLimit ?? 0) : false;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewInvestor((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddInvestor = async (e: React.FormEvent) => {
    e.preventDefault();

    const installmentCapital = Number(newInvestor.installmentCapital) || 0;
    const graceCapital = Number(newInvestor.graceCapital) || 0;

    if (installmentCapital <= 0 && graceCapital <= 0) {
        toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'يجب إدخال رأس مال واحد على الأقل للمستثمر.'
        });
        return;
    }

    const result = await addInvestor({
      name: newInvestor.name,
      installmentCapital: installmentCapital,
      graceCapital: graceCapital,
      email: newInvestor.email,
      phone: newInvestor.phone,
      password: newInvestor.password,
      installmentProfitShare: Number(newInvestor.installmentProfitShare),
      gracePeriodProfitShare: Number(newInvestor.gracePeriodProfitShare),
    });

    if (result.success) {
      setIsAddDialogOpen(false);
      // Resetting the form is handled by onOpenChange now
    }
  };

  const showAddButton = role === 'مدير المكتب' || (isAssistant && currentUser?.permissions?.manageInvestors) || (isEmployee && currentUser?.permissions?.manageInvestors);
  const isAddButtonDisabled = (isOfficeManager || isAssistant || isEmployee) && !canAddMoreInvestors;
      
  if (!currentUser || !hasAccess || (isSubordinate && !currentUser.managedBy)) {
    return <PageSkeleton />;
  }
  
  const managerForSettings = (isEmployee || isAssistant) ? users.find((u) => u.id === currentUser?.managedBy) : null;
  const hideFunds = (isEmployee || isAssistant) ? managerForSettings?.hideEmployeeInvestorFunds ?? false : false;

  const getDialogTitle = () => {
    const isDirectAdditionEnabled = manager?.allowEmployeeSubmissions ?? false;
    if (isEmployee) {
      return isDirectAdditionEnabled ? 'إضافة مستثمر جديد' : 'رفع طلب إضافة مستثمر جديد';
    }
    return isOfficeManager ? 'إضافة مستثمر جديد وإنشاء حساب' : 'إضافة مستثمر جديد';
  };

  const getDialogDescription = () => {
    return 'أدخل بيانات المستثمر لإنشاء حساب له. سيتمكن من تسجيل الدخول مباشرة بعد الموافقة (إذا لزم الأمر).';
  };

  const getSubmitButtonText = () => {
    const isDirectAdditionEnabled = manager?.allowEmployeeSubmissions ?? false;
    if (isEmployee) {
      return isDirectAdditionEnabled ? 'حفظ وإضافة' : 'إرسال الطلب للمراجعة';
    }
    return 'حفظ وإنشاء الحساب';
  };

  const AddButton = (
    <Button disabled={isAddButtonDisabled}>
      <PlusCircle className="ml-2 h-4 w-4" />
      {getDialogTitle()}
    </Button>
  );

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">
              إدارة المستثمرين
            </h1>
            <p className="text-muted-foreground mt-1">
              {manager
                ? `يمكنك إضافة ${Math.max(
                    0,
                    (manager.investorLimit ?? 0) - investorsAddedByManager
                  )} مستثمرين آخرين.`
                : 'عرض وإدارة قائمة المستثمرين في المنصة.'}
            </p>
          </header>
          {showAddButton && (
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) setNewInvestor(getInitialNewInvestorState()); setIsAddDialogOpen(open); }}>
              <DialogTrigger asChild>
                {isAddButtonDisabled ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>{AddButton}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          لقد وصلت للحد الأقصى. تواصل مع الدعم لزيادة العدد.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  AddButton
                )}
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleAddInvestor}>
                  <DialogHeader>
                    <DialogTitle>{getDialogTitle()}</DialogTitle>
                    <DialogDescription>{getDialogDescription()}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        الاسم
                      </Label>
                      <Input
                        id="name"
                        placeholder="اسم المستثمر"
                        className="col-span-3"
                        value={newInvestor.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="installmentCapital" className="text-right">
                        رأس مال الأقساط
                      </Label>
                      <Input
                        id="installmentCapital"
                        type="number"
                        placeholder="0"
                        className="col-span-3"
                        value={newInvestor.installmentCapital}
                        onChange={handleInputChange}
                      />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="graceCapital" className="text-right">
                        رأس مال المهلة
                      </Label>
                      <Input
                        id="graceCapital"
                        type="number"
                        placeholder="0"
                        className="col-span-3"
                        value={newInvestor.graceCapital}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                        البريد الإلكتروني
                        </Label>
                        <Input
                        id="email"
                        type="email"
                        placeholder="بريد الدخول للمستثمر"
                        className="col-span-3"
                        value={newInvestor.email}
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
                        value={newInvestor.phone}
                        onChange={handleInputChange}
                        required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                        كلمة المرور
                        </Label>
                        <Input
                        id="password"
                        type="password"
                        placeholder="كلمة مرور مؤقتة (6+ أحرف)"
                        className="col-span-3"
                        value={newInvestor.password}
                        onChange={handleInputChange}
                        required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="installmentProfitShare" className="text-right">
                            ربح الأقساط (%)
                        </Label>
                        <Input
                            id="installmentProfitShare"
                            type="number"
                            step="0.1"
                            placeholder="70"
                            className="col-span-3"
                            value={newInvestor.installmentProfitShare}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="gracePeriodProfitShare" className="text-right">
                            ربح المهلة (%)
                        </Label>
                        <Input
                            id="gracePeriodProfitShare"
                            type="number"
                            step="0.1"
                            placeholder="33.3"
                            className="col-span-3"
                            value={newInvestor.gracePeriodProfitShare}
                            onChange={handleInputChange}
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
                    <Button type="submit">{getSubmitButtonText()}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <InvestorsTable investors={investors} hideFunds={hideFunds} />
      </main>
    </div>
  );
}
