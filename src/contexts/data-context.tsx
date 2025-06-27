
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
import { borrowersData, investorsData, usersData as initialUsersData } from '@/lib/data';
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

type SignUpCredentials = {
  name: User['name'];
  email: User['email'];
  phone: User['phone'];
  password?: string;
};

type DataContextType = {
  borrowers: Borrower[];
  investors: Investor[];
  users: User[];
  registerNewOfficeManager: (credentials: SignUpCredentials) => Promise<{ success: boolean; message: string }>;
  addBorrower: (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy'
    >,
    investorIds: string[]
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
  const [users, setUsers] = useState<User[]>(initialUsersData);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const registerNewOfficeManager = async (credentials: SignUpCredentials): Promise<{ success: boolean; message: string; }> => {
    const existingUser = users.find(u => u.email === credentials.email || u.phone === credentials.phone);
    if(existingUser) {
      return { success: false, message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل.' };
    }

    const managerId = `user_${Date.now()}`;
    const employeeId = `user_${Date.now() + 1}`;

    const newManager: User = {
      id: managerId,
      name: credentials.name,
      email: credentials.email,
      phone: credentials.phone,
      password: credentials.password,
      role: 'مدير المكتب',
      status: 'معلق',
      photoURL: 'https://placehold.co/40x40.png'
    };
    
    const newEmployee: User = {
      id: employeeId,
      name: `موظف لدى ${credentials.name}`,
      email: `employee-${Date.now()}@example.com`,
      phone: '',
      password: 'password123', // Default password
      role: 'موظف',
      status: 'نشط', // Employee is active by default under the manager
      photoURL: 'https://placehold.co/40x40.png',
      managedBy: managerId,
    };

    setUsers(prev => [...prev, newManager, newEmployee]);

    // Update the original data source (for mock persistence)
    initialUsersData.push(newManager, newEmployee);

    return { success: true, message: 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.' };
  };
  
  const updateBorrower = async (updatedBorrower: Borrower) => {
    const originalBorrower = borrowers.find(b => b.id === updatedBorrower.id);
    if (!originalBorrower) return;

    const statusChanged = originalBorrower.status !== updatedBorrower.status;

    if (statusChanged) {
      if (updatedBorrower.status === 'متعثر' && originalBorrower.status !== 'متعثر') {
        if (originalBorrower.fundedBy && originalBorrower.fundedBy.length > 0) {
          setInvestors(prevInvestors => {
            let newInvestors = [...prevInvestors];
            for (const funder of originalBorrower.fundedBy!) {
              const investorIndex = newInvestors.findIndex(i => i.id === funder.investorId);
              if (investorIndex > -1) {
                newInvestors[investorIndex].defaultedFunds += funder.amount;
              }
            }
            return newInvestors;
          });
          toast({ title: "تم تسجيل القرض كمتعثر وتحديث أموال المستثمرين." });
        }
      }

      if (updatedBorrower.status === 'مسدد بالكامل' && originalBorrower.status !== 'مسدد بالكامل') {
        if (originalBorrower.fundedBy && originalBorrower.fundedBy.length > 0) {
          const totalProfit = originalBorrower.loanType === 'اقساط'
            ? originalBorrower.amount * (originalBorrower.rate / 100) * originalBorrower.term
            : originalBorrower.amount * 0.30; 

          setInvestors(prevInvestors => {
            let newInvestors = [...prevInvestors];
            for (const funder of originalBorrower.fundedBy!) {
              const investorIndex = newInvestors.findIndex(i => i.id === funder.investorId);
              if (investorIndex > -1) {
                const profitShare = (funder.amount / originalBorrower.amount) * totalProfit;
                newInvestors[investorIndex].amount += funder.amount + profitShare; // Return principal + profit
                newInvestors[investorIndex].fundedLoanIds = newInvestors[investorIndex].fundedLoanIds.filter(id => id !== originalBorrower.id);
              }
            }
            return newInvestors;
          });
          toast({ title: "تم سداد القرض بالكامل وإعادة الأموال والأرباح للمستثمرين." });
        }
      }
    }
    
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
    borrower: Omit<Borrower, 'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy'>,
    investorIds: string[]
  ) => {
    if (borrower.status !== 'معلق' && investorIds.length === 0) {
      toast({ variant: 'destructive', title: 'خطأ في التمويل', description: 'يجب اختيار مستثمر واحد على الأقل لتمويل قرض نشط.' });
      return;
    }

    const loanAmount = borrower.amount;
    const amountPerInvestor = loanAmount / investorIds.length;
    
    let funders: Investor[] = [];
    for (const id of investorIds) {
        const investor = investors.find(i => i.id === id);
        if (!investor) {
            toast({ variant: 'destructive', title: 'خطأ', description: `لم يتم العثور على المستثمر.` });
            return;
        }
        if (investor.amount < amountPerInvestor) {
            toast({ variant: 'destructive', title: 'خطأ في السيولة', description: `المستثمر "${investor.name}" لا يملك سيولة كافية لتمويل حصته.` });
            return;
        }
        funders.push(investor);
    }
    
    const newId = `bor_${Date.now()}`;
    
    const updatedInvestors = investors.map(inv => {
        if (investorIds.includes(inv.id)) {
            return {
                ...inv,
                amount: inv.amount - amountPerInvestor,
                fundedLoanIds: [...inv.fundedLoanIds, newId],
            };
        }
        return inv;
    });
    
    const newEntry: Borrower = {
      ...borrower,
      id: newId,
      date: new Date().toISOString().split('T')[0],
      submittedBy: currentUser?.id,
      fundedBy: investorIds.length > 0 ? investorIds.map(id => ({ investorId: id, amount: amountPerInvestor })) : [],
    };

    setInvestors(updatedInvestors);
    setBorrowers((prev) => [...prev, newEntry]);
    toast({title: "تمت إضافة المقترض وربطه بالمستثمرين بنجاح (تجريبيًا)"})
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
    registerNewOfficeManager,
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
