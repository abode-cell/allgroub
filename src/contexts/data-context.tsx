

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

        // Step 1: Fetch the current user's profile from 'users' table. This is the most crucial step.
        const { data: currentUserProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (profileError || !currentUserProfile) {
            throw new Error(`فشل في جلب ملف المستخدم: ${profileError?.message || 'المستخدم غير موجود'}`);
        }

        // Step 2: Check user status. If not active, sign out and stop.
        if (currentUserProfile.status !== 'نشط') {
            let message = 'حسابك غير نشط حاليًا. يرجى التواصل مع الدعم الفني.';
            if (currentUserProfile.status === 'معلق') message = 'حسابك معلق. يرجى التواصل مع مديرك أو الدعم الفني.';
            if (currentUserProfile.status === 'مرفوض') message = 'تم رفض طلبك للانضمام.';
            
            await supabaseClient.auth.signOut();
            toast({ variant: "destructive", title: "تم تسجيل الخروج", description: message });
            setDataLoading(false);
            return;
        }

        // Step 3: Now that we have a valid, active user, fetch all other data.
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
        
        if (usersError || investorsError || borrowersError || transactionsError || notificationsError || supportTicketsError || appConfigError || branchesError) {
          console.error({usersError, investorsError, borrowersError, transactionsError, notificationsError, supportTicketsError, appConfigError, branchesError});
          throw new Error('فشل في جلب أحد الموارد الثانوية.');
        }

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
    return data.users.filter(u => u.status !== 'محذوف');
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
          user_role: 'مدير المكتب', // Correctly passing user_role here
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
    async (investorPayload: NewInvestorPayload): Promise<{ success: boolean; message: string }> => {
        const supabase = getSupabaseBrowserClient();
        if (!currentUser) return { success: false, message: 'يجب تسجيل الدخول أولاً.' };
        
        const {data: { session }} = await supabase.auth.getSession();
        if (!session) return { success: false, message: "No active session" };

        if ((currentUser.role === 'موظف' || currentUser.role === 'مساعد مدير المكتب') && !currentUser.permissions?.manageInvestors) {
           toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك الصلاحية لإضافة مستثمرين.' });
           return { success: false, message: 'ليس لديك الصلاحية لإضافة مستثمرين.' };
        }
      
        const manager = data.users.find(u => u.id === (currentUser.role === 'مدير المكتب' ? currentUser.id : currentUser.managedBy));
        if (manager) {
            const investorsAddedByManager = data.investors.filter(i => {
                const investorUser = data.users.find(u => u.id === i.id);
                return investorUser?.managedBy === manager.id;
            }).length;
            if (investorsAddedByManager >= (manager.investorLimit ?? 0)) {
                const message = `لقد وصل مدير المكتب للحد الأقصى للمستثمرين (${manager.investorLimit}).`;
                toast({ variant: 'destructive', title: 'خطأ', description: message });
                return { success: false, message: message };
            }
        }
        
        try {
            const { error } = await supabase.functions.invoke('create-investor', { 
                body: investorPayload,
            });
            if (error) throw new Error(error.message);
            
            await fetchData(supabase);
            toast({ title: 'تمت إضافة المستثمر وإرسال دعوة له بنجاح.' });
            return { success: true, message: 'تمت إضافة المستثمر بنجاح.' };
        } catch (error: any) {
             console.error("Create Investor Error:", error);
            const errorMessage = error.message.includes('already registered')
                ? 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.'
                : (error.message || 'فشل إنشاء حساب المستثمر. يرجى المحاولة مرة أخرى.');
            toast({ variant: 'destructive', title: 'خطأ', description: errorMessage });
            return { success: false, message: errorMessage };
        }
    },
    [currentUser, data.users, data.investors, fetchData, toast]
  );
  
  const addNewSubordinateUser = useCallback(
    async (payload: NewUserPayload, role: 'موظف' | 'مساعد مدير المكتب'): Promise<{ success: boolean, message: string }> => {
        const supabase = getSupabaseBrowserClient();
        if (!currentUser || currentUser.role !== 'مدير المكتب') {
            const message = 'ليس لديك الصلاحية لإضافة مستخدمين.';
            toast({ variant: 'destructive', title: 'خطأ', description: message });
            return { success: false, message };
        }
        
        try {
            const { error } = await supabase.functions.invoke('create-subordinate', { 
              body: { ...payload, role },
            });
            if (error) throw new Error(error.message);

            await fetchData(supabase);
            toast({ title: `تمت إضافة ${role} بنجاح وإرسال دعوة له.` });
            return { success: true, message: `تمت إضافة ${role} بنجاح.` };
        } catch (error: any) {
            console.error(`Create ${role} Error:`, error);
            const errorMessage = error.message.includes('already registered')
                ? 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.'
                : (error.message || `فشل إنشاء حساب ${role}. يرجى المحاولة مرة أخرى.`);
            toast({ variant: 'destructive', title: 'خطأ', description: errorMessage });
            return { success: false, message: errorMessage };
        }
    },
    [currentUser, fetchData, toast]
  );
  
  const updateUserIdentity = useCallback(
    async (updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
        const supabase = getSupabaseBrowserClient();
        if (!currentUser) {
          return { success: false, message: 'فشل: لم يتم العثور على المستخدم.' };
        }
        
        const {data: { user }, error: authError } = await supabase.auth.updateUser({
            password: updates.password
        });
        
        if (authError) {
          console.error("Auth update error:", authError);
          return { success: false, message: 'فشل تحديث بيانات المصادقة.' };
        }
        
        const { error: dbError } = await supabase.from('users').update({ name: updates.name, phone: updates.phone }).eq('id', currentUser.id);

        if (dbError) {
            console.error("DB update error:", dbError);
            return { success: false, message: 'فشل تحديث بياناتك في قاعدة البيانات.' };
        }
        
        await fetchData(supabase);
        return { success: true, message: 'تم تحديث ملفك الشخصي بنجاح.' };
    },
    [currentUser, fetchData]
  );
  
  const updateUserCredentials = useCallback(async (
    userId: string,
    updates: { email?: string; password?: string, officeName?: string }
  ): Promise<{ success: boolean, message: string }> => {
    const supabase = getSupabaseBrowserClient();
    if (!currentUser) return { success: false, message: "غير مصرح به." };
    
    try {
        const { error } = await supabase.functions.invoke('update-user-credentials', { 
            body: { userId, updates },
        });
        if (error) throw new Error(error.message);
        
        await fetchData(supabase);
        toast({ title: 'نجاح', description: `تم تحديث بيانات الدخول.` });
        return { success: true, message: "تم تحديث البيانات بنجاح." };

    } catch (error: any) {
        console.error("Update User Credentials Error:", error);
        const errorMessage = error.message.includes('already registered')
            ? 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.'
            : (error.message || 'فشل تحديث بيانات المستخدم.');
        toast({ variant: 'destructive', title: 'خطأ', description: errorMessage });
        return { success: false, message: errorMessage };
    }
  }, [currentUser, toast, fetchData]);


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
      
      const supabase = getSupabaseBrowserClient();
      const userToUpdate = data.users.find(u => u.id === userId);
      if (!userToUpdate) return;
      
      const { error: userError } = await supabase
        .from('users')
        .update({ status: status })
        .eq('id', userId);
        
      if (userError) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث حالة المستخدم في قاعدة البيانات." });
        console.error("Error updating user status:", userError);
        return;
      }

      if (userToUpdate.role === 'مستثمر') {
        const investorStatus: Investor['status'] = status === 'محذوف' ? 'محذوف' : (status === 'نشط' ? 'نشط' : 'غير نشط');
        const { error: investorError } = await supabase
          .from('investors')
          .update({ status: investorStatus })
          .eq('id', userId);
          
        if (investorError) {
            toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث حالة المستثمر في قاعدة البيانات." });
            console.error("Error updating investor status:", investorError);
            return;
        }
      }
      
      await fetchData(supabase);
      toast({ title: `تم تحديث حالة ${userToUpdate.name} إلى "${status}"`});
    },
    [currentUser, data.users, toast, fetchData]
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
    const supabase = getSupabaseBrowserClient();
    if (!currentUser || currentUser.role !== 'مدير المكتب') {
        toast({variant: 'destructive', title: 'خطأ', description: 'غير مصرح به.'});
        return {success: false, message: 'غير مصرح به.'};
    }

    if((currentUser.branches?.length ?? 0) >= (currentUser.branchLimit ?? 0)) {
        toast({variant: 'destructive', title: 'خطأ', description: 'لقد وصلت إلى الحد الأقصى لعدد الفروع.'});
        return {success: false, message: 'لقد وصلت إلى الحد الأقصى لعدد الفروع.'};
    }

    const { error } = await supabase.from('branches').insert({ ...branch, manager_id: currentUser.id });

    if (error) {
        console.error("Error adding branch:", error);
        toast({variant: 'destructive', title: 'خطأ', description: 'فشل في إضافة الفرع.'});
        return {success: false, message: 'فشل في إضافة الفرع.'};
    }
    
    await fetchData(supabase);
    toast({title: 'تمت إضافة الفرع بنجاح.'});
    return {success: true, message: 'تمت إضافة الفرع بنجاح.'};
  }, [currentUser, toast, fetchData]);
  
  const deleteBranch = useCallback(async (branchId: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!currentUser || currentUser.role !== 'مدير المكتب') return;
      
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
      if (error) {
          console.error("Error deleting branch:", error);
          toast({variant: 'destructive', title: 'خطأ', description: 'فشل في حذف الفرع.'});
          return;
      }
      
      await fetchData(supabase);
      toast({title: 'تم حذف الفرع بنجاح.'});
  }, [currentUser, toast, fetchData]);
  
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
