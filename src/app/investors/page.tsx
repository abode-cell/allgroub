'use client';

import { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import type { Investor } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';

export default function InvestorsPage() {
  const { user: authUser, role } = useAuth();
  const { investors, addInvestor, users } = useData();
  const { toast } = useToast();
  const router = useRouter();
  
  const user = users.find(u => u.id === authUser?.id);

  const hasAccess = role === 'مدير النظام' || role === 'مدير المكتب' || role === 'موظف' || (role === 'مساعد مدير المكتب' && user?.permissions?.manageInvestors);

  useEffect(() => {
    if (role && !hasAccess) {
      router.replace('/');
    }
  }, [role, hasAccess, router]);


  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInvestor, setNewInvestor] = useState({
    name: '',
    amount: '',
    email: '',
    password: '',
  });

  const isEmployee = role === 'موظف';
  const isOfficeManager = role === 'مدير المكتب';
  const isAssistant = role === 'مساعد مدير المكتب';

  const manager = (isEmployee || isAssistant) ? users.find((u) => u.id === user?.managedBy) : null;
  const isDirectAdditionEnabled = (isEmployee || isAssistant) ? manager?.allowEmployeeSubmissions ?? false : false;
  const hideInvestorFunds = (isEmployee || isAssistant) ? manager?.hideEmployeeInvestorFunds ?? false : false;

  const investorsAddedByManager = isOfficeManager
    ? investors.filter((i) => i.submittedBy === user?.id).length
    : 0;

  const canAddMoreInvestors =
    isOfficeManager && user
      ? investorsAddedByManager < (user.investorLimit ?? 0)
      : !isOfficeManager;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewInvestor((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvestor.name || !newInvestor.amount) {
      return;
    }

    if (isOfficeManager || (isAssistant && user?.permissions?.manageInvestors)) {
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

    addInvestor({
      name: newInvestor.name,
      amount: Number(newInvestor.amount),
      status: status,
      email: newInvestor.email,
      password: newInvestor.password,
    });
    setIsAddDialogOpen(false);
    setNewInvestor({ name: '', amount: '', email: '', password: '' });
  };

  const showAddButton = role === 'مدير النظام' || role === 'مدير المكتب' || (isAssistant && user?.permissions?.manageInvestors) || isEmployee;
  const isAddButtonDisabled = isOfficeManager && !canAddMoreInvestors;

  const displayedInvestors =
    role === 'مستثمر'
      ? investors.filter((i) => i.id === user?.id)
      : role === 'مدير المكتب' || role === 'مساعد مدير المكتب'
      ? investors.filter((i) => i.submittedBy === user?.id || i.submittedBy === user?.managedBy)
      : investors;
      
  if (!hasAccess) {
    return null;
  }

  const getDialogTitle = () => {
    if (isEmployee || isAssistant) {
      return isDirectAdditionEnabled ? 'إضافة مستثمر جديد' : 'رفع طلب إضافة مستثمر جديد';
    }
    return isOfficeManager ? 'إضافة مستثمر جديد وإنشاء حساب' : 'إضافة مستثمر جديد';
  };

  const getDialogDescription = () => {
    if (isOfficeManager || isAssistant) {
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
              {isOfficeManager && user
                ? `يمكنك إضافة ${Math.max(
                    0,
                    (user.investorLimit ?? 0) - investorsAddedByManager
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
                      <Label htmlFor="amount" className="text-right">
                        المبلغ
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="مبلغ الاستثمار"
                        className="col-span-3"
                        value={newInvestor.amount}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    {(isOfficeManager || (isAssistant && user?.permissions?.manageInvestors)) && (
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
        <InvestorsTable investors={displayedInvestors} hideFunds={hideInvestorFunds} />
      </main>
    </div>
  );
}
