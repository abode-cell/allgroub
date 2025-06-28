'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
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
  borrowersData,
  investorsData,
  usersData,
  supportTicketsData,
  notificationsData,
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


export function DataProvider({ children }: { children: ReactNode }) {
  const [borrowers, setBorrowers] = useState<Borrower[]>(borrowersData);
  const [investors, setInvestors] = useState<Investor[]>(investorsData);
  const [users, setUsers] = useState<User[]>(usersData);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(
    supportTicketsData
  );
  const [notifications, setNotifications] = useState<Notification[]>(
    notificationsData
  );
  const [salaryRepaymentPercentage, setSalaryRepaymentPercentage] = useState<number>(30);
  const [baseInterestRate, setBaseInterestRate] = useState<number>(5.5);
  const [investorSharePercentage, setInvestorSharePercentage] = useState<number>(70);
  const [graceTotalProfitPercentage, setGraceTotalProfitPercentage] = useState<number>(30);
  const [graceInvestorSharePercentage, setGraceInvestorSharePercentage] = useState<number>(33.3);
  const [supportEmail, setSupportEmail] = useState('support@aalg-group.com');
  const [supportPhone, setSupportPhone] = useState('920012345');


  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const currentUser = useMemo(() => {
    if (!authUser) return undefined;
    return users.find(u => u.id === authUser.id);
  }, [users, authUser]);
  
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
    const newNotification: Notification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random()}`,
        date: new Date().toISOString(),
        isRead: false,
    };
    notificationsData.unshift(newNotification);
    setNotifications([...notificationsData]);
  }, []);

  const clearUserNotifications = useCallback((userId: string) => {
    const updatedNotifications = notificationsData.filter(n => n.recipientId !== userId);
    notificationsData.length = 0;
    notificationsData.push(...updatedNotifications);
    setNotifications([...notificationsData]);
    toast({ title: 'تم حذف جميع التنبيهات' });
  }, [toast]);

  const markUserNotificationsAsRead = useCallback((userId: string) => {
      notificationsData.forEach(n => {
          if (n.recipientId === userId && !n.isRead) {
              n.isRead = true;
          }
      });
      setNotifications([...notificationsData]);
  }, []);

  const updateSalaryRepaymentPercentage = useCallback(async (percentage: number) => {
    setSalaryRepaymentPercentage(percentage);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث نسبة السداد من الراتب إلى ${percentage}%.`,
    });
  }, [toast]);

  const updateBaseInterestRate = useCallback(async (rate: number) => {
    setBaseInterestRate(rate);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث نسبة الربح الأساسية إلى ${rate}%.`,
    });
  }, [toast]);

  const updateInvestorSharePercentage = useCallback(async (percentage: number) => {
    setInvestorSharePercentage(percentage);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث حصة المستثمر من الأرباح إلى ${percentage}%.`,
    });
  }, [toast]);

  const updateGraceTotalProfitPercentage = useCallback(async (percentage: number) => {
    setGraceTotalProfitPercentage(percentage);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث نسبة الربح الإجمالية لتمويل المهلة إلى ${percentage}%.`,
    });
  }, [toast]);

  const updateGraceInvestorSharePercentage = useCallback(async (percentage: number) => {
    setGraceInvestorSharePercentage(percentage);
    toast({
      title: 'تم تحديث النسبة',
      description: `تم تحديث حصة المستثمر من أرباح المهلة إلى ${percentage}%.`,
    });
  }, [toast]);
  
  const updateSupportInfo = useCallback(async (info: { email?: string; phone?: string; }) => {
    if (info.email) {
        setSupportEmail(info.email);
    }
    if (info.phone) {
        setSupportPhone(info.phone);
    }
    toast({
        title: 'تم تحديث معلومات الدعم',
        description: 'تم تحديث معلومات التواصل بنجاح (تجريبيًا).',
    });
  }, [toast]);


  const registerNewOfficeManager = useCallback(async (
    credentials: SignUpCredentials
  ): Promise<{ success: boolean; message: string }> => {
    const existingUser = users.find(
      (u) => u.email === credentials.email || u.phone === credentials.phone
    );
    if (existingUser) {
      return {
        success: false,
        message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.',
      };
    }

    const managerId = `user_${Date.now()}`;
    const employeeId = `user_${Date.now() + 1}`;

    const newManager: User = {
      id: managerId,
      name: credentials.name,
      email: credentials.email,
      phone: credentials.phone,
      password: credentials.password,
      role: 'مدير المكتب',
      status: 'معلق',
      photoURL: 'https://placehold.co/40x40.png',
      registrationDate: new Date().toISOString().split('T')[0],
      investorLimit: 3,
      employeeLimit: 1,
      allowEmployeeSubmissions: true,
      hideEmployeeInvestorFunds: false,
    };

    const newEmployee: User = {
      id: employeeId,
      name: `موظف لدى ${credentials.name}`,
      email: `employee-${Date.now()}@example.com`,
      phone: '',
      password: 'password123', // Default password
      role: 'موظف',
      status: 'نشط', // Employee is active by default under the manager
      photoURL: 'https://placehold.co/40x40.png',
      managedBy: managerId,
      registrationDate: new Date().toISOString().split('T')[0],
    };

    usersData.push(newManager, newEmployee);
    setUsers([...usersData]);

    return {
      success: true,
      message: 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.',
    };
  }, [users]);

  const updateBorrower = useCallback(async (updatedBorrower: Borrower) => {
    const borrowerIndex = borrowersData.findIndex((b) => b.id === updatedBorrower.id);
    if (borrowerIndex === -1) return;
    
    const originalBorrower = { ...borrowersData[borrowerIndex] };
    const statusChanged = originalBorrower.status !== updatedBorrower.status;

    // Merge new data into the source array item
    borrowersData[borrowerIndex] = { ...originalBorrower, ...updatedBorrower };
    
    if (statusChanged) {
      if (updatedBorrower.status === 'متعثر' && originalBorrower.status !== 'متعثر') {
        if (originalBorrower.fundedBy && originalBorrower.fundedBy.length > 0) {
          originalBorrower.fundedBy.forEach(funder => {
            const investorIndex = investorsData.findIndex(i => i.id === funder.investorId);
            if (investorIndex > -1) {
              investorsData[investorIndex].defaultedFunds += funder.amount;
              addNotification({
                recipientId: funder.investorId,
                title: 'تنبيه: تعثر قرض مرتبط',
                description: `القرض الخاص بالعميل "${originalBorrower.name}" قد تعثر، مما قد يؤثر على استثماراتك.`
              });
            }
          });
          setInvestors([...investorsData]);
          toast({ title: 'تم تسجيل القرض كمتعثر وتحديث أموال المستثمرين.' });
        }
      }

      if (updatedBorrower.status === 'مسدد بالكامل' && originalBorrower.status !== 'مسدد بالكامل') {
        if (originalBorrower.fundedBy && originalBorrower.fundedBy.length > 0) {
          const installmentTotalInterest = originalBorrower.amount * (originalBorrower.rate / 100) * originalBorrower.term;
          const graceTotalProfit = originalBorrower.amount * (graceTotalProfitPercentage / 100);
          const totalProfit = originalBorrower.loanType === 'اقساط' ? installmentTotalInterest : graceTotalProfit;

          originalBorrower.fundedBy.forEach(funder => {
            const investorIndex = investorsData.findIndex(i => i.id === funder.investorId);
            if (investorIndex > -1) {
              const loanShare = funder.amount / originalBorrower.amount;
              let investorProfitShare = 0;
              if (originalBorrower.loanType === 'اقساط') {
                investorProfitShare = totalProfit * (investorSharePercentage / 100) * loanShare;
              } else { // 'مهلة'
                investorProfitShare = totalProfit * (graceInvestorSharePercentage / 100) * loanShare;
              }
              
              const principalReturn = funder.amount;
              const profitTransaction: Transaction = {
                id: `t-profit-${Date.now()}-${investorsData[investorIndex].id}`,
                date: new Date().toISOString().split('T')[0],
                type: 'إيداع أرباح',
                amount: investorProfitShare,
                description: `أرباح من قرض "${originalBorrower.name}"`,
              };
              
              const investor = investorsData[investorIndex];
              investor.transactionHistory.push(profitTransaction);
              investor.amount += principalReturn + investorProfitShare;
              investor.fundedLoanIds = investor.fundedLoanIds.filter(id => id !== originalBorrower.id);
            }
          });
          setInvestors([...investorsData]);
          toast({ title: 'تم سداد القرض بالكامل وإعادة الأموال والأرباح للمستثمرين.' });
        }
      }
    }
    setBorrowers([...borrowersData]);
    toast({ title: 'تم تحديث القرض (تجريبيًا)' });
  }, [addNotification, graceTotalProfitPercentage, investorSharePercentage, graceInvestorSharePercentage, toast]);

  const updateBorrowerPaymentStatus = useCallback(async (
    borrowerId: string,
    paymentStatus?: BorrowerPaymentStatus
  ) => {
    const borrowerIndex = borrowersData.findIndex(b => b.id === borrowerId);
    if (borrowerIndex > -1) {
      if (paymentStatus) {
        borrowersData[borrowerIndex].paymentStatus = paymentStatus;
      } else {
        delete (borrowersData[borrowerIndex] as Partial<Borrower>).paymentStatus;
      }
      setBorrowers([...borrowersData]);
      toast({
        title: 'تم تحديث حالة السداد',
        description: `تم تحديث حالة القرض إلى "${paymentStatus || 'غير محدد'}".`,
      });
    }
  }, [toast]);

  const approveBorrower = useCallback(async (borrowerId: string) => {
    const borrowerIndex = borrowersData.findIndex(b => b.id === borrowerId);
    if (borrowerIndex > -1) {
      const borrower = borrowersData[borrowerIndex];
      borrower.status = 'منتظم';
      if (borrower.submittedBy) {
        addNotification({
          recipientId: borrower.submittedBy,
          title: 'تمت الموافقة على طلبك',
          description: `تمت الموافقة على طلب إضافة القرض "${borrower.name}".`
        });
      }
      setBorrowers([...borrowersData]);
      toast({ title: 'تمت الموافقة على القرض (تجريبيًا)' });
    }
  }, [addNotification, toast]);

  const rejectBorrower = useCallback(async (borrowerId: string, reason: string) => {
    const borrowerIndex = borrowersData.findIndex(b => b.id === borrowerId);
    if (borrowerIndex > -1) {
      const borrower = borrowersData[borrowerIndex];
      borrower.status = 'مرفوض';
      borrower.rejectionReason = reason;
      if (borrower.submittedBy) {
        addNotification({
          recipientId: borrower.submittedBy,
          title: 'تم رفض طلبك',
          description: `تم رفض طلب إضافة القرض "${borrower.name}". السبب: ${reason}`
        });
      }
      setBorrowers([...borrowersData]);
      toast({ variant: 'destructive', title: 'تم رفض القرض (تجريبيًا)' });
    }
  }, [addNotification, toast]);

  const addBorrower = useCallback(async (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus'
    >,
    investorIds: string[]
  ) => {
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

    investorIds.forEach(id => {
        const investorIndex = investorsData.findIndex(i => i.id === id);
        if (investorIndex > -1) {
            const inv = investorsData[investorIndex];
            const remainingAmountToFund = loanAmount - totalFundedAmount;
            const actualContribution = Math.min(inv.amount, remainingAmountToFund);

            if (actualContribution > 0) {
              fundedByDetails.push({ investorId: inv.id, amount: actualContribution });
              totalFundedAmount += actualContribution;
              inv.amount -= actualContribution;
              inv.fundedLoanIds.push(newId);
            }
        }
    });

    const newEntry: Borrower = {
      ...borrower,
      id: newId,
      date: new Date().toISOString().split('T')[0],
      submittedBy: currentUser?.id,
      fundedBy: fundedByDetails,
      amount: loanAmount,
      status: (borrower.status === 'معلق') ? 'معلق' : 'منتظم',
    };

    setInvestors([...investorsData]);
    borrowersData.push(newEntry);
    setBorrowers([...borrowersData]);

    if (newEntry.status === 'معلق' && currentUser?.managedBy) {
      addNotification({
        recipientId: currentUser.managedBy,
        title: 'طلب قرض جديد معلق',
        description: `قدم الموظف "${currentUser.name}" طلبًا لإضافة القرض "${newEntry.name}".`,
      });
    }
    toast({ title: 'تمت إضافة القرض بنجاح (تجريبيًا)' });
  }, [currentUser, toast, addNotification]);

  const updateInvestor = useCallback(async (updatedInvestor: UpdatableInvestor) => {
    const investorIndex = investorsData.findIndex(i => i.id === updatedInvestor.id);
    if (investorIndex > -1) {
      const originalInvestor = investorsData[investorIndex];
      investorsData[investorIndex] = { ...originalInvestor, ...updatedInvestor };
      setInvestors([...investorsData]);
      toast({ title: 'تم تحديث المستثمر (تجريبيًا)' });
    }
  }, [toast]);

  const approveInvestor = useCallback(async (investorId: string) => {
    const investorIndex = investorsData.findIndex(i => i.id === investorId);
    if (investorIndex > -1) {
      const investor = investorsData[investorIndex];
      investor.status = 'نشط';
      if (investor.submittedBy) {
        addNotification({
          recipientId: investor.submittedBy,
          title: 'تمت الموافقة على طلبك',
          description: `تمت الموافقة على طلب إضافة المستثمر "${investor.name}".`
        });
      }
      setInvestors([...investorsData]);
      toast({ title: 'تمت الموافقة على المستثمر (تجريبيًا)' });
    }
  }, [addNotification, toast]);

  const rejectInvestor = useCallback(async (investorId: string, reason: string) => {
    const investorIndex = investorsData.findIndex(i => i.id === investorId);
    if (investorIndex > -1) {
      const investor = investorsData[investorIndex];
      investor.status = 'مرفوض';
      investor.rejectionReason = reason;
      if (investor.submittedBy) {
        addNotification({
          recipientId: investor.submittedBy,
          title: 'تم رفض طلبك',
          description: `تم رفض طلب إضافة المستثمر "${investor.name}". السبب: ${reason}`
        });
      }
      setInvestors([...investorsData]);
      toast({ variant: 'destructive', title: 'تم رفض المستثمر (تجريبيًا)' });
    }
  }, [addNotification, toast]);

  const addInvestor = useCallback(async (investorPayload: NewInvestorPayload) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول أولاً.' });
      return;
    }

    if (currentUser.role === 'مدير المكتب' || (currentUser.role === 'مساعد مدير المكتب' && currentUser.permissions?.manageInvestors)) {
      const managerId = currentUser.role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
      const manager = usersData.find(u => u.id === managerId);
      
      const investorsAddedByManager = investorsData.filter(i => i.submittedBy === managerId).length;
      if (manager && investorsAddedByManager >= (manager.investorLimit ?? 0)) {
        toast({ variant: 'destructive', title: 'تم الوصول للحد الأقصى', description: 'لقد وصل مدير المكتب للحد الأقصى للمستثمرين.' });
        return;
      }
      if (!investorPayload.email || !investorPayload.password) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور للمستثمر الجديد.' });
        return;
      }
      const emailExists = usersData.some((u) => u.email === investorPayload.email);
      if (emailExists) {
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
      
      usersData.push(newInvestorUser);
      investorsData.push(newInvestorEntry);
      setUsers([...usersData]);
      setInvestors([...investorsData]);
      toast({ title: 'تمت إضافة المستثمر والمستخدم المرتبط به بنجاح.' });
      return;
    }

    const newEntry: Investor = {
      ...investorPayload, id: `inv_${Date.now()}`, date: new Date().toISOString().split('T')[0],
      transactionHistory: [{ id: `t_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'إيداع رأس المال', amount: investorPayload.amount, description: 'إيداع تأسيسي للحساب' }],
      defaultedFunds: 0, fundedLoanIds: [], submittedBy: currentUser.id,
    };
    investorsData.push(newEntry);
    setInvestors([...investorsData]);

    if (newEntry.status === 'معلق' && currentUser?.managedBy) {
      addNotification({ recipientId: currentUser.managedBy, title: 'طلب مستثمر جديد معلق', description: `قدم الموظف "${currentUser.name}" طلبًا لإضافة المستثمر "${newEntry.name}".` });
    }
    toast({ title: 'تمت إضافة المستثمر بنجاح.' });
  }, [currentUser, toast, addNotification]);

  const withdrawFromInvestor = useCallback(async (investorId: string, withdrawal: Omit<Transaction, 'id'>) => {
    const investorIndex = investorsData.findIndex(i => i.id === investorId);
    if (investorIndex > -1) {
      const investor = investorsData[investorIndex];
      const newTransaction: Transaction = { ...withdrawal, id: `t_${Date.now()}` };
      investor.amount -= newTransaction.amount;
      investor.transactionHistory.push(newTransaction);
      setInvestors([...investorsData]);
      addNotification({ recipientId: investorId, title: 'عملية سحب ناجحة', description: `تم سحب مبلغ ${formatCurrency(withdrawal.amount)} من حسابك.` });
      toast({ title: 'تمت عملية السحب بنجاح (تجريبيًا)' });
    }
  }, [addNotification, toast]);

  const updateUserStatus = useCallback(async (userId: string, status: User['status']) => {
    const userIndex = usersData.findIndex((u) => u.id === userId);
    if (userIndex === -1) return;

    usersData[userIndex].status = status;
    const userToUpdate = { ...usersData[userIndex] };
    let cascadeMessage = '';

    if (userToUpdate.role === 'مدير المكتب') {
      const isSuspending = status === 'معلق';
      const isReactivating = status === 'نشط' && userToUpdate.status === 'معلق';
      if (isSuspending || isReactivating) {
        usersData.forEach(u => { if (u.managedBy === userId) u.status = status; });
        investorsData.forEach(inv => {
          if (inv.submittedBy === userId) {
            const newStatus = isSuspending ? 'غير نشط' : 'نشط';
            if (!(isReactivating && inv.status !== 'غير نشط')) { inv.status = newStatus; }
          }
        });
        setInvestors([...investorsData]);
        cascadeMessage = isSuspending ? 'وتم تعليق الحسابات المرتبطة به.' : 'وتم إعادة تفعيل الحسابات المرتبطة به.';
      }
    }
    setUsers([...usersData]);
    toast({ title: `تم تحديث حالة المستخدم ${cascadeMessage}`.trim() });
  }, [toast]);

  const updateUserRole = useCallback(async (userId: string, role: UserRole) => {
    const userIndex = usersData.findIndex(u => u.id === userId);
    if (userIndex > -1) {
      usersData[userIndex].role = role;
      setUsers([...usersData]);
      toast({ title: 'تم تحديث دور المستخدم (تجريبيًا)' });
    }
  }, [toast]);

  const updateUserLimits = useCallback(async (userId: string, limits: { investorLimit: number; employeeLimit: number }) => {
    const userIndex = usersData.findIndex(u => u.id === userId);
    if (userIndex > -1) {
      usersData[userIndex] = { ...usersData[userIndex], ...limits };
      setUsers([...usersData]);
      toast({ title: 'تم تحديث حدود المستخدم بنجاح.' });
    }
  }, [toast]);

  const updateManagerSettings = useCallback(async (managerId: string, settings: { allowEmployeeSubmissions?: boolean; hideEmployeeInvestorFunds?: boolean }) => {
    const userIndex = usersData.findIndex(u => u.id === managerId);
    if (userIndex > -1) {
      usersData[userIndex] = { ...usersData[userIndex], ...settings };
      setUsers([...usersData]);
      toast({ title: 'تم تحديث إعدادات المدير بنجاح.' });
    }
  }, [toast]);

  const updateAssistantPermission = useCallback(async (assistantId: string, key: PermissionKey, value: boolean) => {
    const userIndex = usersData.findIndex(u => u.id === assistantId);
    if (userIndex > -1) {
      const user = usersData[userIndex];
      user.permissions = { ...(user.permissions || {}), [key]: value };
      setUsers([...usersData]);
      toast({ title: 'تم تحديث صلاحية المساعد بنجاح.' });
    }
  }, [toast]);

  const deleteUser = useCallback(async (userId: string) => {
    const userIndex = usersData.findIndex(u => u.id === userId);
    if (userIndex > -1) {
      usersData.splice(userIndex, 1);
      setUsers([...usersData]);
      toast({ variant: 'destructive', title: 'تم حذف المستخدم (تجريبيًا)' });
    }
  }, [toast]);

  const requestCapitalIncrease = useCallback(async (investorId: string) => {
    const investor = investors.find(i => i.id === investorId);
    const managers = users.filter(u => u.role === 'مدير النظام' || u.role === 'مدير المكتب');
    if (!investor) return;
    if (managers.length > 0) {
      managers.forEach(manager => {
        addNotification({ recipientId: manager.id, title: 'طلب زيادة رأس المال', description: `المستثمر "${investor.name}" يرغب بزيادة رأس ماله للاستمرار بالاستثمار.` });
      });
    }
    toast({ title: 'تم إرسال طلبك', description: 'تم إعلام الإدارة برغبتك في زيادة رأس المال.' });
  }, [investors, users, addNotification, toast]);

  const addSupportTicket = useCallback(async (ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead'>) => {
    const newTicket: SupportTicket = {
      ...ticket, id: `ticket_${Date.now()}`, date: new Date().toISOString(), isRead: false,
    };
    supportTicketsData.unshift(newTicket);
    setSupportTickets([...supportTicketsData]);
    toast({ title: 'تم إرسال طلب الدعم بنجاح', description: 'سيقوم مدير النظام بمراجعة طلبك في أقرب وقت.' });
  }, [toast]);

  const value = useMemo(() => ({
    currentUser, borrowers, investors, users, supportTickets, notifications, salaryRepaymentPercentage, baseInterestRate, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage, supportEmail, supportPhone,
    updateSupportInfo, updateBaseInterestRate, updateInvestorSharePercentage, updateSalaryRepaymentPercentage, updateGraceTotalProfitPercentage, updateGraceInvestorSharePercentage, addSupportTicket, registerNewOfficeManager,
    addBorrower, updateBorrower, addInvestor, updateInvestor, withdrawFromInvestor, approveBorrower, approveInvestor, rejectBorrower, rejectInvestor, updateUserStatus, updateUserRole, updateUserLimits, updateManagerSettings,
    updateAssistantPermission, requestCapitalIncrease, deleteUser, clearUserNotifications, markUserNotificationsAsRead, updateBorrowerPaymentStatus,
  }), [
    currentUser, borrowers, investors, users, supportTickets, notifications, salaryRepaymentPercentage, baseInterestRate, investorSharePercentage, graceTotalProfitPercentage, graceInvestorSharePercentage, supportEmail, supportPhone,
    updateSupportInfo, updateBaseInterestRate, updateInvestorSharePercentage, updateSalaryRepaymentPercentage, updateGraceTotalProfitPercentage, updateGraceInvestorSharePercentage, addSupportTicket, registerNewOfficeManager,
    addBorrower, updateBorrower, addInvestor, updateInvestor, withdrawFromInvestor, approveBorrower, approveInvestor, rejectBorrower, rejectInvestor, updateUserStatus, updateUserRole, updateUserLimits, updateManagerSettings,
    updateAssistantPermission, requestCapitalIncrease, deleteUser, clearUserNotifications, markUserNotificationsAsRead, updateBorrowerPaymentStatus,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
