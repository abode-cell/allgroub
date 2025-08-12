
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
  UpdatableInvestor,
  NewInvestorPayload,
  InstallmentStatus,
  AddBorrowerResult,
  Branch,
  NewManagerPayload,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { calculateInvestorFinancials, formatCurrency } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

type DataContextValue = {
  currentUser: User | undefined;
  session: Session | null;
  authLoading: boolean;
  dataLoading: boolean;
  borrowers: Borrower[];
  investors: Investor[];
  users: User[];
  transactions: Transaction[];
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
  signIn: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
  registerNewOfficeManager: (payload: NewManagerPayload) => Promise<{ success: boolean; message: string }>;
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<{success: boolean, message: string}>;
  deleteBranch: (branchId: string) => void;
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
  addBorrower: (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'paymentStatus' | 'fundedBy'
    >,
    investorIds: string[],
    force?: boolean
  ) => Promise<AddBorrowerResult>;
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
  addNewSubordinateUser: (payload: NewUserPayload, role: 'موظف' | 'مساعد مدير المكتب') => Promise<{ success: boolean, message: string }>;
  updateInvestor: (investor: UpdatableInvestor) => void;
  approveInvestor: (investorId: string) => void;
  rejectInvestor: (investorId: string, reason: string) => void;
  addInvestorTransaction: (
    investorId: string,
    transaction: Omit<Transaction, 'id' | 'investor_id'>
  ) => void;
  updateUserIdentity: (
    updates: Partial<User>
  ) => Promise<{ success: boolean; message: string }>;
  updateUserCredentials: (
    userId: string,
    updates: { email?: string; password?: string, officeName?: string; }
  ) => Promise<{ success: boolean; message: string }>;
  updateUserStatus: (userId: string, status: User['status']) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserLimits: (
    userId: string,
    limits: { investorLimit: number; employeeLimit: number; assistantLimit: number; branchLimit: number }
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
  updateEmployeePermission: (
    employeeId: string,
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


const DataContext = createContext<DataContextValue | undefined>(undefined);

const initialDataState: Omit<DataContextValue, keyof Omit<DataContextValue, keyof any>> = {
  borrowers: [],
  investors: [],
  users: [],
  transactions: [],
  supportTickets: [],
  notifications: [],
  salaryRepaymentPercentage: 30,
  baseInterestRate: 5.5,
  investorSharePercentage: 70,
  graceTotalProfitPercentage: 30,
  graceInvestorSharePercentage: 33.3,
  supportEmail: 'qzmpty678@gmail.com',
  supportPhone: '0598360380',
};

const EnvError = () => (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ في الإعدادات</AlertTitle>
            <AlertDescription>
                <p>لم يتم العثور على متغيرات بيئة Supabase. لا يمكن للتطبيق الاتصال بقاعدة البيانات.</p>
                <p className="mt-2">الرجاء التأكد من إضافة متغيرات <code className="font-mono text-xs bg-red-100 dark:bg-red-900 p-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> و <code className="font-mono text-xs bg-red-100 dark:bg-red-900 p-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> إلى إعدادات المشروع.</p>
            </AlertDescription>
        </Alert>
    </div>
);


export function DataProvider({ children }: { children: ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [data, setData] = useState(initialDataState as Omit<DataContextValue, keyof any>);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [envError, setEnvError] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const fetchData = useCallback(async (supabaseClient: SupabaseClient) => {
    setDataLoading(true);
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
            setDataLoading(false);
            return;
        };

        const [
            usersRes, investorsRes, borrowersRes, notificationsRes, supportTicketsRes, configRes, transactionsRes, branchesRes
        ] = await Promise.all([
            supabaseClient.from('users').select('*'),
            supabaseClient.from('investors').select('*'),
            supabaseClient.from('borrowers').select('*, installments:borrower_installments(borrower_id, month, status), fundedBy:borrower_funders(borrower_id, investor_id, amount)'),
            supabaseClient.from('notifications').select('*'),
            supabaseClient.from('support_tickets').select('*'),
            supabaseClient.from('app_config').select('*'),
            supabaseClient.from('transactions').select('*'),
            supabaseClient.from('branches').select('*')
        ]);

        if (usersRes.error) throw usersRes.error;
        if (investorsRes.error) throw investorsRes.error;
        if (borrowersRes.error) throw borrowersRes.error;
        if (notificationsRes.error) throw notificationsRes.error;
        if (supportTicketsRes.error) throw supportTicketsRes.error;
        if (configRes.error) throw configRes.error;
        if (transactionsRes.error) throw transactionsRes.error;
        if (branchesRes.error) throw branchesRes.error;

        const configData = configRes.data.reduce((acc: any, row: any) => {
            acc[row.key] = row.value.value;
            return acc;
        }, {} as any);
        
        const borrowersWithData: Borrower[] = borrowersRes.data.map((borrower: any) => ({
            ...borrower,
            fundedBy: (borrower.fundedBy || []).map((f: any) => ({ investorId: f.investor_id, amount: f.amount })),
            installments: (borrower.installments || []).map((i: any) => ({ month: i.month, status: i.status as InstallmentStatus })),
            partialPayment: borrower.partial_payment_paid_amount ? {
                paidAmount: borrower.partial_payment_paid_amount,
                remainingLoanId: borrower.partial_payment_remaining_loan_id!,
            } : undefined
        }));
        
        const usersWithBranches = (usersRes.data || []).map(u => ({
            ...u,
            branches: (branchesRes.data || []).filter(b => b.manager_id === u.id)
        }))
        
        setData({
            users: usersWithBranches,
            investors: investorsRes.data || [],
            borrowers: borrowersWithData,
            transactions: transactionsRes.data || [],
            notifications: notificationsRes.data || [],
            supportTickets: supportTicketsRes.data || [],
            salaryRepaymentPercentage: configData.salaryRepaymentPercentage ?? initialDataState.salaryRepaymentPercentage,
            baseInterestRate: configData.baseInterestRate ?? initialDataState.baseInterestRate,
            investorSharePercentage: configData.investorSharePercentage ?? initialDataState.investorSharePercentage,
            graceTotalProfitPercentage: configData.graceTotalProfitPercentage ?? initialDataState.graceTotalProfitPercentage,
            graceInvestorSharePercentage: configData.graceInvestorSharePercentage ?? initialDataState.graceInvestorSharePercentage,
            supportEmail: configData.supportEmail ?? initialDataState.supportEmail,
            supportPhone: configData.supportPhone ?? initialDataState.supportPhone,
        });

    } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
            variant: "destructive",
            title: "فشل في جلب البيانات",
            description: "لم نتمكن من تحميل بيانات التطبيق. يرجى تحديث الصفحة.",
        });
    } finally {
      setDataLoading(false);
    }
  }, [toast]);
  
  
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        setEnvError(true);
        setAuthLoading(false);
        setDataLoading(false);
        return;
    }
    
    const client = createBrowserClient(supabaseUrl, supabaseKey);
    setSupabase(client);

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN') {
            fetchData(client);
        }
        if (event === 'SIGNED_OUT') {
            setData(initialDataState as any);
        }
        setAuthLoading(false);
    });

    client.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setAuthLoading(false);
        if (session) {
            fetchData(client);
        } else {
            setDataLoading(false);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchData]);
  
  const currentUser = useMemo(() => {
    if (!session?.user) return undefined;
    return data.users.find((u) => u.id === session.user.id);
  }, [data.users, session]);
  
  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    const { role, id } = currentUser;
    const allUsers = data.users;

    if (role === 'مدير النظام') {
      return allUsers.filter(u => u.status !== 'محذوف');
    }
    
    if (role === 'مستثمر') {
      const manager = allUsers.find(u => u.id === currentUser.managedBy);
      return manager ? [currentUser, manager] : [currentUser];
    }
    
    const managerId = role === 'مدير المكتب' ? id : currentUser.managedBy;
    if (managerId) {
        const teamUsers = allUsers.filter(u => u.id === managerId || u.managedBy === managerId);
        return teamUsers.filter(u => u.status !== 'محذوف');
    }

    return [currentUser];
  }, [currentUser, data.users]);

  const signIn = useCallback(async (email: string, password?: string) => {
    if (!supabase) return { success: false, message: "خدمة المصادقة غير متاحة." };
    if (!password) return { success: false, message: "بيانات غير مكتملة." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        if (error.message === 'Invalid login credentials') {
            return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
        }
        return { success: false, message: error.message };
    }
    
    router.push('/dashboard');
    return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
  }, [supabase, router]);

  const signOutUser = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/login');
  },[supabase, router]);

  const registerNewOfficeManager = useCallback(async (payload: NewManagerPayload): Promise<{ success: boolean; message: string }> => {
    if (!supabase) return { success: false, message: "خدمة المصادقة غير متاحة." };
    const { email, password, phone, name, officeName } = payload;
    if (!password) return { success: false, message: "كلمة المرور مطلوبة." };
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
                officeName,
                phone,
                role: 'مدير المكتب'
            }
        }
    });

    if (authError) {
        if (authError.message.includes("User already registered")) {
            return { success: false, message: 'البريد الإلكتروني مسجل بالفعل.' };
        }
        console.error("Supabase sign up error:", authError);
        return { success: false, message: 'فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى.' };
    }
    
    if (!authData.user) {
        return { success: false, message: 'فشل في إنشاء الحساب، لم يتم إرجاع بيانات المستخدم من نظام المصادقة.' };
    }

    await fetchData(supabase);
    return { success: true, message: 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.' };
  }, [supabase, fetchData]);
  
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

  const updateBorrower = useCallback(
    (updatedBorrower: Borrower) => {
      if (!currentUser) return;
      setData(d => {
        const originalBorrower = d.borrowers.find(b => b.id === updatedBorrower.id);
        if (!originalBorrower) return d;
        
        const manager = d.users.find(u => u.id === currentUser.managedBy);

        if(currentUser.role === 'موظف' && !(manager?.allowEmployeeLoanEdits)) {
             toast({
                variant: 'destructive',
                title: 'غير مصرح به',
                description: 'ليس لديك الصلاحية لتعديل القروض.',
             });
             return d;
        } else if (currentUser.role === 'مساعد مدير المكتب' && !currentUser.permissions?.manageBorrowers) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لتعديل القروض.' });
            return d;
        }

        if (originalBorrower.status !== 'معلق') {
            const financialFieldsChanged = updatedBorrower.amount !== originalBorrower.amount ||
                                           updatedBorrower.rate !== originalBorrower.rate ||
                                           updatedBorrower.term !== originalBorrower.term ||
                                           updatedBorrower.loanType !== originalBorrower.loanType ||
                                           updatedBorrower.dueDate !== originalBorrower.dueDate;
            if (financialFieldsChanged) {
              toast({
                  variant: 'destructive',
                  title: 'خطأ',
                  description: 'لا يمكن تغيير البيانات المالية (المبلغ، الفائدة، المدة، نوع التمويل، تاريخ الاستحقاق) لقرض نشط.',
              });
              return d;
            }
        }
        
        if (originalBorrower.paymentStatus === 'تم السداد' || originalBorrower.status === 'مرفوض') {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن تعديل قرض تم سداده أو رفضه.' });
            return d;
        }


        if (updatedBorrower.loanType !== originalBorrower.loanType) {
            if (updatedBorrower.loanType === 'اقساط') {
                delete updatedBorrower.discount;
            } else {
                delete updatedBorrower.rate;
                delete updatedBorrower.term;
                delete updatedBorrower.installments;
            }
        }
        toast({ title: 'تم تحديث القرض' });
        return {
            ...d,
            borrowers: d.borrowers.map((b) => (b.id === updatedBorrower.id ? { ...b, ...updatedBorrower} : b))
        }
      });
    },
    [currentUser, toast]
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
              if (updatedBorrower.loanType === 'اقساط' && updatedBorrower.installments) {
                updatedBorrower.installments = updatedBorrower.installments.map(inst => ({ ...inst, status: 'تم السداد' }));
              }
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
        if (!loanToApprove || loanToApprove.status !== 'معلق') {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على القرض أو تمت معالجته بالفعل.' });
          return d;
        }

        let totalFundedAmount = 0;
        let remainingAmountToFund = loanToApprove.amount;
        const fundedByDetails: { investorId: string; amount: number }[] = [];
        
        for (const invId of investorIds) {
            if (remainingAmountToFund <= 0) break;
            
            const currentInvestorState = d.investors.find(i => i.id === invId);
            if (!currentInvestorState) continue;
            
            const financials = calculateInvestorFinancials(currentInvestorState, d.borrowers, d.transactions);
            const availableCapital = loanToApprove.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
            
            const contribution = Math.min(availableCapital, remainingAmountToFund);
            if (contribution > 0) {
                remainingAmountToFund -= contribution;
                totalFundedAmount += contribution;
                fundedByDetails.push({ investorId: invId, amount: contribution });
            }
        }
        
        const updatedBorrower: Borrower = {
            ...loanToApprove, 
            status: 'منتظم', 
            fundedBy: fundedByDetails,
            amount: totalFundedAmount,
        };
        
        const newBorrowers = d.borrowers.map(b => (b.id === borrowerId ? updatedBorrower : b));
        
        const notificationsToQueue: Omit<Notification, 'id' | 'date' | 'isRead'>[] = [];
        
        if (updatedBorrower.submittedBy) {
            notificationsToQueue.push({
                recipientId: updatedBorrower.submittedBy,
                title: 'تمت الموافقة على طلبك',
                description: `تمت الموافقة على طلب إضافة القرض "${updatedBorrower.name}".`,
            });
        }
        
        fundedByDetails.forEach(funder => {
            notificationsToQueue.push({
                recipientId: funder.investorId,
                title: 'تم استثمار أموالك',
                description: `تم استثمار مبلغ ${formatCurrency(funder.amount)} من رصيدك في قرض جديد للعميل "${loanToApprove.name}".`,
            });
        });
        
        const newNotifications = [...notificationsToQueue.map(n => ({...n, id: `notif_${crypto.randomUUID()}`, date: new Date().toISOString(), isRead: false})), ...d.notifications];
        
        toast({ title: 'تمت الموافقة على القرض بنجاح' });
        return { ...d, borrowers: newBorrowers, notifications: newNotifications };
      })
    },
    [toast]
  );

  const rejectBorrower = useCallback(
    (borrowerId: string, reason: string) => {
        setData(d => {
            const borrowerToReject = d.borrowers.find((b) => b.id === borrowerId);

            if (!borrowerToReject) {
                toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على القرض.' });
                return d;
            }
            
            if (borrowerToReject.status !== 'معلق') {
                toast({ variant: 'destructive', title: 'خطأ', description: 'تمت معالجة هذا الطلب بالفعل.' });
                return d;
            }

            const newStatus: Borrower['status'] = 'مرفوض';
            const rejectedBorrower: Borrower = { ...borrowerToReject, status: newStatus, rejectionReason: reason };
            const newBorrowers = d.borrowers.map((b) => (b.id === borrowerId ? rejectedBorrower : b));
            
            let newNotifications = d.notifications;
            if (rejectedBorrower.submittedBy) {
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
    async (
      borrower: Omit<
        Borrower,
        'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'paymentStatus' | 'fundedBy'
      >,
      investorIds: string[],
      force: boolean = false
    ): Promise<AddBorrowerResult> => {
      let result: AddBorrowerResult = { success: false, message: 'فشل غير متوقع' };
      if (!currentUser) {
          return { success: false, message: 'يجب أن تكون مسجلاً للدخول.' };
      }
      
      setData(d => {
          const manager = d.users.find(u => u.id === currentUser.managedBy);

          if ((currentUser.role === 'موظف' || currentUser.role === 'مساعد مدير المكتب') && !currentUser.permissions?.manageBorrowers) {
               if(!manager?.allowEmployeeSubmissions) {
                  result = { success: false, message: 'ليس لديك الصلاحية لإضافة قروض.' };
                  toast({ variant: 'destructive', title: 'غير مصرح به', description: result.message });
                  return d;
               }
          }

          if (borrower.loanType === 'اقساط' && (!borrower.rate || borrower.rate <= 0 || !borrower.term || borrower.term <= 0)) {
              result = { success: false, message: 'قروض الأقساط يجب أن تحتوي على فائدة ومدة صحيحة.' };
              toast({ variant: 'destructive', title: 'بيانات غير مكتملة', description: result.message });
              return d;
          }
          
          if (!force) {
            const existingActiveLoan = d.borrowers.find(b => 
                b.nationalId === borrower.nationalId &&
                b.status !== 'مرفوض' && b.paymentStatus !== 'تم السداد'
            );
            
            if (existingActiveLoan) {
                const submitter = d.users.find(u => u.id === existingActiveLoan.submittedBy);
                const loanManager = submitter?.role === 'مدير المكتب' ? submitter : d.users.find(u => u.id === submitter?.managedBy);
                const loggedInManagerId = currentUser.role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;

                if (loanManager && loanManager.id !== loggedInManagerId) {
                    result = {
                        success: false,
                        message: 'عميل مكرر',
                        isDuplicate: true,
                        duplicateInfo: {
                            borrowerName: existingActiveLoan.name,
                            managerName: loanManager.name,
                            managerPhone: loanManager.phone || 'غير متوفر'
                        }
                    };
                    return d;
                }
            }
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
          
          let newTransactions = [...d.transactions];

          if(!isPending) {
              for (const invId of investorIds) {
                  if (remainingAmountToFund <= 0) break;
                  
                  const currentInvestorState = d.investors.find(i => i.id === invId);
                  if (!currentInvestorState) continue;
                  
                  const financials = calculateInvestorFinancials(currentInvestorState, d.borrowers, d.transactions);
                  const availableCapital = borrower.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
                  
                  const contribution = Math.min(availableCapital, remainingAmountToFund);
                  if (contribution > 0) {
                      remainingAmountToFund -= contribution;
                      fundedByDetails.push({ investorId: invId, amount: contribution });
                  }
              }
          }

          const newEntry: Borrower = {
              ...borrower,
              id: newId,
              date: new Date().toISOString(),
              submittedBy: currentUser.id,
              fundedBy: fundedByDetails,
              isNotified: false,
              installments: borrower.loanType === 'اقساط' && borrower.term && borrower.term > 0
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
          if (isPending && currentUser?.managedBy) {
              notificationsToQueue.push({
                  recipientId: currentUser.managedBy,
                  title: 'طلب قرض جديد معلق',
                  description: `قدم الموظف "${currentUser.name}" طلبًا لإضافة القرض "${borrower.name}".`,
              });
          }
          if(notificationsToQueue.length > 0) {
              newNotifications = [...notificationsToQueue.map(n => ({...n, id: `notif_${crypto.randomUUID()}`, date: new Date().toISOString(), isRead: false})), ...d.notifications];
          }

          result = { success: true, message: 'تمت إضافة القرض بنجاح.' };
          toast({ title: result.message });
          return { ...d, borrowers: newBorrowers, transactions: newTransactions, notifications: newNotifications };
      });
      return result;
    },
    [currentUser, toast]
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
            name: `${originalBorrower.name}`,
            nationalId: originalBorrower.nationalId,
            phone: originalBorrower.phone,
            amount: remainingAmount,
            rate: 0,
            term: 0,
            date: new Date().toISOString(),
            loanType: 'مهلة',
            status: 'منتظم',
            paymentStatus: 'منتظم',
            fundedBy: originalBorrower.fundedBy,
            dueDate: new Date().toISOString().split('T')[0],
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
        
        toast({ title: 'نجاح', description: 'تم تسجيل السداد الجزئي وإنشاء قرض جديد بالمبلغ المتبقي.' });

        return { ...d, borrowers: newBorrowers };
    });
  }, [toast]);

  const updateInvestor = useCallback(
    (updatedInvestor: UpdatableInvestor) => {
      if (!currentUser) return;
      setData(d => {
        if ((currentUser.role === 'مساعد مدير المكتب' && !currentUser.permissions?.manageInvestors) || currentUser.role === 'موظف') {
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
    [currentUser, toast]
  );
  
  const approveInvestor = useCallback(
    (investorId: string) => {
      setData(d => {
        const investorToApprove = d.investors.find((inv) => inv.id === investorId);
        if (!investorToApprove) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستثمر.' });
          return d;
        }
        if (investorToApprove.status !== 'معلق') {
          toast({ variant: 'destructive', title: 'خطأ', description: 'تمت معالجة هذا الطلب بالفعل.' });
          return d;
        }

        const newUserStatus: User['status'] = 'نشط';
        const newUsers = d.users.map((u) =>
          u.id === investorId ? { ...u, status: newUserStatus } : u
        );

        const newInvestorStatus: Investor['status'] = 'نشط';
        const newInvestors = d.investors.map((i) =>
          i.id === investorId ? { ...i, status: newInvestorStatus } : i
        );

        const approvedInvestor = newInvestors.find(i => i.id === investorId);
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
        return { ...d, investors: newInvestors, users: newUsers, notifications: newNotifications };
      });
    },
    [toast]
  );

  const rejectInvestor = useCallback(
    (investorId: string, reason: string) => {
      setData(d => {
        const investorToReject = d.investors.find((inv) => inv.id === investorId);
        if (!investorToReject) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستثمر.' });
            return d;
        }
        if (investorToReject.status !== 'معلق') {
            toast({ variant: 'destructive', title: 'خطأ', description: 'تمت معالجة هذا الطلب بالفعل.' });
            return d;
        }

        const newInvestorStatus: Investor['status'] = 'مرفوض';
        const rejectedInvestor: Investor = { ...investorToReject, status: newInvestorStatus, rejectionReason: reason };
        const newInvestors = d.investors.map((i) => (i.id === investorId ? rejectedInvestor : i));

        const newUserStatus: User['status'] = 'مرفوض';
        const newUsers = d.users.map((u) => (u.id === investorId ? { ...u, status: newUserStatus } : u));

        let newNotifications = d.notifications;
        if (rejectedInvestor.submittedBy) {
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
        return { ...d, investors: newInvestors, users: newUsers, notifications: newNotifications };
      });
    },
    [toast]
  );

  const addInvestor = useCallback(
    async (investorPayload: Omit<NewInvestorPayload, 'status'>): Promise<{ success: boolean; message: string }> => {
      let result = { success: false, message: 'فشل غير متوقع' };
      if (!currentUser) return { success: false, message: 'يجب تسجيل الدخول أولاً.' };

      setData(d => {
        if ((currentUser.role === 'موظف' || currentUser.role === 'مساعد مدير المكتب') && !currentUser.permissions?.manageInvestors) {
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

        const managerId = currentUser.role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
        const manager = d.users.find(u => u.id === managerId);
      
        if (manager) {
          const investorsAddedByManager = d.investors.filter(i => {
            const investorUser = d.users.find(u => u.id === i.id);
            return investorUser?.managedBy === manager.id;
          }).length;
      
          if (investorsAddedByManager >= (manager.investorLimit ?? 0)) {
            result = { success: false, message: `لقد وصل مدير المكتب للحد الأقصى للمستثمرين (${manager.investorLimit}).` };
            toast({ variant: 'destructive', title: 'خطأ', description: result.message });
            return d;
          }
        }
      
        if (!investorPayload.password || investorPayload.password.length < 6) {
          result = { success: false, message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' };
          toast({ variant: 'destructive', title: 'خطأ', description: result.message });
          return d;
        }

        const status: User['status'] = (currentUser.role === 'موظف' || (currentUser.role === 'مساعد مدير المكتب' && !currentUser.permissions?.manageRequests)) ? 'معلق' : 'نشط';
      
        const newId = `user_inv_${Date.now()}`;
      
        const newUser: User = {
          id: newId,
          name: investorPayload.name,
          email: investorPayload.email,
          phone: investorPayload.phone,
          role: 'مستثمر',
          status: status,
          photoURL: `https://placehold.co/40x40.png`,
          registrationDate: new Date().toISOString(),
          managedBy: managerId,
        };
        
        const newTransactions: Transaction[] = [];

        if (installmentCapital > 0) {
            newTransactions.push({
                id: `tx_init_inst_${newId}`,
                investor_id: newId,
                date: new Date().toISOString(),
                type: 'إيداع رأس المال',
                amount: installmentCapital,
                description: 'إيداع تأسيسي - محفظة الأقساط',
                capitalSource: 'installment',
            });
        }
        if (graceCapital > 0) {
             newTransactions.push({
                id: `tx_init_grace_${newId}`,
                investor_id: newId,
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
          submittedBy: currentUser.id,
          isNotified: false,
          installmentProfitShare: investorPayload.installmentProfitShare,
          gracePeriodProfitShare: investorPayload.gracePeriodProfitShare,
        };
        
        let newNotifications = d.notifications;
        if (status === 'معلق' && managerId) {
            newNotifications = [{
                id: `notif_${crypto.randomUUID()}`,
                date: new Date().toISOString(),
                isRead: false,
                recipientId: managerId,
                title: 'طلب مستثمر جديد معلق',
                description: `قدم الموظف "${currentUser.name}" طلبًا لإضافة المستثمر "${newInvestorEntry.name}".`,
            }, ...d.notifications];
        }
    
        result = { success: true, message: 'تمت إضافة المستثمر بنجاح.' };
        toast({ title: 'تمت إضافة المستثمر بنجاح' });
        return {
          ...d,
          users: [...d.users, newUser],
          investors: [...d.investors, newInvestorEntry],
          transactions: [...d.transactions, ...newTransactions],
          notifications: newNotifications
        };
      });
      return result;
    },
    [currentUser, toast]
  );
  
  const addNewSubordinateUser = useCallback(
    async (payload: NewUserPayload, role: 'موظف' | 'مساعد مدير المكتب'): Promise<{ success: boolean, message: string }> => {
        let result: { success: boolean, message: string } = { success: false, message: 'فشل غير متوقع.' };
        if (!currentUser) {
            result = { success: false, message: 'يجب تسجيل الدخول أولاً.' };
            return result;
        };

        setData(d => {
            if (currentUser.role !== 'مدير المكتب') {
                result = { success: false, message: 'ليس لديك الصلاحية لإضافة مستخدمين.' };
                toast({ variant: 'destructive', title: 'خطأ', description: result.message });
                return d;
            }

            const newId = `user_sub_${Date.now()}`;
            const newUser: User = {
                id: newId,
                name: payload.name,
                email: payload.email,
                phone: payload.phone,
                role: role,
                status: 'نشط',
                managedBy: currentUser.id,
                photoURL: `https://placehold.co/40x40.png`,
                registrationDate: new Date().toISOString(),
            };

            result = { success: true, message: `تمت إضافة ${role} بنجاح.` };
            toast({ title: result.message });
            return {
                ...d,
                users: [...d.users, newUser],
            };
        });
        return result;
    },
    [currentUser, toast]
  );
  
  const updateUserIdentity = useCallback(
    async (updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
        if (!currentUser || !supabase) {
          return { success: false, message: 'فشل: لم يتم العثور على المستخدم.' };
        }
        
        const {data: { user }, error: authError } = await supabase.auth.updateUser({
            password: updates.password
        });
        
        if (authError) {
          console.error("Auth update error:", authError);
          return { success: false, message: 'فشل تحديث بيانات المصادقة.' };
        }

        setData(d => ({
            ...d,
            users: d.users.map(u => u.id === currentUser.id ? {...u, ...updates} : u)
        }));
        
        return { success: true, message: 'تم تحديث ملفك الشخصي بنجاح.' };
    },
    [currentUser, supabase]
  );
  
  const updateUserCredentials = useCallback(async (
    userId: string,
    updates: { email?: string; password?: string, officeName?: string }
  ): Promise<{ success: boolean, message: string }> => {
    let result = { success: false, message: "فشل تحديث بيانات الاعتماد." };
    if (!currentUser || currentUser.role !== 'مدير النظام') {
        result = { success: false, message: "غير مصرح به." };
        toast({ variant: 'destructive', title: 'خطأ', description: result.message });
        return result;
    }
    
    setData(d => {
        const userToUpdate = d.users.find(u => u.id === userId);
        if (!userToUpdate) {
            result = { success: false, message: "لم يتم العثور على المستخدم." };
            toast({ variant: 'destructive', title: 'خطأ', description: result.message });
            return d;
        }

        const updatedUsers = d.users.map(u =>
            u.id === userId ? { ...u, email: updates.email ?? u.email, officeName: updates.officeName ?? u.officeName } : u
        );

        result = { success: true, message: `تم تحديث بيانات دخول ${userToUpdate.name}.` };
        toast({ title: 'نجاح', description: result.message });
        return { ...d, users: updatedUsers };
    });
    return result;
  }, [currentUser, toast]);


  const addInvestorTransaction = useCallback(
    (
      investorId: string,
      transaction: Omit<Transaction, 'id' | 'investor_id'>
    ) => {
      setData(d => {
        const investor = d.investors.find(i => i.id === investorId);
        if (!investor) return d;

        const newTransaction: Transaction = {
          ...transaction,
          id: `tx_${Date.now()}`,
          investor_id: investorId,
        };

        if (transaction.type.includes('سحب')) {
            const financials = calculateInvestorFinancials(investor, d.borrowers, d.transactions);
            const availableCapital = transaction.capitalSource === 'installment' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
            if (transaction.amount > availableCapital) {
                toast({
                    variant: 'destructive',
                    title: 'رصيد غير كافٍ',
                    description: `الرصيد الخامل المتاح (${formatCurrency(availableCapital)}) أقل من المبلغ المطلوب سحبه.`
                });
                return d;
            }
        }
        
        toast({
          title: 'تمت إضافة العملية المالية بنجاح',
        });
        return { ...d, transactions: [newTransaction, ...d.transactions] };
      });
    },
    [toast]
  );

  const updateUserStatus = useCallback(
    async (userId: string, status: User['status']) => {
      if (!currentUser) return;
      if (currentUser.id === userId) {
        toast({ variant: "destructive", title: "خطأ", description: "لا يمكنك تغيير حالتك بنفسك."});
        return;
      }
      
      setData(d => {
        const userToUpdate = d.users.find(u => u.id === userId);
        if (!userToUpdate) return d;
        
        const newUsers = d.users.map(u => (u.id === userId ? { ...u, status } : u));
        let newInvestors = d.investors;
        if(userToUpdate.role === 'مستثمر') {
            const investorStatus: Investor['status'] = status === 'محذوف' ? 'محذوف' : (status === 'نشط' ? 'نشط' : 'غير نشط');
            newInvestors = d.investors.map(i => i.id === userId ? {...i, status: investorStatus} : i);
        }
        
        toast({ title: `تم تحديث حالة ${userToUpdate.name} إلى "${status}"`});
        return { ...d, users: newUsers, investors: newInvestors };
      });
    },
    [currentUser, toast]
  );
  
  const updateUserRole = useCallback((userId: string, role: UserRole) => {
      setData(d => {
        const userToUpdate = d.users.find(u => u.id === userId);
        if (!userToUpdate) return d;
        
        toast({title: `تم تحديث دور ${userToUpdate.name} إلى ${role}.`});
        return {
            ...d,
            users: d.users.map(u => u.id === userId ? {...u, role} : u),
        }
      });
  }, [toast]);
  
  const deleteUser = useCallback((userId: string) => {
      if (!currentUser) return;
      setData(d => {
        const userToDelete = d.users.find(u => u.id === userId);
        if (!userToDelete) return d;
        
        if (userToDelete.role === 'مستثمر') {
            const financials = calculateInvestorFinancials(
                d.investors.find(i => i.id === userId)!, 
                d.borrowers, 
                d.transactions
            );
            if(financials.activeCapital > 0 || financials.idleInstallmentCapital > 0 || financials.idleGraceCapital > 0) {
                 toast({ variant: 'destructive', title: 'لا يمكن الحذف', description: 'لا يمكن حذف مستثمر لديه أموال نشطة أو خاملة في النظام.'});
                 return d;
            }
        }
        
        const newUsers = d.users.map(u => u.id === userId ? {...u, status: 'محذوف' as const} : u);
        const newInvestors = d.investors.map(i => i.id === userId ? {...i, status: 'محذوف' as const} : i);
        
        toast({title: `تم حذف حساب ${userToDelete.name} بنجاح.`});
        return {...d, users: newUsers, investors: newInvestors};
      });
  }, [currentUser, toast]);
  
  const updateUserLimits = useCallback((userId: string, limits: { investorLimit: number; employeeLimit: number; assistantLimit: number; branchLimit: number }) => {
      setData(d => ({
        ...d,
        users: d.users.map(u => u.id === userId ? {...u, ...limits} : u)
      }));
      toast({title: "تم تحديث الحدود بنجاح."});
  }, [toast]);
  
  const updateManagerSettings = useCallback((managerId: string, settings: { allowEmployeeSubmissions?: boolean; hideEmployeeInvestorFunds?: boolean, allowEmployeeLoanEdits?: boolean }) => {
      setData(d => ({
        ...d,
        users: d.users.map(u => u.id === managerId ? {...u, ...settings} : u)
      }));
       toast({title: "تم تحديث إعدادات المكتب."});
  }, [toast]);
  
  const updateAssistantPermission = useCallback((assistantId: string, key: PermissionKey, value: boolean) => {
      setData(d => ({
        ...d,
        users: d.users.map(u => u.id === assistantId ? {...u, permissions: {...u.permissions, [key]: value}} : u)
      }))
  }, []);
  const updateEmployeePermission = useCallback((employeeId: string, key: PermissionKey, value: boolean) => {
      setData(d => ({
        ...d,
        users: d.users.map(u => u.id === employeeId ? {...u, permissions: {...u.permissions, [key]: value}} : u)
      }))
  }, []);
  
  const addSupportTicket = useCallback((ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead' | 'isReplied'>) => {
    setData(d => {
      const newTicket: SupportTicket = {
        ...ticket,
        id: `ticket_${crypto.randomUUID()}`,
        date: new Date().toISOString(),
        isRead: false,
        isReplied: false,
      };
      
      const systemAdmin = d.users.find(u => u.role === 'مدير النظام');
      let newNotifications = d.notifications;
      if (systemAdmin) {
          newNotifications = [
              {
                  id: `notif_${crypto.randomUUID()}`,
                  recipientId: systemAdmin.id,
                  title: 'رسالة دعم جديدة',
                  description: `وصلتك رسالة جديدة من ${ticket.fromUserName} بخصوص "${ticket.subject}".`,
                  date: new Date().toISOString(),
                  isRead: false
              },
              ...d.notifications
          ]
      }
      
      toast({
          title: 'تم إرسال رسالتك بنجاح',
          description: 'سوف يتم مراجعتها من قبل الدعم الفني.',
      });
      return { ...d, supportTickets: [newTicket, ...d.supportTickets], notifications: newNotifications };
    });
  }, [toast]);
  
  const requestCapitalIncrease = useCallback((investorId: string) => {
      if(!currentUser) return;
      
      const investor = data.investors.find(i => i.id === investorId);
      if(!investor) return;

      const subject = `طلب زيادة رأس مال للمستثمر: ${investor.name}`;
      const message = `يرجى العلم بأن المستثمر "${investor.name}" قد استنفد رصيده الخامل.\n\nنرجو التواصل معه لترتيب إيداع جديد لزيادة رأس المال المتاح للاستثمار.\n\nهذه الرسالة تم إنشاؤها تلقائيًا من قبل مدير المكتب: ${currentUser.name}.`;
      
      const systemAdmin = data.users.find(u => u.role === 'مدير النظام');
      if (!systemAdmin) {
        toast({variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على مدير النظام لإرسال الطلب.'});
        return;
      }
      
      addSupportTicket({
          fromUserId: currentUser.id,
          fromUserName: currentUser.name,
          fromUserEmail: currentUser.email,
          subject,
          message
      });
  }, [addSupportTicket, currentUser, data.investors, data.users, toast]);
  
  const deleteSupportTicket = useCallback((ticketId: string) => {
    setData(d => ({
        ...d,
        supportTickets: d.supportTickets.filter(t => t.id !== ticketId)
    }));
    toast({ title: 'تم حذف رسالة الدعم بنجاح.' });
  }, [toast]);
  
  const replyToSupportTicket = useCallback((ticketId: string, replyMessage: string) => {
      setData(d => {
        const ticket = d.supportTickets.find(t => t.id === ticketId);
        if(!ticket) return d;
        
        const newNotification: Notification = {
            id: `notif_${crypto.randomUUID()}`,
            recipientId: ticket.fromUserId,
            title: `رد على رسالتك: ${ticket.subject}`,
            description: replyMessage,
            date: new Date().toISOString(),
            isRead: false,
        };
        
        const updatedTickets = d.supportTickets.map(t => t.id === ticketId ? {...t, isReplied: true, isRead: true } : t);
        
        toast({title: 'تم إرسال الرد بنجاح.'});
        return {
            ...d,
            supportTickets: updatedTickets,
            notifications: [newNotification, ...d.notifications]
        }
      });
  }, [toast]);
  
  const markBorrowerAsNotified = useCallback((borrowerId: string, message: string) => {
      setData(d => ({
        ...d,
        borrowers: d.borrowers.map(b => b.id === borrowerId ? {...b, isNotified: true} : b)
      }));
       toast({
        title: 'تم إرسال الرسالة بنجاح (محاكاة)',
        description: `تم إرسال الرسالة إلى المقترض. محتوى الرسالة: ${message}`,
      });
  }, [toast]);

  const markInvestorAsNotified = useCallback((investorId: string, message: string) => {
      setData(d => ({
        ...d,
        investors: d.investors.map(i => i.id === investorId ? {...i, isNotified: true} : i)
      }));
       toast({
        title: 'تم إرسال الرسالة بنجاح (محاكاة)',
        description: `تم إرسال الرسالة إلى المستثمر. محتوى الرسالة: ${message}`,
      });
  }, [toast]);
  
  const addBranch = useCallback(async (branch: Omit<Branch, 'id'>): Promise<{success: boolean, message: string}> => {
    let result = {success: false, message: 'فشل غير متوقع.'};
    if (!currentUser) return result;
    
    setData(d => {
        if(currentUser.role !== 'مدير المكتب') {
            result = {success: false, message: 'غير مصرح به.'};
            return d;
        }

        if((currentUser.branches?.length ?? 0) >= (currentUser.branchLimit ?? 0)) {
            result = {success: false, message: 'لقد وصلت إلى الحد الأقصى لعدد الفروع.'};
            toast({variant: 'destructive', title: 'خطأ', description: result.message});
            return d;
        }

        const newBranch: Branch = { ...branch, id: `branch_${crypto.randomUUID()}` };
        const updatedUsers = d.users.map(u => 
            u.id === currentUser.id ? { ...u, branches: [...(u.branches || []), newBranch] } : u
        );

        result = {success: true, message: 'تمت إضافة الفرع بنجاح.'};
        toast({title: result.message});
        return { ...d, users: updatedUsers };
    });
    return result;
  }, [currentUser, toast]);
  
  const deleteBranch = useCallback((branchId: string) => {
      if (!currentUser || currentUser.role !== 'مدير المكتب') return;
      setData(d => {
          const updatedUsers = d.users.map(u => {
              if (u.id === currentUser.id) {
                  return { ...u, branches: (u.branches || []).filter(b => b.id !== branchId) };
              }
              return u;
          });
          toast({title: 'تم حذف الفرع بنجاح.'});
          return { ...d, users: updatedUsers };
      });
  }, [currentUser, toast]);
  
  const value = useMemo(() => ({
      currentUser,
      session,
      authLoading,
      dataLoading,
      ...data,
      visibleUsers,
      signIn,
      signOutUser,
      registerNewOfficeManager,
      addBranch,
      deleteBranch,
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
      addBorrower,
      updateBorrower,
      updateBorrowerPaymentStatus,
      approveBorrower,
      rejectBorrower,
      deleteBorrower,
      updateInstallmentStatus,
      handlePartialPayment,
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
      updateEmployeePermission,
      requestCapitalIncrease,
      deleteUser,
      clearUserNotifications,
      markUserNotificationsAsRead,
      markBorrowerAsNotified,
      markInvestorAsNotified,
  }), [
      currentUser, session, authLoading, dataLoading, data, visibleUsers,
      signIn, signOutUser, registerNewOfficeManager, addBranch, deleteBranch,
      updateSupportInfo, updateBaseInterestRate, updateInvestorSharePercentage,
      updateSalaryRepaymentPercentage, updateGraceTotalProfitPercentage,
      updateGraceInvestorSharePercentage, updateTrialPeriod, addSupportTicket,
      deleteSupportTicket, replyToSupportTicket, addBorrower, updateBorrower,
      updateBorrowerPaymentStatus, approveBorrower, rejectBorrower, deleteBorrower,
      updateInstallmentStatus, handlePartialPayment, addInvestor, addNewSubordinateUser,
      updateInvestor, approveInvestor, rejectInvestor, addInvestorTransaction,
      updateUserIdentity, updateUserCredentials, updateUserStatus, updateUserRole,
      updateUserLimits, updateManagerSettings, updateAssistantPermission,
      updateEmployeePermission, requestCapitalIncrease, deleteUser,
      clearUserNotifications, markUserNotificationsAsRead, markBorrowerAsNotified,
      markInvestorAsNotified,
  ]);
  
  if (envError) {
    return <EnvError />;
  }

  return (
    <DataContext.Provider value={value}>
        {children}
    </DataContext.Provider>
  );
}

export function useDataState() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataState must be used within a DataProvider');
  }
  const { signIn, registerNewOfficeManager, signOutUser, ...rest } = context;
  return rest;
}

export function useDataActions() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataActions must be used within a DataProvider');
    }
    const { 
      signIn,
      signOutUser,
      registerNewOfficeManager,
      addBranch,
      deleteBranch,
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
      addBorrower,
      updateBorrower,
      updateBorrowerPaymentStatus,
      approveBorrower,
      rejectBorrower,
      deleteBorrower,
      updateInstallmentStatus,
      handlePartialPayment,
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
      updateEmployeePermission,
      requestCapitalIncrease,
      deleteUser,
      clearUserNotifications,
      markUserNotificationsAsRead,
      markBorrowerAsNotified,
      markInvestorAsNotified,
    } = context;
    
    return {
      signIn,
      signOutUser,
      registerNewOfficeManager,
      addBranch,
      deleteBranch,
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
      addBorrower,
      updateBorrower,
      updateBorrowerPaymentStatus,
      approveBorrower,
      rejectBorrower,
      deleteBorrower,
      updateInstallmentStatus,
      handlePartialPayment,
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
      updateEmployeePermission,
      requestCapitalIncrease,
      deleteUser,
      clearUserNotifications,
      markUserNotificationsAsRead,
      markBorrowerAsNotified,
      markInvestorAsNotified,
    };
}
