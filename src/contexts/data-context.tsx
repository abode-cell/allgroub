
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
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type SignInResult = {
  success: boolean;
  message: string;
  reason?: 'unconfirmed_email' | 'other';
}

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
  signIn: (email: string, password?: string) => Promise<SignInResult>;
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
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'paymentStatus' | 'fundedBy' | 'managedBy'
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
  addInvestor: (investor: NewInvestorPayload) => Promise<{ success: boolean; message: string }>;
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

type InitialDataState = Pick<DataContextValue, 
  | 'borrowers' 
  | 'investors' 
  | 'users' 
  | 'transactions' 
  | 'supportTickets' 
  | 'notifications' 
  | 'salaryRepaymentPercentage' 
  | 'baseInterestRate' 
  | 'investorSharePercentage' 
  | 'graceTotalProfitPercentage' 
  | 'graceInvestorSharePercentage' 
  | 'supportEmail' 
  | 'supportPhone'
>;

const initialDataState: InitialDataState = {
  borrowers: [],
  investors: [],
  users: [],
  transactions: [],
  supportTickets: [],
  notifications: [],
  salaryRepaymentPercentage: 0,
  baseInterestRate: 0,
  investorSharePercentage: 0,
  graceTotalProfitPercentage: 0,
  graceInvestorSharePercentage: 0,
  supportEmail: '',
  supportPhone: '',
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initialDataState);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  
  const fetchData = useCallback(async (supabaseClient: SupabaseClient) => {
    setDataLoading(true);
    try {
        const { data: { user: authUser } } = await supabaseClient.auth.getUser();
        if (!authUser) {
            setDataLoading(false);
            return;
        };

        // Stage 1: Fetch all data concurrently using Promise.all
        const [
          { data: all_users_data, error: usersError },
          { data: investors_data, error: investorsError },
          { data: borrowers_data, error: borrowersError },
          { data: transactions_data, error: transactionsError },
          { data: notifications_data, error: notificationsError },
          { data: support_tickets_data, error: supportTicketsError },
          { data: app_config_data, error: appConfigError },
          { data: branches_data, error: branchesError }
        ] = await Promise.all([
          supabaseClient.from('users').select('*'),
          supabaseClient.from('investors').select('*'),
          supabaseClient.from('borrowers').select('*'),
          supabaseClient.from('transactions').select('*'),
          supabaseClient.from('notifications').select('*'),
          supabaseClient.from('support_tickets').select('*'),
          supabaseClient.from('app_config').select('*'),
          supabaseClient.from('branches').select('*')
        ]);
        
        // Stage 2: Check for any errors during the fetch
        const errors = { usersError, investorsError, borrowersError, transactionsError, notificationsError, supportTicketsError, appConfigError, branchesError };
        for (const [key, error] of Object.entries(errors)) {
            if (error) {
                console.error(`Error fetching ${key}:`, error);
                throw new Error(`فشل في جلب البيانات: ${key}. قد تكون صلاحيات RLS غير صحيحة.`);
            }
        }
        
        // Stage 3: Find the current user profile from the fetched data
        const currentUserProfile = (all_users_data || []).find(u => u.id === authUser.id);
        
        if (!currentUserProfile) {
            await supabaseClient.auth.signOut();
            throw new Error(`ملف المستخدم الخاص بك غير موجود أو ليس لديك صلاحية للوصول إليه.`);
        }
        
        // Stage 4: Check user status. If not active, sign out and stop.
        if (currentUserProfile.status !== 'نشط') {
            let message = 'حسابك غير نشط حاليًا. يرجى التواصل مع الدعم الفني.';
            if (currentUserProfile.status === 'معلق') message = 'حسابك معلق. يرجى التواصل مع مديرك أو الدعم الفني.';
            if (currentUserProfile.status === 'مرفوض') message = 'تم رفض طلبك للانضمام.';
            
            await supabaseClient.auth.signOut();
            toast({ variant: "destructive", title: "تم تسجيل الخروج", description: message });
            setDataLoading(false);
            return;
        }

        // Stage 5: Process and set the data state
        const configData = app_config_data.reduce((acc: any, row: any) => {
            acc[row.key] = row.value.value;
            return acc;
        }, {} as any);
        
        const borrowersWithData: Borrower[] = (borrowers_data || []).map((borrower: any) => ({
            ...borrower,
            fundedBy: (borrower.fundedBy || []).map((f: any) => ({ investorId: f.investor_id, amount: f.amount })),
            installments: (borrower.installments || []).map((i: any) => ({ month: i.month, status: i.status as InstallmentStatus })),
            partialPayment: borrower.partial_payment_paid_amount ? {
                paidAmount: borrower.partial_payment_paid_amount,
                remainingLoanId: borrower.partial_payment_remaining_loan_id!,
            } : undefined
        }));
        
        const usersWithBranches = (all_users_data || []).map((u: User) => ({
            ...u,
            branches: (branches_data || []).filter((b: Branch) => b.manager_id === u.id)
        }))
        
        setData({
            users: usersWithBranches,
            investors: investors_data || [],
            borrowers: borrowersWithData,
            transactions: transactions_data || [],
            notifications: notifications_data || [],
            supportTickets: support_tickets_data || [],
            salaryRepaymentPercentage: configData.salaryRepaymentPercentage ?? 0,
            baseInterestRate: configData.baseInterestRate ?? 0,
            investorSharePercentage: configData.investorSharePercentage ?? 0,
            graceTotalProfitPercentage: configData.graceTotalProfitPercentage ?? 0,
            graceInvestorSharePercentage: configData.graceInvestorSharePercentage ?? 0,
            supportEmail: configData.supportEmail ?? '',
            supportPhone: configData.supportPhone ?? '',
        });

    } catch (error: any) {
        console.error("Error in fetchData:", error);
        toast({
            variant: "destructive",
            title: "فشل في جلب البيانات",
            description: error.message || "لم نتمكن من تحميل بيانات التطبيق. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
        });
    } finally {
      setDataLoading(false);
    }
  }, [toast]);
  
  
  useEffect(() => {
    try {
      const client = getSupabaseBrowserClient();
      
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, session) => {
          setSession(session);
          if (event === 'SIGNED_IN') {
              fetchData(client);
          }
          if (event === 'SIGNED_OUT') {
              setData(initialDataState);
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
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'خطأ فادح', description: 'لا يمكن تهيئة الاتصال بقاعدة البيانات. تحقق من إعدادات البيئة.'});
        setAuthLoading(false);
        setDataLoading(false);
    }
  }, [fetchData, toast]);
  
  const currentUser = useMemo(() => {
    if (!session?.user) return undefined;
    return data.users.find((u) => u.id === session.user.id);
  }, [data.users, session]);
  
  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'مدير النظام') {
        return data.users.filter(u => u.status !== 'محذوف');
    }
    
    const managerId = currentUser.role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy;
    
    return data.users.filter(u => 
        (u.managedBy === managerId || u.id === managerId) && u.status !== 'محذوف'
    );
  }, [currentUser, data.users]);

  const signIn = useCallback(async (email: string, password?: string): Promise<SignInResult> => {
    const supabase = getSupabaseBrowserClient();
    if (!password) return { success: false, message: "بيانات غير مكتملة." };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
        }
        if (error.message.includes('Email not confirmed')) {
            return { success: false, message: 'الرجاء تأكيد بريدك الإلكتروني أولاً.', reason: 'unconfirmed_email' };
        }
        return { success: false, message: error.message };
    }
    
    if (data.user && !data.user.email_confirmed_at) {
        return { success: false, message: 'الرجاء تأكيد بريدك الإلكتروني أولاً.', reason: 'unconfirmed_email' };
    }
    
    return { success: true, message: 'جاري تسجيل الدخول...' };
  }, []);

  const signOutUser = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  },[router]);

 const registerNewOfficeManager = useCallback(async (payload: NewManagerPayload): Promise<{ success: boolean; message: string }> => {
    const supabase = getSupabaseBrowserClient();
    
    if (!payload.password) {
      return { success: false, message: 'كلمة المرور مطلوبة.' };
    }
    
    const { error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.name,
          office_name: payload.officeName,
          raw_phone_number: payload.phone,
          user_role: 'مدير المكتب',
        }
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return { success: false, message: 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.' };
      }
       if (error.message.includes('Database error saving new user')) {
        return { success: false, message: 'خطأ في قاعدة البيانات أثناء حفظ المستخدم الجديد. يرجى مراجعة إعدادات قاعدة البيانات والمشغلات (Triggers).' };
      }
      return { success: false, message: error.message || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.' };
    }
    
    return { success: true, message: 'تم استلام طلبك. يرجى التحقق من بريدك الإلكتروني للتفعيل.' };
  }, []);
  
  const addNotification = useCallback(
    async (notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
       const supabase = getSupabaseBrowserClient();
       const newNotification: Omit<Notification, 'id'> = {
         ...notification,
         date: new Date().toISOString(),
         isRead: false,
       };
       await supabase.from('notifications').insert(newNotification);
       fetchData(supabase);
    },
    [fetchData]
  );

  const clearUserNotifications = useCallback(
    async (userId: string) => {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('notifications').delete().eq('recipientId', userId);
      fetchData(supabase);
      toast({ title: 'تم حذف جميع التنبيهات' });
    },
    [toast, fetchData]
  );

  const markUserNotificationsAsRead = useCallback(async (userId: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.from('notifications').update({ isRead: true }).eq('recipientId', userId).eq('isRead', false);
    fetchData(supabase);
  }, [fetchData]);

  const updateTrialPeriod = useCallback(
    async (days: number) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('app_config').update({ value: { value: days } }).eq('key', 'defaultTrialPeriodDays');
      if (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث الفترة التجريبية." });
      } else {
        await fetchData(supabase);
        toast({
          title: 'تم التحديث',
          description: `تم تحديث الفترة التجريبية إلى ${days} يوم.`,
        });
      }
    },
    [toast, fetchData]
  );

  const updateSalaryRepaymentPercentage = useCallback(
    async (percentage: number) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('app_config').update({ value: { value: percentage } }).eq('key', 'salaryRepaymentPercentage');
      if (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث نسبة السداد." });
      } else {
        await fetchData(supabase);
        toast({ title: 'تم التحديث', description: `تم تحديث نسبة السداد من الراتب إلى ${percentage}%.` });
      }
    },
    [toast, fetchData]
  );
  const updateBaseInterestRate = useCallback(
    async (rate: number) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('app_config').update({ value: { value: rate } }).eq('key', 'baseInterestRate');
      if (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث نسبة الربح." });
      } else {
        await fetchData(supabase);
        toast({ title: 'تم التحديث', description: `تم تحديث نسبة الربح الأساسية إلى ${rate}%.` });
      }
    },
    [toast, fetchData]
  );
  const updateInvestorSharePercentage = useCallback(
    async (percentage: number) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('app_config').update({ value: { value: percentage } }).eq('key', 'investorSharePercentage');
      if (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث حصة المستثمر." });
      } else {
        await fetchData(supabase);
        toast({ title: 'تم التحديث', description: `تم تحديث حصة المستثمر من الأرباح إلى ${percentage}%.` });
      }
    },
    [toast, fetchData]
  );
  const updateGraceTotalProfitPercentage = useCallback(
    async (percentage: number) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('app_config').update({ value: { value: percentage } }).eq('key', 'graceTotalProfitPercentage');
      if (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث ربح المهلة." });
      } else {
        await fetchData(supabase);
        toast({ title: 'تم التحديث', description: `تم تحديث نسبة الربح الإجمالية لتمويل المهلة إلى ${percentage}%.` });
      }
    },
    [toast, fetchData]
  );
  const updateGraceInvestorSharePercentage = useCallback(
    async (percentage: number) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('app_config').update({ value: { value: percentage } }).eq('key', 'graceInvestorSharePercentage');
      if (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث حصة مستثمر المهلة." });
      } else {
        await fetchData(supabase);
        toast({ title: 'تم التحديث', description: `تم تحديث حصة المستثمر من أرباح المهلة إلى ${percentage}%.` });
      }
    },
    [toast, fetchData]
  );

  const updateSupportInfo = useCallback(
    async (info: { email?: string; phone?: string }) => {
      const supabase = getSupabaseBrowserClient();
      if(info.email) {
        const { error } = await supabase.from('app_config').update({ value: { value: info.email } }).eq('key', 'supportEmail');
        if (error) {
          toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث البريد الإلكتروني للدعم." });
          return;
        }
      }
      if(info.phone) {
        const { error } = await supabase.from('app_config').update({ value: { value: info.phone } }).eq('key', 'supportPhone');
        if (error) {
          toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث هاتف الدعم." });
          return;
        }
      }
      await fetchData(supabase);
      toast({ title: 'تم تحديث معلومات الدعم', description: 'تم تحديث معلومات التواصل بنجاح.' });
    },
    [toast, fetchData]
  );

  const updateBorrower = useCallback(
    async (updatedBorrower: Borrower) => {
      const supabase = getSupabaseBrowserClient();
      if (!currentUser) return;
      
      const originalBorrower = data.borrowers.find(b => b.id === updatedBorrower.id);
      if (!originalBorrower) return;
      
      const manager = data.users.find(u => u.id === currentUser.managedBy);

      if(currentUser.role === 'موظف' && !(manager?.allowEmployeeLoanEdits)) {
           toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك الصلاحية لتعديل القروض.'});
           return;
      } else if (currentUser.role === 'مساعد مدير المكتب' && !currentUser.permissions?.manageBorrowers) {
          toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لتعديل القروض.' });
          return;
      }

      if (originalBorrower.status !== 'معلق') {
          const financialFieldsChanged = updatedBorrower.amount !== originalBorrower.amount ||
                                         updatedBorrower.rate !== originalBorrower.rate ||
                                         updatedBorrower.term !== originalBorrower.term ||
                                         updatedBorrower.loanType !== originalBorrower.loanType ||
                                         updatedBorrower.dueDate !== originalBorrower.dueDate;
          if (financialFieldsChanged) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن تغيير البيانات المالية (المبلغ، الفائدة، المدة، نوع التمويل، تاريخ الاستحقاق) لقرض نشط.'});
            return;
          }
      }
      
      if (originalBorrower.paymentStatus === 'تم السداد' || originalBorrower.status === 'مرفوض') {
          toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن تعديل قرض تم سداده أو رفضه.' });
          return;
      }

      let cleanedBorrower: Partial<Borrower> = { ...updatedBorrower };
      if (updatedBorrower.loanType !== originalBorrower.loanType) {
          if (updatedBorrower.loanType === 'اقساط') {
              cleanedBorrower.discount = undefined;
          } else {
              cleanedBorrower.rate = undefined;
              cleanedBorrower.term = undefined;
              cleanedBorrower.installments = undefined;
          }
      }

      const { error } = await supabase.from('borrowers').update(cleanedBorrower).eq('id', cleanedBorrower.id!);
      if (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث القرض في قاعدة البيانات.' });
      } else {
        await fetchData(supabase);
        toast({ title: 'تم تحديث القرض' });
      }
    },
    [currentUser, data.borrowers, data.users, toast, fetchData]
  );
  
  const updateBorrowerPaymentStatus = useCallback(
    async (borrowerId: string, newPaymentStatus?: BorrowerPaymentStatus) => {
      const supabase = getSupabaseBrowserClient();
      const borrower = data.borrowers.find((b) => b.id === borrowerId);
      if (!borrower) return;
      
      if (borrower.lastStatusChange) {
          const lastChangeTime = new Date(borrower.lastStatusChange).getTime();
          const now = new Date().getTime();
          if (now - lastChangeTime < 60 * 1000) {
            toast({ variant: 'destructive', title: 'الرجاء الانتظار', description: 'يجب الانتظار دقيقة واحدة قبل تغيير حالة هذا القرض مرة أخرى.' });
            return;
          }
      }
      
      const updates: Partial<Borrower> = { paymentStatus: newPaymentStatus, lastStatusChange: new Date().toISOString() };
      
      if (newPaymentStatus === 'تم السداد') {
        updates.paidOffDate = new Date().toISOString();
        if (borrower.loanType === 'اقساط' && borrower.installments) {
          updates.installments = borrower.installments.map(inst => ({ ...inst, status: 'تم السداد' }));
        }
      } else {
        updates.paidOffDate = undefined;
      }

      const { error } = await supabase.from('borrowers').update(updates).eq('id', borrowerId);
      if (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث حالة السداد.' });
      } else {
        await fetchData(supabase);
        const toastMessage = newPaymentStatus ? `تم تحديث حالة القرض إلى "${newPaymentStatus}".` : `تمت إزالة حالة السداد للقرض.`;
        toast({ title: 'اكتمل تحديث حالة السداد', description: toastMessage });
      }
    },
    [data.borrowers, toast, fetchData]
  );
  
  const approveBorrower = useCallback(
    async (borrowerId: string, investorIds: string[]) => {
      const supabase = getSupabaseBrowserClient();
      const loanToApprove = data.borrowers.find((b) => b.id === borrowerId);
      if (!loanToApprove || loanToApprove.status !== 'معلق') {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على القرض أو تمت معالجته بالفعل.' });
        return;
      }

      let totalFundedAmount = 0;
      let remainingAmountToFund = loanToApprove.amount;
      const fundedByDetails: { investor_id: string; amount: number }[] = [];
      
      for (const invId of investorIds) {
          if (remainingAmountToFund <= 0) break;
          const currentInvestorState = data.investors.find(i => i.id === invId);
          if (!currentInvestorState) continue;
          
          const financials = calculateInvestorFinancials(currentInvestorState, data.borrowers, data.transactions);
          const availableCapital = loanToApprove.loanType === 'اقساط' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
          
          const contribution = Math.min(availableCapital, remainingAmountToFund);
          if (contribution > 0) {
              remainingAmountToFund -= contribution;
              totalFundedAmount += contribution;
              fundedByDetails.push({ investor_id: invId, amount: contribution });
          }
      }
      
      const { error } = await supabase.from('borrowers').update({ status: 'منتظم', fundedBy: fundedByDetails, amount: totalFundedAmount }).eq('id', borrowerId);
      if(error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل الموافقة على القرض.' });
      } else {
        await fetchData(supabase);
        toast({ title: 'تمت الموافقة على القرض بنجاح' });
      }
    },
    [data.borrowers, data.investors, data.transactions, toast, fetchData]
  );

  const rejectBorrower = useCallback(
    async (borrowerId: string, reason: string) => {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.from('borrowers').update({ status: 'مرفوض', rejectionReason: reason }).eq('id', borrowerId);
        if(error) {
          toast({ variant: 'destructive', title: 'خطأ', description: 'فشل رفض القرض.' });
        } else {
          await fetchData(supabase);
          toast({ variant: 'destructive', title: 'تم رفض القرض' });
        }
    },
    [toast, fetchData]
  );

  const deleteBorrower = useCallback(async (borrowerId: string) => {
    const supabase = getSupabaseBrowserClient();
    const borrowerToDelete = data.borrowers.find(b => b.id === borrowerId);
    if (!borrowerToDelete) return;

    if (borrowerToDelete.status !== 'معلق' && borrowerToDelete.status !== 'مرفوض') {
        toast({ variant: 'destructive', title: 'لا يمكن الحذف', description: 'لا يمكن حذف قرض تمت معالجته.' });
        return;
    }
    
    const { error } = await supabase.from('borrowers').delete().eq('id', borrowerId);
    if (error) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل حذف القرض.' });
    } else {
      await fetchData(supabase);
      toast({ title: 'تم الحذف', description: `تم حذف طلب القرض "${borrowerToDelete.name}" بنجاح.` });
    }
  }, [data.borrowers, toast, fetchData]);

  const addBorrower = useCallback(
    async (
      borrower: Omit<Borrower, 'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'paymentStatus' | 'fundedBy' | 'managedBy'>,
      investorIds: string[],
      force: boolean = false
    ): Promise<AddBorrowerResult> => {
      const supabase = getSupabaseBrowserClient();
      if (!currentUser) {
          return { success: false, message: 'يجب أن تكون مسجلاً للدخول.' };
      }
      
      const manager = data.users.find(u => u.id === (currentUser.role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy));
      if (!manager) {
          return { success: false, message: 'لم يتم العثور على مدير المكتب المسؤول.'};
      }
      
      if ((currentUser.role === 'موظف' || currentUser.role === 'مساعد مدير المكتب') && !manager?.allowEmployeeSubmissions) {
          toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك الصلاحية لإضافة قروض.' });
          return { success: false, message: 'غير مصرح به' };
      }

      if (!force) {
        const existingActiveLoan = data.borrowers.find(b => b.nationalId === borrower.nationalId && b.status !== 'مرفوض' && b.paymentStatus !== 'تم السداد');
        if (existingActiveLoan) {
            const loanManager = data.users.find(u => u.id === existingActiveLoan.managedBy);
            if (loanManager && loanManager.id !== manager.id) {
                return { success: false, message: 'عميل مكرر', isDuplicate: true, duplicateInfo: { borrowerName: existingActiveLoan.name, managerName: loanManager.name, managerPhone: loanManager.phone || 'غير متوفر'}};
            }
        }
      }

      const newEntry: Omit<Borrower, 'id'> = {
          ...borrower,
          date: new Date().toISOString(),
          submittedBy: currentUser.id,
          managedBy: manager.id,
          isNotified: false,
          fundedBy: [],
          installments: borrower.loanType === 'اقساط' && borrower.term && borrower.term > 0
            ? Array.from({ length: borrower.term * 12 }, (_, i) => ({ month: i + 1, status: 'لم يسدد بعد' }))
            : undefined,
      };

      const { error } = await supabase.from('borrowers').insert(newEntry);
      if (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: `فشل إضافة القرض: ${error.message}` });
        return { success: false, message: 'فشل إضافة القرض.' };
      }

      await fetchData(supabase);
      toast({ title: 'تمت إضافة القرض بنجاح.' });
      return { success: true, message: 'تمت إضافة القرض بنجاح.' };
    },
    [currentUser, data.users, data.borrowers, toast, fetchData]
  );
  
  const updateInstallmentStatus = useCallback(async (borrowerId: string, month: number, status: InstallmentStatus) => {
      const supabase = getSupabaseBrowserClient();
      const borrower = data.borrowers.find(b => b.id === borrowerId);
      if (!borrower) return;
      
      const numberOfPayments = (borrower.term || 0) * 12;
      if (borrower.loanType !== 'اقساط' || numberOfPayments === 0) return;

      const currentInstallments = borrower.installments || [];
      const installmentsMap = new Map(currentInstallments.map(i => [i.month, i]));
      
      const fullInstallments = Array.from({ length: numberOfPayments }, (_, i) => {
          const monthNum = i + 1;
          return installmentsMap.get(monthNum) || { month: monthNum, status: 'لم يسدد بعد' as InstallmentStatus };
      });

      const newInstallments = fullInstallments.map(inst => inst.month === month ? { ...inst, status } : inst);
      
      const { error } = await supabase.from('borrowers').update({ installments: newInstallments }).eq('id', borrowerId);
      if (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث حالة القسط.' });
      } else {
        await fetchData(supabase);
      }
  }, [data.borrowers, toast, fetchData]);

  const handlePartialPayment = useCallback(async (borrowerId: string, paidAmount: number) => {
    const supabase = getSupabaseBrowserClient();
    const originalBorrower = data.borrowers.find(b => b.id === borrowerId);
    if (!originalBorrower) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على القرض الأصلي.' });
        return;
    }

    const remainingAmount = originalBorrower.amount - paidAmount;
    const newLoanId = `bor_rem_${Date.now()}`;
    
    const { error: updateError } = await supabase.from('borrowers').update({ status: 'مسدد بالكامل', paymentStatus: 'تم السداد', paidOffDate: new Date().toISOString(), partial_payment_paid_amount: paidAmount, partial_payment_remaining_loan_id: newLoanId }).eq('id', borrowerId);
    
    if (updateError) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث القرض الأصلي.' });
      return;
    }

    const { error: insertError } = await supabase.from('borrowers').insert({
        id: newLoanId, name: `${originalBorrower.name}`, nationalId: originalBorrower.nationalId, phone: originalBorrower.phone, amount: remainingAmount, date: new Date().toISOString(), loanType: 'مهلة', status: 'منتظم', dueDate: new Date().toISOString().split('T')[0], submittedBy: originalBorrower.submittedBy, originalLoanId: originalBorrower.id, managedBy: originalBorrower.managedBy
    });
    
    if (insertError) {
      await supabase.from('borrowers').update({ status: originalBorrower.status, paymentStatus: originalBorrower.paymentStatus, paidOffDate: null, partial_payment_paid_amount: null, partial_payment_remaining_loan_id: null }).eq('id', borrowerId);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل إنشاء قرض بالمبلغ المتبقي.' });
      return;
    }
    
    await fetchData(supabase);
    toast({ title: 'نجاح', description: 'تم تسجيل السداد الجزئي وإنشاء قرض جديد بالمبلغ المتبقي.' });
  }, [data.borrowers, toast, fetchData]);

  const updateInvestor = useCallback(
    async (updatedInvestor: UpdatableInvestor) => {
      const supabase = getSupabaseBrowserClient();
      if (!currentUser || (currentUser.role !== 'مدير المكتب' && currentUser.role !== 'مدير النظام')) return;
      
      const { error } = await supabase.from('investors').update(updatedInvestor).eq('id', updatedInvestor.id);
      if (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث بيانات المستثمر.' });
      } else {
        await fetchData(supabase);
        toast({ title: 'تم تحديث المستثمر' });
      }
    },
    [currentUser, toast, fetchData]
  );
  
  const approveInvestor = useCallback(
    async (investorId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('investors').update({ status: 'نشط' }).eq('id', investorId);
      if (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل الموافقة على المستثمر.' });
      } else {
        await fetchData(supabase);
        toast({ title: 'تمت الموافقة على المستثمر' });
      }
    },
    [toast, fetchData]
  );

  const rejectInvestor = useCallback(
    async (investorId: string, reason: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('investors').update({ status: 'مرفوض', rejectionReason: reason }).eq('id', investorId);
      if (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل رفض المستثمر.' });
      } else {
        await fetchData(supabase);
        toast({ variant: 'destructive', title: 'تم رفض المستثمر' });
      }
    },
    [toast, fetchData]
  );

  const addInvestor = useCallback(
    async (investorPayload: NewInvestorPayload): Promise<{ success: boolean; message: string }> => {
        const supabase = getSupabaseBrowserClient();
        if (!currentUser) return { success: false, message: 'يجب تسجيل الدخول أولاً.' };
        
        try {
            const { error } = await supabase.functions.invoke('create-investor', { body: investorPayload });
            if (error) throw new Error(error.message);
            
            await fetchData(supabase);
            toast({ title: 'تمت إضافة المستثمر وإرسال دعوة له بنجاح.' });
            return { success: true, message: 'تمت إضافة المستثمر بنجاح.' };
        } catch (error: any) {
            const errorMessage = error.message.includes('already registered') ? 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.' : (error.message || 'فشل إنشاء حساب المستثمر.');
            toast({ variant: 'destructive', title: 'خطأ', description: errorMessage });
            return { success: false, message: errorMessage };
        }
    },
    [currentUser, fetchData, toast]
  );
  
  const addNewSubordinateUser = useCallback(
    async (payload: NewUserPayload, role: 'موظف' | 'مساعد مدير المكتب'): Promise<{ success: boolean, message: string }> => {
        const supabase = getSupabaseBrowserClient();
        if (!currentUser || currentUser.role !== 'مدير المكتب') {
            return { success: false, message: 'ليس لديك الصلاحية لإضافة مستخدمين.' };
        }
        
        try {
            const { error } = await supabase.functions.invoke('create-subordinate', { body: { ...payload, role } });
            if (error) throw new Error(error.message);

            await fetchData(supabase);
            toast({ title: `تمت إضافة ${role} بنجاح.` });
            return { success: true, message: `تمت إضافة ${role} بنجاح.` };
        } catch (error: any) {
            const errorMessage = error.message.includes('already registered') ? 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.' : (error.message || `فشل إنشاء حساب ${role}.`);
            toast({ variant: 'destructive', title: 'خطأ', description: errorMessage });
            return { success: false, message: errorMessage };
        }
    },
    [currentUser, fetchData, toast]
  );
  
  const updateUserIdentity = useCallback(
    async (updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
        const supabase = getSupabaseBrowserClient();
        if (!currentUser) return { success: false, message: 'فشل: لم يتم العثور على المستخدم.' };
        
        const { error: authError } = await supabase.auth.updateUser({ password: updates.password });
        if (authError) return { success: false, message: 'فشل تحديث بيانات المصادقة.' };
        
        const { error: dbError } = await supabase.from('users').update({ name: updates.name, phone: updates.phone }).eq('id', currentUser.id);
        if (dbError) return { success: false, message: 'فشل تحديث بياناتك في قاعدة البيانات.' };
        
        await fetchData(supabase);
        return { success: true, message: 'تم تحديث ملفك الشخصي بنجاح.' };
    },
    [currentUser, fetchData]
  );
  
  const updateUserCredentials = useCallback(async (userId: string, updates: { email?: string; password?: string, officeName?: string }): Promise<{ success: boolean, message: string }> => {
    const supabase = getSupabaseBrowserClient();
    try {
        const { error } = await supabase.functions.invoke('update-user-credentials', { body: { userId, updates } });
        if (error) throw new Error(error.message);
        
        await fetchData(supabase);
        toast({ title: 'نجاح', description: `تم تحديث بيانات الدخول.` });
        return { success: true, message: "تم تحديث البيانات بنجاح." };
    } catch (error: any) {
        const errorMessage = error.message.includes('already registered') ? 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.' : (error.message || 'فشل تحديث بيانات المستخدم.');
        toast({ variant: 'destructive', title: 'خطأ', description: errorMessage });
        return { success: false, message: errorMessage };
    }
  }, [fetchData, toast]);


  const addInvestorTransaction = useCallback(
    async (investorId: string, transaction: Omit<Transaction, 'id' | 'investor_id'>) => {
      const supabase = getSupabaseBrowserClient();
      const investor = data.investors.find(i => i.id === investorId);
      if (!investor) return;

      if (transaction.type.includes('سحب')) {
          const financials = calculateInvestorFinancials(investor, data.borrowers, data.transactions);
          const availableCapital = transaction.capitalSource === 'installment' ? financials.idleInstallmentCapital : financials.idleGraceCapital;
          if (transaction.amount > availableCapital) {
              toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: `الرصيد الخامل المتاح (${formatCurrency(availableCapital)}) أقل من المبلغ المطلوب.` });
              return;
          }
      }
      
      const newTransaction: Omit<Transaction, 'id'> = { ...transaction, investor_id: investorId };
      const { error } = await supabase.from('transactions').insert(newTransaction);
      if (error) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل إضافة العملية المالية.' });
      } else {
        await fetchData(supabase);
        toast({ title: 'تمت إضافة العملية المالية بنجاح' });
      }
    },
    [data.investors, data.borrowers, data.transactions, toast, fetchData]
  );

  const updateUserStatus = useCallback(
    async (userId: string, status: User['status']) => {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('users').update({ status }).eq('id', userId);
      await fetchData(supabase);
      toast({ title: `تم تحديث حالة المستخدم إلى "${status}"`});
    },
    [toast, fetchData]
  );
  
  const updateUserRole = useCallback(async (userId: string, role: UserRole) => {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('users').update({ role }).eq('id', userId);
      await fetchData(supabase);
      toast({title: `تم تحديث دور المستخدم.`});
  }, [toast, fetchData]);
  
  const deleteUser = useCallback(async (userId: string) => {
      const supabase = getSupabaseBrowserClient();
      const userToDelete = data.users.find(u => u.id === userId);
      if (!userToDelete) return;
      
      if (userToDelete.role === 'مستثمر') {
          const investorProfile = data.investors.find(i => i.id === userId);
          if (investorProfile) {
              const financials = calculateInvestorFinancials(investorProfile, data.borrowers, data.transactions);
              if(financials.activeCapital > 0 || financials.idleInstallmentCapital > 0 || financials.idleGraceCapital > 0) {
                   toast({ variant: 'destructive', title: 'لا يمكن الحذف', description: 'لا يمكن حذف مستثمر لديه أموال نشطة أو خاملة.'});
                   return;
              }
          }
      }
      
      await supabase.from('users').update({ status: 'محذوف' }).eq('id', userId);
      await fetchData(supabase);
      toast({title: `تم حذف حساب ${userToDelete.name} بنجاح.`});
  }, [data.users, data.investors, data.borrowers, data.transactions, toast, fetchData]);
  
  const updateUserLimits = useCallback(async (userId: string, limits: { investorLimit: number; employeeLimit: number; assistantLimit: number; branchLimit: number }) => {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('users').update(limits).eq('id', userId);
      await fetchData(supabase);
      toast({title: "تم تحديث الحدود بنجاح."});
  }, [toast, fetchData]);
  
  const updateManagerSettings = useCallback(async (managerId: string, settings: { allowEmployeeSubmissions?: boolean; hideEmployeeInvestorFunds?: boolean, allowEmployeeLoanEdits?: boolean }) => {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('users').update(settings).eq('id', managerId);
      await fetchData(supabase);
       toast({title: "تم تحديث إعدادات المكتب."});
  }, [toast, fetchData]);
  
  const updateAssistantPermission = useCallback(async (assistantId: string, key: PermissionKey, value: boolean) => {
      const supabase = getSupabaseBrowserClient();
      const assistant = data.users.find(u => u.id === assistantId);
      if (!assistant) return;
      const newPermissions = { ...assistant.permissions, [key]: value };
      await supabase.from('users').update({ permissions: newPermissions }).eq('id', assistantId);
      await fetchData(supabase);
  }, [data.users, fetchData]);

  const updateEmployeePermission = useCallback(async (employeeId: string, key: PermissionKey, value: boolean) => {
      const supabase = getSupabaseBrowserClient();
      const employee = data.users.find(u => u.id === employeeId);
      if (!employee) return;
      const newPermissions = { ...employee.permissions, [key]: value };
      await supabase.from('users').update({ permissions: newPermissions }).eq('id', employeeId);
      await fetchData(supabase);
  }, [data.users, fetchData]);
  
  const addSupportTicket = useCallback(async (ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead' | 'isReplied'>) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.from('support_tickets').insert(ticket);
    await fetchData(supabase);
    toast({ title: 'تم إرسال رسالتك بنجاح' });
  }, [toast, fetchData]);
  
  const requestCapitalIncrease = useCallback((investorId: string) => {
      if(!currentUser) return;
      const investor = data.investors.find(i => i.id === investorId);
      if(!investor) return;
      const subject = `طلب زيادة رأس مال لـ: ${investor.name}`;
      const message = `طلب مدير المكتب: ${currentUser.name} زيادة رأس المال للمستثمر ${investor.name}.`;
      addSupportTicket({ fromUserId: currentUser.id, fromUserName: currentUser.name, fromUserEmail: currentUser.email, subject, message });
  }, [addSupportTicket, currentUser, data.investors]);
  
  const deleteSupportTicket = useCallback(async (ticketId: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.from('support_tickets').delete().eq('id', ticketId);
    await fetchData(supabase);
    toast({ title: 'تم حذف رسالة الدعم.' });
  }, [toast, fetchData]);
  
  const replyToSupportTicket = useCallback(async (ticketId: string, replyMessage: string) => {
      const supabase = getSupabaseBrowserClient();
      const ticket = data.supportTickets.find(t => t.id === ticketId);
      if(!ticket) return;
      
      await supabase.from('notifications').insert({ recipientId: ticket.fromUserId, title: `رد على رسالتك: ${ticket.subject}`, description: replyMessage });
      await supabase.from('support_tickets').update({ isReplied: true, isRead: true }).eq('id', ticketId);
      
      await fetchData(supabase);
      toast({title: 'تم إرسال الرد بنجاح.'});
  }, [data.supportTickets, toast, fetchData]);
  
  const markBorrowerAsNotified = useCallback(async (borrowerId: string, message: string) => {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('borrowers').update({ isNotified: true }).eq('id', borrowerId);
      await fetchData(supabase);
       toast({ title: 'تم إرسال الرسالة بنجاح (محاكاة)' });
  }, [toast, fetchData]);

  const markInvestorAsNotified = useCallback(async (investorId: string, message: string) => {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('investors').update({ isNotified: true }).eq('id', investorId);
      await fetchData(supabase);
       toast({ title: 'تم إرسال الرسالة بنجاح (محاكاة)' });
  }, [toast, fetchData]);
  
  const addBranch = useCallback(async (branch: Omit<Branch, 'id'>): Promise<{success: boolean, message: string}> => {
    const supabase = getSupabaseBrowserClient();
    if (!currentUser || currentUser.role !== 'مدير المكتب') return {success: false, message: 'غير مصرح به.'};
    if((currentUser.branches?.length ?? 0) >= (currentUser.branchLimit ?? 0)) return {success: false, message: 'لقد وصلت إلى الحد الأقصى.'};

    const { error } = await supabase.from('branches').insert({ ...branch, manager_id: currentUser.id });
    if (error) return {success: false, message: 'فشل في إضافة الفرع.'};
    
    await fetchData(supabase);
    toast({title: 'تمت إضافة الفرع بنجاح.'});
    return {success: true, message: 'تمت إضافة الفرع بنجاح.'};
  }, [currentUser, toast, fetchData]);
  
  const deleteBranch = useCallback(async (branchId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
      if (error) {
        toast({variant: 'destructive', title: 'خطأ', description: 'فشل في حذف الفرع.'});
      } else {
        await fetchData(supabase);
        toast({title: 'تم حذف الفرع بنجاح.'});
      }
  }, [toast, fetchData]);
  
  const value = useMemo(() => ({
      currentUser, session, authLoading, dataLoading, ...data, visibleUsers,
      signIn, signOutUser, registerNewOfficeManager, addBranch, deleteBranch, updateSupportInfo,
      updateBaseInterestRate, updateInvestorSharePercentage, updateSalaryRepaymentPercentage,
      updateGraceTotalProfitPercentage, updateGraceInvestorSharePercentage, updateTrialPeriod,
      addSupportTicket, deleteSupportTicket, replyToSupportTicket, addBorrower, updateBorrower,
      updateBorrowerPaymentStatus, approveBorrower, rejectBorrower, deleteBorrower, updateInstallmentStatus,
      handlePartialPayment, addInvestor, addNewSubordinateUser, updateInvestor, approveInvestor, rejectInvestor,
      addInvestorTransaction, updateUserIdentity, updateUserCredentials, updateUserStatus, updateUserRole,
      updateUserLimits, updateManagerSettings, updateAssistantPermission, updateEmployeePermission,
      requestCapitalIncrease, deleteUser, clearUserNotifications, markUserNotificationsAsRead,
      markBorrowerAsNotified, markInvestorAsNotified,
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
      signIn, signOutUser, registerNewOfficeManager, addBranch, deleteBranch, updateSupportInfo,
      updateBaseInterestRate, updateInvestorSharePercentage, updateSalaryRepaymentPercentage,
      updateGraceTotalProfitPercentage, updateGraceInvestorSharePercentage, updateTrialPeriod,
      addSupportTicket, deleteSupportTicket, replyToSupportTicket, addBorrower, updateBorrower,
      updateBorrowerPaymentStatus, approveBorrower, rejectBorrower, deleteBorrower, updateInstallmentStatus,
      handlePartialPayment, addInvestor, addNewSubordinateUser, updateInvestor, approveInvestor, rejectInvestor,
      addInvestorTransaction, updateUserIdentity, updateUserCredentials, updateUserStatus, updateUserRole,
      updateUserLimits, updateManagerSettings, updateAssistantPermission, updateEmployeePermission,
      requestCapitalIncrease, deleteUser, clearUserNotifications, markUserNotificationsAsRead,
      markBorrowerAsNotified, markInvestorAsNotified,
    } = context;
    
    return {
      signIn, signOutUser, registerNewOfficeManager, addBranch, deleteBranch, updateSupportInfo,
      updateBaseInterestRate, updateInvestorSharePercentage, updateSalaryRepaymentPercentage,
      updateGraceTotalProfitPercentage, updateGraceInvestorSharePercentage, updateTrialPeriod,
      addSupportTicket, deleteSupportTicket, replyToSupportTicket, addBorrower, updateBorrower,
      updateBorrowerPaymentStatus, approveBorrower, rejectBorrower, deleteBorrower, updateInstallmentStatus,
      handlePartialPayment, addInvestor, addNewSubordinateUser, updateInvestor, approveInvestor, rejectInvestor,
      addInvestorTransaction, updateUserIdentity, updateUserCredentials, updateUserStatus, updateUserRole,
      updateUserLimits, updateManagerSettings, updateAssistantPermission, updateEmployeePermission,
      requestCapitalIncrease, deleteUser, clearUserNotifications, markUserNotificationsAsRead,
      markBorrowerAsNotified, markInvestorAsNotified,
    };
}
