
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
  | 'isNotified'
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
  | 'isNotified'
> & { email: string; password: string };

type SignUpCredentials = {
  name: User['name'];
  email: User['email'];
  phone: User['phone'];
  password?: string;
};

// --- New Context Structure ---

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
  addSupportTicket: (
    ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead'>
  ) => void;
  registerNewOfficeManager: (
    credentials: SignUpCredentials
  ) => Promise<{ success: boolean; message: string }>;
  addBorrower: (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus' | 'isNotified'
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
  withdrawFromInvestor: (
    investorId: string,
    withdrawal: Omit<Transaction, 'id'>
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

// --- End of New Structure ---

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
  // State is now split into multiple pieces for performance.
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

  // Load from localStorage only on initial mount.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(APP_DATA_KEY);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed.users && parsed.borrowers && parsed.investors) {
            setBorrowers(parsed.borrowers);
            setInvestors(parsed.investors);
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

  // Save to localStorage whenever any piece of state changes.
  useEffect(() => {
    if (isInitialLoad) return; // Don't save on the first render
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
        id: `notif_${Date.now()}_${Math.random()}`,
        date: new Date().toISOString(),
        isRead: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    },
    []
  );

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
        investorLimit: 3,
        employeeLimit: 1,
        assistantLimit: 1,
        allowEmployeeSubmissions: true,
        hideEmployeeInvestorFunds: false,
        permissions: {},
      };

      setUsers((prev) => [...prev, newManager]);

      const systemAdmins = users.filter((u) => u.role === 'مدير النظام');
      systemAdmins.forEach((admin) => {
        addNotification({
          recipientId: admin.id,
          title: 'تسجيل مدير مكتب جديد',
          description: `المستخدم "${credentials.name}" سجل كمدير مكتب وينتظر التفعيل.`,
        });
      });

      return {
        success: true,
        message: 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.',
      };
    },
    [users, addNotification]
  );

  const updateBorrower = useCallback(
    (updatedBorrower: Borrower) => {
      setBorrowers((prev) =>
        prev.map((b) => (b.id === updatedBorrower.id ? updatedBorrower : b))
      );
      toast({ title: 'تم تحديث القرض' });
    },
    [toast]
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

        if (
          paymentStatus === 'تم السداد' &&
          borrowerToUpdate.status !== 'مسدد بالكامل'
        ) {
          const updatedBorrower = {
            ...borrowerToUpdate,
            status: 'مسدد بالكامل',
            paymentStatus,
          };

          if (updatedBorrower.fundedBy && updatedBorrower.amount > 0) {
            const installmentTotalInterest =
              updatedBorrower.rate && updatedBorrower.term
                ? updatedBorrower.amount *
                  (updatedBorrower.rate / 100) *
                  updatedBorrower.term
                : 0;
            const graceTotalProfit =
              updatedBorrower.amount * (graceTotalProfitPercentage / 100);
            const totalProfit =
              updatedBorrower.loanType === 'اقساط'
                ? installmentTotalInterest
                : graceTotalProfit;

            const investorUpdates = new Map<
              string,
              { amountToAdd: number; principal: number; profit: number }
            >();

            updatedBorrower.fundedBy.forEach((funder) => {
              const principalReturn = funder.amount;
              const loanShare = funder.amount / updatedBorrower.amount;
              const investorProfitShare =
                updatedBorrower.loanType === 'اقساط'
                  ? totalProfit * (investorSharePercentage / 100) * loanShare
                  : totalProfit * (graceInvestorSharePercentage / 100) * loanShare;

              const currentUpdate = investorUpdates.get(funder.investorId) || {
                amountToAdd: 0,
                principal: 0,
                profit: 0,
              };
              currentUpdate.amountToAdd += principalReturn + investorProfitShare;
              currentUpdate.principal += principalReturn;
              currentUpdate.profit += investorProfitShare;
              investorUpdates.set(funder.investorId, currentUpdate);

              notificationsToQueue.push({
                recipientId: funder.investorId,
                title: 'أرباح محققة',
                description: `تم سداد قرض "${updatedBorrower.name}" بالكامل. تم إضافة الأرباح ورأس المال إلى حسابك.`,
              });
            });

            setInvestors((prevInvestors) =>
              prevInvestors.map((inv) => {
                if (investorUpdates.has(inv.id)) {
                  const update = investorUpdates.get(inv.id)!;
                  const newTransactions: Transaction[] = [];

                  if (update.principal > 0)
                    newTransactions.push({
                      id: `t-principal-ret-${Date.now()}-${inv.id}`,
                      date: new Date().toISOString(),
                      type: 'إيداع رأس المال',
                      amount: update.principal,
                      description: `استعادة رأس مال من قرض "${updatedBorrower.name}"`,
                    });
                  if (update.profit > 0)
                    newTransactions.push({
                      id: `t-profit-ret-${Date.now()}-${inv.id}`,
                      date: new Date().toISOString(),
                      type: 'إيداع أرباح',
                      amount: update.profit,
                      description: `أرباح من قرض "${updatedBorrower.name}"`,
                    });

                  return {
                    ...inv,
                    amount: inv.amount + update.amountToAdd,
                    fundedLoanIds: inv.fundedLoanIds.filter(
                      (id) => id !== borrowerId
                    ),
                    transactionHistory: [
                      ...inv.transactionHistory,
                      ...newTransactions,
                    ],
                  };
                }
                return inv;
              })
            );
          }
          toastMessage = {
            title: 'تم سداد القرض بالكامل',
            description: 'تمت إعادة الأموال والأرباح للمستثمرين بنجاح.',
          };
          return prevBorrowers.map((b) =>
            b.id === borrowerId ? updatedBorrower : b
          );
        } else if (
          paymentStatus === 'متعثر' &&
          borrowerToUpdate.status !== 'متعثر'
        ) {
          const updatedBorrower = {
            ...borrowerToUpdate,
            status: 'متعثر',
            paymentStatus,
          };

          if (updatedBorrower.fundedBy) {
            const investorUpdates = new Map<string, { amountToDefault: number }>();
            updatedBorrower.fundedBy.forEach((funder) => {
              const currentUpdate = investorUpdates.get(funder.investorId) || {
                amountToDefault: 0,
              };
              currentUpdate.amountToDefault += funder.amount;
              investorUpdates.set(funder.investorId, currentUpdate);
              notificationsToQueue.push({
                recipientId: funder.investorId,
                title: 'تنبيه: تعثر قرض مرتبط',
                description: `القرض الخاص بالعميل "${updatedBorrower.name}" قد تعثر، مما قد يؤثر على استثماراتك.`,
              });
            });
            setInvestors((prevInvestors) =>
              prevInvestors.map((inv) => {
                if (investorUpdates.has(inv.id)) {
                  const update = investorUpdates.get(inv.id)!;
                  return {
                    ...inv,
                    defaultedFunds:
                      (inv.defaultedFunds || 0) + update.amountToDefault,
                    fundedLoanIds: inv.fundedLoanIds.filter(
                      (id) => id !== borrowerId
                    ),
                  };
                }
                return inv;
              })
            );
          }
          toastMessage = {
            title: 'تم تسجيل القرض كمتعثر',
            description: 'تم تحديث أموال المستثمرين المتعثرة.',
            variant: 'destructive',
          };
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
            const contribution = Math.min(inv.amount, remainingAmountToFund);
            if (contribution > 0) {
              remainingAmountToFund -= contribution;
              fundedByDetails.push({ investorId: inv.id, amount: contribution });
              return {
                ...inv,
                amount: inv.amount - contribution,
                fundedLoanIds: [...inv.fundedLoanIds, newId],
              };
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
      };

      setBorrowers((prev) => [...prev, newEntry]);

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

  const updateInvestor = useCallback(
    (updatedInvestor) => {
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
    (investorPayload) => {
      const loggedInUser = users.find(u => u.id === userId);
      if (!loggedInUser) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب تسجيل الدخول أولاً.',
        });
        return;
      }

      if (
        loggedInUser.role === 'مدير المكتب' ||
        (loggedInUser.role === 'مساعد مدير المكتب' &&
          loggedInUser.permissions?.manageInvestors)
      ) {
        const managerId =
          loggedInUser.role === 'مدير المكتب'
            ? loggedInUser.id
            : loggedInUser.managedBy;
        const manager = users.find((u) => u.id === managerId);
        const investorsAddedByManager = investors.filter(
          (i) => i.submittedBy === managerId
        ).length;

        if (manager && investorsAddedByManager >= (manager.investorLimit ?? 0)) {
          toast({
            variant: 'destructive',
            title: 'تم الوصول للحد الأقصى',
            description: 'لقد وصل مدير المكتب للحد الأقصى للمستثمرين.',
          });
          return;
        }
        if (!investorPayload.email || !investorPayload.password) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description:
              'الرجاء إدخال البريد الإلكتروني وكلمة المرور للمستثمر الجديد.',
          });
          return;
        }
        if (users.some((u) => u.email === investorPayload.email)) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'البريد الإلكتروني مستخدم بالفعل.',
          });
          return;
        }

        const newId = `user_inv_${Date.now()}`;
        const newInvestorUser: User = {
          id: newId,
          name: investorPayload.name,
          email: investorPayload.email,
          phone: '',
          password: investorPayload.password,
          role: 'مستثمر',
          status: 'نشط',
          photoURL: 'https://placehold.co/40x40.png',
          registrationDate: new Date().toISOString(),
          managedBy: managerId,
        };
        const newInvestorEntry: Investor = {
          id: newId,
          name: investorPayload.name,
          amount: investorPayload.amount,
          status: 'نشط',
          date: new Date().toISOString(),
          transactionHistory: [
            {
              id: `t_${Date.now()}`,
              date: new Date().toISOString(),
              type: 'إيداع رأس المال',
              amount: investorPayload.amount,
              description: 'إيداع تأسيسي للحساب',
            },
          ],
          defaultedFunds: 0,
          fundedLoanIds: [],
          submittedBy: loggedInUser.id,
          isNotified: false,
        };

        setUsers((prev) => [...prev, newInvestorUser]);
        setInvestors((prev) => [...prev, newInvestorEntry]);
        toast({
          title: 'تمت إضافة المستثمر والمستخدم المرتبط به بنجاح.',
        });
      } else {
        const newEntry: Investor = {
          ...investorPayload,
          id: `inv_${Date.now()}`,
          date: new Date().toISOString(),
          transactionHistory: [
            {
              id: `t_${Date.now()}`,
              date: new Date().toISOString(),
              type: 'إيداع رأس المال',
              amount: investorPayload.amount,
              description: 'إيداع تأسيسي للحساب',
            },
          ],
          defaultedFunds: 0,
          fundedLoanIds: [],
          submittedBy: loggedInUser.id,
          isNotified: false,
        };

        setInvestors((prev) => [...prev, newEntry]);

        if (newEntry.status === 'معلق' && loggedInUser?.managedBy) {
          addNotification({
            recipientId: loggedInUser.managedBy,
            title: 'طلب مستثمر جديد معلق',
            description: `قدم الموظف "${loggedInUser.name}" طلبًا لإضافة المستثمر "${newEntry.name}".`,
          });
        }
        toast({ title: 'تمت إضافة المستثمر بنجاح.' });
      }
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

  const withdrawFromInvestor = useCallback(
    (investorId, withdrawal) => {
      setInvestors((prev) =>
        prev.map((i) => {
          if (i.id === investorId) {
            const newTransaction: Transaction = {
              ...withdrawal,
              id: `t_${Date.now()}`,
            };
            return {
              ...i,
              amount: i.amount - newTransaction.amount,
              transactionHistory: [...i.transactionHistory, newTransaction],
            };
          }
          return i;
        })
      );
      addNotification({
        recipientId: investorId,
        title: 'عملية سحب ناجحة',
        description: `تم سحب مبلغ ${formatCurrency(
          withdrawal.amount
        )} من حسابك.`,
      });
      toast({ title: 'تمت عملية السحب بنجاح' });
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
    (userId: string, status: User['status']) => {
      let toastMessage = `تم تحديث حالة المستخدم.`;
      const userToUpdate = users.find((u) => u.id === userId);
      if (!userToUpdate) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'لم يتم العثور على المستخدم.',
        });
        return;
      }

      const isSuspending = status === 'معلق';

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.id === userId) return { ...u, status };
          if (userToUpdate.role === 'مدير المكتب' && u.managedBy === userId)
            return { ...u, status };
          return u;
        })
      );

      if (userToUpdate.role === 'مدير المكتب') {
        setInvestors((prevInvestors) =>
          prevInvestors.map((inv) => {
            if (inv.submittedBy === userId) {
              if (isSuspending && inv.status === 'نشط')
                return { ...inv, status: 'غير نشط' };
              if (!isSuspending && inv.status === 'غير نشط')
                return { ...inv, status: 'نشط' };
            }
            return inv;
          })
        );
      }

      if (
        status === 'نشط' &&
        userToUpdate.status === 'معلق' &&
        userToUpdate.role === 'مدير المكتب'
      ) {
        addNotification({
          recipientId: userId,
          title: 'تم تفعيل حسابك!',
          description: `مرحباً ${userToUpdate.name}، تم تفعيل حسابك كمدير مكتب. يمكنك الآن تسجيل الدخول.`,
        });
      }

      toastMessage =
        userToUpdate.role === 'مدير المكتب' && isSuspending
          ? 'تم تعليق حساب المدير والحسابات المرتبطة به.'
          : 'تم تفعيل حساب المدير والحسابات المرتبطة به.';
      toast({ title: 'تم التحديث', description: toastMessage });
    },
    [users, addNotification, toast]
  );

  const updateUserRole = useCallback(
    (userId: string, role: UserRole) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            const updatedUser = { ...u, role };
            if (role === 'مستثمر' || role === 'مدير النظام') {
              delete updatedUser.managedBy;
              delete updatedUser.permissions;
            }
            if (role !== 'مدير المكتب') {
              delete updatedUser.investorLimit;
              delete updatedUser.employeeLimit;
              delete updatedUser.assistantLimit;
              delete updatedUser.allowEmployeeSubmissions;
              delete updatedUser.hideEmployeeInvestorFunds;
            }
            if (role !== 'مساعد مدير المكتب') {
              if (updatedUser.permissions) delete updatedUser.permissions;
            } else {
              updatedUser.permissions = {};
            }
            return updatedUser;
          }
          return u;
        })
      );
      toast({ title: 'تم تحديث دور المستخدم' });
    },
    [toast]
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
    (userId: string) => {
      const userToDelete = users.find((u) => u.id === userId);
      if (!userToDelete) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'لم يتم العثور على المستخدم.',
        });
        return;
      }

      let idsToDelete = new Set<string>([userId]);
      let managerInvestorIds: Set<string> | null = null;
      if (userToDelete.role === 'مدير المكتب') {
        users.forEach((u) => {
          if (u.managedBy === userId) idsToDelete.add(u.id);
        });
        managerInvestorIds = new Set(
          investors.filter((i) => i.submittedBy === userId).map((i) => i.id)
        );
        managerInvestorIds.forEach((id) => idsToDelete.add(id));
      }
      if (userToDelete.role === 'مستثمر') {
        idsToDelete.add(userToDelete.id);
      }

      setUsers((prev) => prev.filter((u) => !idsToDelete.has(u.id)));
      if (userToDelete.role === 'مستثمر' || managerInvestorIds) {
        setInvestors((prev) => prev.filter((i) => !idsToDelete.has(i.id)));
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
      };
      setSupportTickets((prev) => [newTicket, ...prev]);
      toast({
        title: 'تم إرسال طلب الدعم بنجاح',
        description: 'سيقوم مدير النظام بمراجعة طلبك في أقرب وقت.',
      });
    },
    [toast]
  );
  
  const markBorrowerAsNotified = useCallback((borrowerId: string, message: string) => {
      setBorrowers(prev => prev.map(b => b.id === borrowerId ? { ...b, isNotified: true } : b));
      // In a real app, an SMS API would be called here with the message.
      toast({ title: "تم إرسال الرسالة بنجاح", description: "تم تحديث حالة تبليغ العميل." });
  }, [toast]);

  const markInvestorAsNotified = useCallback((investorId: string, message: string) => {
      setInvestors(prev => prev.map(i => i.id === investorId ? { ...i, isNotified: true } : i));
      // In a real app, an SMS API would be called here with the message.
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
      addSupportTicket,
      registerNewOfficeManager,
      addBorrower,
      updateBorrower,
      updateBorrowerPaymentStatus,
      approveBorrower,
      rejectBorrower,
      addInvestor,
      addEmployee,
      addAssistant,
      updateInvestor,
      approveInvestor,
      rejectInvestor,
      withdrawFromInvestor,
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
      addSupportTicket,
      registerNewOfficeManager,
      addBorrower,
      updateBorrower,
      updateBorrowerPaymentStatus,
      approveBorrower,
      rejectBorrower,
      addInvestor,
      addEmployee,
      addAssistant,
      updateInvestor,
      approveInvestor,
      rejectInvestor,
      withdrawFromInvestor,
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
