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
  TransactionType,
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

// This is a mock implementation using local state and does not connect to any backend service.

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
  updateSupportInfo: (info: { email?: string; phone?: string; }) => Promise<void>;
  updateBaseInterestRate: (rate: number) => Promise<void>;
  updateInvestorSharePercentage: (percentage: number) => Promise<void>;
  updateSalaryRepaymentPercentage: (percentage: number) => Promise<void>;
  updateGraceTotalProfitPercentage: (percentage: number) => Promise<void>;
  updateGraceInvestorSharePercentage: (percentage: number) => Promise<void>;
  addSupportTicket: (
    ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead'>
  ) => Promise<void>;
  registerNewOfficeManager: (
    credentials: SignUpCredentials
  ) => Promise<{ success: boolean; message: string }>;
  addBorrower: (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus'
    >,
    investorIds: string[]
  ) => Promise<void>;
  updateBorrower: (borrower: Borrower) => Promise<void>;
  updateBorrowerPaymentStatus: (borrowerId: string, paymentStatus?: BorrowerPaymentStatus) => Promise<void>;
  approveBorrower: (borrowerId: string) => Promise<void>;
  rejectBorrower: (borrowerId: string, reason: string) => Promise<void>;
  addInvestor: (investor: NewInvestorPayload) => Promise<void>;
  updateInvestor: (investor: UpdatableInvestor) => Promise<void>;
  approveInvestor: (investorId: string) => Promise<void>;
  rejectInvestor: (investorId: string, reason: string) => Promise<void>;
  withdrawFromInvestor: (
    investorId: string,
    withdrawal: Omit<Transaction, 'id'>
  ) => Promise<void>;
  updateUserIdentity: (updates: Partial<User>) => Promise<{ success: boolean; message: string }>;
  updateUserStatus: (userId: string, status: User['status']) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUserLimits: (
    userId: string,
    limits: { investorLimit: number; employeeLimit: number }
  ) => Promise<void>;
  updateManagerSettings: (
    managerId: string,
    settings: { allowEmployeeSubmissions?: boolean; hideEmployeeInvestorFunds?: boolean }
  ) => Promise<void>;
  updateAssistantPermission: (assistantId: string, key: PermissionKey, value: boolean) => Promise<void>;
  requestCapitalIncrease: (investorId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  clearUserNotifications: (userId: string) => void;
  markUserNotificationsAsRead: (userId: string) => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const usePersistentState = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    }
  }, [key, state]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event value for key “${key}”:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [state, setState];
};


export function DataProvider({ children }: { children: ReactNode }) {
  const [borrowers, setBorrowers] = usePersistentState<Borrower[]>('borrowers', initialBorrowersData);
  const [investors, setInvestors] = usePersistentState<Investor[]>('investors', initialInvestorsData);
  const [users, setUsers] = usePersistentState<User[]>('users', initialUsersData);
  const [supportTickets, setSupportTickets] = usePersistentState<SupportTicket[]>('supportTickets', initialSupportTicketsData);
  const [notifications, setNotifications] = usePersistentState<Notification[]>('notifications', initialNotificationsData);
  
  const [salaryRepaymentPercentage, setSalaryRepaymentPercentage] = usePersistentState<number>('salaryRepaymentPercentage', 30);
  const [baseInterestRate, setBaseInterestRate] = usePersistentState<number>('baseInterestRate', 5.5);
  const [investorSharePercentage, setInvestorSharePercentage] = usePersistentState<number>('investorSharePercentage', 70);
  const [graceTotalProfitPercentage, setGraceTotalProfitPercentage] = usePersistentState<number>('graceTotalProfitPercentage', 30);
  const [graceInvestorSharePercentage, setGraceInvestorSharePercentage] = usePersistentState<number>('graceInvestorSharePercentage', 33.3);
  const [supportEmail, setSupportEmail] = usePersistentState<string>('supportEmail', 'support@aalg-group.com');
  const [supportPhone, setSupportPhone] = usePersistentState<string>('supportPhone', '920012345');


  const { userId } = useAuth();
  const { toast } = useToast();

  const currentUser = useMemo(() => {
    if (!userId) return undefined;
    return users.find(u => u.id === userId);
  }, [users, userId]);
  
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
    const newNotification: Notification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random()}`,
        date: new Date().toISOString(),
        isRead: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, [setNotifications]);

  const clearUserNotifications = useCallback((userId: string) => {
    setNotifications(prev => prev.filter(n => n.recipientId !== userId));
    toast({ title: 'تم حذف جميع التنبيهات' });
  }, [setNotifications, toast]);

  const markUserNotificationsAsRead = useCallback((userId: string) => {
      setNotifications(prev => prev.map(n => 
        (n.recipientId === userId && !n.isRead) ? { ...n, isRead: true } : n
      ));
  }, [setNotifications]);

  const updateSalaryRepaymentPercentage = useCallback(async (percentage: number) => {
    setSalaryRepaymentPercentage(percentage);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث نسبة السداد من الراتب إلى ${percentage}%.`,
    });
  }, [setSalaryRepaymentPercentage, toast]);

  const updateBaseInterestRate = useCallback(async (rate: number) => {
    setBaseInterestRate(rate);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث نسبة الربح الأساسية إلى ${rate}%.`,
    });
  }, [setBaseInterestRate, toast]);

  const updateInvestorSharePercentage = useCallback(async (percentage: number) => {
    setInvestorSharePercentage(percentage);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث حصة المستثمر من الأرباح إلى ${percentage}%.`,
    });
  }, [setInvestorSharePercentage, toast]);

  const updateGraceTotalProfitPercentage = useCallback(async (percentage: number) => {
    setGraceTotalProfitPercentage(percentage);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث نسبة الربح الإجمالية لتمويل المهلة إلى ${percentage}%.`,
    });
  }, [setGraceTotalProfitPercentage, toast]);

  const updateGraceInvestorSharePercentage = useCallback(async (percentage: number) => {
    setGraceInvestorSharePercentage(percentage);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث حصة المستثمر من أرباح المهلة إلى ${percentage}%.`,
    });
  }, [setGraceInvestorSharePercentage, toast]);
  
  const updateSupportInfo = useCallback(async (info: { email?: string; phone?: string; }) => {
    if (info.email) setSupportEmail(info.email);
    if (info.phone) setSupportPhone(info.phone);
    toast({
        title: 'تم تحديث معلومات الدعم',
        description: 'تم تحديث معلومات التواصل بنجاح (تجريبيًا).',
    });
  }, [setSupportEmail, setSupportPhone, toast]);


  const registerNewOfficeManager = useCallback(async (
    credentials: SignUpCredentials
  ): Promise<{ success: boolean; message: string }> => {
    setUsers(prevUsers => {
        const existingUser = prevUsers.find(
          (u) => u.email === credentials.email || u.phone === credentials.phone
        );
        if (existingUser) {
          return prevUsers; // Return previous state to prevent update
        }

        const managerId = `user_${Date.now()}`;
        const employeeId = `user_${Date.now() + 1}`;

        const newManager: User = {
          id: managerId, name: credentials.name, email: credentials.email, phone: credentials.phone, password: credentials.password, role: 'مدير المكتب', status: 'معلق',
          photoURL: 'https://placehold.co/40x40.png', registrationDate: new Date().toISOString().split('T')[0], investorLimit: 3, employeeLimit: 1, allowEmployeeSubmissions: true,
          hideEmployeeInvestorFunds: false, permissions: {},
        };

        const newEmployee: User = {
          id: employeeId, name: `موظف لدى ${credentials.name}`, email: `employee-${Date.now()}@example.com`, phone: '', password: 'password123',
          role: 'موظف', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', managedBy: managerId, registrationDate: new Date().toISOString().split('T')[0], permissions: {},
        };

        return [...prevUsers, newManager, newEmployee];
    });
    
    // Check after attempting to set state
    if (users.find(u => u.email === credentials.email || u.phone === credentials.phone)) {
       return { success: false, message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.' };
    }

    return { success: true, message: 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.' };
  }, [users, setUsers]);

  const updateBorrower = useCallback(async (updatedBorrower: Borrower) => {
    let originalBorrower: Borrower | undefined;
    
    setBorrowers(prev => prev.map(b => {
      if (b.id === updatedBorrower.id) {
        originalBorrower = b;
        return updatedBorrower;
      }
      return b;
    }));

    if (!originalBorrower) return;

    const statusChanged = originalBorrower.status !== updatedBorrower.status;
    if (statusChanged) {
      if (updatedBorrower.status === 'متعثر' && originalBorrower.status !== 'متعثر' && originalBorrower.fundedBy) {
        setInvestors(prevInvestors => {
          const updatedInvestors = [...prevInvestors];
          originalBorrower!.fundedBy!.forEach(funder => {
            const investorIndex = updatedInvestors.findIndex(i => i.id === funder.investorId);
            if (investorIndex > -1) {
              const newDefaultedFunds = (updatedInvestors[investorIndex].defaultedFunds || 0) + funder.amount;
              updatedInvestors[investorIndex] = { ...updatedInvestors[investorIndex], defaultedFunds: newDefaultedFunds };
              addNotification({
                recipientId: funder.investorId,
                title: 'تنبيه: تعثر قرض مرتبط',
                description: `القرض الخاص بالعميل "${originalBorrower!.name}" قد تعثر، مما قد يؤثر على استثماراتك.`
              });
            }
          });
          return updatedInvestors;
        });
        toast({ title: 'تم تسجيل القرض كمتعثر وتحديث أموال المستثمرين.' });
      }

      if (updatedBorrower.status === 'مسدد بالكامل' && originalBorrower.status !== 'مسدد بالكامل' && originalBorrower.fundedBy) {
        setInvestors(prevInvestors => {
          const updatedInvestors = [...prevInvestors];
          const installmentTotalInterest = originalBorrower!.amount * (originalBorrower!.rate / 100) * originalBorrower!.term;
          const graceTotalProfit = originalBorrower!.amount * (graceTotalProfitPercentage / 100);
          const totalProfit = originalBorrower!.loanType === 'اقساط' ? installmentTotalInterest : graceTotalProfit;

          originalBorrower!.fundedBy!.forEach(funder => {
            const investorIndex = updatedInvestors.findIndex(i => i.id === funder.investorId);
            if (investorIndex > -1) {
              const loanShare = funder.amount / originalBorrower!.amount;
              let investorProfitShare = 0;
              if (originalBorrower!.loanType === 'اقساط') {
                investorProfitShare = totalProfit * (investorSharePercentage / 100) * loanShare;
              } else {
                investorProfitShare = totalProfit * (graceInvestorSharePercentage / 100) * loanShare;
              }
              
              const principalReturn = funder.amount;
              const profitTransaction: Transaction = {
                id: `t-profit-${Date.now()}-${investorIndex}`,
                date: new Date().toISOString().split('T')[0],
                type: 'إيداع أرباح',
                amount: investorProfitShare,
                description: `أرباح من قرض "${originalBorrower!.name}"`,
              };
              
              const investor = { ...updatedInvestors[investorIndex] };
              investor.transactionHistory = [...investor.transactionHistory, profitTransaction];
              investor.amount += principalReturn + investorProfitShare;
              investor.fundedLoanIds = investor.fundedLoanIds.filter(id => id !== originalBorrower!.id);
              updatedInvestors[investorIndex] = investor;
            }
          });
          return updatedInvestors;
        });
        toast({ title: 'تم سداد القرض بالكامل وإعادة الأموال والأرباح للمستثمرين.' });
      }
    }
    toast({ title: 'تم تحديث القرض (تجريبيًا)' });
  }, [setBorrowers, setInvestors, addNotification, graceTotalProfitPercentage, investorSharePercentage, graceInvestorSharePercentage, toast]);

  const updateBorrowerPaymentStatus = useCallback(async (
    borrowerId: string,
    paymentStatus?: BorrowerPaymentStatus
  ) => {
    setBorrowers(prev => prev.map(b => {
        if (b.id === borrowerId) {
            const updatedBorrower = { ...b };
            if (paymentStatus) {
                updatedBorrower.paymentStatus = paymentStatus;
            } else {
                delete (updatedBorrower as Partial<Borrower>).paymentStatus;
            }
            return updatedBorrower;
        }
        return b;
    }));
    toast({
        title: 'تم تحديث حالة السداد',
        description: `تم تحديث حالة القرض إلى "${paymentStatus || 'غير محدد'}".`,
    });
  }, [setBorrowers, toast]);

  const approveBorrower = useCallback(async (borrowerId: string) => {
    let approvedBorrower: Borrower | null = null;
    setBorrowers(prev => prev.map(b => {
      if (b.id === borrowerId) {
        approvedBorrower = { ...b, status: 'منتظم' };
        return approvedBorrower;
      }
      return b;
    }));

    if (approvedBorrower && approvedBorrower.submittedBy) {
      addNotification({
        recipientId: approvedBorrower.submittedBy,
        title: 'تمت الموافقة على طلبك',
        description: `تمت الموافقة على طلب إضافة القرض "${approvedBorrower.name}".`
      });
    }
    toast({ title: 'تمت الموافقة على القرض (تجريبيًا)' });
  }, [addNotification, setBorrowers, toast]);

  const rejectBorrower = useCallback(async (borrowerId: string, reason: string) => {
    let rejectedBorrower: Borrower | null = null;
    setBorrowers(prev => prev.map(b => {
      if (b.id === borrowerId) {
        rejectedBorrower = { ...b, status: 'مرفوض', rejectionReason: reason };
        return rejectedBorrower;
      }
      return b;
    }));

    if (rejectedBorrower && rejectedBorrower.submittedBy) {
      addNotification({
        recipientId: rejectedBorrower.submittedBy,
        title: 'تم رفض طلبك',
        description: `تم رفض طلب إضافة القرض "${rejectedBorrower.name}". السبب: ${reason}`
      });
    }
    toast({ variant: 'destructive', title: 'تم رفض القرض (تجريبيًا)' });
  }, [addNotification, setBorrowers, toast]);

  const addBorrower = useCallback(async (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus'
    >,
    investorIds: string[]
  ) => {
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يجب أن تكون مسجلاً للدخول.' });
        return;
    }
    if (borrower.status !== 'معلق' && investorIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'خطأ في التمويل',
        description: 'يجب اختيار مستثمر واحد على الأقل لتمويل قرض نشط.',
      });
      return;
    }

    const loanAmount = borrower.amount;
    const newId = `bor_${Date.now()}`;
    const fundedByDetails: { investorId: string; amount: number }[] = [];
    let totalFundedAmount = 0;

    setInvestors(prevInvestors => {
        const updatedInvestors = [...prevInvestors];
        investorIds.forEach(id => {
            const investorIndex = updatedInvestors.findIndex(i => i.id === id);
            if (investorIndex > -1) {
                const inv = { ...updatedInvestors[investorIndex] };
                const remainingAmountToFund = loanAmount - totalFundedAmount;
                const actualContribution = Math.min(inv.amount, remainingAmountToFund);

                if (actualContribution > 0) {
                  fundedByDetails.push({ investorId: inv.id, amount: actualContribution });
                  totalFundedAmount += actualContribution;
                  inv.amount -= actualContribution;
                  inv.fundedLoanIds = [...inv.fundedLoanIds, newId];
                  updatedInvestors[investorIndex] = inv;
                }
            }
        });
        return updatedInvestors;
    });

    const newEntry: Borrower = {
      ...borrower,
      id: newId,
      date: new Date().toISOString().split('T')[0],
      submittedBy: currentUser.id,
      fundedBy: fundedByDetails,
      amount: loanAmount,
      status: (borrower.status === 'معلق') ? 'معلق' : 'منتظم',
    };

    setBorrowers(prev => [...prev, newEntry]);

    if (newEntry.status === 'معلق' && currentUser?.managedBy) {
      addNotification({
        recipientId: currentUser.managedBy,
        title: 'طلب قرض جديد معلق',
        description: `قدم الموظف "${currentUser.name}" طلبًا لإضافة القرض "${newEntry.name}".`,
      });
    }
    toast({ title: 'تمت إضافة القرض بنجاح (تجريبيًا)' });
  }, [currentUser, toast, addNotification, setBorrowers, setInvestors]);

  const updateInvestor = useCallback(async (updatedInvestor: UpdatableInvestor) => {
    setInvestors(prev => prev.map(i => i.id === updatedInvestor.id ? { ...i, ...updatedInvestor } : i));
    toast({ title: 'تم تحديث المستثمر (تجريبيًا)' });
  }, [setInvestors, toast]);

  const approveInvestor = useCallback(async (investorId: string) => {
    let approvedInvestor: Investor | null = null;
    setInvestors(prev => prev.map(i => {
        if (i.id === investorId) {
            approvedInvestor = { ...i, status: 'نشط' };
            return approvedInvestor;
        }
        return i;
    }));
    
    if (approvedInvestor && approvedInvestor.submittedBy) {
      addNotification({
        recipientId: approvedInvestor.submittedBy,
        title: 'تمت الموافقة على طلبك',
        description: `تمت الموافقة على طلب إضافة المستثمر "${approvedInvestor.name}".`
      });
    }
    toast({ title: 'تمت الموافقة على المستثمر (تجريبيًا)' });
  }, [addNotification, setInvestors, toast]);

  const rejectInvestor = useCallback(async (investorId: string, reason: string) => {
    let rejectedInvestor: Investor | null = null;
    setInvestors(prev => prev.map(i => {
        if (i.id === investorId) {
            rejectedInvestor = { ...i, status: 'مرفوض', rejectionReason: reason };
            return rejectedInvestor;
        }
        return i;
    }));
    
    if (rejectedInvestor && rejectedInvestor.submittedBy) {
      addNotification({
        recipientId: rejectedInvestor.submittedBy,
        title: 'تم رفض طلبك',
        description: `تم رفض طلب إضافة المستثمر "${rejectedInvestor.name}". السبب: ${reason}`
      });
    }
    toast({ variant: 'destructive', title: 'تم رفض المستثمر (تجريبيًا)' });
  }, [addNotification, setInvestors, toast]);

  const addInvestor = useCallback(async (investorPayload: NewInvestorPayload) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول أولاً.' });
      return;
    }

    setUsers(prevUsers => {
        let usersToUpdate = [...prevUsers];
        let investorsToUpdate = [...investors];
        let toastMessage: { variant?: 'destructive', title: string, description: string } | null = null;

        if (currentUser.role === 'مدير المكتب' || (currentUser.role === 'مساعد مدير المكتب' && currentUser.permissions?.manageInvestors)) {
            const managerId = currentUser.role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
            const manager = usersToUpdate.find(u => u.id === managerId);
            const investorsAddedByManager = investors.filter(i => i.submittedBy === managerId).length;

            if (manager && investorsAddedByManager >= (manager.investorLimit ?? 0)) {
                toastMessage = { variant: 'destructive', title: 'تم الوصول للحد الأقصى', description: 'لقد وصل مدير المكتب للحد الأقصى للمستثمرين.' };
            } else if (!investorPayload.email || !investorPayload.password) {
                toastMessage = { variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور للمستثمر الجديد.' };
            } else if (usersToUpdate.some((u) => u.email === investorPayload.email)) {
                toastMessage = { variant: 'destructive', title: 'خطأ', description: 'البريد الإلكتروني مستخدم بالفعل.' };
            } else {
                const newId = `user_inv_${Date.now()}`;
                const newInvestorUser: User = {
                    id: newId, name: investorPayload.name, email: investorPayload.email, phone: '', password: investorPayload.password, role: 'مستثمر', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', registrationDate: new Date().toISOString().split('T')[0], managedBy: managerId,
                };
                const newInvestorEntry: Investor = {
                    id: newId, name: investorPayload.name, amount: investorPayload.amount, status: 'نشط', date: new Date().toISOString().split('T')[0],
                    transactionHistory: [{ id: `t_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'إيداع رأس المال', amount: investorPayload.amount, description: 'إيداع تأسيسي للحساب' }],
                    defaultedFunds: 0, fundedLoanIds: [], submittedBy: currentUser.id,
                };
                
                usersToUpdate = [...usersToUpdate, newInvestorUser];
                setInvestors(prev => [...prev, newInvestorEntry]);
                toastMessage = { title: 'تمت إضافة المستثمر والمستخدم المرتبط به بنجاح.' };
            }
        } else {
            const newEntry: Investor = {
                ...investorPayload, id: `inv_${Date.now()}`, date: new Date().toISOString().split('T')[0],
                transactionHistory: [{ id: `t_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'إيداع رأس المال', amount: investorPayload.amount, description: 'إيداع تأسيسي للحساب' }],
                defaultedFunds: 0, fundedLoanIds: [], submittedBy: currentUser.id,
            };
            
            setInvestors(prev => [...prev, newEntry]);
            if (newEntry.status === 'معلق' && currentUser?.managedBy) {
                addNotification({ recipientId: currentUser.managedBy, title: 'طلب مستثمر جديد معلق', description: `قدم الموظف "${currentUser.name}" طلبًا لإضافة المستثمر "${newEntry.name}".` });
            }
            toastMessage = { title: 'تمت إضافة المستثمر بنجاح.' };
        }
        
        if (toastMessage) {
            toast(toastMessage);
        }

        return usersToUpdate;
    });
  }, [currentUser, users, investors, toast, addNotification, setUsers, setInvestors]);

  const withdrawFromInvestor = useCallback(async (investorId: string, withdrawal: Omit<Transaction, 'id'>) => {
    setInvestors(prev => prev.map(i => {
        if (i.id === investorId) {
            const newTransaction: Transaction = { ...withdrawal, id: `t_${Date.now()}` };
            return {
                ...i,
                amount: i.amount - newTransaction.amount,
                transactionHistory: [...i.transactionHistory, newTransaction],
            };
        }
        return i;
    }));
    addNotification({ recipientId: investorId, title: 'عملية سحب ناجحة', description: `تم سحب مبلغ ${formatCurrency(withdrawal.amount)} من حسابك.` });
    toast({ title: 'تمت عملية السحب بنجاح (تجريبيًا)' });
  }, [setInvestors, addNotification, toast]);
  
  const updateUserIdentity = useCallback(async (updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if(!currentUser) return { success: false, message: "لم يتم العثور على المستخدم." };
    
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updates } : u));
    
    toast({ title: 'نجاح', description: "تم تحديث معلوماتك بنجاح (تجريبيًا)." });
    return { success: true, message: "تم تحديث معلوماتك بنجاح (تجريبيًا)." };
  }, [currentUser, setUsers, toast]);

  const updateUserStatus = useCallback(async (userId: string, status: User['status']) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    setUsers(prev => prev.map(u => {
      if (u.id === userId) return { ...u, status };
      if (userToUpdate.role === 'مدير المكتب' && u.managedBy === userId) return { ...u, status };
      return u;
    }));

    if (userToUpdate.role === 'مدير المكتب') {
      const isSuspending = status === 'معلق';
      const newInvestorStatus = isSuspending ? 'غير نشط' : 'نشط';
      setInvestors(prev => prev.map(inv => {
        if (inv.submittedBy === userId) {
          if (isSuspending || inv.status === 'غير نشط') {
            return { ...inv, status: newInvestorStatus };
          }
        }
        return inv;
      }));
    }

    const cascadeMessage = userToUpdate.role === 'مدير المكتب' 
      ? (status === 'معلق' ? 'وتم تعليق الحسابات المرتبطة به.' : 'وتم إعادة تفعيل الحسابات المرتبطة به.')
      : '';
    toast({ title: `تم تحديث حالة المستخدم ${cascadeMessage}`.trim() });
  }, [users, setUsers, setInvestors, toast]);

  const updateUserRole = useCallback(async (userId: string, role: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    toast({ title: 'تم تحديث دور المستخدم (تجريبيًا)' });
  }, [setUsers, toast]);

  const updateUserLimits = useCallback(async (userId: string, limits: { investorLimit: number; employeeLimit: number }) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...limits } : u));
    toast({ title: 'تم تحديث حدود المستخدم بنجاح.' });
  }, [setUsers, toast]);

  const updateManagerSettings = useCallback(async (managerId: string, settings: { allowEmployeeSubmissions?: boolean; hideEmployeeInvestorFunds?: boolean }) => {
    setUsers(prev => prev.map(u => u.id === managerId ? { ...u, ...settings } : u));
    toast({ title: 'تم تحديث إعدادات المدير بنجاح.' });
  }, [setUsers, toast]);

  const updateAssistantPermission = useCallback(async (assistantId: string, key: PermissionKey, value: boolean) => {
    setUsers(prev => prev.map(u => 
        u.id === assistantId ? { ...u, permissions: { ...(u.permissions || {}), [key]: value } } : u
    ));
    toast({ title: 'تم تحديث صلاحية المساعد بنجاح.' });
  }, [setUsers, toast]);

  const deleteUser = useCallback(async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ variant: 'destructive', title: 'تم حذف المستخدم (تجريبيًا)' });
  }, [setUsers, toast]);

  const requestCapitalIncrease = useCallback(async (investorId: string) => {
    const investor = investors.find(i => i.id === investorId);
    if (!investor) return;
    
    const managers = users.filter(u => u.role === 'مدير النظام' || u.role === 'مدير المكتب');
    managers.forEach(manager => {
        addNotification({ 
            recipientId: manager.id, 
            title: 'طلب زيادة رأس المال', 
            description: `المستثمر "${investor.name}" يرغب بزيادة رأس ماله للاستمرار بالاستثمار.` 
        });
    });
    
    toast({ title: 'تم إرسال طلبك', description: 'تم إعلام الإدارة برغبتك في زيادة رأس المال.' });
  }, [investors, users, addNotification, toast]);

  const addSupportTicket = useCallback(async (ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead'>) => {
    const newTicket: SupportTicket = {
      ...ticket, id: `ticket_${Date.now()}`, date: new Date().toISOString(), isRead: false,
    };
    setSupportTickets(prev => [newTicket, ...prev]);
    toast({ title: 'تم إرسال طلب الدعم بنجاح', description: 'سيقوم مدير النظام بمراجعة طلبك في أقرب وقت.' });
  }, [setSupportTickets, toast]);

  const value = {
    currentUser, borrowers, investors, users, supportTickets, notifications, salaryRepaymentPercentage, baseInterestRate, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage, supportEmail, supportPhone,
    updateSupportInfo, updateBaseInterestRate, updateInvestorSharePercentage, updateSalaryRepaymentPercentage, updateGraceTotalProfitPercentage, updateGraceInvestorSharePercentage, addSupportTicket, registerNewOfficeManager,
    addBorrower, updateBorrower, addInvestor, updateInvestor, withdrawFromInvestor, approveBorrower, approveInvestor, rejectBorrower, rejectInvestor, updateUserIdentity, updateUserStatus, updateUserRole, updateUserLimits, updateManagerSettings,
    updateAssistantPermission, requestCapitalIncrease, deleteUser, clearUserNotifications, markUserNotificationsAsRead, updateBorrowerPaymentStatus,
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
