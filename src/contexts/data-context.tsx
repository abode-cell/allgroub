

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

const APP_DATA_KEY = 'appData_cleared_v2';

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
  const [borrowers, setBorrowers] = useState<Borrower[]>(initialData.borrowers);
  const [investors, setInvestors] = useState<Investor[]>(initialData.investors);
  const [users, setUsers] = useState<User[]>(initialData.users);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(
    initialData.supportTickets
  );
  const [notifications, setNotifications] = useState<Notification[]>(
    initialData.notifications
  );
  const [salaryRepaymentPercentage, setSalaryRepaymentPercentage] =
    useState<number>(initialData.salaryRepaymentPercentage);
  const [baseInterestRate, setBaseInterestRate] = useState<number>(
    initialData.baseInterestRate
  );
  const [investorSharePercentage, setInvestorSharePercentage] =
    useState<number>(initialData.investorSharePercentage);
  const [graceTotalProfitPercentage, setGraceTotalProfitPercentage] =
    useState<number>(initialData.graceTotalProfitPercentage);
  const [graceInvestorSharePercentage, setGraceInvestorSharePercentage] =
    useState<number>(initialData.graceInvestorSharePercentage);
  const [supportEmail, setSupportEmail] = useState<string>(
    initialData.supportEmail
  );
  const [supportPhone, setSupportPhone] = useState<string>(
    initialData.supportPhone
  );

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

            setBorrowers(parsed.borrowers);
            setInvestors(migratedInvestors);
            setUsers(parsed.users);
            setSupportTickets(
              parsed.supportTickets || initialData.supportTickets
            );
            setNotifications(parsed.notifications || initialData.notifications);
            setSalaryRepaymentPercentage(
              parsed.salaryRepaymentPercentage ||
                initialData.salaryRepaymentPercentage
            );
            setBaseInterestRate(
              parsed.baseInterestRate || initialData.baseInterestRate
            );
            setInvestorSharePercentage(
              parsed.investorSharePercentage ||
                initialData.investorSharePercentage
            );
            setGraceTotalProfitPercentage(
              parsed.graceTotalProfitPercentage ||
                initialData.graceTotalProfitPercentage
            );
            setGraceInvestorSharePercentage(
              parsed.graceInvestorSharePercentage ||
                initialData.graceInvestorSharePercentage
            );
            setSupportEmail(parsed.supportEmail || initialData.supportEmail);
            setSupportPhone(parsed.supportPhone || initialData.supportPhone);
          }
        }
      } catch (error) {
        console.warn(`Error reading localStorage key “${APP_DATA_KEY}”:`, error);
      } finally {
        setIsInitialLoad(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isInitialLoad) return; 
    if (typeof window !== 'undefined') {
      try {
        const appData = {
          borrowers,
          investors,
          users,
          supportTickets,
          notifications,
          salaryRepaymentPercentage,
          baseInterestRate,
          investorSharePercentage,
          graceTotalProfitPercentage,
          graceInvestorSharePercentage,
          supportEmail,
          supportPhone,
        };
        window.localStorage.setItem(APP_DATA_KEY, JSON.stringify(appData));
      } catch (error) {
        console.warn(`Error setting localStorage key “${APP_DATA_KEY}”:`, error);
      }
    }
  }, [
    isInitialLoad,
    borrowers,
    investors,
    users,
    supportTickets,
    notifications,
    salaryRepaymentPercentage,
    baseInterestRate,
    investorSharePercentage,
    graceTotalProfitPercentage,
    graceInvestorSharePercentage,
    supportEmail,
    supportPhone,
  ]);

  const { userId } = useAuth();
  const { toast } = useToast();

  const currentUser = useMemo(() => {
    if (!userId) return undefined;
    return users.find((u) => u.id === userId);
  }, [users, userId]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif_${crypto.randomUUID()}`,
        date: new Date().toISOString(),
        isRead: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    },
    []
  );

  // Effect to simulate cron job for trial management
  useEffect(() => {
    if (isInitialLoad || cronJobRan) return;

    const today = new Date();
    let usersModified = false;
    const notificationsToAdd: Notification[] = [];
    const systemAdmin = users.find((u) => u.role === 'مدير النظام');

    const updatedUsers = users.map((user) => {
      if (
        user.role === 'مدير المكتب' &&
        user.trialEndsAt &&
        user.status === 'نشط'
      ) {
        const trialEndDate = new Date(user.trialEndsAt);
        const alreadySuspendedId = `trial-suspended-${user.id}`;
        const alreadySuspended = notifications.some(n => n.id === alreadySuspendedId);

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
          const alreadySent = notifications.some((n) => n.id === reminderId);
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

    if (usersModified) {
      setUsers(updatedUsers);
    }

    if (notificationsToAdd.length > 0) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const uniqueNewNotifications = notificationsToAdd.filter(
          (n) => !existingIds.has(n.id)
        );
        return [...uniqueNewNotifications, ...prev];
      });
    }
    setCronJobRan(true); // Run only once per session
  }, [isInitialLoad, cronJobRan, users, notifications]);


  const clearUserNotifications = useCallback(
    (userId: string) => {
      setNotifications((prev) => prev.filter((n) => n.recipientId !== userId));
      toast({ title: 'تم حذف جميع التنبيهات' });
    },
    [toast]
  );

  const markUserNotificationsAsRead = useCallback((userId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipientId === userId && !n.isRead ? { ...n, isRead: true } : n
      )
    );
  }, []);

  const updateTrialPeriod = useCallback(
    (days: number) => {
      const admin = users.find((u) => u.role === 'مدير النظام');
      if (!admin) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'لم يتم العثور على حساب مدير النظام.',
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === admin.id ? { ...u, defaultTrialPeriodDays: days } : u
        )
      );
      toast({
        title: 'تم التحديث',
        description: `تم تحديث الفترة التجريبية إلى ${days} يوم.`,
      });
    },
    [users, toast]
  );

  const updateSalaryRepaymentPercentage = useCallback(
    (percentage: number) => {
      setSalaryRepaymentPercentage(percentage);
      toast({
        title: 'تم التحديث',
        description: `تم تحديث نسبة السداد من الراتب إلى ${percentage}%.`,
      });
    },
    [toast]
  );
  const updateBaseInterestRate = useCallback(
    (rate: number) => {
      setBaseInterestRate(rate);
      toast({
        title: 'تم التحديث',
        description: `تم تحديث نسبة الربح الأساسية إلى ${rate}%.`,
      });
    },
    [toast]
  );
  const updateInvestorSharePercentage = useCallback(
    (percentage: number) => {
      setInvestorSharePercentage(percentage);
      toast({
        title: 'تم التحديث',
        description: `تم تحديث حصة المستثمر من الأرباح إلى ${percentage}%.`,
      });
    },
    [toast]
  );
  const updateGraceTotalProfitPercentage = useCallback(
    (percentage: number) => {
      setGraceTotalProfitPercentage(percentage);
      toast({
        title: 'تم التحديث',
        description: `تم تحديث نسبة الربح الإجمالية لتمويل المهلة إلى ${percentage}%.`,
      });
    },
    [toast]
  );
  const updateGraceInvestorSharePercentage = useCallback(
    (percentage: number) => {
      setGraceInvestorSharePercentage(percentage);
      toast({
        title: 'تم التحديث',
        description: `تم تحديث حصة المستثمر من أرباح المهلة إلى ${percentage}%.`,
      });
    },
    [toast]
  );

  const updateSupportInfo = useCallback(
    (info: { email?: string; phone?: string }) => {
      if (info.email) setSupportEmail(info.email);
      if (info.phone) setSupportPhone(info.phone);
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
      const existingUser = users.find(
        (u) => u.email === credentials.email || u.phone === credentials.phone
      );
      if (existingUser) {
        return {
          success: false,
          message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.',
        };
      }

      const systemAdmin = users.find((u) => u.role === 'مدير النظام');
      const trialDays = systemAdmin?.defaultTrialPeriodDays ?? 14;
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      const managerId = `user_${Date.now()}`;
      const newManager: User = {
        id: managerId,
        name: credentials.name,
        email: credentials.email,
        phone: credentials.phone,
        password: credentials.password,
        role: 'مدير المكتب',
        status: 'معلق',
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

      setUsers((prev) => [...prev, newManager]);

      if (systemAdmin) {
        addNotification({
          recipientId: systemAdmin.id,
          title: 'تسجيل مدير مكتب جديد',
          description: `المستخدم "${credentials.name}" سجل كمدير مكتب وينتظر التفعيل.`,
        });
      }

      return {
        success: true,
        message: 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.',
      };
    },
    [users, addNotification]
  );

  const updateBorrower = useCallback(
    (updatedBorrower: Borrower) => {
        const originalBorrower = borrowers.find(b => b.id === updatedBorrower.id);
        if (!originalBorrower) return;

        // Prevent changing amount of an active loan, this logic is critical for data integrity
        if (originalBorrower.status !== 'معلق' && updatedBorrower.amount !== originalBorrower.amount) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'لا يمكن تغيير مبلغ قرض نشط.',
            });
            return;
        }

        if (updatedBorrower.loanType !== originalBorrower.loanType) {
            if (updatedBorrower.loanType === 'اقساط') {
                updatedBorrower.discount = 0;
            } else {
                updatedBorrower.rate = 0;
                updatedBorrower.term = 0;
            }
        }

      setBorrowers((prev) =>
        prev.map((b) => (b.id === updatedBorrower.id ? { ...b, ...updatedBorrower} : b))
      );
      toast({ title: 'تم تحديث القرض' });
    },
    [toast, borrowers]
  );

  const updateBorrowerPaymentStatus = useCallback(
    (borrowerId: string, paymentStatus?: BorrowerPaymentStatus) => {
      let toastMessage: {
        title: string;
        description: string;
        variant?: 'destructive';
      } | null = null;
      let notificationsToQueue: Omit<
        Notification,
        'id' | 'date' | 'isRead'
      >[] = [];

      setBorrowers((prevBorrowers) => {
        const borrowerToUpdate = prevBorrowers.find((b) => b.id === borrowerId);
        if (!borrowerToUpdate) return prevBorrowers;

        if (paymentStatus) {
           const updatedBorrower = {
            ...borrowerToUpdate,
            paymentStatus,
          };

          if (updatedBorrower.fundedBy && updatedBorrower.amount > 0 && (paymentStatus === 'تم السداد' || paymentStatus === 'متعثر')) {
            
            const investorUpdates = new Map<
              string,
              { amountToChange: number; principal: number; profit: number }
            >();

            updatedBorrower.fundedBy.forEach((funder) => {
              const investorDetails = investors.find(i => i.id === funder.investorId);
              if (!investorDetails) return;

              let principalChange = funder.amount;
              let profit = 0;

              if(borrowerToUpdate.loanType === 'اقساط' && borrowerToUpdate.rate && borrowerToUpdate.term) {
                const profitShare = investorDetails.installmentProfitShare ?? investorSharePercentage;
                const interestOnFundedAmount = funder.amount * (borrowerToUpdate.rate / 100) * borrowerToUpdate.term;
                profit = interestOnFundedAmount * (profitShare / 100);
              } else if (borrowerToUpdate.loanType === 'مهلة') {
                const profitShare = investorDetails.gracePeriodProfitShare ?? graceInvestorSharePercentage;
                const totalProfitOnFundedAmount = funder.amount * (graceTotalProfitPercentage / 100);
                profit = totalProfitOnFundedAmount * (profitShare / 100);
              }
              
              const currentUpdate = investorUpdates.get(funder.investorId) || {
                amountToChange: 0,
                principal: 0,
                profit: 0,
              };

              if (paymentStatus === 'تم السداد') {
                  currentUpdate.amountToChange += principalChange + profit;
                  notificationsToQueue.push({
                    recipientId: funder.investorId,
                    title: 'أرباح محققة',
                    description: `تم سداد قرض "${updatedBorrower.name}" بالكامل. تم إضافة الأرباح ورأس المال إلى حسابك.`,
                  });
              } else { // متعثر
                  currentUpdate.amountToChange += principalChange;
                   notificationsToQueue.push({
                    recipientId: funder.investorId,
                    title: 'تنبيه: تعثر قرض مرتبط',
                    description: `القرض الخاص بالعميل "${updatedBorrower.name}" قد تعثر، مما قد يؤثر على استثماراتك.`,
                  });
              }

              currentUpdate.principal += principalChange;
              currentUpdate.profit += profit;
              investorUpdates.set(funder.investorId, currentUpdate);
            });

            setInvestors((prevInvestors) =>
              prevInvestors.map((inv) => {
                if (investorUpdates.has(inv.id)) {
                  const update = investorUpdates.get(inv.id)!;
                  const newTransactions: Transaction[] = [];

                  if (paymentStatus === 'تم السداد') {
                    if (update.principal > 0)
                      newTransactions.push({
                        id: `tx-prin-ret-${borrowerId}-${inv.id}-${crypto.randomUUID()}`,
                        date: new Date().toISOString(),
                        type: 'إيداع رأس المال',
                        amount: update.principal,
                        description: `استعادة رأس مال من قرض "${updatedBorrower.name}"`,
                      });
                    if (update.profit > 0)
                      newTransactions.push({
                        id: `tx-profit-ret-${borrowerId}-${inv.id}-${crypto.randomUUID()}`,
                        date: new Date().toISOString(),
                        type: 'إيداع أرباح',
                        amount: update.profit,
                        description: `أرباح من قرض "${updatedBorrower.name}"`,
                      });
                  }
                  
                  const updatedInv = {...inv};
                   if (paymentStatus === 'تم السداد') {
                      if (updatedBorrower.loanType === 'اقساط') {
                        updatedInv.installmentCapital += update.amountToChange;
                      } else {
                        updatedInv.gracePeriodCapital += update.amountToChange;
                      }
                   } else { // متعثر
                        updatedInv.defaultedFunds = (updatedInv.defaultedFunds || 0) + update.amountToChange;
                   }
                  
                  updatedInv.fundedLoanIds = inv.fundedLoanIds.filter(id => id !== borrowerId);
                  updatedInv.transactionHistory = [...inv.transactionHistory, ...newTransactions];

                  return updatedInv;
                }
                return inv;
              })
            );
          }
           if (paymentStatus !== 'تم السداد') {
                toastMessage = {
                  title: 'تم تحديث حالة السداد',
                  description: `تم تحديث حالة القرض إلى "${paymentStatus || 'غير محدد'}".`,
                };
            }

          return prevBorrowers.map((b) =>
            b.id === borrowerId ? updatedBorrower : b
          );
        } else {
          toastMessage = {
            title: 'تم تحديث حالة السداد',
            description: `تم تحديث حالة القرض إلى "${
              paymentStatus || 'غير محدد'
            }".`,
          };
          return prevBorrowers.map((b) =>
            b.id === borrowerId ? { ...b, paymentStatus: paymentStatus } : b
          );
        }
      });

      setTimeout(() => {
        if (toastMessage) toast(toastMessage);
        notificationsToQueue.forEach(addNotification);
      }, 0);
    },
    [
      addNotification,
      toast,
      investors,
      graceTotalProfitPercentage,
      investorSharePercentage,
      graceInvestorSharePercentage,
    ]
  );

  const approveBorrower = useCallback(
    (borrowerId: string) => {
      let approvedBorrower: Borrower | null = null;
      setBorrowers((prev) => {
        const newBorrowers = prev.map((b) => {
          if (b.id === borrowerId) {
            approvedBorrower = { ...b, status: 'منتظم' };
            return approvedBorrower;
          }
          return b;
        });
        return newBorrowers;
      });

      if (approvedBorrower && approvedBorrower.submittedBy) {
        addNotification({
          recipientId: approvedBorrower.submittedBy,
          title: 'تمت الموافقة على طلبك',
          description: `تمت الموافقة على طلب إضافة القرض "${approvedBorrower.name}".`,
        });
      }
      toast({ title: 'تمت الموافقة على القرض' });
    },
    [addNotification, toast]
  );

  const rejectBorrower = useCallback(
    (borrowerId: string, reason: string) => {
      let rejectedBorrower: Borrower | null = null;
      setBorrowers((prev) => {
        const newBorrowers = prev.map((b) => {
          if (b.id === borrowerId) {
            rejectedBorrower = { ...b, status: 'مرفوض', rejectionReason: reason };
            return rejectedBorrower;
          }
          return b;
        });
        return newBorrowers;
      });

      if (rejectedBorrower && rejectedBorrower.submittedBy) {
        addNotification({
          recipientId: rejectedBorrower.submittedBy,
          title: 'تم رفض طلبك',
          description: `تم رفض طلب إضافة القرض "${rejectedBorrower.name}". السبب: ${reason}`,
        });
      }
      toast({ variant: 'destructive', title: 'تم رفض القرض' });
    },
    [addNotification, toast]
  );

  const deleteBorrower = useCallback((borrowerId: string) => {
    const borrowerToDelete = borrowers.find(b => b.id === borrowerId);
    if (!borrowerToDelete) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على القرض.' });
        return;
    }

    const isCapitalLocked = ['منتظم', 'متأخر', 'معلق'].includes(borrowerToDelete.status);

    if (borrowerToDelete.fundedBy && borrowerToDelete.fundedBy.length > 0) {
        setInvestors(prevInvestors => {
            const investorsMap = new Map(prevInvestors.map(inv => [inv.id, { ...inv, transactionHistory: [...inv.transactionHistory], fundedLoanIds: [...inv.fundedLoanIds] }]));

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
                        });
                    }

                    investor.fundedLoanIds = investor.fundedLoanIds.filter(id => id !== borrowerId);
                    investorsMap.set(investor.id, investor);
                }
            }
            return Array.from(investorsMap.values());
        });
    }

    setBorrowers(prev => prev.filter(b => b.id !== borrowerId));

    toast({
        variant: 'destructive',
        title: 'تم الحذف',
        description: `تم حذف القرض "${borrowerToDelete.name}" بنجاح.`
    });
  }, [borrowers, investors, toast]);

  const addBorrower = useCallback(
    (borrower, investorIds) => {
      const loggedInUser = users.find(u => u.id === userId);
      if (!loggedInUser) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب أن تكون مسجلاً للدخول.',
        });
        return;
      }

      const isPending = borrower.status === 'معلق';
      if (!isPending && investorIds.length === 0) {
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
      let remainingAmountToFund = loanAmount;

      setInvestors((prevInvestors) => {
        if (isPending) return prevInvestors;
        return prevInvestors.map((inv) => {
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

      setBorrowers((prev) => [...prev, newEntry]);

      if (fundedByDetails.length > 0) {
        fundedByDetails.forEach(funder => {
          addNotification({
            recipientId: funder.investorId,
            title: 'تم استثمار أموالك',
            description: `تم استثمار مبلغ ${formatCurrency(funder.amount)} من رصيدك في قرض جديد للعميل "${borrower.name}".`,
          });
        });
      }

      if (isPending && loggedInUser?.managedBy) {
        addNotification({
          recipientId: loggedInUser.managedBy,
          title: 'طلب قرض جديد معلق',
          description: `قدم الموظف "${loggedInUser.name}" طلبًا لإضافة القرض "${borrower.name}".`,
        });
      }

      toast({ title: 'تمت إضافة القرض بنجاح' });
    },
    [userId, users, toast, addNotification]
  );
  
  const updateInstallmentStatus = useCallback((borrowerId: string, month: number, status: InstallmentStatus) => {
      setBorrowers(prev => prev.map(borrower => {
          if (borrower.id === borrowerId) {
              const numberOfPayments = (borrower.term || 0) * 12;
              if (borrower.loanType !== 'اقساط' || numberOfPayments === 0) return borrower;

              // Ensure the installments array is fully populated before updating
              const currentInstallments = borrower.installments || [];
              const installmentsMap = new Map(currentInstallments.map(i => [i.month, i]));
              
              const fullInstallments = Array.from({ length: numberOfPayments }, (_, i) => {
                  const monthNum = i + 1;
                  return installmentsMap.get(monthNum) || { month: monthNum, status: 'لم يسدد بعد' as InstallmentStatus };
              });

              // Apply the update
              const newInstallments = fullInstallments.map(inst => 
                  inst.month === month ? { ...inst, status } : inst
              );

              return { ...borrower, installments: newInstallments };
          }
          return borrower;
      }));
  }, []);

  const updateInvestor = useCallback(
    (updatedInvestor: UpdatableInvestor) => {
      setInvestors((prev) =>
        prev.map((i) =>
          i.id === updatedInvestor.id ? { ...i, ...updatedInvestor } : i
        )
      );
      toast({ title: 'تم تحديث المستثمر' });
    },
    [toast]
  );

  const approveInvestor = useCallback(
    (investorId: string) => {
      let approvedInvestor: Investor | null = null;
      setInvestors((prev) => {
        const newInvestors = prev.map((i) => {
          if (i.id === investorId) {
            approvedInvestor = { ...i, status: 'نشط' };
            return approvedInvestor;
          }
          return i;
        });
        return newInvestors;
      });

      // Also update the user status
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === investorId ? { ...u, status: 'نشط' } : u))
      );

      if (approvedInvestor && approvedInvestor.submittedBy) {
        addNotification({
          recipientId: approvedInvestor.submittedBy,
          title: 'تمت الموافقة على طلبك',
          description: `تمت الموافقة على طلب إضافة المستثمر "${approvedInvestor.name}".`,
        });
      }
      toast({ title: 'تمت الموافقة على المستثمر' });
    },
    [addNotification, toast]
  );

  const rejectInvestor = useCallback(
    (investorId: string, reason: string) => {
      let rejectedInvestor: Investor | null = null;
      setInvestors((prev) => {
        const newInvestors = prev.map((i) => {
          if (i.id === investorId) {
            rejectedInvestor = { ...i, status: 'مرفوض', rejectionReason: reason };
            return rejectedInvestor;
          }
          return i;
        });
        return newInvestors;
      });

      // Also update the user status
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === investorId ? { ...u, status: 'مرفوض' } : u))
      );

      if (rejectedInvestor && rejectedInvestor.submittedBy) {
        addNotification({
          recipientId: rejectedInvestor.submittedBy,
          title: 'تم رفض طلبك',
          description: `تم رفض طلب إضافة المستثمر "${rejectedInvestor.name}". السبب: ${reason}`,
        });
      }
      toast({ variant: 'destructive', title: 'تم رفض المستثمر' });
    },
    [addNotification, toast]
  );

  const addInvestor = useCallback(
    (investorPayload: NewInvestorPayload) => {
      const loggedInUser = users.find(u => u.id === userId);
      if (!loggedInUser) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول أولاً.' });
        return;
      }
    
      // Unified Check for existing user by email
      if (users.some((u) => u.email === investorPayload.email)) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'البريد الإلكتروني مستخدم بالفعل.' });
        return;
      }
    
      const managerId = loggedInUser.role === 'مدير المكتب' ? loggedInUser.id : loggedInUser.managedBy;
      const manager = users.find(u => u.id === managerId);
    
      // Check limits only if the user is a manager or assistant
      if (loggedInUser.role === 'مدير المكتب' || loggedInUser.role === 'مساعد مدير المكتب') {
        const investorsAddedByManager = investors.filter(i => {
          const investorUser = users.find(u => u.id === i.id);
          return investorUser?.managedBy === managerId;
        }).length;
    
        if (manager && investorsAddedByManager >= (manager.investorLimit ?? 0)) {
          toast({ variant: 'destructive', title: 'تم الوصول للحد الأقصى', description: 'لقد وصل مدير المكتب للحد الأقصى للمستثمرين.' });
          return;
        }
      }
    
      // Determine status based on role and permissions
      const isDirectAdditionEnabled = manager?.allowEmployeeSubmissions ?? false;
      const status: User['status'] = (loggedInUser.role === 'موظف' && !isDirectAdditionEnabled) ? 'معلق' : 'نشط';
    
      const newId = `user_inv_${Date.now()}`;
    
      // Create User object for the investor
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
    
      // Create Investor object
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
        }],
        defaultedFunds: 0,
        fundedLoanIds: [],
        submittedBy: loggedInUser.id,
        isNotified: false,
        installmentProfitShare: investorPayload.installmentProfitShare,
        gracePeriodProfitShare: investorPayload.gracePeriodProfitShare,
      };
    
      setUsers((prev) => [...prev, newInvestorUser]);
      setInvestors((prev) => [...prev, newInvestorEntry]);
    
      // Notifications
      if (status === 'معلق' && loggedInUser?.managedBy) {
        addNotification({
          recipientId: loggedInUser.managedBy,
          title: 'طلب مستثمر جديد معلق',
          description: `قدم الموظف "${loggedInUser.name}" طلبًا لإضافة المستثمر "${newInvestorEntry.name}".`,
        });
      }
    
      toast({ title: 'تمت إضافة المستثمر بنجاح' });
    },
    [userId, users, investors, addNotification, toast]
  );

  const addEmployee = useCallback(
    async (
      payload: NewUserPayload
    ): Promise<{ success: boolean; message: string }> => {
      const loggedInUser = users.find(u => u.id === userId);
      if (!loggedInUser || loggedInUser.role !== 'مدير المكتب')
        return { success: false, message: 'ليس لديك الصلاحية لإضافة موظف.' };

      const myEmployees = users.filter(
        (u) => u.managedBy === loggedInUser.id && u.role === 'موظف'
      );
      if (myEmployees.length >= (loggedInUser.employeeLimit ?? 0))
        return {
          success: false,
          message: 'لقد وصلت للحد الأقصى لعدد الموظفين.',
        };

      if (
        users.some((u) => u.email === payload.email || u.phone === payload.phone)
      )
        return {
          success: false,
          message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.',
        };

      if (!payload.password || payload.password.length < 6)
        return {
          success: false,
          message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        };

      const newId = `user_emp_${Date.now()}`;
      const newUser: User = {
        id: newId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        role: 'موظف',
        status: 'نشط',
        managedBy: loggedInUser.id,
        photoURL: 'https://placehold.co/40x40.png',
        registrationDate: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
      toast({ title: 'نجاح', description: 'تمت إضافة الموظف بنجاح.' });
      return { success: true, message: 'تمت إضافة الموظف بنجاح.' };
    },
    [userId, users, toast]
  );

  const addAssistant = useCallback(
    async (
      payload: NewUserPayload
    ): Promise<{ success: boolean; message: string }> => {
      const loggedInUser = users.find(u => u.id === userId);
      if (!loggedInUser || loggedInUser.role !== 'مدير المكتب')
        return { success: false, message: 'ليس لديك الصلاحية لإضافة مساعد.' };

      const myAssistants = users.filter(
        (u) => u.managedBy === loggedInUser.id && u.role === 'مساعد مدير المكتب'
      );
      if (myAssistants.length >= (loggedInUser.assistantLimit ?? 0))
        return {
          success: false,
          message: 'لقد وصلت للحد الأقصى لعدد المساعدين.',
        };

      if (
        users.some((u) => u.email === payload.email || u.phone === payload.phone)
      )
        return {
          success: false,
          message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.',
        };

      if (!payload.password || payload.password.length < 6)
        return {
          success: false,
          message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        };

      const newId = `user_asst_${Date.now()}`;
      const newUser: User = {
        id: newId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        role: 'مساعد مدير المكتب',
        status: 'نشط',
        managedBy: loggedInUser.id,
        photoURL: 'https://placehold.co/40x40.png',
        registrationDate: new Date().toISOString(),
        permissions: {
          manageInvestors: false,
          manageBorrowers: false,
          importData: false,
          viewReports: false,
          manageRequests: false,
          useCalculator: false,
          accessSettings: false,
          manageEmployeePermissions: false,
          viewIdleFundsReport: false,
        },
      };
      setUsers((prev) => [...prev, newUser]);
      toast({ title: 'نجاح', description: 'تمت إضافة المساعد بنجاح.' });
      return { success: true, message: 'تمت إضافة المساعد بنجاح.' };
    },
    [userId, users, toast]
  );

  const addInvestorTransaction = useCallback(
    (investorId, transaction) => {
      setInvestors((prev) =>
        prev.map((i) => {
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
                        return i; // Return original investor object on error
                    }
                    updatedInvestor.installmentCapital -= amount;
                } else if (capitalSource === 'grace') {
                     if (updatedInvestor.gracePeriodCapital < amount) {
                        toast({ variant: 'destructive', title: 'رصيد غير كافي', description: 'المبلغ المطلوب للسحب يتجاوز الرصيد المتاح في محفظة المهلة.' });
                        return i; // Return original investor object on error
                    }
                    updatedInvestor.gracePeriodCapital -= amount;
                }
            }

            updatedInvestor.transactionHistory = [...updatedInvestor.transactionHistory, newTransaction];
            
            const notificationTitle = newTransaction.type.includes('إيداع') ? 'عملية إيداع ناجحة' : 'عملية سحب ناجحة';
            addNotification({
              recipientId: investorId,
              title: notificationTitle,
              description: `تمت عملية "${newTransaction.type}" بمبلغ ${formatCurrency(amount)} بنجاح.`,
            });
            toast({ title: 'تمت العملية بنجاح' });
            
            return updatedInvestor;
          }
          return i;
        })
      );
    },
    [addNotification, toast]
  );

  const updateUserIdentity = useCallback(
    async (updates) => {
      const loggedInUser = users.find(u => u.id === userId);
      if (!loggedInUser)
        return { success: false, message: 'لم يتم العثور على المستخدم.' };
      setUsers((prev) =>
        prev.map((u) => (u.id === loggedInUser.id ? { ...u, ...updates } : u))
      );
      toast({ title: 'نجاح', description: 'تم تحديث معلوماتك بنجاح.' });
      return { success: true, message: 'تم تحديث معلوماتك بنجاح.' };
    },
    [userId, users, toast]
  );

  const updateUserCredentials = useCallback(
    async (userId: string, updates: { email?: string; password?: string }) => {
      if (updates.email) {
        const emailInUse = users.some(
          (u) => u.email === updates.email && u.id !== userId
        );
        if (emailInUse) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'هذا البريد الإلكتروني مستخدم بالفعل.',
          });
          return {
            success: false,
            message: 'هذا البريد الإلكتروني مستخدم بالفعل.',
          };
        }
      }
      if (updates.password && updates.password.length < 6) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        });
        return {
          success: false,
          message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        };
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
      );
      toast({ title: 'نجاح', description: 'تم تحديث بيانات الدخول بنجاح.' });
      return { success: true, message: 'تم تحديث بيانات الدخول بنجاح.' };
    },
    [users, toast]
  );

  const updateUserStatus = useCallback(
    (userIdToUpdate: string, status: User['status']) => {
      const userToUpdate = users.find((u) => u.id === userIdToUpdate);
      if (!userToUpdate) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
        return;
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.id === userIdToUpdate) {
            const updatedUser: User = { ...u, status };
            // If activating, and the user had a trial, clear the trial date to make activation permanent
            if (status === 'نشط' && updatedUser.trialEndsAt) {
              delete updatedUser.trialEndsAt;
            }
            return updatedUser;
          }
          // Cascade suspension/activation to managed users
          if (userToUpdate.role === 'مدير المكتب' && u.managedBy === userIdToUpdate) {
            return { ...u, status };
          }
          return u;
        })
      );
      
      const isSuspending = status === 'معلق';
      if (userToUpdate.role === 'مدير المكتب') {
        setInvestors((prevInvestors) =>
          prevInvestors.map((inv) => {
            const investorUser = users.find(u => u.id === inv.id);
            if (investorUser?.managedBy === userIdToUpdate) {
              if (isSuspending && inv.status === 'نشط') return { ...inv, status: 'غير نشط' };
              if (!isSuspending && inv.status === 'غير نشط') return { ...inv, status: 'نشط' };
            }
            return inv;
          })
        );
      }

      if (status === 'نشط' && userToUpdate.status === 'معلق') {
        addNotification({
          recipientId: userIdToUpdate,
          title: 'تم تفعيل حسابك!',
          description: `مرحباً ${userToUpdate.name}، تم تفعيل حسابك. يمكنك الآن تسجيل الدخول.`,
        });
      }

      const toastMessage = userToUpdate.role === 'مدير المكتب' && status === 'معلق'
        ? 'تم تعليق حساب المدير والحسابات المرتبطة به.'
        : 'تم تحديث حالة المستخدم بنجاح.';
      toast({ title: 'تم التحديث', description: toastMessage });
    },
    [users, addNotification, toast]
  );

  const updateUserRole = useCallback(
    (userIdToChange: string, newRole: UserRole) => {
      const userToChange = users.find((u) => u.id === userIdToChange);
      if (!userToChange) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
        return;
      }

      // Prevent changing the role of a manager who manages other users.
      if (userToChange.role === 'مدير المكتب') {
        const managedUsersCount = users.filter(u => u.managedBy === userIdToChange).length;
        if (managedUsersCount > 0) {
          toast({
            variant: 'destructive',
            title: 'لا يمكن تغيير الدور',
            description: `لا يمكن تغيير دور هذا المدير لأنه يدير ${managedUsersCount} مستخدمًا. يرجى حذف المستخدمين المرتبطين به أولاً.`,
          });
          return;
        }
      }

      // Prevent changing role to/from investor to maintain data integrity.
      if (userToChange.role === 'مستثمر' || newRole === 'مستثمر') {
        toast({
          variant: 'destructive',
          title: 'لا يمكن تغيير الدور',
          description: 'لا يمكن تغيير دور المستخدم من وإلى "مستثمر" مباشرة. يرجى حذف وإعادة إنشاء المستخدم بالدور الصحيح.',
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userIdToChange) {
            const updatedUser: User = { ...u, role: newRole };
            
            // Clean up fields that don't apply to the new role
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
        })
      );
      toast({ title: 'تم تحديث دور المستخدم بنجاح' });
    },
    [users, toast]
  );

  const updateUserLimits = useCallback(
    (userId, limits) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...limits } : u))
      );
      toast({ title: 'تم تحديث حدود المستخدم بنجاح.' });
    },
    [toast]
  );

  const updateManagerSettings = useCallback(
    (managerId, settings) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === managerId ? { ...u, ...settings } : u))
      );
      toast({ title: 'تم تحديث إعدادات المدير بنجاح.' });
    },
    [toast]
  );

  const updateAssistantPermission = useCallback(
    (assistantId, key, value) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === assistantId
            ? { ...u, permissions: { ...(u.permissions || {}), [key]: value } }
            : u
        )
      );
      toast({ title: 'تم تحديث صلاحية المساعد بنجاح.' });
    },
    [toast]
  );

  const deleteUser = useCallback(
    (userIdToDelete: string) => {
      const userToDelete = users.find((u) => u.id === userIdToDelete);
      if (!userToDelete) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
        return;
      }
  
      let idsToDelete = new Set<string>([userIdToDelete]);
      let investorIdsToDelete = new Set<string>();
      const userMap = new Map(users.map(u => [u.id, u]));
  
      if (userToDelete.role === 'مدير المكتب') {
        users.forEach((u) => {
          if (u.managedBy === userIdToDelete) idsToDelete.add(u.id);
        });
        investors.forEach((i) => {
          const investorUser = userMap.get(i.id);
          if (investorUser?.managedBy === userIdToDelete) {
            idsToDelete.add(i.id);
            investorIdsToDelete.add(i.id);
          }
        });
      } else if (userToDelete.role === 'مستثمر') {
        investorIdsToDelete.add(userToDelete.id);
      }
  
      // Remove dangling references from borrowers
      if (investorIdsToDelete.size > 0) {
        setBorrowers(prevBorrowers => 
          prevBorrowers.map(borrower => {
            if (borrower.fundedBy?.some(funder => investorIdsToDelete.has(funder.investorId))) {
              return {
                ...borrower,
                fundedBy: borrower.fundedBy.filter(funder => !investorIdsToDelete.has(funder.investorId))
              };
            }
            return borrower;
          })
        );
      }
  
      // Now, delete the users and investors
      setUsers((prev) => prev.filter((u) => !idsToDelete.has(u.id)));
      if (investorIdsToDelete.size > 0) {
        setInvestors((prev) => prev.filter((i) => !investorIdsToDelete.has(i.id)));
      }
  
      const numDeleted = idsToDelete.size;
      const toastMessage =
        userToDelete.role === 'مدير المكتب' && numDeleted > 1
          ? `تم حذف المدير و ${numDeleted - 1} من الحسابات المرتبطة به.`
          : 'تم حذف المستخدم بنجاح.';
      toast({
        variant: 'destructive',
        title: 'اكتمل الحذف',
        description: toastMessage,
      });
    },
    [users, investors, toast]
  );
  

  const requestCapitalIncrease = useCallback(
    (investorId: string) => {
      const investor = investors.find((i) => i.id === investorId);
      if (!investor) return;

      const systemAdmins = users.filter((u) => u.role === 'مدير النظام');
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
    [investors, users, addNotification, toast]
  );

  const addSupportTicket = useCallback(
    (ticket) => {
      const newTicket: SupportTicket = {
        ...ticket,
        id: `ticket_${Date.now()}`,
        date: new Date().toISOString(),
        isRead: false,
        isReplied: false,
      };
      setSupportTickets((prev) => [newTicket, ...prev]);

      const systemAdmin = users.find((u) => u.role === 'مدير النظام');
      if (systemAdmin) {
        addNotification({
          recipientId: systemAdmin.id,
          title: 'طلب دعم جديد',
          description: `رسالة جديدة من ${ticket.fromUserName} بخصوص: ${ticket.subject}`,
        });
      }

      toast({
        title: 'تم إرسال طلب الدعم بنجاح',
        description: 'سيقوم مدير النظام بمراجعة طلبك في أقرب وقت.',
      });
    },
    [users, addNotification, toast]
  );

  const deleteSupportTicket = useCallback(
    (ticketId: string) => {
      setSupportTickets((prev) => prev.filter((t) => t.id !== ticketId));
      toast({
        variant: 'destructive',
        title: 'تم حذف الرسالة',
        description: 'تم حذف رسالة الدعم بنجاح.',
      });
    },
    [toast]
  );

  const replyToSupportTicket = useCallback((ticketId: string, replyMessage: string) => {
    let repliedTicket: SupportTicket | null = null;

    setSupportTickets(prev => prev.map(ticket => {
        if (ticket.id === ticketId) {
            repliedTicket = { ...ticket, isReplied: true, isRead: true };
            return repliedTicket;
        }
        return ticket;
    }));

    if (repliedTicket) {
        addNotification({
            recipientId: repliedTicket.fromUserId,
            title: `رد على رسالتك: "${repliedTicket.subject}"`,
            description: replyMessage,
        });
        toast({
            title: 'تم إرسال الرد بنجاح',
            description: `تم إرسال ردك إلى ${repliedTicket.fromUserName}.`,
        });
    }
  }, [addNotification, toast]);
  
  const markBorrowerAsNotified = useCallback((borrowerId: string, message: string) => {
      setBorrowers(prev => prev.map(b => b.id === borrowerId ? { ...b, isNotified: true } : b));
      toast({ title: "تم إرسال الرسالة بنجاح", description: "تم تحديث حالة تبليغ العميل." });
  }, [toast]);

  const markInvestorAsNotified = useCallback((investorId: string, message: string) => {
      setInvestors(prev => prev.map(i => i.id === investorId ? { ...i, isNotified: true } : i));
      toast({ title: "تم إرسال الرسالة بنجاح", description: "تم تحديث حالة تبليغ المستثمر." });
  }, [toast]);

  const actions = useMemo(
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
      borrowers,
      investors,
      users,
      supportTickets,
      notifications,
      salaryRepaymentPercentage,
      baseInterestRate,
      investorSharePercentage,
      graceTotalProfitPercentage,
      graceInvestorSharePercentage,
      supportEmail,
      supportPhone,
    }),
    [
      currentUser,
      borrowers,
      investors,
      users,
      supportTickets,
      notifications,
      salaryRepaymentPercentage,
      baseInterestRate,
      investorSharePercentage,
      graceTotalProfitPercentage,
      graceInvestorSharePercentage,
      supportEmail,
      supportPhone,
    ]
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
