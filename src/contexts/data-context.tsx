'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import type {
  Borrower,
  Investor,
  Transaction,
  User,
  UserRole,
  SupportTicket,
  Notification,
  BorrowerPaymentStatus,
  PermissionKey,
} from '@/lib/types';
import {
  borrowersData as initialBorrowersData,
  investorsData as initialInvestorsData,
  usersData as initialUsersData,
  supportTicketsData as initialSupportTicketsData,
  notificationsData as initialNotificationsData,
} from '@/lib/data';
import { useAuth } from './auth-context';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type UpdatableInvestor = Omit<
  Investor,
  | 'defaultedFunds'
  | 'fundedLoanIds'
  | 'transactionHistory'
  | 'rejectionReason'
  | 'submittedBy'
>;

type NewInvestorPayload = Omit<
  Investor,
  | 'id'
  | 'date'
  | 'transactionHistory'
  | 'defaultedFunds'
  | 'fundedLoanIds'
  | 'rejectionReason'
  | 'submittedBy'
> & { email?: string; password?: string };

type SignUpCredentials = {
  name: User['name'];
  email: User['email'];
  phone: User['phone'];
  password?: string;
};

type DataContextType = {
  currentUser: User | undefined;
  borrowers: Borrower[];
  investors: Investor[];
  users: User[];
  supportTickets: SupportTicket[];
  notifications: Notification[];
  salaryRepaymentPercentage: number;
  baseInterestRate: number;
  investorSharePercentage: number;
  graceTotalProfitPercentage: number;
  graceInvestorSharePercentage: number;
  supportEmail: string;
  supportPhone: string;
  updateSupportInfo: (info: { email?: string; phone?: string; }) => void;
  updateBaseInterestRate: (rate: number) => void;
  updateInvestorSharePercentage: (percentage: number) => void;
  updateSalaryRepaymentPercentage: (percentage: number) => void;
  updateGraceTotalProfitPercentage: (percentage: number) => void;
  updateGraceInvestorSharePercentage: (percentage: number) => void;
  addSupportTicket: (
    ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead'>
  ) => void;
  registerNewOfficeManager: (
    credentials: SignUpCredentials
  ) => Promise<{ success: boolean; message: string }>;
  addBorrower: (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus'
    >,
    investorIds: string[]
  ) => void;
  updateBorrower: (borrower: Borrower) => void;
  updateBorrowerPaymentStatus: (borrowerId: string, paymentStatus?: BorrowerPaymentStatus) => void;
  approveBorrower: (borrowerId: string) => void;
  rejectBorrower: (borrowerId: string, reason: string) => void;
  addInvestor: (investor: NewInvestorPayload) => void;
  updateInvestor: (investor: UpdatableInvestor) => void;
  approveInvestor: (investorId: string) => void;
  rejectInvestor: (investorId: string, reason: string) => void;
  withdrawFromInvestor: (
    investorId: string,
    withdrawal: Omit<Transaction, 'id'>
  ) => void;
  updateUserIdentity: (updates: Partial<User>) => Promise<{ success: boolean; message: string }>;
  updateUserStatus: (userId: string, status: User['status']) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserLimits: (
    userId: string,
    limits: { investorLimit: number; employeeLimit: number }
  ) => void;
  updateManagerSettings: (
    managerId: string,
    settings: { allowEmployeeSubmissions?: boolean; hideEmployeeInvestorFunds?: boolean }
  ) => void;
  updateAssistantPermission: (assistantId: string, key: PermissionKey, value: boolean) => void;
  requestCapitalIncrease: (investorId: string) => void;
  deleteUser: (userId: string) => void;
  clearUserNotifications: (userId: string) => void;
  markUserNotificationsAsRead: (userId: string) => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const APP_DATA_KEY = 'appData';

const initialData = {
  borrowers: initialBorrowersData,
  investors: initialInvestorsData,
  users: initialUsersData,
  supportTickets: initialSupportTicketsData,
  notifications: initialNotificationsData,
  salaryRepaymentPercentage: 30,
  baseInterestRate: 5.5,
  investorSharePercentage: 70,
  graceTotalProfitPercentage: 30,
  graceInvestorSharePercentage: 33.3,
  supportEmail: 'support@aalg-group.com',
  supportPhone: '920012345',
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => {
    if (typeof window === 'undefined') {
      return initialData;
    }
    try {
      const item = window.localStorage.getItem(APP_DATA_KEY);
      if (item) {
        // Basic validation to prevent app crash on corrupted data
        const parsed = JSON.parse(item);
        if (parsed.users && parsed.borrowers && parsed.investors) {
          return parsed;
        }
      }
      return initialData;
    } catch (error) {
      console.warn(`Error reading localStorage key “${APP_DATA_KEY}”:`, error);
      return initialData;
    }
  });

  const { userId } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
      } catch (error) {
        console.warn(`Error setting localStorage key “${APP_DATA_KEY}”:`, error);
      }
    }
  }, [data]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === APP_DATA_KEY && e.newValue) {
        try {
          setData(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event value for key “${APP_DATA_KEY}”:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const currentUser = useMemo(() => {
    if (!userId) return undefined;
    return data.users.find(u => u.id === userId);
  }, [data.users, userId]);
  
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
    const newNotification: Notification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random()}`,
        date: new Date().toISOString(),
        isRead: false,
    };
    setData(prev => ({...prev, notifications: [newNotification, ...prev.notifications]}));
  }, []);

  const clearUserNotifications = useCallback((userId: string) => {
    setData(prev => ({...prev, notifications: prev.notifications.filter(n => n.recipientId !== userId)}));
    toast({ title: 'تم حذف جميع التنبيهات' });
  }, [toast]);

  const markUserNotificationsAsRead = useCallback((userId: string) => {
    setData(prev => ({...prev, notifications: prev.notifications.map(n => 
        (n.recipientId === userId && !n.isRead) ? { ...n, isRead: true } : n
    )}));
  }, []);

  const updateGlobalSetting = useCallback((key: string, value: any, successMessage: string) => {
    setData(prev => ({ ...prev, [key]: value }));
    toast({
      title: 'تم التحديث',
      description: successMessage,
    });
  }, [toast]);

  const updateSalaryRepaymentPercentage = (percentage: number) => updateGlobalSetting('salaryRepaymentPercentage', percentage, `تم تحديث نسبة السداد من الراتب إلى ${percentage}%.`);
  const updateBaseInterestRate = (rate: number) => updateGlobalSetting('baseInterestRate', rate, `تم تحديث نسبة الربح الأساسية إلى ${rate}%.`);
  const updateInvestorSharePercentage = (percentage: number) => updateGlobalSetting('investorSharePercentage', percentage, `تم تحديث حصة المستثمر من الأرباح إلى ${percentage}%.`);
  const updateGraceTotalProfitPercentage = (percentage: number) => updateGlobalSetting('graceTotalProfitPercentage', percentage, `تم تحديث نسبة الربح الإجمالية لتمويل المهلة إلى ${percentage}%.`);
  const updateGraceInvestorSharePercentage = (percentage: number) => updateGlobalSetting('graceInvestorSharePercentage', percentage, `تم تحديث حصة المستثمر من أرباح المهلة إلى ${percentage}%.`);
  
  const updateSupportInfo = useCallback((info: { email?: string; phone?: string; }) => {
    setData(prev => ({ ...prev, supportEmail: info.email ?? prev.supportEmail, supportPhone: info.phone ?? prev.supportPhone }));
    toast({ title: 'تم تحديث معلومات الدعم', description: 'تم تحديث معلومات التواصل بنجاح.' });
  }, [toast]);

  const registerNewOfficeManager = useCallback(async (credentials: SignUpCredentials): Promise<{ success: boolean; message: string }> => {
    let success = false;
    let message = '';
    
    setData(prev => {
        const existingUser = prev.users.find(u => u.email === credentials.email || u.phone === credentials.phone);
        if (existingUser) {
            message = 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.';
            return prev;
        }

        const managerId = `user_${Date.now()}`;
        const newManager: User = {
            id: managerId, name: credentials.name, email: credentials.email, phone: credentials.phone, password: credentials.password, role: 'مدير المكتب', status: 'معلق',
            photoURL: 'https://placehold.co/40x40.png', registrationDate: new Date().toISOString().split('T')[0], investorLimit: 3, employeeLimit: 1, allowEmployeeSubmissions: true,
            hideEmployeeInvestorFunds: false, permissions: {},
        };
        
        success = true;
        message = 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.';
        return { ...prev, users: [...prev.users, newManager] };
    });

    return { success, message };
  }, []);

  const updateBorrower = useCallback((updatedBorrower: Borrower) => {
    setData(prev => ({
        ...prev,
        borrowers: prev.borrowers.map(b => b.id === updatedBorrower.id ? updatedBorrower : b),
    }));
    toast({ title: 'تم تحديث القرض' });
  }, [toast]);

  const updateBorrowerPaymentStatus = useCallback((borrowerId: string, paymentStatus?: BorrowerPaymentStatus) => {
    setData(prev => {
        const originalBorrower = prev.borrowers.find(b => b.id === borrowerId);
        if (!originalBorrower) return prev;

        const newState = { ...prev };
        let toastMessage: { title: string, description: string, variant?: "destructive" } | null = null;
        const notificationsToQueue: Omit<Notification, 'id' | 'date' | 'isRead'>[] = [];

        const borrowerIndex = newState.borrowers.findIndex(b => b.id === borrowerId);
        const updatedBorrower: Borrower = { ...newState.borrowers[borrowerIndex] };
        
        // Unset paymentStatus if 'none' is selected, otherwise set it
        if (paymentStatus) {
            updatedBorrower.paymentStatus = paymentStatus;
        } else {
            delete (updatedBorrower as Partial<Borrower>).paymentStatus;
        }

        // Logic for "Paid Off"
        if (paymentStatus === 'تم السداد' && originalBorrower.status !== 'مسدد بالكامل') {
            updatedBorrower.status = 'مسدد بالكامل';
            if (originalBorrower.fundedBy) {
                const installmentTotalInterest = (originalBorrower.rate && originalBorrower.term) ? originalBorrower.amount * (originalBorrower.rate / 100) * originalBorrower.term : 0;
                const graceTotalProfit = originalBorrower.amount * (prev.graceTotalProfitPercentage / 100);
                const totalProfit = originalBorrower.loanType === 'اقساط' ? installmentTotalInterest : graceTotalProfit;

                originalBorrower.fundedBy.forEach(funder => {
                    const investorIndex = newState.investors.findIndex(i => i.id === funder.investorId);
                    if (investorIndex > -1) {
                        const investor = newState.investors[investorIndex];
                        const loanShare = funder.amount / originalBorrower.amount;
                        const investorProfitShare = originalBorrower.loanType === 'اقساط'
                            ? totalProfit * (prev.investorSharePercentage / 100) * loanShare
                            : totalProfit * (prev.graceInvestorSharePercentage / 100) * loanShare;
                        
                        const principalReturn = funder.amount;
                        const profitTransaction: Transaction = {
                            id: `t-profit-${Date.now()}-${investorIndex}`, date: new Date().toISOString().split('T')[0], type: 'إيداع أرباح', amount: investorProfitShare,
                            description: `أرباح من قرض "${originalBorrower.name}"`,
                        };
                        
                        newState.investors[investorIndex] = {
                          ...investor,
                          transactionHistory: [...investor.transactionHistory, profitTransaction],
                          amount: investor.amount + principalReturn + investorProfitShare,
                          fundedLoanIds: investor.fundedLoanIds.filter(id => id !== originalBorrower.id)
                        };

                        notificationsToQueue.push({ recipientId: funder.investorId, title: 'أرباح محققة', description: `تم سداد قرض "${originalBorrower.name}" بالكامل. تم إضافة الأرباح ورأس المال إلى حسابك.` });
                    }
                });
                toastMessage = { title: 'تم سداد القرض بالكامل', description: 'تمت إعادة الأموال والأرباح للمستثمرين بنجاح.' };
            }
        }
        // Logic for "Defaulted"
        else if (paymentStatus === 'متعثر' && originalBorrower.status !== 'متعثر') {
          updatedBorrower.status = 'متعثر';
          if (originalBorrower.fundedBy) {
              originalBorrower.fundedBy.forEach(funder => {
                const investorIndex = newState.investors.findIndex(i => i.id === funder.investorId);
                if (investorIndex > -1) {
                    const investor = newState.investors[investorIndex];
                    newState.investors[investorIndex] = { ...investor, defaultedFunds: (investor.defaultedFunds || 0) + funder.amount };
                    notificationsToQueue.push({ recipientId: funder.investorId, title: 'تنبيه: تعثر قرض مرتبط', description: `القرض الخاص بالعميل "${originalBorrower.name}" قد تعثر، مما قد يؤثر على استثماراتك.` });
                }
            });
            toastMessage = { title: 'تم تسجيل القرض كمتعثر', description: 'تم تحديث أموال المستثمرين المتعثرة.', variant: 'destructive' };
          }
        }

        newState.borrowers[borrowerIndex] = updatedBorrower;
        
        setTimeout(() => {
          if (toastMessage) {
            toast(toastMessage);
          } else {
            toast({ title: 'تم تحديث حالة السداد', description: `تم تحديث حالة القرض إلى "${paymentStatus || 'غير محدد'}".` });
          }
          notificationsToQueue.forEach(addNotification);
        }, 0);

        return newState;
    });
  }, [addNotification, toast]);

  const approveBorrower = useCallback((borrowerId: string) => {
    let approvedBorrower: Borrower | null = null;
    setData(prev => {
        const newBorrowers = prev.borrowers.map(b => {
            if (b.id === borrowerId) {
                approvedBorrower = { ...b, status: 'منتظم' };
                return approvedBorrower;
            }
            return b;
        });
        return { ...prev, borrowers: newBorrowers };
    });

    if (approvedBorrower && approvedBorrower.submittedBy) {
        addNotification({ recipientId: approvedBorrower.submittedBy, title: 'تمت الموافقة على طلبك', description: `تمت الموافقة على طلب إضافة القرض "${approvedBorrower.name}".` });
    }
    toast({ title: 'تمت الموافقة على القرض' });
  }, [addNotification, toast]);

  const rejectBorrower = useCallback((borrowerId: string, reason: string) => {
    let rejectedBorrower: Borrower | null = null;
    setData(prev => {
        const newBorrowers = prev.borrowers.map(b => {
            if (b.id === borrowerId) {
                rejectedBorrower = { ...b, status: 'مرفوض', rejectionReason: reason };
                return rejectedBorrower;
            }
            return b;
        });
        return { ...prev, borrowers: newBorrowers };
    });

    if (rejectedBorrower && rejectedBorrower.submittedBy) {
        addNotification({ recipientId: rejectedBorrower.submittedBy, title: 'تم رفض طلبك', description: `تم رفض طلب إضافة القرض "${rejectedBorrower.name}". السبب: ${reason}` });
    }
    toast({ variant: 'destructive', title: 'تم رفض القرض' });
  }, [addNotification, toast]);

  const addBorrower = useCallback((borrower, investorIds) => {
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يجب أن تكون مسجلاً للدخول.' });
        return;
    }
    
    const isPending = borrower.status === 'معلق';
    if (!isPending && investorIds.length === 0) {
        toast({ variant: 'destructive', title: 'خطأ في التمويل', description: 'يجب اختيار مستثمر واحد على الأقل لتمويل قرض نشط.' });
        return;
    }
    
    setData(prev => {
        const loanAmount = borrower.amount;
        const newId = `bor_${Date.now()}`;
        const fundedByDetails: { investorId: string; amount: number }[] = [];
        let newInvestors = [...prev.investors];

        if (!isPending) {
            let totalFundedAmount = 0;
            investorIds.forEach(id => {
                const investorIndex = newInvestors.findIndex(i => i.id === id);
                if (investorIndex > -1) {
                    const inv = { ...newInvestors[investorIndex] };
                    const remainingAmountToFund = loanAmount - totalFundedAmount;
                    const actualContribution = Math.min(inv.amount, remainingAmountToFund);

                    if (actualContribution > 0) {
                        fundedByDetails.push({ investorId: inv.id, amount: actualContribution });
                        totalFundedAmount += actualContribution;
                        inv.amount -= actualContribution;
                        inv.fundedLoanIds = [...inv.fundedLoanIds, newId];
                        newInvestors[investorIndex] = inv;
                    }
                }
            });
        }
        
        const newEntry: Borrower = {
            ...borrower, id: newId, date: new Date().toISOString().split('T')[0],
            submittedBy: currentUser.id, fundedBy: fundedByDetails,
        };
        
        return { ...prev, borrowers: [...prev.borrowers, newEntry], investors: newInvestors };
    });

    if (isPending && currentUser?.managedBy) {
        addNotification({ recipientId: currentUser.managedBy, title: 'طلب قرض جديد معلق', description: `قدم الموظف "${currentUser.name}" طلبًا لإضافة القرض "${borrower.name}".` });
    }
    
    toast({ title: 'تمت إضافة القرض بنجاح' });
  }, [currentUser, toast, addNotification]);

  const updateInvestor = useCallback((updatedInvestor) => {
    setData(prev => ({
        ...prev,
        investors: prev.investors.map(i => i.id === updatedInvestor.id ? { ...i, ...updatedInvestor } : i)
    }));
    toast({ title: 'تم تحديث المستثمر' });
  }, [toast]);

  const approveInvestor = useCallback((investorId: string) => {
    let approvedInvestor: Investor | null = null;
    setData(prev => {
        const newInvestors = prev.investors.map(i => {
            if (i.id === investorId) {
                approvedInvestor = { ...i, status: 'نشط' };
                return approvedInvestor;
            }
            return i;
        });
        return { ...prev, investors: newInvestors };
    });
    
    if (approvedInvestor && approvedInvestor.submittedBy) {
        addNotification({ recipientId: approvedInvestor.submittedBy, title: 'تمت الموافقة على طلبك', description: `تمت الموافقة على طلب إضافة المستثمر "${approvedInvestor.name}".` });
    }
    toast({ title: 'تمت الموافقة على المستثمر' });
  }, [addNotification, toast]);

  const rejectInvestor = useCallback((investorId: string, reason: string) => {
    let rejectedInvestor: Investor | null = null;
    setData(prev => {
        const newInvestors = prev.investors.map(i => {
            if (i.id === investorId) {
                rejectedInvestor = { ...i, status: 'مرفوض', rejectionReason: reason };
                return rejectedInvestor;
            }
            return i;
        });
        return { ...prev, investors: newInvestors };
    });
    
    if (rejectedInvestor && rejectedInvestor.submittedBy) {
        addNotification({ recipientId: rejectedInvestor.submittedBy, title: 'تم رفض طلبك', description: `تم رفض طلب إضافة المستثمر "${rejectedInvestor.name}". السبب: ${reason}` });
    }
    toast({ variant: 'destructive', title: 'تم رفض المستثمر' });
  }, [addNotification, toast]);

  const addInvestor = useCallback((investorPayload) => {
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول أولاً.' });
        return;
    }

    if (currentUser.role === 'مدير المكتب' || (currentUser.role === 'مساعد مدير المكتب' && currentUser.permissions?.manageInvestors)) {
        const managerId = currentUser.role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
        const manager = data.users.find(u => u.id === managerId);
        const investorsAddedByManager = data.investors.filter(i => i.submittedBy === managerId).length;

        if (manager && investorsAddedByManager >= (manager.investorLimit ?? 0)) {
            toast({ variant: 'destructive', title: 'تم الوصول للحد الأقصى', description: 'لقد وصل مدير المكتب للحد الأقصى للمستثمرين.' });
            return;
        }
        if (!investorPayload.email || !investorPayload.password) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور للمستثمر الجديد.' });
            return;
        }
        if (data.users.some((u) => u.email === investorPayload.email)) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'البريد الإلكتروني مستخدم بالفعل.' });
            return;
        }

        const newId = `user_inv_${Date.now()}`;
        const newInvestorUser: User = {
            id: newId, name: investorPayload.name, email: investorPayload.email, phone: '', password: investorPayload.password, role: 'مستثمر', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', registrationDate: new Date().toISOString().split('T')[0], managedBy: managerId,
        };
        const newInvestorEntry: Investor = {
            id: newId, name: investorPayload.name, amount: investorPayload.amount, status: 'نشط', date: new Date().toISOString().split('T')[0],
            transactionHistory: [{ id: `t_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'إيداع رأس المال', amount: investorPayload.amount, description: 'إيداع تأسيسي للحساب' }],
            defaultedFunds: 0, fundedLoanIds: [], submittedBy: currentUser.id,
        };
        
        setData(prev => ({ ...prev, users: [...prev.users, newInvestorUser], investors: [...prev.investors, newInvestorEntry] }));
        toast({ title: 'تمت إضافة المستثمر والمستخدم المرتبط به بنجاح.' });
    } else {
        const newEntry: Investor = {
            ...investorPayload, id: `inv_${Date.now()}`, date: new Date().toISOString().split('T')[0],
            transactionHistory: [{ id: `t_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'إيداع رأس المال', amount: investorPayload.amount, description: 'إيداع تأسيسي للحساب' }],
            defaultedFunds: 0, fundedLoanIds: [], submittedBy: currentUser.id,
        };
        
        setData(prev => ({ ...prev, investors: [...prev.investors, newEntry] }));
        
        if (newEntry.status === 'معلق' && currentUser?.managedBy) {
            addNotification({ recipientId: currentUser.managedBy, title: 'طلب مستثمر جديد معلق', description: `قدم الموظف "${currentUser.name}" طلبًا لإضافة المستثمر "${newEntry.name}".` });
        }
        toast({ title: 'تمت إضافة المستثمر بنجاح.' });
    }
  }, [currentUser, data, addNotification, toast]);

  const withdrawFromInvestor = useCallback((investorId, withdrawal) => {
    setData(prev => ({
        ...prev,
        investors: prev.investors.map(i => {
            if (i.id === investorId) {
                const newTransaction: Transaction = { ...withdrawal, id: `t_${Date.now()}` };
                return { ...i, amount: i.amount - newTransaction.amount, transactionHistory: [...i.transactionHistory, newTransaction] };
            }
            return i;
        })
    }));
    addNotification({ recipientId: investorId, title: 'عملية سحب ناجحة', description: `تم سحب مبلغ ${formatCurrency(withdrawal.amount)} من حسابك.` });
    toast({ title: 'تمت عملية السحب بنجاح' });
  }, [addNotification, toast]);
  
  const updateUserIdentity = useCallback(async (updates) => {
    if(!currentUser) return { success: false, message: "لم يتم العثور على المستخدم." };
    setData(prev => ({ ...prev, users: prev.users.map(u => u.id === currentUser.id ? { ...u, ...updates } : u) }));
    toast({ title: 'نجاح', description: "تم تحديث معلوماتك بنجاح." });
    return { success: true, message: "تم تحديث معلوماتك بنجاح." };
  }, [currentUser, toast]);

  const updateUserStatus = useCallback((userId: string, status: User['status']) => {
    let userToUpdate: User | undefined;
    setData(prev => {
        userToUpdate = prev.users.find(u => u.id === userId);
        if (!userToUpdate) return prev;
        
        const newUsers = prev.users.map(u => {
            if (u.id === userId) return { ...u, status };
            if (userToUpdate?.role === 'مدير المكتب' && u.managedBy === userId) return { ...u, status };
            return u;
        });
        
        let newInvestors = prev.investors;
        if (userToUpdate.role === 'مدير المكتب') {
            const isSuspending = status === 'معلق';
            const newInvestorStatus = isSuspending ? 'غير نشط' : 'نشط';
            newInvestors = prev.investors.map(inv => {
                if (inv.submittedBy === userId) {
                    if (isSuspending || inv.status === 'غير نشط') return { ...inv, status: newInvestorStatus };
                }
                return inv;
            });
        }
        
        return { ...prev, users: newUsers, investors: newInvestors };
    });

    const cascadeMessage = userToUpdate?.role === 'مدير المكتب' 
      ? (status === 'معلق' ? 'وتم تعليق الحسابات المرتبطة به.' : 'وتم إعادة تفعيل الحسابات المرتبطة به.')
      : '';
    toast({ title: `تم تحديث حالة المستخدم ${cascadeMessage}`.trim() });
  }, [toast]);

  const updateUserRole = useCallback((userId: string, role: UserRole) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => {
        if (u.id === userId) {
          const updatedUser = { ...u, role };

          // Reset properties that are not relevant to the new role
          if (role === 'مستثمر' || role === 'مدير النظام') {
            delete updatedUser.managedBy;
            delete updatedUser.permissions;
          }
          if (role !== 'مدير المكتب') {
            delete updatedUser.investorLimit;
            delete updatedUser.employeeLimit;
            delete updatedUser.allowEmployeeSubmissions;
            delete updatedUser.hideEmployeeInvestorFunds;
          }
           if (role !== 'مساعد مدير المكتب') {
             if(updatedUser.permissions) delete updatedUser.permissions;
           } else {
             updatedUser.permissions = {}; // Initialize empty permissions for new assistants
           }

          return updatedUser;
        }
        return u;
      })
    }));
    toast({ title: 'تم تحديث دور المستخدم' });
  }, [toast]);

  const updateUserLimits = useCallback((userId, limits) => {
    setData(prev => ({...prev, users: prev.users.map(u => u.id === userId ? { ...u, ...limits } : u)}));
    toast({ title: 'تم تحديث حدود المستخدم بنجاح.' });
  }, [toast]);

  const updateManagerSettings = useCallback((managerId, settings) => {
    setData(prev => ({...prev, users: prev.users.map(u => u.id === managerId ? { ...u, ...settings } : u)}));
    toast({ title: 'تم تحديث إعدادات المدير بنجاح.' });
  }, [toast]);

  const updateAssistantPermission = useCallback((assistantId, key, value) => {
    setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === assistantId ? { ...u, permissions: { ...(u.permissions || {}), [key]: value } } : u)
    }));
    toast({ title: 'تم تحديث صلاحية المساعد بنجاح.' });
  }, [toast]);

  const deleteUser = useCallback((userId: string) => {
    setData(prev => ({...prev, users: prev.users.filter(u => u.id !== userId)}));
    toast({ variant: 'destructive', title: 'تم حذف المستخدم' });
  }, [toast]);

  const requestCapitalIncrease = useCallback((investorId: string) => {
    const investor = data.investors.find(i => i.id === investorId);
    if (!investor) return;
    
    const managers = data.users.filter(u => u.role === 'مدير النظام' || u.role === 'مدير المكتب');
    managers.forEach(manager => {
        addNotification({ recipientId: manager.id, title: 'طلب زيادة رأس المال', description: `المستثمر "${investor.name}" يرغب بزيادة رأس ماله للاستمرار بالاستثمار.` });
    });
    
    toast({ title: 'تم إرسال طلبك', description: 'تم إعلام الإدارة برغبتك في زيادة رأس المال.' });
  }, [data.investors, data.users, addNotification, toast]);

  const addSupportTicket = useCallback((ticket) => {
    const newTicket: SupportTicket = {
      ...ticket, id: `ticket_${Date.now()}`, date: new Date().toISOString(), isRead: false,
    };
    setData(prev => ({...prev, supportTickets: [newTicket, ...prev.supportTickets]}));
    toast({ title: 'تم إرسال طلب الدعم بنجاح', description: 'سيقوم مدير النظام بمراجعة طلبك في أقرب وقت.' });
  }, [toast]);

  const value = {
    currentUser, 
    borrowers: data.borrowers, 
    investors: data.investors, 
    users: data.users, 
    supportTickets: data.supportTickets, 
    notifications: data.notifications, 
    salaryRepaymentPercentage: data.salaryRepaymentPercentage, 
    baseInterestRate: data.baseInterestRate, 
    investorSharePercentage: data.investorSharePercentage, 
    graceTotalProfitPercentage: data.graceTotalProfitPercentage, 
    graceInvestorSharePercentage: data.graceInvestorSharePercentage, 
    supportEmail: data.supportEmail, 
    supportPhone: data.supportPhone,
    updateSupportInfo, 
    updateBaseInterestRate, 
    updateInvestorSharePercentage, 
    updateSalaryRepaymentPercentage, 
    updateGraceTotalProfitPercentage, 
    updateGraceInvestorSharePercentage, 
    addSupportTicket, 
    registerNewOfficeManager,
    addBorrower, 
    updateBorrower, 
    addInvestor, 
    updateInvestor, 
    withdrawFromInvestor, 
    approveBorrower, 
    approveInvestor, 
    rejectBorrower, 
    rejectInvestor, 
    updateUserIdentity, 
    updateUserStatus, 
    updateUserRole, 
    updateUserLimits, 
    updateManagerSettings,
    updateAssistantPermission, 
    requestCapitalIncrease, 
    deleteUser, 
    clearUserNotifications, 
    markUserNotificationsAsRead, 
    updateBorrowerPaymentStatus,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
