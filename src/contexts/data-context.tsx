'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import type {
  Borrower,
  Investor,
  Withdrawal,
  User,
  UserRole,
} from '@/lib/types';
import { useAuth } from './auth-context';
import { useSupabase } from './supabase-context';
import { useToast } from '@/hooks/use-toast';

type UpdatableInvestor = Omit<
  Investor,
  | 'defaultedFunds'
  | 'fundedLoanIds'
  | 'withdrawalHistory'
  | 'rejectionReason'
  | 'submittedBy'
>;

type DataContextType = {
  borrowers: Borrower[];
  investors: Investor[];
  users: User[];
  addBorrower: (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy'
    >
  ) => Promise<void>;
  updateBorrower: (borrower: Borrower) => Promise<void>;
  approveBorrower: (borrowerId: string) => Promise<void>;
  rejectBorrower: (borrowerId: string, reason: string) => Promise<void>;
  addInvestor: (
    investor: Omit<
      Investor,
      | 'id'
      | 'date'
      | 'withdrawalHistory'
      | 'defaultedFunds'
      | 'fundedLoanIds'
      | 'rejectionReason'
      | 'submittedBy'
    >
  ) => Promise<void>;
  updateInvestor: (investor: UpdatableInvestor) => Promise<void>;
  approveInvestor: (investorId: string) => Promise<void>;
  rejectInvestor: (investorId: string, reason: string) => Promise<void>;
  withdrawFromInvestor: (
    investorId: string,
    withdrawal: Omit<Withdrawal, 'id' | 'date'>
  ) => Promise<void>;
  updateUserStatus: (userId: string, status: User['status']) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabase();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    const { data: borrowersData, error: borrowersError } = await supabase
      .from('borrowers')
      .select('*');
    if (borrowersData) setBorrowers(borrowersData);
    if (borrowersError)
      toast({
        variant: 'destructive',
        title: 'خطأ في تحميل المقترضين',
        description: borrowersError.message,
      });

    const { data: investorsData, error: investorsError } = await supabase
      .from('investors')
      .select('*');
    if (investorsData) setInvestors(investorsData);
    if (investorsError)
      toast({
        variant: 'destructive',
        title: 'خطأ في تحميل المستثمرين',
        description: investorsError.message,
      });

    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('*');
    if (usersData) setUsers(usersData);
    if (usersError)
      toast({
        variant: 'destructive',
        title: 'خطأ في تحميل المستخدمين',
        description: usersError.message,
      });
  }, [supabase, toast]);

  useEffect(() => {
    // Only fetch data if auth has finished loading and a user is present.
    if (!authLoading && currentUser) {
      fetchAllData();
    }
    // If auth is done and there's no user (logged out), clear the data.
    if (!authLoading && !currentUser) {
      setBorrowers([]);
      setInvestors([]);
      setUsers([]);
    }
  }, [currentUser, authLoading, fetchAllData]);

  const updateBorrower = async (updatedBorrower: Borrower) => {
    const { data, error } = await supabase
      .from('borrowers')
      .update(updatedBorrower)
      .eq('id', updatedBorrower.id)
      .select();

    if (data) {
      setBorrowers((prev) =>
        prev.map((b) => (b.id === updatedBorrower.id ? data[0] : b))
      );
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في تحديث المقترض',
        description: error.message,
      });
  };

  const approveBorrower = async (borrowerId: string) => {
    const { data, error } = await supabase
      .from('borrowers')
      .update({ status: 'منتظم' })
      .eq('id', borrowerId)
      .select();

    if (data) {
      setBorrowers((prev) =>
        prev.map((b) => (b.id === borrowerId ? data[0] : b))
      );
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في الموافقة على المقترض',
        description: error.message,
      });
  };

  const rejectBorrower = async (borrowerId: string, reason: string) => {
    const { data, error } = await supabase
      .from('borrowers')
      .update({ status: 'مرفوض', rejectionReason: reason })
      .eq('id', borrowerId)
      .select();

    if (data) {
      setBorrowers((prev) =>
        prev.map((b) => (b.id === borrowerId ? data[0] : b))
      );
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في رفض المقترض',
        description: error.message,
      });
  };

  const addBorrower = async (
    borrower: Omit<Borrower, 'id' | 'date' | 'rejectionReason' | 'submittedBy'>
  ) => {
    const newEntry = {
      ...borrower,
      date: new Date().toISOString().split('T')[0],
      submittedBy: currentUser?.id, // Assumes a user is logged in
    };
    const { data, error } = await supabase
      .from('borrowers')
      .insert(newEntry)
      .select();
    if (data) {
      setBorrowers((prev) => [...prev, data[0]]);
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في إضافة المقترض',
        description: error.message,
      });
  };

  const updateInvestor = async (updatedInvestor: UpdatableInvestor) => {
    const { data, error } = await supabase
      .from('investors')
      .update(updatedInvestor)
      .eq('id', updatedInvestor.id)
      .select();

    if (data) {
      setInvestors((prev) =>
        prev.map((i) => (i.id === updatedInvestor.id ? data[0] : i))
      );
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في تحديث المستثمر',
        description: error.message,
      });
  };

  const approveInvestor = async (investorId: string) => {
    const { data, error } = await supabase
      .from('investors')
      .update({ status: 'نشط' })
      .eq('id', investorId)
      .select();

    if (data) {
      setInvestors((prev) =>
        prev.map((i) => (i.id === investorId ? data[0] : i))
      );
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في الموافقة على المستثمر',
        description: error.message,
      });
  };

  const rejectInvestor = async (investorId: string, reason: string) => {
    const { data, error } = await supabase
      .from('investors')
      .update({ status: 'مرفوض', rejectionReason: reason })
      .eq('id', investorId)
      .select();

    if (data) {
      setInvestors((prev) =>
        prev.map((i) => (i.id === investorId ? data[0] : i))
      );
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في رفض المستثمر',
        description: error.message,
      });
  };

  const addInvestor = async (
    investor: Omit<
      Investor,
      | 'id'
      | 'date'
      | 'withdrawalHistory'
      | 'defaultedFunds'
      | 'fundedLoanIds'
      | 'rejectionReason'
      | 'submittedBy'
    >
  ) => {
    const newEntry = {
      ...investor,
      date: new Date().toISOString().split('T')[0],
      withdrawalHistory: [],
      defaultedFunds: 0,
      fundedLoanIds: [],
      submittedBy: currentUser?.id,
    };
    const { data, error } = await supabase
      .from('investors')
      .insert(newEntry)
      .select();
    if (data) {
      setInvestors((prev) => [...prev, data[0]]);
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في إضافة المستثمر',
        description: error.message,
      });
  };

  const withdrawFromInvestor = async (
    investorId: string,
    withdrawal: Omit<Withdrawal, 'id' | 'date'>
  ) => {
    const investor = investors.find((i) => i.id === investorId);
    if (!investor) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لم يتم العثور على المستثمر لعملية السحب',
      });
      return;
    }

    const newWithdrawal: Withdrawal = {
      ...withdrawal,
      id: `wd_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
    };

    const newHistory = [...investor.withdrawalHistory, newWithdrawal];
    const newAmount = investor.amount - newWithdrawal.amount;

    const { data, error } = await supabase
      .from('investors')
      .update({ amount: newAmount, withdrawalHistory: newHistory })
      .eq('id', investorId)
      .select();

    if (data) {
      setInvestors((prev) =>
        prev.map((i) => (i.id === investorId ? data[0] : i))
      );
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في سحب الأموال',
        description: error.message,
      });
  };

  const updateUserStatus = async (userId: string, status: User['status']) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId)
      .select();

    if (data) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? data[0] : u)));
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في تحديث حالة المستخدم',
        description: error.message,
      });
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select();

    if (data) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? data[0] : u)));
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في تحديث دور المستخدم',
        description: error.message,
      });
  };

  const deleteUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    if (error)
      toast({
        variant: 'destructive',
        title: 'خطأ في حذف المستخدم',
        description: error.message,
      });
  };

  const value = {
    borrowers,
    investors,
    users,
    addBorrower,
    updateBorrower,
    addInvestor,
    updateInvestor,
    withdrawFromInvestor,
    approveBorrower,
    approveInvestor,
    rejectBorrower,
    rejectInvestor,
    updateUserStatus,
    updateUserRole,
    deleteUser,
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
