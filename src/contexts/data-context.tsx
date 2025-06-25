'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { borrowersData as initialBorrowers, investorsData as initialInvestors } from '@/lib/data';
import type { Borrower, Investor, Withdrawal } from '@/lib/types';

type UpdatableInvestor = Omit<Investor, 'defaultedFunds' | 'fundedLoanIds' | 'withdrawalHistory' | 'rejectionReason' | 'submittedBy'>;

type DataContextType = {
  borrowers: Borrower[];
  investors: Investor[];
  addBorrower: (borrower: Omit<Borrower, 'id' | 'next_due' | 'rejectionReason' | 'submittedBy'>) => void;
  updateBorrower: (borrower: Borrower) => void;
  approveBorrower: (borrowerId: string) => void;
  rejectBorrower: (borrowerId: string, reason: string) => void;
  addInvestor: (investor: Omit<Investor, 'id' | 'date' | 'withdrawalHistory' | 'defaultedFunds' | 'fundedLoanIds' | 'rejectionReason' | 'submittedBy'>) => void;
  updateInvestor: (investor: UpdatableInvestor) => void;
  approveInvestor: (investorId: string) => void;
  rejectInvestor: (investorId: string, reason: string) => void;
  withdrawFromInvestor: (investorId: string, withdrawal: Omit<Withdrawal, 'id'|'date'>) => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [borrowers, setBorrowers] = useState<Borrower[]>(initialBorrowers);
  const [investors, setInvestors] = useState<Investor[]>(initialInvestors);

  const calculateDefaultedFunds = useCallback((investorId: string, currentBorrowers: Borrower[], allInvestors: Investor[]): number => {
    const investor = allInvestors.find(inv => inv.id === investorId);
    if (!investor) return 0;
    
    return currentBorrowers
      .filter(loan => investor.fundedLoanIds.includes(loan.id) && (loan.status === 'متعثر'))
      .reduce((acc, loan) => acc + loan.amount, 0);
  }, []);

  useEffect(() => {
    // Initial calculation of defaulted funds and enrich investors
    setInvestors(prevInvestors => 
      prevInvestors.map(inv => ({
        ...inv,
        defaultedFunds: calculateDefaultedFunds(inv.id, borrowers, prevInvestors),
      }))
    );
  }, [borrowers, calculateDefaultedFunds]);

  const updateBorrower = (updatedBorrower: Borrower) => {
    setBorrowers(prevBorrowers => {
        const newBorrowers = prevBorrowers.map(b => b.id === updatedBorrower.id ? updatedBorrower : b);
        // Recalculate defaulted funds for all investors after a borrower's status might have changed
        setInvestors(prevInvestors => 
            prevInvestors.map(inv => ({
                ...inv,
                defaultedFunds: calculateDefaultedFunds(inv.id, newBorrowers, prevInvestors)
            }))
        );
        return newBorrowers;
    });
  };
  
  const approveBorrower = (borrowerId: string) => {
     const borrower = borrowers.find(b => b.id === borrowerId);
     if (borrower && borrower.status === 'معلق') {
       updateBorrower({ ...borrower, status: 'منتظم' });
     }
  };

  const rejectBorrower = (borrowerId: string, reason: string) => {
    const borrower = borrowers.find(b => b.id === borrowerId);
     if (borrower && borrower.status === 'معلق') {
       updateBorrower({ ...borrower, status: 'مرفوض', rejectionReason: reason });
     }
  };

  const addBorrower = (borrower: Omit<Borrower, 'id' | 'next_due' | 'rejectionReason' | 'submittedBy'>) => {
    const newEntry: Borrower = {
      ...borrower,
      id: `bor_${Date.now()}`,
      next_due: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      submittedBy: 'emp_01', // Hardcoded for simulation
    };
    setBorrowers(prev => [...prev, newEntry]);
  };
  
  const updateInvestor = (updatedInvestor: UpdatableInvestor) => {
    setInvestors(prevInvestors => prevInvestors.map(inv => {
      if (inv.id === updatedInvestor.id) {
        return {
          ...inv,
          ...updatedInvestor,
        };
      }
      return inv;
    }));
  };
  
  const approveInvestor = (investorId: string) => {
     const investor = investors.find(i => i.id === investorId);
     if (investor && investor.status === 'معلق') {
        updateInvestorStatus(investor.id, 'نشط');
     }
  };

  const rejectInvestor = (investorId: string, reason: string) => {
    const investor = investors.find(i => i.id === investorId);
    if (investor && investor.status === 'معلق') {
        updateInvestorStatus(investor.id, 'مرفوض', reason);
    }
  };

  const updateInvestorStatus = (investorId: string, status: Investor['status'], reason?: string) => {
      setInvestors(prev => prev.map(inv => 
        inv.id === investorId 
          ? { ...inv, status, rejectionReason: reason } 
          : inv
      ));
  }


  const addInvestor = (investor: Omit<Investor, 'id' | 'date' | 'withdrawalHistory'| 'defaultedFunds' | 'fundedLoanIds' | 'rejectionReason' | 'submittedBy'>) => {
    const newEntry: Investor = {
      ...investor,
      id: `inv_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      withdrawalHistory: [],
      defaultedFunds: 0, // Initially zero
      fundedLoanIds: [], // Initially empty
      submittedBy: 'emp_01', // Hardcoded for simulation
    };
    setInvestors(prev => [...prev, newEntry]);
  };
  
  const withdrawFromInvestor = (investorId: string, withdrawal: Omit<Withdrawal, 'id'|'date'>) => {
    const newWithdrawal: Withdrawal = {
      ...withdrawal,
      id: `wd_${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };
    
    setInvestors(prev => prev.map(inv => {
      if (inv.id === investorId) {
        return {
          ...inv,
          amount: inv.amount - newWithdrawal.amount,
          withdrawalHistory: [...inv.withdrawalHistory, newWithdrawal]
        }
      }
      return inv;
    }));
  };


  const value = { borrowers, investors, addBorrower, updateBorrower, addInvestor, updateInvestor, withdrawFromInvestor, approveBorrower, approveInvestor, rejectBorrower, rejectInvestor };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
