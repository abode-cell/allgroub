'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import type {
  Borrower,
  Investor,
  Withdrawal,
  User,
  UserRole,
} from '@/lib/types';
import { borrowersData, investorsData, usersData } from '@/lib/data';
import { useAuth } from './auth-context';
import { useToast } from '@/hooks/use-toast';

// This is a mock implementation using local state and does not connect to any backend service.

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
  const [borrowers, setBorrowers] = useState<Borrower[]>(borrowersData);
  const [investors, setInvestors] = useState<Investor[]>(investorsData);
  const [users, setUsers] = useState<User[]>(usersData);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const updateBorrower = async (updatedBorrower: Borrower) => {
    setBorrowers((prev) =>
        prev.map((b) => (b.id === updatedBorrower.id ? updatedBorrower : b))
      );
    toast({title: "تم تحديث المقترض (تجريبيًا)"})
  };

  const approveBorrower = async (borrowerId: string) => {
    setBorrowers((prev) =>
        prev.map((b) => (b.id === borrowerId ? { ...b, status: 'منتظم' } : b))
      );
    toast({title: "تمت الموافقة على المقترض (تجريبيًا)"})
  };

  const rejectBorrower = async (borrowerId: string, reason: string) => {
     setBorrowers((prev) =>
        prev.map((b) => (b.id === borrowerId ? { ...b, status: 'مرفوض', rejectionReason: reason } : b))
      );
    toast({variant: 'destructive', title: "تم رفض المقترض (تجريبيًا)"})
  };

  const addBorrower = async (
    borrower: Omit<Borrower, 'id' | 'date' | 'rejectionReason' | 'submittedBy'>
  ) => {
    const newEntry: Borrower = {
      ...borrower,
      id: `bor_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      submittedBy: currentUser?.id,
    };
    setBorrowers((prev) => [...prev, newEntry]);
    toast({title: "تمت إضافة المقترض (تجريبيًا)"})
  };

  const updateInvestor = async (updatedInvestor: UpdatableInvestor) => {
    setInvestors((prev) =>
        prev.map((i) => (i.id === updatedInvestor.id ? {...i, ...updatedInvestor} : i))
      );
    toast({title: "تم تحديث المستثمر (تجريبيًا)"})
  };

  const approveInvestor = async (investorId: string) => {
    setInvestors((prev) =>
        prev.map((i) => (i.id === investorId ? { ...i, status: 'نشط' } : i))
      );
    toast({title: "تمت الموافقة على المستثمر (تجريبيًا)"})
  };

  const rejectInvestor = async (investorId: string, reason: string) => {
    setInvestors((prev) =>
        prev.map((i) => (i.id === investorId ? { ...i, status: 'مرفوض', rejectionReason: reason } : i))
      );
    toast({variant: 'destructive', title: "تم رفض المستثمر (تجريبيًا)"})
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
    const newEntry: Investor = {
      ...investor,
      id: `inv_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      withdrawalHistory: [],
      defaultedFunds: 0,
      fundedLoanIds: [],
      submittedBy: currentUser?.id,
    };
    setInvestors((prev) => [...prev, newEntry]);
    toast({title: "تمت إضافة المستثمر (تجريبيًا)"})
  };
  
  const withdrawFromInvestor = async (
    investorId: string,
    withdrawal: Omit<Withdrawal, 'id' | 'date'>
  ) => {
    setInvestors(prev => prev.map(inv => {
        if (inv.id === investorId) {
            const newWithdrawal: Withdrawal = {
                ...withdrawal,
                id: `wd_${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
            };
            return {
                ...inv,
                amount: inv.amount - newWithdrawal.amount,
                withdrawalHistory: [...inv.withdrawalHistory, newWithdrawal]
            }
        }
        return inv;
    }));
    toast({title: "تم سحب الأموال (تجريبيًا)"})
  };

  const updateUserStatus = async (userId: string, status: User['status']) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    toast({title: "تم تحديث حالة المستخدم (تجريبيًا)"})
  };
  
  const updateUserRole = async (userId: string, role: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    toast({title: "تم تحديث دور المستخدم (تجريبيًا)"})
  };

  const deleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast({variant: 'destructive', title: "تم حذف المستخدم (تجريبيًا)"})
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
