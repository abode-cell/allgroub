

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
  NewUserPayload,
  TransactionType,
  WithdrawalMethod,
  UpdatableInvestor,
  NewInvestorPayload,
  InstallmentStatus,
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

type DataState = {
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
};

type DataActions = {
  updateSupportInfo: (info: { email?: string; phone?: string }) => void;
  updateBaseInterestRate: (rate: number) => void;
  updateInvestorSharePercentage: (percentage: number) => void;
  updateSalaryRepaymentPercentage: (percentage: number) => void;
  updateGraceTotalProfitPercentage: (percentage: number) => void;
  updateGraceInvestorSharePercentage: (percentage: number) => void;
  updateTrialPeriod: (days: number) => void;
  addSupportTicket: (
    ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead' | 'isReplied'>
  ) => void;
  deleteSupportTicket: (ticketId: string) => void;
  replyToSupportTicket: (ticketId: string, replyMessage: string) => void;
  registerNewOfficeManager: (
    credentials: Omit<User, 'id' | 'role' | 'status'>
  ) => Promise<{ success: boolean; message: string }>;
  addBorrower: (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus' | 'isNotified' | 'installments'
    >,
    investorIds: string[]
  ) => void;
  updateBorrower: (borrower: Borrower) => void;
  updateBorrowerPaymentStatus: (
    borrowerId: string,
    paymentStatus?: BorrowerPaymentStatus
  ) => void;
  approveBorrower: (borrowerId: string) => void;
  rejectBorrower: (borrowerId: string, reason: string) => void;
  deleteBorrower: (borrowerId: string) => void;
  updateInstallmentStatus: (borrowerId: string, month: number, status: InstallmentStatus) => void;
  addInvestor: (investor: NewInvestorPayload) => void;
  addEmployee: (
    payload: NewUserPayload
  ) => Promise<{ success: boolean; message: string }>;
  addAssistant: (
    payload: NewUserPayload
  ) => Promise<{ success: boolean; message: string }>;
  updateInvestor: (investor: UpdatableInvestor) => void;
  approveInvestor: (investorId: string) => void;
  rejectInvestor: (investorId: string, reason: string) => void;
  addInvestorTransaction: (
    investorId: string,
    transaction: Omit<Transaction, 'id'>
  ) => void;
  updateUserIdentity: (
    updates: Partial<User>
  ) => Promise<{ success: boolean; message: string }>;
  updateUserCredentials: (
    userId: string,
    updates: { email?: string; password?: string }
  ) => Promise<{ success: boolean; message: string }>;
  updateUserStatus: (userId: string, status: User['status']) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserLimits: (
    userId: string,
    limits: { investorLimit: number; employeeLimit: number; assistantLimit: number }
  ) => void;
  updateManagerSettings: (
    managerId: string,
    settings: {
      allowEmployeeSubmissions?: boolean;
      hideEmployeeInvestorFunds?: boolean;
      allowEmployeeLoanEdits?: boolean;
    }
  ) => void;
  updateAssistantPermission: (
    assistantId: string,
    key: PermissionKey,
    value: boolean
  ) => void;
  requestCapitalIncrease: (investorId: string) => void;
  deleteUser: (userId: string) => void;
  clearUserNotifications: (userId: string) => void;
  markUserNotificationsAsRead: (userId: string) => void;
  markBorrowerAsNotified: (borrowerId: string, message: string) => void;
  markInvestorAsNotified: (investorId: string, message: string) => void;
};

const DataStateContext = createContext<DataState | undefined>(undefined);
const DataActionsContext = createContext<DataActions | undefined>(undefined);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const APP_DATA_KEY = 'appData_cleared_v8'; // Incremented key to force clear old data

const initialDataState: Omit<DataState, 'currentUser'> = {
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
  const [data, setData] = useState<Omit<DataState, 'currentUser'>>(initialDataState);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [cronJobRan, setCronJobRan] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(APP_DATA_KEY);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed.users && parsed.borrowers && parsed.investors) {
            
            const migratedInvestors = parsed.investors.map((inv: any) => {
              if (inv.amount !== undefined && inv.installmentCapital === undefined) {
                const newInv = { ...inv };
                if (newInv.investmentType === 'اقساط') {
                  newInv.installmentCapital = newInv.amount;
                  newInv.gracePeriodCapital = 0;
                } else {
                  newInv.installmentCapital = 0;
                  newInv.gracePeriodCapital = newInv.amount;
                }
                delete newInv.amount;
                return newInv;
              }
              return inv;
            });
            
            setData({
              borrowers: parsed.borrowers,
              investors: migratedInvestors,
              users: parsed.users,
              supportTickets: parsed.supportTickets || initialDataState.supportTickets,
              notifications: parsed.notifications || initialDataState.notifications,
              salaryRepaymentPercentage: parsed.salaryRepaymentPercentage || initialDataState.salaryRepaymentPercentage,
              baseInterestRate: parsed.baseInterestRate || initialDataState.baseInterestRate,
              investorSharePercentage: parsed.investorSharePercentage || initialDataState.investorSharePercentage,
              graceTotalProfitPercentage: parsed.graceTotalProfitPercentage || initialDataState.graceTotalProfitPercentage,
              graceInvestorSharePercentage: parsed.graceInvestorSharePercentage || initialDataState.graceInvestorSharePercentage,
              supportEmail: parsed.supportEmail || initialDataState.supportEmail,
              supportPhone: parsed.supportPhone || initialDataState.supportPhone,
            });
          } else {
            setData(initialDataState);
          }
        } else {
           setData(initialDataState);
        }
      } catch (error) {
        console.warn(`Error reading localStorage key “${APP_DATA_KEY}”:`, error);
        setData(initialDataState);
      } finally {
        setIsInitialLoad(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isInitialLoad) return; 
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
      } catch (error) {
        console.warn(`Error setting localStorage key “${APP_DATA_KEY}”:`, error);
      }
    }
  }, [isInitialLoad, data]);

  const { userId } = useAuth();
  const { toast } = useToast();

  const currentUser = useMemo(() => {
    if (!userId) return undefined;
    return data.users.find((u) => u.id === userId);
  }, [data.users, userId]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
      setData(d => {
        const newNotification: Notification = {
          ...notification,
          id: `notif_${crypto.randomUUID()}`,
          date: new Date().toISOString(),
          isRead: false,
        };
        return { ...d, notifications: [newNotification, ...d.notifications] };
      });
    },
    []
  );

  // Effect to simulate cron job for trial management
  useEffect(() => {
    if (isInitialLoad || cronJobRan || data.users.length === 0) return;

    const today = new Date();
    let usersModified = false;
    const notificationsToAdd: Notification[] = [];
    const systemAdmin = data.users.find((u) => u.role === 'مدير النظام');

    const updatedUsers = data.users.map((user) => {
      if (
        user.role === 'مدير المكتب' &&
        user.trialEndsAt &&
        user.status === 'نشط'
      ) {
        const trialEndDate = new Date(user.trialEndsAt);
        const alreadySuspendedId = `trial-suspended-${user.id}`;
        const alreadySuspended = data.notifications.some(n => n.id === alreadySuspendedId);

        // Suspension logic
        if (today > trialEndDate && !alreadySuspended) {
          usersModified = true;
          if (systemAdmin) {
            notificationsToAdd.push({
              id: `admin-trial-expired-${user.id}`,
              recipientId: systemAdmin.id,
              title: 'انتهاء تجربة مستخدم',
              description: `انتهت الفترة التجريبية للمستخدم "${user.name}" وتم تعليق حسابه.`,
              date: today.toISOString(),
              isRead: false,
            });
          }
          notificationsToAdd.push({
            id: alreadySuspendedId,
            recipientId: user.id,
            title: 'انتهت الفترة التجريبية',
            description:
              'انتهت فترة التجربة الخاصة بك. تم تعليق حسابك تلقائياً.',
            date: today.toISOString(),
            isRead: false,
          });
          return { ...user, status: 'معلق' };
        }

        // Reminder logic
        const timeDiff = trialEndDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysLeft > 0 && daysLeft <= 3) {
          const reminderId = `trial-reminder-${user.id}-${daysLeft}`;
          const alreadySent = data.notifications.some((n) => n.id === reminderId);
          if (!alreadySent) {
            notificationsToAdd.push({
              id: reminderId,
              recipientId: user.id,
              title: 'تذكير بقرب انتهاء الفترة التجريبية',
              description: `ستنتهي الفترة التجريبية لحسابك خلال ${daysLeft} يوم/أيام.`,
              date: today.toISOString(),
              isRead: false,
            });
          }
        }
      }
      return user;
    });

    if (usersModified || notificationsToAdd.length > 0) {
      setData(d => {
        const existingIds = new Set(d.notifications.map((p) => p.id));
        const uniqueNewNotifications = notificationsToAdd.filter(
          (n) => !existingIds.has(n.id)
        );

        return {
            ...d,
            users: usersModified ? updatedUsers : d.users,
            notifications: [...uniqueNewNotifications, ...d.notifications],
        }
      });
    }
    setCronJobRan(true); // Run only once per session
  }, [isInitialLoad, cronJobRan, data.users, data.notifications]);


  const clearUserNotifications = useCallback(
    (userId: string) => {
      setData(d => ({ ...d, notifications: d.notifications.filter((n) => n.recipientId !== userId) }));
      toast({ title: 'تم حذف جميع التنبيهات' });
    },
    [toast]
  );

  const markUserNotificationsAsRead = useCallback((userId: string) => {
    setData(d => ({
        ...d,
        notifications: d.notifications.map((n) =>
            n.recipientId === userId && !n.isRead ? { ...n, isRead: true } : n
        )
    }));
  }, []);

  const updateTrialPeriod = useCallback(
    (days: number) => {
      setData(d => ({
        ...d,
        users: d.users.map((u) => u.role === 'مدير النظام' ? { ...u, defaultTrialPeriodDays: days } : u)
      }));
      toast({
        title: 'تم التحديث',
        description: `تم تحديث الفترة التجريبية إلى ${days} يوم.`,
      });
    },
    [toast]
  );

  const updateSalaryRepaymentPercentage = useCallback(
    (percentage: number) => {
      setData(d => ({...d, salaryRepaymentPercentage: percentage}));
      toast({
        title: 'تم التحديث',
        description: `تم تحديث نسبة السداد من الراتب إلى ${percentage}%.`,
      });
    },
    [toast]
  );
  const updateBaseInterestRate = useCallback(
    (rate: number) => {
      setData(d => ({...d, baseInterestRate: rate}));
      toast({
        title: 'تم التحديث',
        description: `تم تحديث نسبة الربح الأساسية إلى ${rate}%.`,
      });
    },
    [toast]
  );
  const updateInvestorSharePercentage = useCallback(
    (percentage: number) => {
      setData(d => ({...d, investorSharePercentage: percentage}));
      toast({
        title: 'تم التحديث',
        description: `تم تحديث حصة المستثمر من الأرباح إلى ${percentage}%.`,
      });
    },
    [toast]
  );
  const updateGraceTotalProfitPercentage = useCallback(
    (percentage: number) => {
      setData(d => ({...d, graceTotalProfitPercentage: percentage}));
      toast({
        title: 'تم التحديث',
        description: `تم تحديث نسبة الربح الإجمالية لتمويل المهلة إلى ${percentage}%.`,
      });
    },
    [toast]
  );
  const updateGraceInvestorSharePercentage = useCallback(
    (percentage: number) => {
      setData(d => ({...d, graceInvestorSharePercentage: percentage}));
      toast({
        title: 'تم التحديث',
        description: `تم تحديث حصة المستثمر من أرباح المهلة إلى ${percentage}%.`,
      });
    },
    [toast]
  );

  const updateSupportInfo = useCallback(
    (info: { email?: string; phone?: string }) => {
      setData(d => ({
          ...d,
          supportEmail: info.email ?? d.supportEmail,
          supportPhone: info.phone ?? d.supportPhone,
      }));
      toast({
        title: 'تم تحديث معلومات الدعم',
        description: 'تم تحديث معلومات التواصل بنجاح.',
      });
    },
    [toast]
  );

  const registerNewOfficeManager = useCallback(
    async (
      credentials: Omit<User, 'id' | 'role' | 'status'>
    ): Promise<{ success: boolean; message: string }> => {
      let success = false;
      let message = '';
      let newManager: User | null = null;
      let systemAdmin: User | undefined;

      setData(d => {
        const existingUser = d.users.find(
          (u) => u.email === credentials.email || u.phone === credentials.phone
        );
        if (existingUser) {
          message = 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.';
          return d;
        }

        systemAdmin = d.users.find((u) => u.role === 'مدير النظام');
        const trialDays = systemAdmin?.defaultTrialPeriodDays ?? 14;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        const managerId = `user_${Date.now()}`;
        newManager = {
          id: managerId,
          name: credentials.name,
          email: credentials.email,
          phone: credentials.phone,
          password: credentials.password,
          role: 'مدير المكتب',
          status: 'نشط',
          photoURL: 'https://placehold.co/40x40.png',
          registrationDate: new Date().toISOString(),
          trialEndsAt: trialEndsAt.toISOString(),
          investorLimit: 3,
          employeeLimit: 1,
          assistantLimit: 1,
          allowEmployeeSubmissions: true,
          hideEmployeeInvestorFunds: false,
          allowEmployeeLoanEdits: false,
          permissions: {},
        };
        success = true;
        message = 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.';
        
        let newNotifications = d.notifications;
        if(systemAdmin) {
            newNotifications = [{
                id: `notif_${crypto.randomUUID()}`,
                date: new Date().toISOString(),
                isRead: false,
                recipientId: systemAdmin.id,
                title: 'تسجيل مدير مكتب جديد',
                description: `المستخدم "${credentials.name}" سجل كمدير مكتب وينتظر التفعيل.`,
            }, ...d.notifications];
        }

        return { ...d, users: [...d.users, newManager], notifications: newNotifications };
      });
      
      return { success, message };
    },
    []
  );

  const updateBorrower = useCallback(
    (updatedBorrower: Borrower) => {
      setData(d => {
        const originalBorrower = d.borrowers.find(b => b.id === updatedBorrower.id);
        if (!originalBorrower) return d;

        if (originalBorrower.status !== 'معلق' && updatedBorrower.amount !== originalBorrower.amount) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'لا يمكن تغيير مبلغ قرض نشط.',
            });
            return d;
        }

        if (updatedBorrower.loanType !== originalBorrower.loanType) {
            if (updatedBorrower.loanType === 'اقساط') {
                updatedBorrower.discount = 0;
            } else {
                updatedBorrower.rate = 0;
                updatedBorrower.term = 0;
            }
        }
        toast({ title: 'تم تحديث القرض' });
        return {
            ...d,
            borrowers: d.borrowers.map((b) => (b.id === updatedBorrower.id ? { ...b, ...updatedBorrower} : b))
        }
      });
    },
    [toast]
  );
  
  const updateBorrowerPaymentStatus = useCallback(
    (borrowerId: string, newPaymentStatus?: BorrowerPaymentStatus) => {
      setData((currentData) => {
        const originalBorrowers = currentData.borrowers;
        const originalInvestors = currentData.investors;
        
        const targetBorrowerIndex = originalBorrowers.findIndex((b) => b.id === borrowerId);
        if (targetBorrowerIndex === -1) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على القرض.' });
          return currentData;
        }

        const targetBorrower = originalBorrowers[targetBorrowerIndex];
        const originalPaymentStatus = targetBorrower.paymentStatus;
        if (originalPaymentStatus === newPaymentStatus) return currentData;
        
        if (targetBorrower.lastStatusChange) {
          const lastChangeTime = new Date(targetBorrower.lastStatusChange).getTime();
          const now = new Date().getTime();
          if (now - lastChangeTime < 60 * 1000) {
            toast({
              variant: 'destructive',
              title: 'الرجاء الانتظار',
              description: 'يجب الانتظار دقيقة واحدة قبل تغيير حالة هذا القرض مرة أخرى.',
            });
            return currentData;
          }
        }

        let newInvestors = JSON.parse(JSON.stringify(originalInvestors)) as Investor[];
        const notificationsToQueue: Omit<Notification, 'id' | 'date' | 'isRead'>[] = [];
        const isFunded = targetBorrower.fundedBy && targetBorrower.fundedBy.length > 0;

        if (isFunded) {
          for (const funder of targetBorrower.fundedBy!) {
            const investorIndex = newInvestors.findIndex(i => i.id === funder.investorId);
            if (investorIndex === -1) continue;

            let investor = newInvestors[investorIndex];
            const txTag = `borrower:${targetBorrower.id}`;

            // --- 1. REVERSE previous state's financial effects ---
            if (originalPaymentStatus === 'تم السداد') {
                const principal = funder.amount;
                let profit = 0;
                if (targetBorrower.loanType === 'اقساط' && targetBorrower.rate && targetBorrower.term) {
                    const profitShare = investor.installmentProfitShare ?? currentData.investorSharePercentage;
                    const interestOnFundedAmount = funder.amount * (targetBorrower.rate / 100) * targetBorrower.term;
                    profit = interestOnFundedAmount * (profitShare / 100);
                } else if (targetBorrower.loanType === 'مهلة') {
                    const profitShare = investor.gracePeriodProfitShare ?? currentData.graceInvestorSharePercentage;
                    const totalProfitOnFundedAmount = funder.amount * (currentData.graceTotalProfitPercentage / 100);
                    profit = totalProfitOnFundedAmount * (profitShare / 100);
                }
                const totalReturn = principal + profit;

                if (targetBorrower.loanType === 'اقساط') investor.installmentCapital -= totalReturn;
                else investor.gracePeriodCapital -= totalReturn;
                investor.transactionHistory = investor.transactionHistory.filter(tx => tx.meta?.tag !== txTag);
            } 
            else if (originalPaymentStatus === 'متعثر' || originalPaymentStatus === 'تم اتخاذ الاجراءات القانونيه') {
                const defaultAmount = funder.amount; 
                investor.defaultedFunds = (investor.defaultedFunds || 0) - defaultAmount;
                if (targetBorrower.loanType === 'اقساط') investor.installmentCapital += defaultAmount;
                else investor.gracePeriodCapital += defaultAmount;
                investor.transactionHistory = investor.transactionHistory.filter(tx => tx.meta?.tag !== txTag);
            }

            // --- 2. APPLY new state's financial effects ---
            if (newPaymentStatus === 'تم السداد') {
                const principal = funder.amount;
                let profit = 0;
                if (targetBorrower.loanType === 'اقساط' && targetBorrower.rate && targetBorrower.term) {
                    const profitShare = investor.installmentProfitShare ?? currentData.investorSharePercentage;
                    const interestOnFundedAmount = funder.amount * (targetBorrower.rate / 100) * targetBorrower.term;
                    profit = interestOnFundedAmount * (profitShare / 100);
                } else if (targetBorrower.loanType === 'مهلة') {
                    const profitShare = investor.gracePeriodProfitShare ?? currentData.graceInvestorSharePercentage;
                    const totalProfitOnFundedAmount = funder.amount * (currentData.graceTotalProfitPercentage / 100);
                    profit = totalProfitOnFundedAmount * (profitShare / 100);
                }
                
                if (targetBorrower.loanType === 'اقساط') investor.installmentCapital += (principal + profit);
                else investor.gracePeriodCapital += (principal + profit);

                if (principal > 0) investor.transactionHistory.push({ id: `tx_${crypto.randomUUID()}`, date: new Date().toISOString(), type: 'إيداع رأس المال', amount: principal, description: `استعادة رأس مال من قرض "${targetBorrower.name}"`, capitalSource: targetBorrower.loanType, meta: { tag: txTag } });
                if (profit > 0) investor.transactionHistory.push({ id: `tx_${crypto.randomUUID()}`, date: new Date().toISOString(), type: 'إيداع أرباح', amount: profit, description: `أرباح من قرض "${targetBorrower.name}"`, capitalSource: targetBorrower.loanType, meta: { tag: txTag } });
                notificationsToQueue.push({ recipientId: investor.id, title: 'أرباح محققة', description: `تم سداد قرض "${targetBorrower.name}" بالكامل.` });
            } 
            else if (newPaymentStatus === 'متعثر' || newPaymentStatus === 'تم اتخاذ الاجراءات القانونيه') {
                const funderAmount = funder.amount;
                if (targetBorrower.loanType === 'اقساط') investor.installmentCapital -= funderAmount;
                else investor.gracePeriodCapital -= funderAmount;
                investor.defaultedFunds = (investor.defaultedFunds || 0) + funderAmount;
                investor.transactionHistory.push({ id: `tx_${crypto.randomUUID()}`, date: new Date().toISOString(), type: 'سحب من رأس المال', amount: funderAmount, description: `تحويل رأس مال إلى متعثر بسبب قرض "${targetBorrower.name}"`, capitalSource: targetBorrower.loanType, meta: { tag: txTag } });
                notificationsToQueue.push({ recipientId: investor.id, title: 'تنبيه: تعثر قرض', description: `القرض الخاص بالعميل "${targetBorrower.name}" قد تعثر.` });
            }
          }
        }
        
        const newBorrowers = [...originalBorrowers];
        newBorrowers[targetBorrowerIndex] = { ...targetBorrower, paymentStatus: newPaymentStatus, lastStatusChange: new Date().toISOString() };
        
        let finalNotifications = currentData.notifications;
        if(notificationsToQueue.length > 0) {
            finalNotifications = [...notificationsToQueue.map(n => ({...n, id: `notif_${crypto.randomUUID()}`, date: new Date().toISOString(), isRead: false })), ...currentData.notifications];
        }

        const toastMessage = newPaymentStatus ? `تم تحديث حالة القرض إلى "${newPaymentStatus}".` : `تمت إزالة حالة السداد للقرض.`;
        toast({ title: 'اكتمل تحديث حالة السداد', description: toastMessage });
  
        return {
          ...currentData,
          borrowers: newBorrowers,
          investors: newInvestors,
          notifications: finalNotifications,
        };
      });
    },
    [toast]
  );
  
  const approveBorrower = useCallback(
    (borrowerId: string) => {
      setData(d => {
        let approvedBorrower: Borrower | null = null;
        const newBorrowers = d.borrowers.map((b) => {
          if (b.id === borrowerId) {
            approvedBorrower = { ...b, status: 'منتظم' };
            return approvedBorrower;
          }
          return b;
        });

        let newNotifications = d.notifications;
        if (approvedBorrower && approvedBorrower.submittedBy) {
            newNotifications = [{
                id: `notif_${crypto.randomUUID()}`,
                date: new Date().toISOString(),
                isRead: false,
                recipientId: approvedBorrower.submittedBy,
                title: 'تمت الموافقة على طلبك',
                description: `تمت الموافقة على طلب إضافة القرض "${approvedBorrower.name}".`,
            }, ...d.notifications];
        }
        
        toast({ title: 'تمت الموافقة على القرض' });
        return { ...d, borrowers: newBorrowers, notifications: newNotifications };
      })
    },
    [toast]
  );

  const rejectBorrower = useCallback(
    (borrowerId: string, reason: string) => {
      setData(d => {
        let rejectedBorrower: Borrower | null = null;
        const newBorrowers = d.borrowers.map((b) => {
          if (b.id === borrowerId) {
            rejectedBorrower = { ...b, status: 'مرفوض', rejectionReason: reason };
            return rejectedBorrower;
          }
          return b;
        });

        let newNotifications = d.notifications;
        if (rejectedBorrower && rejectedBorrower.submittedBy) {
          newNotifications = [{
              id: `notif_${crypto.randomUUID()}`,
              date: new Date().toISOString(),
              isRead: false,
              recipientId: rejectedBorrower.submittedBy,
              title: 'تم رفض طلبك',
              description: `تم رفض طلب إضافة القرض "${rejectedBorrower.name}". السبب: ${reason}`,
          }, ...d.notifications];
        }

        toast({ variant: 'destructive', title: 'تم رفض القرض' });
        return { ...d, borrowers: newBorrowers, notifications: newNotifications };
      });
    },
    [toast]
  );

  const deleteBorrower = useCallback((borrowerId: string) => {
    setData(d => {
        const borrowerToDelete = d.borrowers.find(b => b.id === borrowerId);
        if (!borrowerToDelete) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على القرض.' });
            return d;
        }

        const isCapitalLocked = borrowerToDelete.status === 'منتظم' 
            || borrowerToDelete.status === 'متأخر' 
            || (borrowerToDelete.paymentStatus && ['منتظم', 'متأخر بقسط', 'متأخر بقسطين'].includes(borrowerToDelete.paymentStatus));

        let newInvestors = d.investors;
        if (borrowerToDelete.fundedBy && borrowerToDelete.fundedBy.length > 0) {
            const investorsMap = new Map(d.investors.map(inv => [inv.id, { ...inv, transactionHistory: [...inv.transactionHistory], fundedLoanIds: [...inv.fundedLoanIds] }]));

            for (const funder of borrowerToDelete.fundedBy!) {
                if (investorsMap.has(funder.investorId)) {
                    const investor = investorsMap.get(funder.investorId)!;

                    if (isCapitalLocked) {
                        if (borrowerToDelete.loanType === 'اقساط') {
                            investor.installmentCapital += funder.amount;
                        } else {
                            investor.gracePeriodCapital += funder.amount;
                        }
                        
                        investor.transactionHistory.push({
                            id: `tx_del_${borrowerId}_${investor.id}_${crypto.randomUUID()}`,
                            date: new Date().toISOString(),
                            type: 'إيداع رأس المال',
                            amount: funder.amount,
                            description: `استعادة رأس مال من حذف قرض: "${borrowerToDelete.name}"`,
                            capitalSource: borrowerToDelete.loanType,
                        });
                    }

                    investor.fundedLoanIds = investor.fundedLoanIds.filter(id => id !== borrowerId);
                    investorsMap.set(investor.id, investor);
                }
            }
            newInvestors = Array.from(investorsMap.values());
        }

        const newBorrowers = d.borrowers.filter(b => b.id !== borrowerId);
        toast({
            variant: 'destructive',
            title: 'تم الحذف',
            description: `تم حذف القرض "${borrowerToDelete.name}" بنجاح.`
        });
        return { ...d, borrowers: newBorrowers, investors: newInvestors };
    });
  }, [toast]);

  const addBorrower = useCallback(
    (borrower, investorIds) => {
        setData(d => {
            const loggedInUser = d.users.find(u => u.id === userId);
            if (!loggedInUser) {
                toast({ variant: 'destructive', title: 'خطأ', description: 'يجب أن تكون مسجلاً للدخول.' });
                return d;
            }

            const isPending = borrower.status === 'معلق';
            if (!isPending && investorIds.length === 0) {
                toast({ variant: 'destructive', title: 'خطأ في التمويل', description: 'يجب اختيار مستثمر واحد على الأقل لتمويل قرض نشط.' });
                return d;
            }

            const loanAmount = borrower.amount;
            const newId = `bor_${Date.now()}`;
            const fundedByDetails: { investorId: string; amount: number }[] = [];
            let remainingAmountToFund = loanAmount;
            
            const newInvestors = d.investors.map((inv) => {
                if (isPending) return inv;
                if (investorIds.includes(inv.id) && remainingAmountToFund > 0) {
                    const availableCapital = borrower.loanType === 'اقساط' ? inv.installmentCapital : inv.gracePeriodCapital;
                    const contribution = Math.min(availableCapital, remainingAmountToFund);
                    if (contribution > 0) {
                        remainingAmountToFund -= contribution;
                        fundedByDetails.push({ investorId: inv.id, amount: contribution });
                        
                        const updatedInv = {...inv};
                        if (borrower.loanType === 'اقساط') {
                            updatedInv.installmentCapital -= contribution;
                        } else {
                            updatedInv.gracePeriodCapital -= contribution;
                        }
                        updatedInv.fundedLoanIds = [...inv.fundedLoanIds, newId];
                        return updatedInv;
                    }
                }
                return inv;
            });

            const newEntry: Borrower = {
                ...borrower,
                id: newId,
                date: new Date().toISOString(),
                submittedBy: loggedInUser.id,
                fundedBy: fundedByDetails,
                isNotified: false,
                installments: borrower.loanType === 'اقساط' && borrower.term > 0
                ? Array.from({ length: borrower.term * 12 }, (_, i) => ({ month: i + 1, status: 'لم يسدد بعد' }))
                : undefined,
            };

            const newBorrowers = [...d.borrowers, newEntry];

            let newNotifications = d.notifications;
            const notificationsToQueue: Omit<Notification, 'id' | 'date' | 'isRead'>[] = [];
            if (fundedByDetails.length > 0) {
                fundedByDetails.forEach(funder => {
                    notificationsToQueue.push({
                        recipientId: funder.investorId,
                        title: 'تم استثمار أموالك',
                        description: `تم استثمار مبلغ ${formatCurrency(funder.amount)} من رصيدك في قرض جديد للعميل "${borrower.name}".`,
                    });
                });
            }
            if (isPending && loggedInUser?.managedBy) {
                notificationsToQueue.push({
                    recipientId: loggedInUser.managedBy,
                    title: 'طلب قرض جديد معلق',
                    description: `قدم الموظف "${loggedInUser.name}" طلبًا لإضافة القرض "${borrower.name}".`,
                });
            }
            if(notificationsToQueue.length > 0) {
                newNotifications = [...notificationsToQueue.map(n => ({...n, id: `notif_${crypto.randomUUID()}`, date: new Date().toISOString(), isRead: false})), ...d.notifications];
            }

            toast({ title: 'تمت إضافة القرض بنجاح' });
            return { ...d, borrowers: newBorrowers, investors: newInvestors, notifications: newNotifications };
        });
    },
    [userId, toast]
  );
  
  const updateInstallmentStatus = useCallback((borrowerId: string, month: number, status: InstallmentStatus) => {
      setData(d => ({
        ...d,
        borrowers: d.borrowers.map(borrower => {
            if (borrower.id === borrowerId) {
                const numberOfPayments = (borrower.term || 0) * 12;
                if (borrower.loanType !== 'اقساط' || numberOfPayments === 0) return borrower;

                const currentInstallments = borrower.installments || [];
                const installmentsMap = new Map(currentInstallments.map(i => [i.month, i]));
                
                const fullInstallments = Array.from({ length: numberOfPayments }, (_, i) => {
                    const monthNum = i + 1;
                    return installmentsMap.get(monthNum) || { month: monthNum, status: 'لم يسدد بعد' as InstallmentStatus };
                });

                const newInstallments = fullInstallments.map(inst => 
                    inst.month === month ? { ...inst, status } : inst
                );

                return { ...borrower, installments: newInstallments };
            }
            return borrower;
        })
      }));
  }, []);

  const updateInvestor = useCallback(
    (updatedInvestor: UpdatableInvestor) => {
      setData(d => ({...d, investors: d.investors.map((i) =>
        i.id === updatedInvestor.id ? { ...i, ...updatedInvestor } : i
      )}));
      toast({ title: 'تم تحديث المستثمر' });
    },
    [toast]
  );

  const approveInvestor = useCallback(
    (investorId: string) => {
      setData(d => {
        let approvedInvestor: Investor | null = null;
        const newInvestors = d.investors.map((i) => {
          if (i.id === investorId) {
            approvedInvestor = { ...i, status: 'نشط' };
            return approvedInvestor;
          }
          return i;
        });

        const newUsers = d.users.map((u) => (u.id === investorId ? { ...u, status: 'نشط' } : u));
        
        let newNotifications = d.notifications;
        if (approvedInvestor && approvedInvestor.submittedBy) {
            newNotifications = [{
                id: `notif_${crypto.randomUUID()}`,
                date: new Date().toISOString(),
                isRead: false,
                recipientId: approvedInvestor.submittedBy,
                title: 'تمت الموافقة على طلبك',
                description: `تمت الموافقة على طلب إضافة المستثمر "${approvedInvestor.name}".`,
            }, ...d.notifications];
        }

        toast({ title: 'تمت الموافقة على المستثمر' });
        return {...d, investors: newInvestors, users: newUsers, notifications: newNotifications};
      });
    },
    [toast]
  );

  const rejectInvestor = useCallback(
    (investorId: string, reason: string) => {
      setData(d => {
        let rejectedInvestor: Investor | null = null;
        const newInvestors = d.investors.map((i) => {
          if (i.id === investorId) {
            rejectedInvestor = { ...i, status: 'مرفوض', rejectionReason: reason };
            return rejectedInvestor;
          }
          return i;
        });
        
        const newUsers = d.users.map((u) => (u.id === investorId ? { ...u, status: 'مرفوض' } : u));
        
        let newNotifications = d.notifications;
        if (rejectedInvestor && rejectedInvestor.submittedBy) {
            newNotifications = [{
                id: `notif_${crypto.randomUUID()}`,
                date: new Date().toISOString(),
                isRead: false,
                recipientId: rejectedInvestor.submittedBy,
                title: 'تم رفض طلبك',
                description: `تم رفض طلب إضافة المستثمر "${rejectedInvestor.name}". السبب: ${reason}`,
            }, ...d.notifications];
        }

        toast({ variant: 'destructive', title: 'تم رفض المستثمر' });
        return {...d, investors: newInvestors, users: newUsers, notifications: newNotifications};
      });
    },
    [toast]
  );

  const addInvestor = useCallback(
    (investorPayload: NewInvestorPayload) => {
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (!loggedInUser) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول أولاً.' });
          return d;
        }
      
        if (d.users.some((u) => u.email === investorPayload.email)) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'البريد الإلكتروني مستخدم بالفعل.' });
          return d;
        }
      
        const managerId = loggedInUser.role === 'مدير المكتب' ? loggedInUser.id : loggedInUser.managedBy;
        const manager = d.users.find(u => u.id === managerId);
      
        if (loggedInUser.role === 'مدير المكتب' || loggedInUser.role === 'مساعد مدير المكتب') {
          const investorsAddedByManager = d.investors.filter(i => {
            const investorUser = d.users.find(u => u.id === i.id);
            return investorUser?.managedBy === managerId;
          }).length;
      
          if (manager && investorsAddedByManager >= (manager.investorLimit ?? 0)) {
            toast({ variant: 'destructive', title: 'تم الوصول للحد الأقصى', description: 'لقد وصل مدير المكتب للحد الأقصى للمستثمرين.' });
            return d;
          }
        }
      
        const isDirectAdditionEnabled = manager?.allowEmployeeSubmissions ?? false;
        const status: User['status'] = (loggedInUser.role === 'موظف' && !isDirectAdditionEnabled) ? 'معلق' : 'نشط';
      
        const newId = `user_inv_${Date.now()}`;
      
        const newInvestorUser: User = {
          id: newId,
          name: investorPayload.name,
          email: investorPayload.email,
          phone: investorPayload.phone,
          password: investorPayload.password,
          role: 'مستثمر',
          status: status,
          photoURL: 'https://placehold.co/40x40.png',
          registrationDate: new Date().toISOString(),
          managedBy: managerId,
        };
      
        const newInvestorEntry: Investor = {
          id: newId,
          name: investorPayload.name,
          investmentType: investorPayload.investmentType,
          installmentCapital: investorPayload.investmentType === 'اقساط' ? investorPayload.capital : 0,
          gracePeriodCapital: investorPayload.investmentType === 'مهلة' ? investorPayload.capital : 0,
          status: status,
          date: new Date().toISOString(),
          transactionHistory: [{
            id: `tx_init_${newId}_${crypto.randomUUID()}`,
            date: new Date().toISOString(),
            type: 'إيداع رأس المال',
            amount: investorPayload.capital,
            description: 'إيداع تأسيسي للحساب',
            capitalSource: investorPayload.investmentType,
          }],
          defaultedFunds: 0,
          fundedLoanIds: [],
          submittedBy: loggedInUser.id,
          isNotified: false,
          installmentProfitShare: investorPayload.installmentProfitShare,
          gracePeriodProfitShare: investorPayload.gracePeriodProfitShare,
        };
        
        let newNotifications = d.notifications;
        if (status === 'معلق' && loggedInUser?.managedBy) {
            newNotifications = [{
                id: `notif_${crypto.randomUUID()}`,
                date: new Date().toISOString(),
                isRead: false,
                recipientId: loggedInUser.managedBy,
                title: 'طلب مستثمر جديد معلق',
                description: `قدم الموظف "${loggedInUser.name}" طلبًا لإضافة المستثمر "${newInvestorEntry.name}".`,
            }, ...d.notifications];
        }
    
        toast({ title: 'تمت إضافة المستثمر بنجاح' });
        return {
          ...d,
          users: [...d.users, newInvestorUser],
          investors: [...d.investors, newInvestorEntry],
          notifications: newNotifications
        };
      });
    },
    [userId, toast]
  );

  const addEmployee = useCallback(
    async (payload: NewUserPayload): Promise<{ success: boolean; message: string }> => {
        let result: { success: boolean, message: string } = { success: false, message: 'فشل غير متوقع.' };
        setData(d => {
            const loggedInUser = d.users.find(u => u.id === userId);
            if (!loggedInUser || loggedInUser.role !== 'مدير المكتب') {
                result = { success: false, message: 'ليس لديك الصلاحية لإضافة موظف.' };
                return d;
            }

            const myEmployees = d.users.filter((u) => u.managedBy === loggedInUser.id && u.role === 'موظف');
            if (myEmployees.length >= (loggedInUser.employeeLimit ?? 0)) {
                result = { success: false, message: 'لقد وصلت للحد الأقصى لعدد الموظفين.' };
                return d;
            }

            if (d.users.some((u) => u.email === payload.email || u.phone === payload.phone)) {
                result = { success: false, message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.' };
                return d;
            }
            if (!payload.password || payload.password.length < 6) {
                result = { success: false, message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' };
                return d;
            }

            const newId = `user_emp_${Date.now()}`;
            const newUser: User = {
                id: newId, name: payload.name, email: payload.email, phone: payload.phone, password: payload.password,
                role: 'موظف', status: 'نشط', managedBy: loggedInUser.id, photoURL: 'https://placehold.co/40x40.png', registrationDate: new Date().toISOString(),
            };
            result = { success: true, message: 'تمت إضافة الموظف بنجاح.' };
            toast({ title: 'نجاح', description: 'تمت إضافة الموظف بنجاح.' });
            return {...d, users: [...d.users, newUser] };
        });
        return result;
    },
    [userId, toast]
  );

  const addAssistant = useCallback(
    async (payload: NewUserPayload): Promise<{ success: boolean; message: string }> => {
        let result: { success: boolean, message: string } = { success: false, message: 'فشل غير متوقع.' };
        setData(d => {
            const loggedInUser = d.users.find(u => u.id === userId);
            if (!loggedInUser || loggedInUser.role !== 'مدير المكتب') {
                result = { success: false, message: 'ليس لديك الصلاحية لإضافة مساعد.' };
                return d;
            }

            const myAssistants = d.users.filter((u) => u.managedBy === loggedInUser.id && u.role === 'مساعد مدير المكتب');
            if (myAssistants.length >= (loggedInUser.assistantLimit ?? 0)) {
                result = { success: false, message: 'لقد وصلت للحد الأقصى لعدد المساعدين.' };
                return d;
            }

            if (d.users.some((u) => u.email === payload.email || u.phone === payload.phone)) {
                result = { success: false, message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.' };
                return d;
            }
            if (!payload.password || payload.password.length < 6) {
                result = { success: false, message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' };
                return d;
            }

            const newId = `user_asst_${Date.now()}`;
            const newUser: User = {
                id: newId, name: payload.name, email: payload.email, phone: payload.phone, password: payload.password,
                role: 'مساعد مدير المكتب', status: 'نشط', managedBy: loggedInUser.id, photoURL: 'https://placehold.co/40x40.png', registrationDate: new Date().toISOString(),
                permissions: { manageInvestors: false, manageBorrowers: false, importData: false, viewReports: false, manageRequests: false, useCalculator: false, accessSettings: false, manageEmployeePermissions: false, viewIdleFundsReport: false },
            };
            result = { success: true, message: 'تمت إضافة المساعد بنجاح.' };
            toast({ title: 'نجاح', description: 'تمت إضافة المساعد بنجاح.' });
            return {...d, users: [...d.users, newUser] };
        });
        return result;
    },
    [userId, toast]
  );

  const addInvestorTransaction = useCallback(
    (investorId, transaction) => {
      setData(d => {
        const newInvestors = d.investors.map((i) => {
          if (i.id === investorId) {
            const newTransaction: Transaction = {
              ...transaction,
              id: `tx_man_${investorId}_${crypto.randomUUID()}`,
            };

            const updatedInvestor = { ...i };
            const amount = newTransaction.amount;
            const capitalSource = newTransaction.capitalSource;

            if (newTransaction.type.includes('إيداع')) {
                if(capitalSource === 'installment') updatedInvestor.installmentCapital += amount;
                else if (capitalSource === 'grace') updatedInvestor.gracePeriodCapital += amount;
            } else if (newTransaction.type.includes('سحب')) {
                if (capitalSource === 'installment') {
                    if (updatedInvestor.installmentCapital < amount) {
                        toast({ variant: 'destructive', title: 'رصيد غير كافي', description: 'المبلغ المطلوب للسحب يتجاوز الرصيد المتاح في محفظة الأقساط.' });
                        return i;
                    }
                    updatedInvestor.installmentCapital -= amount;
                } else if (capitalSource === 'grace') {
                     if (updatedInvestor.gracePeriodCapital < amount) {
                        toast({ variant: 'destructive', title: 'رصيد غير كافي', description: 'المبلغ المطلوب للسحب يتجاوز الرصيد المتاح في محفظة المهلة.' });
                        return i;
                    }
                    updatedInvestor.gracePeriodCapital -= amount;
                }
            }

            updatedInvestor.transactionHistory = [...updatedInvestor.transactionHistory, newTransaction];
            return updatedInvestor;
          }
          return i;
        });

        if (JSON.stringify(newInvestors) === JSON.stringify(d.investors)) {
            return d; // No change, abort state update
        }

        const notificationTitle = transaction.type.includes('إيداع') ? 'عملية إيداع ناجحة' : 'عملية سحب ناجحة';
        const newNotifications = [{
            id: `notif_${crypto.randomUUID()}`,
            date: new Date().toISOString(), isRead: false,
            recipientId: investorId,
            title: notificationTitle,
            description: `تمت عملية "${transaction.type}" بمبلغ ${formatCurrency(transaction.amount)} بنجاح.`,
        }, ...d.notifications];
        
        toast({ title: 'تمت العملية بنجاح' });
        return {...d, investors: newInvestors, notifications: newNotifications};
      });
    },
    [toast]
  );

  const updateUserIdentity = useCallback(
    async (updates) => {
      let result: { success: boolean, message: string } = { success: false, message: 'فشل غير متوقع.' };
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (!loggedInUser) {
          result = { success: false, message: 'لم يتم العثور على المستخدم.' };
          return d;
        }
        result = { success: true, message: 'تم تحديث معلوماتك بنجاح.' };
        toast({ title: 'نجاح', description: 'تم تحديث معلوماتك بنجاح.' });
        return {
          ...d,
          users: d.users.map((u) => (u.id === loggedInUser.id ? { ...u, ...updates } : u)),
        };
      });
      return result;
    },
    [userId, toast]
  );

  const updateUserCredentials = useCallback(
    async (userIdToUpdate, updates) => {
      let result: { success: boolean, message: string } = { success: false, message: 'فشل غير متوقع.' };
      setData(d => {
        if (updates.email) {
            const emailInUse = d.users.some(
            (u) => u.email === updates.email && u.id !== userIdToUpdate
            );
            if (emailInUse) {
                result = { success: false, message: 'هذا البريد الإلكتروني مستخدم بالفعل.' };
                return d;
            }
        }
        if (updates.password && updates.password.length < 6) {
            result = { success: false, message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' };
            return d;
        }

        result = { success: true, message: 'تم تحديث بيانات الدخول بنجاح.' };
        return {
            ...d,
            users: d.users.map((u) => (u.id === userIdToUpdate ? { ...u, ...updates } : u)),
        };
      });

      if(!result.success) {
        toast({ variant: 'destructive', title: 'خطأ', description: result.message });
      } else {
        toast({ title: 'نجاح', description: result.message });
      }
      return result;
    },
    [toast]
  );

  const updateUserStatus = useCallback(
    (userIdToUpdate: string, status: User['status']) => {
      setData(d => {
        const userToUpdate = d.users.find((u) => u.id === userIdToUpdate);
        if (!userToUpdate) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
            return d;
        }

        const newUsers = d.users.map((u) => {
            if (u.id === userIdToUpdate) {
                const updatedUser: User = { ...u, status };
                if (status === 'نشط' && updatedUser.trialEndsAt) {
                delete updatedUser.trialEndsAt;
                }
                return updatedUser;
            }
            if (userToUpdate.role === 'مدير المكتب' && u.managedBy === userIdToUpdate) {
                return { ...u, status };
            }
            return u;
        });

        const isSuspending = status === 'معلق';
        let newInvestors = d.investors;
        if (userToUpdate.role === 'مدير المكتب') {
            newInvestors = d.investors.map((inv) => {
                const investorUser = d.users.find(u => u.id === inv.id);
                if (investorUser?.managedBy === userIdToUpdate) {
                if (isSuspending && inv.status === 'نشط') return { ...inv, status: 'غير نشط' };
                if (!isSuspending && inv.status === 'غير نشط') return { ...inv, status: 'نشط' };
                }
                return inv;
            });
        }
        
        let newNotifications = d.notifications;
        if (status === 'نشط' && userToUpdate.status === 'معلق') {
            newNotifications = [{
                id: `notif_${crypto.randomUUID()}`, date: new Date().toISOString(), isRead: false,
                recipientId: userIdToUpdate,
                title: 'تم تفعيل حسابك!',
                description: `مرحباً ${userToUpdate.name}، تم تفعيل حسابك. يمكنك الآن تسجيل الدخول.`,
            }, ...d.notifications]
        }

        const toastMessage = userToUpdate.role === 'مدير المكتب' && status === 'معلق'
            ? 'تم تعليق حساب المدير والحسابات المرتبطة به.'
            : 'تم تحديث حالة المستخدم بنجاح.';
        toast({ title: 'تم التحديث', description: toastMessage });

        return { ...d, users: newUsers, investors: newInvestors, notifications: newNotifications };
      });
    },
    [toast]
  );

  const updateUserRole = useCallback(
    (userIdToChange: string, newRole: UserRole) => {
      setData(d => {
        const userToChange = d.users.find((u) => u.id === userIdToChange);
        if (!userToChange) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
          return d;
        }

        if (userToChange.role === 'مدير المكتب') {
          const managedUsersCount = d.users.filter(u => u.managedBy === userIdToChange).length;
          if (managedUsersCount > 0) {
            toast({
              variant: 'destructive',
              title: 'لا يمكن تغيير الدور',
              description: `لا يمكن تغيير دور هذا المدير لأنه يدير ${managedUsersCount} مستخدمًا. يرجى حذف المستخدمين المرتبطين به أولاً.`,
            });
            return d;
          }
        }

        if (userToChange.role === 'مستثمر' || newRole === 'مستثمر') {
          toast({
            variant: 'destructive',
            title: 'لا يمكن تغيير الدور',
            description: 'لا يمكن تغيير دور المستخدم من وإلى "مستثمر" مباشرة. يرجى حذف وإعادة إنشاء المستخدم بالدور الصحيح.',
          });
          return d;
        }

        const newUsers = d.users.map((u) => {
          if (u.id === userIdToChange) {
            const updatedUser: User = { ...u, role: newRole };
            
            if (newRole === 'مدير المكتب') {
                updatedUser.investorLimit = updatedUser.investorLimit ?? 10;
                updatedUser.employeeLimit = updatedUser.employeeLimit ?? 5;
                updatedUser.assistantLimit = updatedUser.assistantLimit ?? 1;
                updatedUser.allowEmployeeSubmissions = updatedUser.allowEmployeeSubmissions ?? true;
                updatedUser.hideEmployeeInvestorFunds = updatedUser.hideEmployeeInvestorFunds ?? false;
                updatedUser.allowEmployeeLoanEdits = updatedUser.allowEmployeeLoanEdits ?? false;
                delete updatedUser.managedBy;
            } else {
                delete updatedUser.investorLimit;
                delete updatedUser.employeeLimit;
                delete updatedUser.assistantLimit;
                delete updatedUser.allowEmployeeSubmissions;
                delete updatedUser.hideEmployeeInvestorFunds;
                delete updatedUser.allowEmployeeLoanEdits;
            }
            
            if (newRole === 'مساعد مدير المكتب') {
              updatedUser.permissions = updatedUser.permissions || {};
            } else {
              delete updatedUser.permissions;
            }

            if (newRole !== 'موظف' && newRole !== 'مساعد مدير المكتب' && newRole !== 'مدير المكتب') {
                delete updatedUser.managedBy;
            }

            return updatedUser;
          }
          return u;
        });

        toast({ title: 'تم تحديث دور المستخدم بنجاح' });
        return { ...d, users: newUsers };
      });
    },
    [toast]
  );

  const updateUserLimits = useCallback(
    (userId, limits) => {
      setData(d => ({...d, users: d.users.map((u) => (u.id === userId ? { ...u, ...limits } : u))}));
      toast({ title: 'تم تحديث حدود المستخدم بنجاح.' });
    },
    [toast]
  );

  const updateManagerSettings = useCallback(
    (managerId, settings) => {
      setData(d => ({...d, users: d.users.map((u) => (u.id === managerId ? { ...u, ...settings } : u))}));
      toast({ title: 'تم تحديث إعدادات المدير بنجاح.' });
    },
    [toast]
  );

  const updateAssistantPermission = useCallback(
    (assistantId, key, value) => {
      setData(d => ({...d, users: d.users.map((u) =>
          u.id === assistantId
            ? { ...u, permissions: { ...(u.permissions || {}), [key]: value } }
            : u
        )}));
      toast({ title: 'تم تحديث صلاحية المساعد بنجاح.' });
    },
    [toast]
  );

  const deleteUser = useCallback(
    (userIdToDelete: string) => {
      setData(d => {
        const userToDelete = d.users.find((u) => u.id === userIdToDelete);
        if (!userToDelete) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
          return d;
        }
    
        let idsToDelete = new Set<string>([userIdToDelete]);
        let investorIdsToDelete = new Set<string>();
        const userMap = new Map(d.users.map(u => [u.id, u]));
    
        if (userToDelete.role === 'مدير المكتب') {
          d.users.forEach((u) => {
            if (u.managedBy === userIdToDelete) idsToDelete.add(u.id);
          });
          d.investors.forEach((i) => {
            const investorUser = userMap.get(i.id);
            if (investorUser?.managedBy === userIdToDelete) {
              idsToDelete.add(i.id);
              investorIdsToDelete.add(i.id);
            }
          });
        } else if (userToDelete.role === 'مستثمر') {
          investorIdsToDelete.add(userToDelete.id);
        }
    
        let newBorrowers = d.borrowers;
        if (investorIdsToDelete.size > 0) {
          newBorrowers = d.borrowers.map(borrower => {
              if (borrower.fundedBy?.some(funder => investorIdsToDelete.has(funder.investorId))) {
                return {
                  ...borrower,
                  fundedBy: borrower.fundedBy.filter(funder => !investorIdsToDelete.has(funder.investorId))
                };
              }
              return borrower;
            })
        }
    
        const newUsers = d.users.filter((u) => !idsToDelete.has(u.id));
        const newInvestors = d.investors.filter((i) => !investorIdsToDelete.has(i.id));
        
        const numDeleted = idsToDelete.size;
        const toastMessage =
          userToDelete.role === 'مدير المكتب' && numDeleted > 1
            ? `تم حذف المدير و ${numDeleted - 1} من الحسابات المرتبطة به.`
            : 'تم حذف المستخدم بنجاح.';
        toast({ variant: 'destructive', title: 'اكتمل الحذف', description: toastMessage, });

        return { ...d, users: newUsers, investors: newInvestors, borrowers: newBorrowers };
      });
    },
    [toast]
  );
  

  const requestCapitalIncrease = useCallback(
    (investorId: string) => {
      const investor = data.investors.find((i) => i.id === investorId);
      if (!investor) return;

      const systemAdmins = data.users.filter((u) => u.role === 'مدير النظام');
      systemAdmins.forEach((admin) => {
        addNotification({
          recipientId: admin.id,
          title: 'طلب زيادة رأس المال',
          description: `المستثمر "${investor.name}" يرغب بزيادة رأس ماله للاستمرار بالاستثمار.`,
        });
      });

      toast({
        title: 'تم إرسال طلبك',
        description: 'تم إعلام الإدارة برغبتك في زيادة رأس المال.',
      });
    },
    [data.investors, data.users, addNotification, toast]
  );

  const addSupportTicket = useCallback(
    (ticket) => {
        setData(d => {
            const newTicket: SupportTicket = {
                ...ticket, id: `ticket_${Date.now()}`, date: new Date().toISOString(),
                isRead: false, isReplied: false,
            };

            let newNotifications = d.notifications;
            const systemAdmin = d.users.find((u) => u.role === 'مدير النظام');
            if (systemAdmin) {
                newNotifications = [{
                    id: `notif_${crypto.randomUUID()}`, date: new Date().toISOString(), isRead: false,
                    recipientId: systemAdmin.id,
                    title: 'طلب دعم جديد',
                    description: `رسالة جديدة من ${ticket.fromUserName} بخصوص: ${ticket.subject}`,
                }, ...d.notifications];
            }
            toast({
                title: 'تم إرسال طلب الدعم بنجاح',
                description: 'سيقوم مدير النظام بمراجعة طلبك في أقرب وقت.',
            });
            return { ...d, supportTickets: [newTicket, ...d.supportTickets], notifications: newNotifications };
        });
    },
    [toast]
  );

  const deleteSupportTicket = useCallback(
    (ticketId: string) => {
      setData(d => ({ ...d, supportTickets: d.supportTickets.filter((t) => t.id !== ticketId) }));
      toast({
        variant: 'destructive',
        title: 'تم حذف الرسالة',
        description: 'تم حذف رسالة الدعم بنجاح.',
      });
    },
    [toast]
  );

  const replyToSupportTicket = useCallback((ticketId: string, replyMessage: string) => {
    setData(d => {
        let repliedTicket: SupportTicket | null = null;

        const newSupportTickets = d.supportTickets.map(ticket => {
            if (ticket.id === ticketId) {
                repliedTicket = { ...ticket, isReplied: true, isRead: true };
                return repliedTicket;
            }
            return ticket;
        });

        if (repliedTicket) {
            const newNotifications = [{
                id: `notif_${crypto.randomUUID()}`, date: new Date().toISOString(), isRead: false,
                recipientId: repliedTicket.fromUserId,
                title: `رد على رسالتك: "${repliedTicket.subject}"`,
                description: replyMessage,
            }, ...d.notifications];

            toast({
                title: 'تم إرسال الرد بنجاح',
                description: `تم إرسال ردك إلى repliedTicket.fromUserName.`,
            });
            return { ...d, supportTickets: newSupportTickets, notifications: newNotifications };
        }
        return d;
    });
  }, [toast]);
  
  const markBorrowerAsNotified = useCallback((borrowerId: string, message: string) => {
      setData(d => ({...d, borrowers: d.borrowers.map(b => b.id === borrowerId ? { ...b, isNotified: true } : b)}));
      toast({ title: "تم إرسال الرسالة بنجاح", description: "تم تحديث حالة تبليغ العميل." });
  }, [toast]);

  const markInvestorAsNotified = useCallback((investorId: string, message: string) => {
      setData(d => ({...d, investors: d.investors.map(i => i.id === investorId ? { ...i, isNotified: true } : i)}));
      toast({ title: "تم إرسال الرسالة بنجاح", description: "تم تحديث حالة تبليغ المستثمر." });
  }, [toast]);

  const actions: DataActions = useMemo(
    () => ({
      updateSupportInfo,
      updateBaseInterestRate,
      updateInvestorSharePercentage,
      updateSalaryRepaymentPercentage,
      updateGraceTotalProfitPercentage,
      updateGraceInvestorSharePercentage,
      updateTrialPeriod,
      addSupportTicket,
      deleteSupportTicket,
      replyToSupportTicket,
      registerNewOfficeManager,
      addBorrower,
      updateBorrower,
      updateBorrowerPaymentStatus,
      updateInstallmentStatus,
      approveBorrower,
      rejectBorrower,
      deleteBorrower,
      addInvestor,
      addEmployee,
      addAssistant,
      updateInvestor,
      approveInvestor,
      rejectInvestor,
      addInvestorTransaction,
      updateUserIdentity,
      updateUserCredentials,
      updateUserStatus,
      updateUserRole,
      updateUserLimits,
      updateManagerSettings,
      updateAssistantPermission,
      requestCapitalIncrease,
      deleteUser,
      clearUserNotifications,
      markUserNotificationsAsRead,
      markBorrowerAsNotified,
      markInvestorAsNotified,
    }),
    [
      updateSupportInfo,
      updateBaseInterestRate,
      updateInvestorSharePercentage,
      updateSalaryRepaymentPercentage,
      updateGraceTotalProfitPercentage,
      updateGraceInvestorSharePercentage,
      updateTrialPeriod,
      addSupportTicket,
      deleteSupportTicket,
      replyToSupportTicket,
      registerNewOfficeManager,
      addBorrower,
      updateBorrower,
      updateBorrowerPaymentStatus,
      updateInstallmentStatus,
      approveBorrower,
      rejectBorrower,
      deleteBorrower,
      addInvestor,
      addEmployee,
      addAssistant,
      updateInvestor,
      approveInvestor,
      rejectInvestor,
      addInvestorTransaction,
      updateUserIdentity,
      updateUserCredentials,
      updateUserStatus,
      updateUserRole,
      updateUserLimits,
      updateManagerSettings,
      updateAssistantPermission,
      requestCapitalIncrease,
      deleteUser,
      clearUserNotifications,
      markUserNotificationsAsRead,
      markBorrowerAsNotified,
      markInvestorAsNotified,
    ]
  );

  const state: DataState = useMemo(
    () => ({
      currentUser,
      ...data,
    }),
    [currentUser, data]
  );

  return (
    <DataStateContext.Provider value={state}>
      <DataActionsContext.Provider value={actions}>
        {children}
      </DataActionsContext.Provider>
    </DataStateContext.Provider>
  );
}

export function useDataState() {
  const context = useContext(DataStateContext);
  if (context === undefined) {
    throw new Error('useDataState must be used within a DataProvider');
  }
  return context;
}

export function useDataActions() {
  const context = useContext(DataActionsContext);
  if (context === undefined) {
    throw new Error('useDataActions must be used within a DataProvider');
  }
  return context;
}
