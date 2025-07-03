

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
import { calculateInvestorFinancials } from '@/services/dashboard-service';
import { isPast } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

type DataState = {
  currentUser: User | undefined;
  borrowers: Borrower[];
  investors: Investor[];
  users: User[];
  visibleUsers: User[];
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
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus'
    >,
    investorIds: string[]
  ) => Promise<{ success: boolean; message: string }>;
  updateBorrower: (borrower: Borrower) => void;
  updateBorrowerPaymentStatus: (
    borrowerId: string,
    paymentStatus?: BorrowerPaymentStatus
  ) => void;
  approveBorrower: (borrowerId: string, investorIds: string[]) => void;
  rejectBorrower: (borrowerId: string, reason: string) => void;
  deleteBorrower: (borrowerId: string) => void;
  updateInstallmentStatus: (borrowerId: string, month: number, status: InstallmentStatus) => void;
  handlePartialPayment: (borrowerId: string, paidAmount: number) => void;
  addInvestor: (investor: Omit<NewInvestorPayload, 'status'>) => Promise<{ success: boolean; message: string }>;
  addNewSubordinateUser: (payload: NewUserPayload, role: 'موظف' | 'مساعد مدير المكتب') => Promise<{ success: boolean; message: string }>;
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
  updateUserStatus: (userId: string, status: User['status']) => Promise<void>;
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

export const APP_DATA_KEY = 'appData_v_ULTIMATE_FINAL_22';

const initialDataState: Omit<DataState, 'currentUser' | 'visibleUsers'> = {
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

const sanitizeAndMigrateData = (data: any): Omit<DataState, 'currentUser' | 'visibleUsers'> => {
  const defaultUser: Partial<User> = {
    permissions: {},
    allowEmployeeLoanEdits: false,
    allowEmployeeSubmissions: false,
    hideEmployeeInvestorFunds: false,
  };
  const users = (data.users || []).map((u: any) => ({
    ...defaultUser,
    ...u,
    permissions: u.permissions || {},
  }));

  const investors = (data.investors || []).map((i: any) => {
    const newInvestor = {
      ...i,
      transactionHistory: i.transactionHistory || [],
      fundedLoanIds: i.fundedLoanIds || [],
      installmentProfitShare: i.installmentProfitShare ?? initialDataState.investorSharePercentage,
      gracePeriodProfitShare: i.gracePeriodProfitShare ?? initialDataState.graceInvestorSharePercentage,
    };
    // Clean up deprecated property
    delete newInvestor.investmentType;
    return newInvestor;
  });

  const borrowers = (data.borrowers || []).map((b: any) => ({
    ...b,
    fundedBy: b.fundedBy || [],
    installments: b.installments || [],
  }));

  return {
    ...initialDataState,
    ...data,
    users,
    investors,
    borrowers,
    notifications: data.notifications || [],
    supportTickets: data.supportTickets || [],
    salaryRepaymentPercentage: data.salaryRepaymentPercentage ?? initialDataState.salaryRepaymentPercentage,
    baseInterestRate: data.baseInterestRate ?? initialDataState.baseInterestRate,
    investorSharePercentage: data.investorSharePercentage ?? initialDataState.investorSharePercentage,
    graceTotalProfitPercentage: data.graceTotalProfitPercentage ?? initialDataState.graceTotalProfitPercentage,
    graceInvestorSharePercentage: data.graceInvestorSharePercentage ?? initialDataState.graceInvestorSharePercentage,
    supportEmail: data.supportEmail ?? initialDataState.supportEmail,
    supportPhone: data.supportPhone ?? initialDataState.supportPhone,
  };
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => {
    if (typeof window === 'undefined') {
      return initialDataState;
    }
    try {
      const item = window.localStorage.getItem(APP_DATA_KEY);
      return item ? sanitizeAndMigrateData(JSON.parse(item)) : initialDataState;
    } catch (error) {
      console.warn(`Error reading localStorage during initialization.`, error);
      return initialDataState;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn(`Error setting localStorage:`, error);
    }
  }, [data]);

  const { userId } = useAuth();
  const { toast } = useToast();

  const currentUser = useMemo(() => {
    if (!userId) return undefined;
    return data.users.find((u) => u.id === userId);
  }, [data.users, userId]);
  
  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];

    const { role, id, managedBy } = currentUser;
    const allUsers = data.users;

    switch (role) {
        case 'مدير النظام':
            return allUsers;
        case 'مدير المكتب':
            return allUsers.filter(u =>
                u.role === 'مدير النظام' || // can see admin
                u.id === id || // can see self
                u.managedBy === id // can see their team
            );
        case 'مساعد مدير المكتب':
        case 'موظف':
            if (!managedBy) return [currentUser];
            return allUsers.filter(u =>
                u.id === managedBy || // can see their manager
                u.id === id || // can see self
                u.managedBy === managedBy // can see their colleagues
            );
        case 'مستثمر':
             if (!managedBy) return [currentUser];
             return allUsers.filter(u =>
                u.id === managedBy || // can see their manager
                u.id === id // can see self
             );
        default:
            return [];
    }
  }, [currentUser, data.users]);


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
          status: 'معلق',
          photoURL: `https://placehold.co/40x40.png`,
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
        const loggedInUser = d.users.find(u => u.id === userId);
        if (!loggedInUser) return d;

        const originalBorrower = d.borrowers.find(b => b.id === updatedBorrower.id);
        if (!originalBorrower) return d;
        
        // Security check: if user is employee or assistant, do they have permission?
        if(loggedInUser.role === 'موظف') {
            const manager = d.users.find(u => u.id === loggedInUser.managedBy);
            if (!manager?.allowEmployeeLoanEdits) {
                 toast({
                    variant: 'destructive',
                    title: 'غير مصرح به',
                    description: 'ليس لديك الصلاحية لتعديل القروض.',
                 });
                 return d;
            }
        } else if (loggedInUser.role === 'مساعد مدير المكتب' && !loggedInUser.permissions?.manageBorrowers) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لتعديل القروض.' });
            return d;
        }

        if (originalBorrower.status !== 'معلق') {
            const financialFieldsChanged = updatedBorrower.amount !== originalBorrower.amount ||
                                           updatedBorrower.rate !== originalBorrower.rate ||
                                           updatedBorrower.term !== originalBorrower.term ||
                                           updatedBorrower.loanType !== originalBorrower.loanType;
            if (financialFieldsChanged) {
              toast({
                  variant: 'destructive',
                  title: 'خطأ',
                  description: 'لا يمكن تغيير البيانات المالية (المبلغ، الفائدة، المدة، نوع التمويل) لقرض نشط.',
              });
              return d;
            }
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
    [userId, toast]
  );
  
  const updateBorrowerPaymentStatus = useCallback(
    (borrowerId: string, newPaymentStatus?: BorrowerPaymentStatus) => {
      setData(d => {
        const borrower = d.borrowers.find((b) => b.id === borrowerId);
        if (!borrower) return d;
        
        if (borrower.lastStatusChange) {
            const lastChangeTime = new Date(borrower.lastStatusChange).getTime();
            const now = new Date().getTime();
            if (now - lastChangeTime < 60 * 1000) {
              toast({
                variant: 'destructive',
                title: 'الرجاء الانتظار',
                description: 'يجب الانتظار دقيقة واحدة قبل تغيير حالة هذا القرض مرة أخرى.',
              });
              return d;
            }
        }

        const newBorrowers = d.borrowers.map((b) => {
          if (b.id === borrowerId) {
            const updatedBorrower: Borrower = { 
              ...b, 
              paymentStatus: newPaymentStatus, 
              lastStatusChange: new Date().toISOString() 
            };
            
            if (newPaymentStatus === 'تم السداد') {
              updatedBorrower.paidOffDate = new Date().toISOString();
            } else {
              delete updatedBorrower.paidOffDate;
            }
            return updatedBorrower;
          }
          return b;
        });
        
        const toastMessage = newPaymentStatus ? `تم تحديث حالة القرض إلى "${newPaymentStatus}".` : `تمت إزالة حالة السداد للقرض.`;
        toast({ title: 'اكتمل تحديث حالة السداد', description: toastMessage });

        return { ...d, borrowers: newBorrowers };
      });
    },
    [toast]
  );
  
  const approveBorrower = useCallback(
    (borrowerId: string, investorIds: string[]) => {
      setData(d => {
        const loanToApprove = d.borrowers.find((b) => b.id === borrowerId);
        if (!loanToApprove) return d;

        const fundedByDetails: { investorId: string; amount: number }[] = [];
        let remainingAmountToFund = loanToApprove.amount;
        let newInvestorsData = [...d.investors]; 
        const updatedInvestorsMap = new Map(newInvestorsData.map(inv => [inv.id, {...inv, fundedLoanIds: [...(inv.fundedLoanIds || [])]}])); 
        let totalFundedAmount = 0;

        for (const invId of investorIds) {
            if (remainingAmountToFund <= 0) break;
            
            const currentInvestorState = updatedInvestorsMap.get(invId);
            if (!currentInvestorState) continue;
            
            const financials = calculateInvestorFinancials(currentInvestorState, d.borrowers);
            const availableCapital = loanToApprove.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
            
            const contribution = Math.min(availableCapital, remainingAmountToFund);
            if (contribution > 0) {
                remainingAmountToFund -= contribution;
                totalFundedAmount += contribution;
                fundedByDetails.push({ investorId: invId, amount: contribution });
                
                if (currentInvestorState.fundedLoanIds) {
                   currentInvestorState.fundedLoanIds.push(loanToApprove.id);
                } else {
                   currentInvestorState.fundedLoanIds = [loanToApprove.id];
                }
                
                updatedInvestorsMap.set(invId, currentInvestorState);
            }
        }
        newInvestorsData = Array.from(updatedInvestorsMap.values());
        
        let approvedBorrower: Borrower | null = null;
        const newBorrowers = d.borrowers.map((b) => {
          if (b.id === borrowerId) {
            approvedBorrower = { 
                ...b, 
                status: 'منتظم', 
                fundedBy: fundedByDetails,
                amount: totalFundedAmount,
            };
            return approvedBorrower;
          }
          return b;
        });

        let newNotifications = d.notifications;
        if (approvedBorrower) {
            const notificationsToQueue: Omit<Notification, 'id' | 'date' | 'isRead'>[] = [];
            if (approvedBorrower.submittedBy) {
                notificationsToQueue.push({
                    recipientId: approvedBorrower.submittedBy,
                    title: 'تمت الموافقة على طلبك',
                    description: `تمت الموافقة على طلب إضافة القرض "${approvedBorrower.name}".`,
                });
            }
            if (fundedByDetails.length > 0) {
                fundedByDetails.forEach(funder => {
                    notificationsToQueue.push({
                        recipientId: funder.investorId,
                        title: 'تم استثمار أموالك',
                        description: `تم استثمار مبلغ ${formatCurrency(funder.amount)} من رصيدك في قرض جديد للعميل "${loanToApprove.name}".`,
                    });
                });
            }
            if(notificationsToQueue.length > 0) {
                newNotifications = [...notificationsToQueue.map(n => ({...n, id: `notif_${crypto.randomUUID()}`, date: new Date().toISOString(), isRead: false})), ...d.notifications];
            }
        }
        
        toast({ title: 'تمت الموافقة على القرض بنجاح' });
        return { ...d, borrowers: newBorrowers, investors: newInvestorsData, notifications: newNotifications };
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

        if (borrowerToDelete.status !== 'معلق' && borrowerToDelete.status !== 'مرفوض') {
            toast({
                variant: 'destructive',
                title: 'لا يمكن الحذف',
                description: 'لا يمكن حذف قرض تمت معالجته. يمكن حذف الطلبات المعلقة أو المرفوضة فقط.',
            });
            return d;
        }
        
        if (borrowerToDelete.fundedBy && borrowerToDelete.fundedBy.length > 0) {
             console.error(`Attempting to delete loan ${borrowerId} which is ${borrowerToDelete.status} but has funding. This should not happen.`);
        }

        const newBorrowers = d.borrowers.filter(b => b.id !== borrowerId);
        
        toast({
            title: 'تم الحذف',
            description: `تم حذف طلب القرض "${borrowerToDelete.name}" بنجاح.`
        });
        
        return { ...d, borrowers: newBorrowers };
    });
  }, [toast]);

  const addBorrower = useCallback(
    async (borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus'
    >,
    investorIds: string[]
  ): Promise<{ success: boolean; message: string }> => {
        let result: { success: boolean; message: string } = { success: false, message: 'فشل غير متوقع' };
        setData(d => {
            const loggedInUser = d.users.find(u => u.id === userId);
            if (!loggedInUser) {
                result = { success: false, message: 'يجب أن تكون مسجلاً للدخول.' };
                toast({ variant: 'destructive', title: 'خطأ', description: result.message });
                return d;
            }

            // Centralized permission check
            if (loggedInUser.role === 'موظف') {
                const manager = d.users.find(u => u.id === loggedInUser.managedBy);
                if (!manager?.allowEmployeeSubmissions) {
                    result = { success: false, message: 'ليس لديك الصلاحية لإضافة قروض.' };
                    toast({ variant: 'destructive', title: 'غير مصرح به', description: result.message });
                    return d;
                }
            } else if (loggedInUser.role === 'مساعد مدير المكتب' && !loggedInUser.permissions?.manageBorrowers) {
                result = { success: false, message: 'ليس لديك الصلاحية لإضافة قروض.' };
                toast({ variant: 'destructive', title: 'غير مصرح به', description: result.message });
                return d;
            }

            if (borrower.loanType === 'اقساط' && (!borrower.rate || borrower.rate <= 0 || !borrower.term || borrower.term <= 0)) {
                result = { success: false, message: 'قروض الأقساط يجب أن تحتوي على فائدة ومدة صحيحة.' };
                toast({ variant: 'destructive', title: 'بيانات غير مكتملة', description: result.message });
                return d;
            }

            const isPending = borrower.status === 'معلق';
            if (!isPending && investorIds.length === 0) {
                 result = { success: false, message: 'يجب اختيار مستثمر واحد على الأقل لتمويل قرض نشط.' };
                toast({ variant: 'destructive', title: 'خطأ في التمويل', description: result.message });
                return d;
            }
            
            const newId = `bor_${Date.now()}_${crypto.randomUUID()}`;
            const fundedByDetails: { investorId: string; amount: number }[] = [];
            let remainingAmountToFund = borrower.amount;
            
            let newInvestorsData = [...d.investors]; 

            if(!isPending) {
                const updatedInvestorsMap = new Map(newInvestorsData.map(inv => [inv.id, {...inv, fundedLoanIds: [...(inv.fundedLoanIds || [])]}])); 

                for (const invId of investorIds) {
                    if (remainingAmountToFund <= 0) break;
                    
                    const currentInvestorState = updatedInvestorsMap.get(invId);
                    if (!currentInvestorState) continue;
                    
                    const financials = calculateInvestorFinancials(currentInvestorState, d.borrowers);
                    const availableCapital = borrower.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
                    
                    const contribution = Math.min(availableCapital, remainingAmountToFund);
                    if (contribution > 0) {
                        remainingAmountToFund -= contribution;
                        fundedByDetails.push({ investorId: invId, amount: contribution });
                        
                        if (currentInvestorState.fundedLoanIds) {
                           currentInvestorState.fundedLoanIds.push(newId);
                        } else {
                           currentInvestorState.fundedLoanIds = [newId];
                        }
                        
                        updatedInvestorsMap.set(invId, currentInvestorState);
                    }
                }
                newInvestorsData = Array.from(updatedInvestorsMap.values());
            }

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

            result = { success: true, message: 'تمت إضافة القرض بنجاح.' };
            toast({ title: result.message });
            return { ...d, borrowers: newBorrowers, investors: newInvestorsData, notifications: newNotifications };
        });
        return result;
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

  const handlePartialPayment = useCallback((borrowerId: string, paidAmount: number) => {
    setData(d => {
        const originalBorrower = d.borrowers.find(b => b.id === borrowerId);
        if (!originalBorrower) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على القرض الأصلي.' });
            return d;
        }

        if (paidAmount <= 0 || paidAmount >= originalBorrower.amount) {
            toast({ variant: 'destructive', title: 'مبلغ غير صالح', description: 'المبلغ المسدد يجب أن يكون أكبر من صفر وأقل من إجمالي القرض.' });
            return d;
        }

        const remainingAmount = originalBorrower.amount - paidAmount;
        const newLoanId = `bor_rem_${Date.now()}`;
        
        const newRemainingLoan: Borrower = {
            id: newLoanId,
            name: `${originalBorrower.name} (مبلغ متبقٍ)`,
            phone: originalBorrower.phone,
            amount: remainingAmount,
            rate: 0,
            term: 0,
            date: new Date().toISOString(),
            loanType: 'مهلة',
            status: 'معلق',
            dueDate: new Date().toISOString().split('T')[0], // Placeholder, should be edited by manager
            submittedBy: originalBorrower.submittedBy,
            isNotified: false,
            originalLoanId: originalBorrower.id,
        };
        
        const updatedOriginalBorrower: Borrower = {
            ...originalBorrower,
            status: 'مسدد بالكامل',
            paymentStatus: 'تم السداد',
            paidOffDate: new Date().toISOString(),
            partialPayment: {
                paidAmount: paidAmount,
                remainingLoanId: newLoanId,
            }
        };

        const newBorrowers = d.borrowers.map(b => b.id === borrowerId ? updatedOriginalBorrower : b);
        newBorrowers.push(newRemainingLoan);
        
        toast({ title: 'نجاح', description: 'تم تسجيل السداد الجزئي وإنشاء طلب قرض جديد بالمبلغ المتبقي.' });

        return { ...d, borrowers: newBorrowers };
    });
  }, [toast]);

  const updateInvestor = useCallback(
    (updatedInvestor: UpdatableInvestor) => {
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (!loggedInUser) return d;
        if (loggedInUser.role === 'مساعد مدير المكتب' && !loggedInUser.permissions?.manageInvestors) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لتعديل المستثمرين.' });
            return d;
        }

        const existingInvestor = d.investors.find(i => i.id === updatedInvestor.id);
        if (!existingInvestor) return d;
        
        return ({...d, investors: d.investors.map((i) =>
            i.id === updatedInvestor.id ? { ...i, ...updatedInvestor } : i
        )})
      });
      toast({ title: 'تم تحديث المستثمر' });
    },
    [userId, toast]
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
    async (investorPayload: Omit<NewInvestorPayload, 'status'>): Promise<{ success: boolean; message: string }> => {
      let result = { success: false, message: 'فشل غير متوقع' };
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (!loggedInUser) {
          result = { success: false, message: 'يجب تسجيل الدخول أولاً.' };
          toast({ variant: 'destructive', title: 'خطأ', description: result.message });
          return d;
        }

        // Centralized permission check
        if (loggedInUser.role === 'موظف') {
            const manager = d.users.find(u => u.id === loggedInUser.managedBy);
            if (!manager?.allowEmployeeSubmissions) {
                result = { success: false, message: 'ليس لديك الصلاحية لإضافة مستثمرين.' };
                toast({ variant: 'destructive', title: 'غير مصرح به', description: result.message });
                return d;
            }
        } else if (loggedInUser.role === 'مساعد مدير المكتب' && !loggedInUser.permissions?.manageInvestors) {
            result = { success: false, message: 'ليس لديك الصلاحية لإضافة مستثمرين.' };
            toast({ variant: 'destructive', title: 'غير مصرح به', description: result.message });
            return d;
        }
      
        if (d.users.some((u) => u.email === investorPayload.email || u.phone === investorPayload.phone)) {
          result = { success: false, message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.' };
          toast({ variant: 'destructive', title: 'خطأ', description: result.message });
          return d;
        }
      
        const installmentCapital = Number(investorPayload.installmentCapital) || 0;
        const graceCapital = Number(investorPayload.graceCapital) || 0;

        if (installmentCapital <= 0 && graceCapital <= 0) {
           result = { success: false, message: 'يجب إدخال رأس مال واحد على الأقل.' };
           toast({ variant: 'destructive', title: 'خطأ', description: result.message });
           return d;
        }

        const managerId = loggedInUser.role === 'مدير المكتب' ? loggedInUser.id : loggedInUser.managedBy;
        const manager = d.users.find(u => u.id === managerId);
      
        if (manager) {
          const investorsAddedByManager = d.investors.filter(i => {
            const investorUser = d.users.find(u => u.id === i.id);
            return investorUser?.managedBy === manager.id;
          }).length;
      
          if (investorsAddedByManager >= (manager.investorLimit ?? 0)) {
            result = { success: false, message: 'لقد وصل مدير المكتب للحد الأقصى للمستثمرين.' };
            toast({ variant: 'destructive', title: 'خطأ', description: result.message });
            return d;
          }
        }
      
        if (!investorPayload.password || investorPayload.password.length < 6) {
          result = { success: false, message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' };
          toast({ variant: 'destructive', title: 'خطأ', description: result.message });
          return d;
        }

        const isDirectAdditionEnabled = manager?.allowEmployeeSubmissions ?? false;
        const status: User['status'] = (loggedInUser.role === 'موظف' && !isDirectAdditionEnabled) ? 'معلق' : 'نشط';
      
        const newId = `user_inv_${Date.now()}`;
      
        const newUser: User = {
          id: newId,
          name: investorPayload.name,
          email: investorPayload.email,
          phone: investorPayload.phone,
          password: investorPayload.password,
          role: 'مستثمر',
          status: status,
          photoURL: `https://placehold.co/40x40.png`,
          registrationDate: new Date().toISOString(),
          managedBy: managerId,
        };
        
        const transactionHistory: Transaction[] = [];

        if (installmentCapital > 0) {
            transactionHistory.push({
                id: `tx_init_inst_${newId}`,
                date: new Date().toISOString(),
                type: 'إيداع رأس المال',
                amount: installmentCapital,
                description: 'إيداع تأسيسي - محفظة الأقساط',
                capitalSource: 'installment',
            });
        }
        if (graceCapital > 0) {
             transactionHistory.push({
                id: `tx_init_grace_${newId}`,
                date: new Date().toISOString(),
                type: 'إيداع رأس المال',
                amount: graceCapital,
                description: 'إيداع تأسيسي - محفظة المهلة',
                capitalSource: 'grace',
            });
        }
      
        const newInvestorEntry: Investor = {
          id: newId,
          name: investorPayload.name,
          status: status,
          date: new Date().toISOString(),
          transactionHistory: transactionHistory,
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
    
        result = { success: true, message: 'تمت إضافة المستثمر بنجاح.' };
        toast({ title: 'تمت إضافة المستثمر بنجاح' });
        return {
          ...d,
          users: [...d.users, newUser],
          investors: [...d.investors, newInvestorEntry],
          notifications: newNotifications
        };
      });
      return result;
    },
    [userId, toast]
  );
  
  const addNewSubordinateUser = useCallback(
    async (payload: NewUserPayload, role: 'موظف' | 'مساعد مدير المكتب'): Promise<{ success: boolean, message: string }> => {
        let result: { success: boolean, message: string } = { success: false, message: 'فشل غير متوقع.' };
        setData(d => {
            const loggedInUser = d.users.find(u => u.id === userId);
            if (!loggedInUser || loggedInUser.role !== 'مدير المكتب') {
                result = { success: false, message: 'ليس لديك الصلاحية لإضافة مستخدمين.' };
                toast({ variant: 'destructive', title: 'خطأ', description: result.message });
                return d;
            }
            
            if (d.users.some((u) => u.email === payload.email || u.phone === payload.phone)) {
                result = { success: false, message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.' };
                toast({ variant: 'destructive', title: 'خطأ', description: result.message });
                return d;
            }
            if (!payload.password || payload.password.length < 6) {
                result = { success: false, message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' };
                toast({ variant: 'destructive', title: 'خطأ', description: result.message });
                return d;
            }

            const isEmployee = role === 'موظف';
            const limit = isEmployee ? loggedInUser.employeeLimit : loggedInUser.assistantLimit;
            const currentCount = d.users.filter(u => u.managedBy === loggedInUser.id && u.role === role).length;

            if (currentCount >= (limit ?? 0)) {
                result = { success: false, message: `لقد وصلت للحد الأقصى لعدد ${isEmployee ? 'الموظفين' : 'المساعدين'}.` };
                toast({ variant: 'destructive', title: 'خطأ', description: result.message });
                return d;
            }


            const newId = `user_${isEmployee ? 'emp' : 'asst'}_${Date.now()}`;
            const newUser: User = {
                id: newId, name: payload.name, email: payload.email, phone: payload.phone, password: payload.password,
                role: role, status: 'نشط', managedBy: loggedInUser.id, photoURL: `https://placehold.co/40x40.png`, registrationDate: new Date().toISOString(),
                permissions: isEmployee ? { manageInvestors: true, manageBorrowers: true } : { manageInvestors: false, manageBorrowers: false, importData: false, viewReports: false, manageRequests: false, useCalculator: false, accessSettings: false, manageEmployeePermissions: false, viewIdleFundsReport: false },
            };
            result = { success: true, message: `تمت إضافة ${isEmployee ? 'الموظف' : 'المساعد'} بنجاح.` };
            toast({ title: 'نجاح', description: result.message });
            return {...d, users: [...d.users, newUser] };
        });
        return result;
    },
    [userId, toast]
  );

  const addInvestorTransaction = useCallback(
    (investorId, transaction) => {
      setData(d => {
        const investor = d.investors.find(i => i.id === investorId);
        if (!investor) return d;
        
        if (transaction.type.includes('سحب')) {
            const financials = calculateInvestorFinancials(investor, d.borrowers);
            const availableCapital = transaction.capitalSource === 'installment' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
            if (availableCapital < transaction.amount) {
                toast({ variant: 'destructive', title: 'رصيد غير كافي', description: `المبلغ المطلوب للسحب يتجاوز الرصيد المتاح في محفظة ${transaction.capitalSource === 'installment' ? 'الأقساط' : 'المهلة'}.` });
                return d;
            }
        }

        const newInvestors = d.investors.map((i) => {
          if (i.id === investorId) {
            const newTransaction: Transaction = {
              ...transaction,
              id: `tx_man_${investorId}_${crypto.randomUUID()}`,
            };
            return { ...i, transactionHistory: [...(i.transactionHistory || []), newTransaction] };
          }
          return i;
        });
        
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

        const newUsers = d.users.map((u) => (u.id === loggedInUser.id ? { ...u, ...updates } : u));
        
        const newInvestors = d.investors.map((i) => {
          if (i.id === loggedInUser.id && updates.name) {
              return { ...i, name: updates.name };
          }
          return i;
        });

        result = { success: true, message: 'تم تحديث معلوماتك بنجاح.' };
        toast({ title: 'نجاح', description: 'تم تحديث معلوماتك بنجاح.' });
        return {
          ...d,
          users: newUsers,
          investors: newInvestors
        };
      });
      return result;
    },
    [userId, toast]
  );

  const updateUserCredentials = useCallback(
    async (userIdToUpdate: string, updates: { email?: string; password?: string }) => {
      let result: { success: boolean, message: string } = { success: false, message: 'فشل غير متوقع.' };
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (!loggedInUser) {
             result = { success: false, message: 'غير مصرح لك.' };
             return d;
        }
        const userToUpdate = d.users.find(u => u.id === userIdToUpdate);
        if (!userToUpdate) {
             result = { success: false, message: 'المستخدم المستهدف غير موجود.' };
             return d;
        }

        const isSystemAdmin = loggedInUser.role === 'مدير النظام';
        const isOfficeManager = loggedInUser.role === 'مدير المكتب';

        const canEdit = isSystemAdmin || 
                        (isOfficeManager && userToUpdate.managedBy === loggedInUser.id);
        
        if (!canEdit || userToUpdate.role === 'مدير النظام') {
            result = { success: false, message: 'ليس لديك الصلاحية لتعديل هذا المستخدم.' };
            return d;
        }


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
    [userId, toast]
  );

  const updateUserStatus = useCallback(
    async (userIdToUpdate: string, status: User['status']) => {
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        const userToUpdate = d.users.find((u) => u.id === userIdToUpdate);
        if (!loggedInUser || !userToUpdate) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
            return d;
        }

        if (userToUpdate.lastStatusChange) {
            const lastChangeTime = new Date(userToUpdate.lastStatusChange).getTime();
            const now = new Date().getTime();
            if (now - lastChangeTime < 5000) { // 5 second cooldown
                toast({
                    variant: 'destructive',
                    title: 'الرجاء الانتظار',
                    description: 'يجب الانتظار بضع ثوان قبل تغيير حالة هذا المستخدم مرة أخرى.',
                });
                return d;
            }
        }

        const canUpdate = loggedInUser.role === 'مدير النظام' ||
                          (loggedInUser.role === 'مدير المكتب' && userToUpdate.managedBy === loggedInUser.id) ||
                          (loggedInUser.role === 'مساعد مدير المكتب' && userToUpdate.managedBy === loggedInUser.managedBy && userToUpdate.role === 'موظف');

        if (!canUpdate) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لتغيير حالة هذا المستخدم.' });
            return d;
        }


        const newUsers = d.users.map((u) => {
            if (u.id === userIdToUpdate) {
                const updatedUser: User = { ...u, status, lastStatusChange: new Date().toISOString() };
                if (status === 'نشط' && updatedUser.trialEndsAt) {
                  delete updatedUser.trialEndsAt;
                }
                return updatedUser;
            }
            // If manager is being suspended/activated, do the same for their subordinates
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
    [userId, toast]
  );

  const updateUserRole = useCallback(
    (userIdToChange: string, newRole: UserRole) => {
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (loggedInUser?.role !== 'مدير النظام') {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'فقط مدير النظام يمكنه تغيير الأدوار.' });
            return d;
        }

        if (userIdToChange === loggedInUser.id) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكنك تغيير دورك الخاص.' });
          return d;
        }
        
        const userToChange = d.users.find((u) => u.id === userIdToChange);
        if (!userToChange) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
          return d;
        }

        if (userToChange.role === 'مدير النظام') {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن تغيير دور مدير نظام آخر.' });
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
    [userId, toast]
  );

  const updateUserLimits = useCallback(
    (userIdToUpdate, limits) => {
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (loggedInUser?.role !== 'مدير النظام') {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'فقط مدير النظام يمكنه تغيير الحدود.' });
            return d;
        }
        return ({...d, users: d.users.map((u) => (u.id === userIdToUpdate ? { ...u, ...limits } : u))})
      });
      toast({ title: 'تم تحديث حدود المستخدم بنجاح.' });
    },
    [userId, toast]
  );

  const updateManagerSettings = useCallback(
    (managerId, settings) => {
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (!loggedInUser || (loggedInUser.role !== 'مدير النظام' && loggedInUser.id !== managerId)) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لتغيير هذه الإعدادات.' });
            return d;
        }

        return ({...d, users: d.users.map((u) => (u.id === managerId ? { ...u, ...settings } : u))})
      });
      toast({ title: 'تم تحديث إعدادات المدير بنجاح.' });
    },
    [userId, toast]
  );

  const updateAssistantPermission = useCallback(
    (assistantId: string, key: PermissionKey, value: boolean) => {
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        if (loggedInUser?.role !== 'مدير المكتب') {
             toast({ variant: 'destructive', title: 'غير مصرح به', description: 'فقط مدير المكتب يمكنه تغيير صلاحيات المساعد.' });
             return d;
        }
        return ({...d, users: d.users.map((u) =>
          u.id === assistantId
            ? { ...u, permissions: { ...(u.permissions || {}), [key]: value } }
            : u
        )})
      });
      toast({ title: 'تم تحديث صلاحية المساعد بنجاح.' });
    },
    [userId, toast]
  );

  const deleteUser = useCallback(
    (userIdToDelete: string) => {
      setData(d => {
        const loggedInUser = d.users.find(u => u.id === userId);
        const userToDelete = d.users.find((u) => u.id === userIdToDelete);

        if (!loggedInUser || !userToDelete) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
          return d;
        }
        
        if (userToDelete.id === loggedInUser.id || userToDelete.role === 'مدير النظام') {
            toast({ variant: 'destructive', title: 'لا يمكن الحذف', description: 'لا يمكنك حذف هذا الحساب.' });
            return d;
        }

        const canDelete = loggedInUser.role === 'مدير النظام' || 
                         (loggedInUser.role === 'مدير المكتب' && userToDelete.managedBy === loggedInUser.id);
        
        if (!canDelete) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لحذف هذا المستخدم.' });
            return d;
        }
        
        let blockingReason = '';
        if (userToDelete.role === 'مدير المكتب') {
          const managedEmployees = d.users.filter(u => u.managedBy === userIdToDelete && u.role === 'موظف');
          const managedAssistants = d.users.filter(u => u.managedBy === userIdToDelete && u.role === 'مساعد مدير المكتب');
          const managedInvestors = d.investors.filter(i => {
              const invUser = d.users.find(u => u.id === i.id);
              return invUser?.managedBy === userIdToDelete;
          });

          if (managedEmployees.length > 0 || managedAssistants.length > 0) {
              blockingReason = `لا يمكن حذف هذا المدير لأنه يدير ${managedEmployees.length + managedAssistants.length} موظف/مساعد. يرجى حذفهم أولاً.`;
          } else if (managedInvestors.length > 0) {
              blockingReason = `لا يمكن حذف هذا المدير لأنه يدير ${managedInvestors.length} مستثمر. يرجى حذفهم أولاً.`;
          }
        } else if (userToDelete.role === 'مستثمر') {
            const investorData = d.investors.find(i => i.id === userIdToDelete);
            if (investorData) {
                const financials = calculateInvestorFinancials(investorData, d.borrowers);
                if (financials.totalCapitalInSystem > 0) {
                    blockingReason = `لا يمكن الحذف لوجود أرصدة (نشطة، خاملة، أو متعثرة) مرتبطة بالمستثمر "${investorData.name}". يرجى سحب جميع الأرصدة أولاً.`;
                }
            }
        } else { // Employee or Assistant
            const hasSubmittedLoans = d.borrowers.some(b => b.submittedBy === userIdToDelete);
            if (hasSubmittedLoans) {
                blockingReason = `لا يمكن الحذف لوجود قروض مرتبطة بهذا المستخدم "${userToDelete.name}".`;
            }
        }
    
        if (blockingReason) {
            toast({ variant: 'destructive', title: 'لا يمكن الحذف', description: blockingReason, duration: 5000 });
            return d;
        }
        
        const newUsers = d.users.filter((u) => u.id !== userIdToDelete);
        const newInvestors = d.investors.filter((i) => i.id !== userIdToDelete);
        const newBorrowers = d.borrowers.map(b => {
          if (b.fundedBy?.some(f => f.investorId === userIdToDelete)) {
            return {
              ...b,
              fundedBy: b.fundedBy.filter(f => f.investorId !== userIdToDelete)
            };
          }
          return b;
        });

        toast({ variant: 'destructive', title: 'اكتمل الحذف', description: `تم حذف المستخدم "${userToDelete.name}" بنجاح.` });
        return { ...d, users: newUsers, investors: newInvestors, borrowers: newBorrowers };
      });
    },
    [userId, toast]
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
                description: `تم إرسال ردك إلى ${repliedTicket.fromUserName}.`,
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
      handlePartialPayment,
      approveBorrower,
      rejectBorrower,
      deleteBorrower,
      addInvestor,
      addNewSubordinateUser,
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
      handlePartialPayment,
      approveBorrower,
      rejectBorrower,
      deleteBorrower,
      addInvestor,
      addNewSubordinateUser,
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
      visibleUsers,
      ...data,
    }),
    [currentUser, visibleUsers, data]
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
