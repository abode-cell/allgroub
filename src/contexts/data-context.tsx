'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import type { 
  User, 
  Borrower, 
  Investor, 
  Transaction, 
  SupportTicket, 
  Notification, 
  NewUserPayload, 
  NewManagerPayload, 
  NewInvestorPayload, 
  UpdatableInvestor, 
  AddBorrowerResult,
  Office,
  Branch,
  BorrowerPaymentStatus,
  InstallmentStatus
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface DataState {
  // Auth state
  session: Session | null;
  authLoading: boolean;
  dataLoading: boolean;
  
  // User data
  currentUser: User | null;
  users: User[];
  visibleUsers: User[];
  
  // Business data
  borrowers: Borrower[];
  investors: Investor[];
  transactions: Transaction[];
  notifications: Notification[];
  supportTickets: SupportTicket[];
  offices: Office[];
  branches: Branch[];
  
  // App configuration
  baseInterestRate: number;
  investorSharePercentage: number;
  salaryRepaymentPercentage: number;
  graceTotalProfitPercentage: number;
  graceInvestorSharePercentage: number;
  supportEmail: string;
  supportPhone: string;
}

interface DataActions {
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string; reason?: string }>;
  signOutUser: () => Promise<void>;
  registerNewOfficeManager: (payload: NewManagerPayload) => Promise<{ success: boolean; message: string }>;
  
  // User management
  addUser: (payload: NewUserPayload) => Promise<{ success: boolean; message: string }>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  updateUserStatus: (userId: string, status: User['status']) => Promise<void>;
  updateUserCredentials: (userId: string, updates: { email?: string; password?: string }) => Promise<{ success: boolean; message: string }>;
  updateUserIdentity: (updates: { name?: string; phone?: string; password?: string }) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<void>;
  
  // Business actions
  addBorrower: (borrower: Omit<Borrower, 'id' | 'date' | 'fundedBy'>, investorIds: string[], force?: boolean) => Promise<AddBorrowerResult>;
  updateBorrower: (borrower: Borrower) => Promise<void>;
  updateBorrowerPaymentStatus: (borrowerId: string, paymentStatus?: BorrowerPaymentStatus) => Promise<void>;
  updateInstallmentStatus: (borrowerId: string, month: number, status: InstallmentStatus) => Promise<void>;
  deleteBorrower: (borrowerId: string) => Promise<void>;
  handlePartialPayment: (borrowerId: string, paidAmount: number) => Promise<void>;
  markBorrowerAsNotified: (borrowerId: string, message: string) => Promise<void>;
  
  addInvestor: (payload: NewInvestorPayload) => Promise<{ success: boolean; message: string }>;
  updateInvestor: (investor: UpdatableInvestor) => Promise<void>;
  approveInvestor: (investorId: string) => Promise<void>;
  rejectInvestor: (investorId: string, reason: string) => Promise<void>;
  addInvestorTransaction: (investorId: string, transaction: Omit<Transaction, 'id' | 'investor_id' | 'office_id'>) => Promise<void>;
  requestCapitalIncrease: (investorId: string) => Promise<void>;
  markInvestorAsNotified: (investorId: string, message: string) => Promise<void>;
  
  approveBorrower: (borrowerId: string, investorIds: string[]) => Promise<void>;
  rejectBorrower: (borrowerId: string, reason: string) => Promise<void>;
  
  // Configuration
  updateBaseInterestRate: (rate: number) => Promise<void>;
  updateInvestorSharePercentage: (percentage: number) => Promise<void>;
  updateSalaryRepaymentPercentage: (percentage: number) => Promise<void>;
  updateGraceTotalProfitPercentage: (percentage: number) => Promise<void>;
  updateGraceInvestorSharePercentage: (percentage: number) => Promise<void>;
  updateSupportInfo: (info: { email: string; phone: string }) => Promise<void>;
  updateTrialPeriod: (days: number) => Promise<void>;
  
  // Support and notifications
  addSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead' | 'isReplied'>) => Promise<void>;
  deleteSupportTicket: (ticketId: string) => Promise<void>;
  replyToSupportTicket: (ticketId: string, reply: string) => Promise<void>;
  markUserNotificationsAsRead: (userId: string) => Promise<void>;
  clearUserNotifications: (userId: string) => Promise<void>;
  
  // Office and branch management
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<void>;
  updateBranch: (branchId: string, updates: Partial<Branch>) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);
const DataActionsContext = createContext<DataActions | null>(null);

const initialState: DataState = {
  session: null,
  authLoading: true,
  dataLoading: true,
  currentUser: null,
  users: [],
  visibleUsers: [],
  borrowers: [],
  investors: [],
  transactions: [],
  notifications: [],
  supportTickets: [],
  offices: [],
  branches: [],
  baseInterestRate: 15,
  investorSharePercentage: 70,
  salaryRepaymentPercentage: 65,
  graceTotalProfitPercentage: 25,
  graceInvestorSharePercentage: 33.3,
  supportEmail: 'qzmpty678@gmail.com',
  supportPhone: '0598360380',
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(initialState);
  const { toast } = useToast();
  const supabase = getSupabaseBrowserClient();

  // Helper function to generate unique IDs
  const generateId = useCallback(() => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, dataLoading: true }));

      const [
        { data: users },
        { data: borrowers },
        { data: investors },
        { data: transactions },
        { data: notifications },
        { data: supportTickets },
        { data: offices },
        { data: branches },
        { data: appConfig }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('borrowers').select('*'),
        supabase.from('investors').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('support_tickets').select('*'),
        supabase.from('offices').select('*'),
        supabase.from('branches').select('*'),
        supabase.from('app_config').select('*')
      ]);

      // Parse app configuration
      const config = (appConfig || []).reduce((acc, item) => {
        acc[item.key] = item.value.value;
        return acc;
      }, {} as any);

      setState(prev => ({
        ...prev,
        users: users || [],
        visibleUsers: users || [],
        borrowers: borrowers || [],
        investors: investors || [],
        transactions: transactions || [],
        notifications: notifications || [],
        supportTickets: supportTickets || [],
        offices: offices || [],
        branches: branches || [],
        baseInterestRate: config.baseInterestRate || 15,
        investorSharePercentage: config.investorSharePercentage || 70,
        salaryRepaymentPercentage: config.salaryRepaymentPercentage || 65,
        graceTotalProfitPercentage: config.graceTotalProfitPercentage || 25,
        graceInvestorSharePercentage: config.graceInvestorSharePercentage || 33.3,
        supportEmail: config.supportEmail || 'qzmpty678@gmail.com',
        supportPhone: config.supportPhone || '0598360380',
        dataLoading: false,
      }));
    } catch (error) {
      console.error('Error loading data:', error);
      setState(prev => ({ ...prev, dataLoading: false }));
    }
  }, [supabase]);

  // Auth state management
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            session, 
            authLoading: false 
          }));

          if (session?.user) {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (mounted && userData) {
              setState(prev => ({ 
                ...prev, 
                currentUser: userData 
              }));
              await loadData();
            }
          } else {
            setState(prev => ({ ...prev, dataLoading: false }));
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            authLoading: false, 
            dataLoading: false 
          }));
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setState(prev => ({ ...prev, session }));

        if (event === 'SIGNED_IN' && session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData) {
            setState(prev => ({ ...prev, currentUser: userData }));
            await loadData();
          }
        } else if (event === 'SIGNED_OUT') {
          setState(prev => ({ 
            ...prev, 
            currentUser: null,
            users: [],
            visibleUsers: [],
            borrowers: [],
            investors: [],
            transactions: [],
            notifications: [],
            supportTickets: [],
            offices: [],
            branches: [],
          }));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadData]);

  // Auth actions
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          return { success: false, message: 'يرجى تأكيد بريدك الإلكتروني أولاً.', reason: 'unconfirmed_email' };
        }
        return { success: false, message: 'بيانات الدخول غير صحيحة.' };
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userData?.status === 'معلق') {
          await supabase.auth.signOut();
          return { success: false, message: 'حسابك قيد المراجعة.', reason: 'pending_review' };
        }

        if (userData?.status === 'مرفوض') {
          await supabase.auth.signOut();
          return { success: false, message: 'تم رفض حسابك. يرجى التواصل مع الدعم.' };
        }

        if (userData?.status === 'محذوف') {
          await supabase.auth.signOut();
          return { success: false, message: 'هذا الحساب غير نشط.' };
        }
      }

      return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول.' };
    }
  }, [supabase]);

  const signOutUser = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setState(initialState);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [supabase]);

  const registerNewOfficeManager = useCallback(async (payload: NewManagerPayload) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-office-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, message: result.message || 'فشل في إنشاء الحساب.' };
      }

      return { success: true, message: result.message };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'حدث خطأ أثناء إنشاء الحساب.' };
    }
  }, []);

  // User management actions
  const addUser = useCallback(async (payload: NewUserPayload) => {
    try {
      if (!state.currentUser?.office_id) {
        throw new Error('معرف المكتب غير متوفر.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-subordinate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ...payload,
          office_id: state.currentUser.office_id,
          managed_by: state.currentUser.id,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, message: result.message || 'فشل في إضافة المستخدم.' };
      }

      await loadData();
      toast({ title: 'نجاح', description: 'تم إضافة المستخدم بنجاح.' });
      return { success: true, message: 'تم إضافة المستخدم بنجاح.' };
    } catch (error) {
      console.error('Add user error:', error);
      return { success: false, message: 'حدث خطأ أثناء إضافة المستخدم.' };
    }
  }, [state.currentUser, supabase, loadData, toast]);

  const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === userId ? { ...user, ...updates } : user
        ),
        visibleUsers: prev.visibleUsers.map(user => 
          user.id === userId ? { ...user, ...updates } : user
        ),
        currentUser: prev.currentUser?.id === userId 
          ? { ...prev.currentUser, ...updates } 
          : prev.currentUser
      }));

      toast({ title: 'نجاح', description: 'تم تحديث المستخدم بنجاح.' });
    } catch (error) {
      console.error('Update user error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث المستخدم.' });
    }
  }, [supabase, toast]);

  const updateUserStatus = useCallback(async (userId: string, status: User['status']) => {
    await updateUser(userId, { status });
  }, [updateUser]);

  const updateUserCredentials = useCallback(async (userId: string, updates: { email?: string; password?: string }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-user-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ userId, updates }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, message: result.message || 'فشل في تحديث البيانات.' };
      }

      if (updates.email) {
        await updateUser(userId, { email: updates.email });
      }

      return { success: true, message: 'تم تحديث البيانات بنجاح.' };
    } catch (error) {
      console.error('Update credentials error:', error);
      return { success: false, message: 'حدث خطأ أثناء تحديث البيانات.' };
    }
  }, [updateUser]);

  const updateUserIdentity = useCallback(async (updates: { name?: string; phone?: string; password?: string }) => {
    try {
      if (!state.currentUser) {
        return { success: false, message: 'المستخدم غير مسجل الدخول.' };
      }

      if (updates.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: updates.password
        });
        if (passwordError) throw passwordError;
      }

      if (updates.name || updates.phone) {
        const { error: profileError } = await supabase
          .from('users')
          .update({
            ...(updates.name && { name: updates.name }),
            ...(updates.phone && { phone: updates.phone })
          })
          .eq('id', state.currentUser.id);

        if (profileError) throw profileError;

        setState(prev => ({
          ...prev,
          currentUser: prev.currentUser ? {
            ...prev.currentUser,
            ...(updates.name && { name: updates.name }),
            ...(updates.phone && { phone: updates.phone })
          } : null
        }));
      }

      return { success: true, message: 'تم تحديث البيانات بنجاح.' };
    } catch (error) {
      console.error('Update identity error:', error);
      return { success: false, message: 'فشل في تحديث البيانات.' };
    }
  }, [state.currentUser, supabase]);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      await updateUser(userId, { status: 'محذوف' });
      toast({ title: 'نجاح', description: 'تم حذف المستخدم بنجاح.' });
    } catch (error) {
      console.error('Delete user error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في حذف المستخدم.' });
    }
  }, [updateUser, toast]);

  // Borrower management
  const addBorrower = useCallback(async (
    borrower: Omit<Borrower, 'id' | 'date' | 'fundedBy'>, 
    investorIds: string[], 
    force: boolean = false
  ): Promise<AddBorrowerResult> => {
    try {
      if (!state.currentUser?.office_id) {
        return { success: false, message: 'معرف المكتب غير متوفر.' };
      }

      // Check for duplicate borrower
      if (!force) {
        const { data: duplicateData } = await supabase
          .rpc('check_duplicate_borrower', {
            p_national_id: borrower.nationalId,
            p_office_id: state.currentUser.office_id
          });

        if (duplicateData && duplicateData.length > 0) {
          const duplicate = duplicateData[0];
          return {
            success: false,
            message: 'عميل مسجل مسبقاً',
            isDuplicate: true,
            duplicateInfo: {
              borrowerName: duplicate.borrower_name,
              managerName: duplicate.manager_name,
              managerPhone: duplicate.manager_phone
            }
          };
        }
      }

      const borrowerId = `bor_${generateId()}`;
      const fundedBy = investorIds.map(id => ({ investorId: id, amount: 0 }));

      const newBorrower: Borrower = {
        ...borrower,
        id: borrowerId,
        office_id: state.currentUser.office_id,
        branch_id: state.currentUser.branch_id || null,
        date: new Date().toISOString(),
        fundedBy,
        submittedBy: state.currentUser.id,
        managedBy: state.currentUser.managedBy || state.currentUser.id,
      };

      const { error } = await supabase
        .from('borrowers')
        .insert(newBorrower);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        borrowers: [...prev.borrowers, newBorrower]
      }));

      toast({ title: 'نجاح', description: 'تم إضافة القرض بنجاح.' });
      return { success: true, message: 'تم إضافة القرض بنجاح.' };
    } catch (error) {
      console.error('Add borrower error:', error);
      return { success: false, message: 'فشل في إضافة القرض.' };
    }
  }, [state.currentUser, supabase, generateId, toast]);

  const updateBorrower = useCallback(async (borrower: Borrower) => {
    try {
      const { error } = await supabase
        .from('borrowers')
        .update(borrower)
        .eq('id', borrower.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        borrowers: prev.borrowers.map(b => 
          b.id === borrower.id ? borrower : b
        )
      }));

      toast({ title: 'نجاح', description: 'تم تحديث القرض بنجاح.' });
    } catch (error) {
      console.error('Update borrower error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث القرض.' });
    }
  }, [supabase, toast]);

  const updateBorrowerPaymentStatus = useCallback(async (borrowerId: string, paymentStatus?: BorrowerPaymentStatus) => {
    try {
      const updates: any = { 
        paymentStatus,
        lastStatusChange: new Date().toISOString()
      };

      if (paymentStatus === 'تم السداد') {
        updates.paidOffDate = new Date().toISOString();
        updates.status = 'مسدد بالكامل';
      }

      const { error } = await supabase
        .from('borrowers')
        .update(updates)
        .eq('id', borrowerId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        borrowers: prev.borrowers.map(b => 
          b.id === borrowerId ? { ...b, ...updates } : b
        )
      }));

      toast({ title: 'نجاح', description: 'تم تحديث حالة السداد.' });
    } catch (error) {
      console.error('Update payment status error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث حالة السداد.' });
    }
  }, [supabase, toast]);

  const updateInstallmentStatus = useCallback(async (borrowerId: string, month: number, status: InstallmentStatus) => {
    try {
      const borrower = state.borrowers.find(b => b.id === borrowerId);
      if (!borrower) return;

      const updatedInstallments = [...(borrower.installments || [])];
      const existingIndex = updatedInstallments.findIndex(i => i.month === month);

      if (existingIndex >= 0) {
        updatedInstallments[existingIndex].status = status;
      } else {
        updatedInstallments.push({ month, status });
      }

      const { error } = await supabase
        .from('borrowers')
        .update({ installments: updatedInstallments })
        .eq('id', borrowerId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        borrowers: prev.borrowers.map(b => 
          b.id === borrowerId ? { ...b, installments: updatedInstallments } : b
        )
      }));
    } catch (error) {
      console.error('Update installment status error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث حالة القسط.' });
    }
  }, [state.borrowers, supabase, toast]);

  const deleteBorrower = useCallback(async (borrowerId: string) => {
    try {
      const { error } = await supabase
        .from('borrowers')
        .delete()
        .eq('id', borrowerId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        borrowers: prev.borrowers.filter(b => b.id !== borrowerId)
      }));

      toast({ title: 'نجاح', description: 'تم حذف القرض بنجاح.' });
    } catch (error) {
      console.error('Delete borrower error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في حذف القرض.' });
    }
  }, [supabase, toast]);

  const handlePartialPayment = useCallback(async (borrowerId: string, paidAmount: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/handle-partial-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ borrowerId, paidAmount }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message);
      }

      await loadData();
      toast({ title: 'نجاح', description: 'تم تسجيل السداد الجزئي وإنشاء قرض جديد بالمبلغ المتبقي.' });
    } catch (error) {
      console.error('Partial payment error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: error.message || 'فشل في معالجة السداد الجزئي.' });
    }
  }, [loadData, toast]);

  const markBorrowerAsNotified = useCallback(async (borrowerId: string, message: string) => {
    try {
      const { error } = await supabase
        .from('borrowers')
        .update({ isNotified: true })
        .eq('id', borrowerId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        borrowers: prev.borrowers.map(b => 
          b.id === borrowerId ? { ...b, isNotified: true } : b
        )
      }));

      toast({ title: 'نجاح', description: 'تم تسجيل إرسال الرسالة للعميل.' });
    } catch (error) {
      console.error('Mark notified error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تسجيل الإشعار.' });
    }
  }, [supabase, toast]);

  // Investor management
  const addInvestor = useCallback(async (payload: NewInvestorPayload) => {
    try {
      if (!state.currentUser?.office_id) {
        return { success: false, message: 'معرف المكتب غير متوفر.' };
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-investor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ...payload,
          office_id: state.currentUser.office_id,
          managedBy: state.currentUser.id,
          submittedBy: state.currentUser.id,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, message: result.message || 'فشل في إضافة المستثمر.' };
      }

      await loadData();
      toast({ title: 'نجاح', description: 'تم إضافة المستثمر بنجاح.' });
      return { success: true, message: 'تم إضافة المستثمر بنجاح.' };
    } catch (error) {
      console.error('Add investor error:', error);
      return { success: false, message: 'حدث خطأ أثناء إضافة المستثمر.' };
    }
  }, [state.currentUser, loadData, toast]);

  const updateInvestor = useCallback(async (investor: UpdatableInvestor) => {
    try {
      const { error } = await supabase
        .from('investors')
        .update({
          name: investor.name,
          status: investor.status,
          installmentProfitShare: investor.installmentProfitShare,
          gracePeriodProfitShare: investor.gracePeriodProfitShare,
          branch_id: investor.branch_id
        })
        .eq('id', investor.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        investors: prev.investors.map(i => 
          i.id === investor.id ? { ...i, ...investor } : i
        )
      }));

      toast({ title: 'نجاح', description: 'تم تحديث المستثمر بنجاح.' });
    } catch (error) {
      console.error('Update investor error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث المستثمر.' });
    }
  }, [supabase, toast]);

  const approveInvestor = useCallback(async (investorId: string) => {
    try {
      const { error } = await supabase
        .from('investors')
        .update({ status: 'نشط' })
        .eq('id', investorId);

      if (error) throw error;

      await updateUser(investorId, { status: 'نشط' });
      
      setState(prev => ({
        ...prev,
        investors: prev.investors.map(i => 
          i.id === investorId ? { ...i, status: 'نشط' } : i
        )
      }));

      toast({ title: 'نجاح', description: 'تم الموافقة على المستثمر.' });
    } catch (error) {
      console.error('Approve investor error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في الموافقة على المستثمر.' });
    }
  }, [supabase, updateUser, toast]);

  const rejectInvestor = useCallback(async (investorId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('investors')
        .update({ 
          status: 'مرفوض',
          rejectionReason: reason 
        })
        .eq('id', investorId);

      if (error) throw error;

      await updateUser(investorId, { status: 'مرفوض' });

      setState(prev => ({
        ...prev,
        investors: prev.investors.map(i => 
          i.id === investorId ? { ...i, status: 'مرفوض', rejectionReason: reason } : i
        )
      }));

      toast({ title: 'نجاح', description: 'تم رفض طلب المستثمر.' });
    } catch (error) {
      console.error('Reject investor error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في رفض المستثمر.' });
    }
  }, [supabase, updateUser, toast]);

  const addInvestorTransaction = useCallback(async (investorId: string, transaction: Omit<Transaction, 'id' | 'investor_id' | 'office_id'>) => {
    try {
      if (!state.currentUser?.office_id) {
        throw new Error('معرف المكتب غير متوفر.');
      }

      const newTransaction: Transaction = {
        ...transaction,
        id: `tx_${generateId()}`,
        investor_id: investorId,
        office_id: state.currentUser.office_id,
      };

      const { error } = await supabase
        .from('transactions')
        .insert(newTransaction);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, newTransaction]
      }));

      toast({ title: 'نجاح', description: 'تم إضافة العملية المالية بنجاح.' });
    } catch (error) {
      console.error('Add transaction error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في إضافة العملية المالية.' });
    }
  }, [state.currentUser, supabase, generateId, toast]);

  const requestCapitalIncrease = useCallback(async (investorId: string) => {
    try {
      const investor = state.investors.find(i => i.id === investorId);
      if (!investor || !state.currentUser) return;

      const notificationId = `notif_${generateId()}`;
      const notification: Notification = {
        id: notificationId,
        date: new Date().toISOString(),
        recipientId: state.currentUser.id,
        title: 'طلب زيادة رأس المال',
        description: `المستثمر ${investor.name} يطلب زيادة رأس المال.`,
        isRead: false,
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        notifications: [...prev.notifications, notification]
      }));

      toast({ title: 'نجاح', description: 'تم إرسال طلب زيادة رأس المال.' });
    } catch (error) {
      console.error('Request capital increase error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في إرسال الطلب.' });
    }
  }, [state.investors, state.currentUser, supabase, generateId, toast]);

  const markInvestorAsNotified = useCallback(async (investorId: string, message: string) => {
    try {
      const { error } = await supabase
        .from('investors')
        .update({ isNotified: true })
        .eq('id', investorId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        investors: prev.investors.map(i => 
          i.id === investorId ? { ...i, isNotified: true } : i
        )
      }));

      toast({ title: 'نجاح', description: 'تم تسجيل إرسال الرسالة للمستثمر.' });
    } catch (error) {
      console.error('Mark investor notified error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تسجيل الإشعار.' });
    }
  }, [supabase, toast]);

  // Request management
  const approveBorrower = useCallback(async (borrowerId: string, investorIds: string[]) => {
    try {
      const borrower = state.borrowers.find(b => b.id === borrowerId);
      if (!borrower) return;

      // Calculate funding distribution
      const totalAmount = borrower.amount;
      const selectedInvestors = state.investors.filter(i => investorIds.includes(i.id));
      
      let remainingAmount = totalAmount;
      const fundedBy = selectedInvestors.map((investor, index) => {
        const isLast = index === selectedInvestors.length - 1;
        const amount = isLast ? remainingAmount : Math.floor(totalAmount / selectedInvestors.length);
        remainingAmount -= amount;
        return { investorId: investor.id, amount };
      });

      const { error } = await supabase
        .from('borrowers')
        .update({ 
          status: 'منتظم',
          fundedBy 
        })
        .eq('id', borrowerId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        borrowers: prev.borrowers.map(b => 
          b.id === borrowerId ? { ...b, status: 'منتظم', fundedBy } : b
        )
      }));

      toast({ title: 'نجاح', description: 'تم الموافقة على القرض وتمويله.' });
    } catch (error) {
      console.error('Approve borrower error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في الموافقة على القرض.' });
    }
  }, [state.borrowers, state.investors, supabase, toast]);

  const rejectBorrower = useCallback(async (borrowerId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('borrowers')
        .update({ 
          status: 'مرفوض',
          rejectionReason: reason 
        })
        .eq('id', borrowerId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        borrowers: prev.borrowers.map(b => 
          b.id === borrowerId ? { ...b, status: 'مرفوض', rejectionReason: reason } : b
        )
      }));

      toast({ title: 'نجاح', description: 'تم رفض طلب القرض.' });
    } catch (error) {
      console.error('Reject borrower error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في رفض القرض.' });
    }
  }, [supabase, toast]);

  // Configuration updates
  const updateAppConfig = useCallback(async (key: string, value: number) => {
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key, value: { value } });

      if (error) throw error;

      setState(prev => ({ ...prev, [key]: value }));
      toast({ title: 'نجاح', description: 'تم تحديث الإعداد بنجاح.' });
    } catch (error) {
      console.error('Update config error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث الإعداد.' });
    }
  }, [supabase, toast]);

  const updateBaseInterestRate = useCallback((rate: number) => updateAppConfig('baseInterestRate', rate), [updateAppConfig]);
  const updateInvestorSharePercentage = useCallback((percentage: number) => updateAppConfig('investorSharePercentage', percentage), [updateAppConfig]);
  const updateSalaryRepaymentPercentage = useCallback((percentage: number) => updateAppConfig('salaryRepaymentPercentage', percentage), [updateAppConfig]);
  const updateGraceTotalProfitPercentage = useCallback((percentage: number) => updateAppConfig('graceTotalProfitPercentage', percentage), [updateAppConfig]);
  const updateGraceInvestorSharePercentage = useCallback((percentage: number) => updateAppConfig('graceInvestorSharePercentage', percentage), [updateAppConfig]);

  const updateSupportInfo = useCallback(async (info: { email: string; phone: string }) => {
    try {
      await Promise.all([
        supabase.from('app_config').upsert({ key: 'supportEmail', value: { value: info.email } }),
        supabase.from('app_config').upsert({ key: 'supportPhone', value: { value: info.phone } })
      ]);

      setState(prev => ({
        ...prev,
        supportEmail: info.email,
        supportPhone: info.phone
      }));

      toast({ title: 'نجاح', description: 'تم تحديث معلومات الدعم بنجاح.' });
    } catch (error) {
      console.error('Update support info error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث معلومات الدعم.' });
    }
  }, [supabase, toast]);

  const updateTrialPeriod = useCallback(async (days: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ defaultTrialPeriodDays: days })
        .eq('role', 'مدير النظام');

      if (error) throw error;

      await updateAppConfig('defaultTrialPeriodDays', days);
    } catch (error) {
      console.error('Update trial period error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث مدة التجربة.' });
    }
  }, [supabase, updateAppConfig, toast]);

  // Support and notifications
  const addSupportTicket = useCallback(async (ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead' | 'isReplied'>) => {
    try {
      const newTicket: SupportTicket = {
        ...ticket,
        id: `ticket_${generateId()}`,
        date: new Date().toISOString(),
        isRead: false,
        isReplied: false,
      };

      const { error } = await supabase
        .from('support_tickets')
        .insert(newTicket);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        supportTickets: [...prev.supportTickets, newTicket]
      }));

      toast({ title: 'نجاح', description: 'تم إرسال طلب الدعم بنجاح.' });
    } catch (error) {
      console.error('Add support ticket error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في إرسال طلب الدعم.' });
    }
  }, [supabase, generateId, toast]);

  const deleteSupportTicket = useCallback(async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        supportTickets: prev.supportTickets.filter(t => t.id !== ticketId)
      }));

      toast({ title: 'نجاح', description: 'تم حذف الرسالة بنجاح.' });
    } catch (error) {
      console.error('Delete support ticket error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في حذف الرسالة.' });
    }
  }, [supabase, toast]);

  const replyToSupportTicket = useCallback(async (ticketId: string, reply: string) => {
    try {
      const ticket = state.supportTickets.find(t => t.id === ticketId);
      if (!ticket) return;

      // Update ticket as replied
      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({ isReplied: true, isRead: true })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      // Create notification for the user
      const notification: Notification = {
        id: `notif_${generateId()}`,
        date: new Date().toISOString(),
        recipientId: ticket.fromUserId,
        title: `رد على: ${ticket.subject}`,
        description: reply,
        isRead: false,
      };

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notification);

      if (notifError) throw notifError;

      setState(prev => ({
        ...prev,
        supportTickets: prev.supportTickets.map(t => 
          t.id === ticketId ? { ...t, isReplied: true, isRead: true } : t
        ),
        notifications: [...prev.notifications, notification]
      }));

      toast({ title: 'نجاح', description: 'تم إرسال الرد بنجاح.' });
    } catch (error) {
      console.error('Reply to ticket error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في إرسال الرد.' });
    }
  }, [state.supportTickets, supabase, generateId, toast]);

  const markUserNotificationsAsRead = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ isRead: true })
        .eq('recipientId', userId)
        .eq('isRead', false);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.recipientId === userId ? { ...n, isRead: true } : n
        )
      }));
    } catch (error) {
      console.error('Mark notifications read error:', error);
    }
  }, [supabase]);

  const clearUserNotifications = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('recipientId', userId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.recipientId !== userId)
      }));

      toast({ title: 'نجاح', description: 'تم حذف جميع التنبيهات.' });
    } catch (error) {
      console.error('Clear notifications error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في حذف التنبيهات.' });
    }
  }, [supabase, toast]);

  // Branch management
  const addBranch = useCallback(async (branch: Omit<Branch, 'id'>) => {
    try {
      const newBranch: Branch = {
        ...branch,
        id: generateId(),
      };

      const { error } = await supabase
        .from('branches')
        .insert(newBranch);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        branches: [...prev.branches, newBranch]
      }));

      toast({ title: 'نجاح', description: 'تم إضافة الفرع بنجاح.' });
    } catch (error) {
      console.error('Add branch error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في إضافة الفرع.' });
    }
  }, [supabase, generateId, toast]);

  const updateBranch = useCallback(async (branchId: string, updates: Partial<Branch>) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', branchId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        branches: prev.branches.map(b => 
          b.id === branchId ? { ...b, ...updates } : b
        )
      }));

      toast({ title: 'نجاح', description: 'تم تحديث الفرع بنجاح.' });
    } catch (error) {
      console.error('Update branch error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحديث الفرع.' });
    }
  }, [supabase, toast]);

  const deleteBranch = useCallback(async (branchId: string) => {
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        branches: prev.branches.filter(b => b.id !== branchId)
      }));

      toast({ title: 'نجاح', description: 'تم حذف الفرع بنجاح.' });
    } catch (error) {
      console.error('Delete branch error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في حذف الفرع.' });
    }
  }, [supabase, toast]);

  const actions: DataActions = {
    signIn,
    signOutUser,
    registerNewOfficeManager,
    addUser,
    updateUser,
    updateUserStatus,
    updateUserCredentials,
    updateUserIdentity,
    deleteUser,
    addBorrower,
    updateBorrower,
    updateBorrowerPaymentStatus,
    updateInstallmentStatus,
    deleteBorrower,
    handlePartialPayment,
    markBorrowerAsNotified,
    addInvestor,
    updateInvestor,
    approveInvestor,
    rejectInvestor,
    addInvestorTransaction,
    requestCapitalIncrease,
    markInvestorAsNotified,
    approveBorrower,
    rejectBorrower,
    updateBaseInterestRate,
    updateInvestorSharePercentage,
    updateSalaryRepaymentPercentage,
    updateGraceTotalProfitPercentage,
    updateGraceInvestorSharePercentage,
    updateSupportInfo,
    updateTrialPeriod,
    addSupportTicket,
    deleteSupportTicket,
    replyToSupportTicket,
    markUserNotificationsAsRead,
    clearUserNotifications,
    addBranch,
    updateBranch,
    deleteBranch,
  };

  return (
    <DataContext.Provider value={state}>
      <DataActionsContext.Provider value={actions}>
        {children}
      </DataActionsContext.Provider>
    </DataContext.Provider>
  );
}

export const useDataState = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataState must be used within a DataProvider');
  }
  return context;
};

export const useDataActions = () => {
  const context = useContext(DataActionsContext);
  if (!context) {
    throw new Error('useDataActions must be used within a DataProvider');
  }
  return context;
};