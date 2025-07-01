
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  const { investors: allInvestors, users, currentUser, investorSharePercentage, graceInvestorSharePercentage } = useDataState();
  const { toast } = useToast();
  const router = useRouter();
  
  const role = currentUser?.role;
  const hasAccess = role === 'مدير المكتب' || role === 'موظف' || (role === 'مساعد مدير المكتب' && currentUser?.permissions?.manageInvestors);

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  const investors = useMemo(() => {
    if (!currentUser || !allInvestors) return [];
    if (role === 'مدير النظام') return [];
    if (role === 'مستثمر') {
      return allInvestors.filter(i => i.id === currentUser.id);
    }
    const managerId = role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    const relevantUserIds = new Set(users.filter(u => u.managedBy === managerId || u.id === managerId).map(u => u.id));
    relevantUserIds.add(currentUser.id);
    return allInvestors.filter(i => i.submittedBy && relevantUserIds.has(i.submittedBy));
  }, [currentUser, allInvestors, users, role]);


  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInvestor, setNewInvestor] = useState<{
    name: string;
    capital: string;
    email: string;
    password: string;
    investmentType: 'اقساط' | 'مهلة';
    installmentProfitShare: string;
    gracePeriodProfitShare: string;
  }>({
    name: '',
    capital: '',
    email: '',
    password: '',
    investmentType: 'اقساط',
    installmentProfitShare: String(investorSharePercentage),
    gracePeriodProfitShare: String(graceInvestorSharePercentage),
  });
  
  const installmentInvestors = useMemo(() => investors.filter(i => i.investmentType === 'اقساط'), [investors]);
  const gracePeriodInvestors = useMemo(() => investors.filter(i => i.investmentType === 'مهلة'), [investors]);

  const isEmployee = role === 'موظف';
  const isOfficeManager = role === 'مدير المكتب';
  const isAssistant = role === 'مساعد مدير المكتب';

  const manager = (isEmployee || isAssistant) ? users.find((u) => u.id === currentUser?.managedBy) : null;
  const isDirectAdditionEnabled = (isEmployee || isAssistant) ? manager?.allowEmployeeSubmissions ?? false : false;
  const hideInvestorFunds = (isEmployee || isAssistant) ? manager?.hideEmployeeInvestorFunds ?? false : false;

  const investorsAddedByManager = isOfficeManager
    ? investors.filter((i) => i.submittedBy === currentUser?.id).length
    : 0;

  const canAddMoreInvestors =
    isOfficeManager && currentUser
      ? investorsAddedByManager < (currentUser.investorLimit ?? 0)
      : !isOfficeManager;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewInvestor((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvestor.name || !newInvestor.capital) {
      return;
    }

    if (isOfficeManager || (isAssistant && currentUser?.permissions?.manageInvestors)) {
      if (!newInvestor.email || !newInvestor.password) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور للمستثمر.',
        });
        return;
      }
      if (newInvestor.password.length < 6) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        });
        return;
      }
    }

    const status: Investor['status'] = ((isEmployee || isAssistant) && !isDirectAdditionEnabled) ? 'معلق' : 'نشط';

    const payload: NewInvestorPayload = {
      name: newInvestor.name,
      capital: Number(newInvestor.capital),
      status: status,
      email: newInvestor.email,
      password: newInvestor.password,
      investmentType: newInvestor.investmentType,
      installmentProfitShare: Number(newInvestor.installmentProfitShare),
      gracePeriodProfitShare: Number(newInvestor.gracePeriodProfitShare),
    };
    
    addInvestor(payload);
    setIsAddDialogOpen(false);
    setNewInvestor({ name: '', capital: '', email: '', password: '', investmentType: 'اقساط', installmentProfitShare: String(investorSharePercentage), gracePeriodProfitShare: String(graceInvestorSharePercentage) });
  };

  const showAddButton = role === 'مدير المكتب' || (isAssistant && currentUser?.permissions?.manageInvestors) || isEmployee;
  const isAddButtonDisabled = isOfficeManager && !canAddMoreInvestors;
      
  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  const getDialogTitle = () => {
    if (isEmployee || isAssistant) {
      return isDirectAdditionEnabled ? 'إضافة مستثمر جديد' : 'رفع طلب إضافة مستثمر جديد';
    }
    return isOfficeManager ? 'إضافة مستثمر جديد وإنشاء حساب' : 'إضافة مستثمر جديد';
  };

  const getDialogDescription = () => {
    if (isOfficeManager || (isAssistant && currentUser?.permissions?.manageInvestors)) {
      return 'أدخل بيانات المستثمر لإنشاء حساب له. سيتمكن من تسجيل الدخول مباشرة.';
    }
    if (isEmployee) {
      return isDirectAdditionEnabled
        ? 'أدخل تفاصيل المستثمر الجديد لإضافته مباشرة إلى النظام.'
        : 'أدخل تفاصيل المستثمر الجديد وسيتم مراجعة الطلب من قبل مديرك.';
    }
    return 'أدخل تفاصيل المستثمر الجديد هنا. انقر على حفظ عند الانتهاء.';
  };

  const getSubmitButtonText = () => {
    if (isEmployee || isAssistant) {
      return isDirectAdditionEnabled ? 'حفظ' : 'إرسال الطلب';
    }
    return 'حفظ';
  };


  const AddButton = (
    <Button disabled={isAddButtonDisabled}>
      <PlusCircle className="ml-2 h-4 w-4" />
      {isEmployee || isAssistant ? (isDirectAdditionEnabled ? 'إضافة مستثمر' : 'رفع طلب إضافة مستثمر') : 'إضافة مستثمر'}
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
              {isOfficeManager && currentUser
                ? `يمكنك إضافة ${Math.max(
                    0,
                    (currentUser.investorLimit ?? 0) - investorsAddedByManager
                  )} مستثمرين آخرين.`
                : 'عرض وإدارة قائمة المستثمرين في المنصة.'}
            </p>
          </header>
          {showAddButton && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                {isAddButtonDisabled ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* The button is wrapped in a span to allow tooltip on disabled elements */}
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
              <DialogContent className="sm:max-w-[425px]">
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
                        <Label className="text-right">نوع الاستثمار</Label>
                        <RadioGroup
                          value={newInvestor.investmentType}
                          onValueChange={(value: 'اقساط' | 'مهلة') => setNewInvestor(p => ({...p, investmentType: value}))}
                          className="col-span-3 flex gap-4 rtl:space-x-reverse"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="اقساط" id="inv-r1" />
                            <Label htmlFor="inv-r1">أقساط</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="مهلة" id="inv-r2" />
                            <Label htmlFor="inv-r2">مهلة</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="capital" className="text-right">
                        رأس المال
                      </Label>
                      <Input
                        id="capital"
                        type="number"
                        placeholder="مبلغ الاستثمار"
                        className="col-span-3"
                        value={newInvestor.capital}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    {(isOfficeManager || (isAssistant && currentUser?.permissions?.manageInvestors)) && (
                      <>
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
                          <Label htmlFor="password" className="text-right">
                            كلمة المرور
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="كلمة مرور مؤقتة"
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
                      </>
                    )}
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
        <Tabs defaultValue="installments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="installments">
                  مستثمرو الأقساط ({installmentInvestors.length})
                </TabsTrigger>
                <TabsTrigger value="grace-period">
                  مستثمرو المهلة ({gracePeriodInvestors.length})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="installments" className="mt-4">
                <InvestorsTable investors={installmentInvestors} hideFunds={hideInvestorFunds} />
            </TabsContent>
            <TabsContent value="grace-period" className="mt-4">
                <InvestorsTable investors={gracePeriodInvestors} hideFunds={hideInvestorFunds} />
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
