'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { borrowersData as initialBorrowers, investorsData as initialInvestors, investorLoanMap } from '@/lib/data';
import type { Borrower, Investor, Withdrawal } from '@/lib/types';

// Omit 'defaultedFunds' for adding/updating, as it will be calculated
type UpdatableInvestor = Omit<Investor, 'defaultedFunds'>;

type DataContextType = {
  borrowers: Borrower[];
  investors: Investor[];
  addBorrower: (borrower: Omit<Borrower, 'id' | 'next_due'>) => void;
  updateBorrower: (borrower: Borrower) => void;
  addInvestor: (investor: Omit<UpdatableInvestor, 'id' | 'date' | 'status' | 'withdrawalHistory'>) => void;
  updateInvestor: (investor: UpdatableInvestor) => void;
  withdrawFromInvestor: (investorId: string, withdrawal: Omit<Withdrawal, 'id'|'date'>) => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [borrowers, setBorrowers] = useState<Borrower[]>(initialBorrowers);
  const [investors, setInvestors] = useState<Investor[]>([]);

  const calculateDefaultedFunds = useCallback((investorId: string, currentBorrowers: Borrower[]): number => {
    const loanIds = investorLoanMap[investorId] || [];
    if (!loanIds.length) return 0;
    
    return currentBorrowers
      .filter(loan => loanIds.includes(loan.id) && (loan.status === 'متعثر' || loan.status === 'معلق'))
      .reduce((acc, loan) => acc + loan.amount, 0);
  }, []);

  useEffect(() => {
    // Initial calculation of defaulted funds
    const enrichedInvestors = initialInvestors.map(inv => ({
      ...inv,
      defaultedFunds: calculateDefaultedFunds(inv.id, borrowers),
    }));
    setInvestors(enrichedInvestors);
  }, []); // Run only once on mount with initial data

  const updateBorrower = (updatedBorrower: Borrower) => {
    setBorrowers(prevBorrowers => {
        const newBorrowers = prevBorrowers.map(b => b.id === updatedBorrower.id ? updatedBorrower : b);

        // After updating borrowers, recalculate defaulted funds for all investors
        setInvestors(prevInvestors => 
            prevInvestors.map(inv => ({
                ...inv,
                defaultedFunds: calculateDefaultedFunds(inv.id, newBorrowers)
            }))
        );

        return newBorrowers;
    });
  };
  
  const addBorrower = (borrower: Omit<Borrower, 'id' | 'next_due'>) => {
    const newEntry: Borrower = {
      ...borrower,
      id: `bor_${Date.now()}`,
      next_due: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    };
    setBorrowers(prev => [...prev, newEntry]);
  };

  const updateInvestor = (updatedInvestor: UpdatableInvestor) => {
    setInvestors(prevInvestors => prevInvestors.map(inv => {
      if (inv.id === updatedInvestor.id) {
        return {
          ...updatedInvestor,
          defaultedFunds: inv.defaultedFunds // Keep the calculated value, it's managed by borrower updates
        };
      }
      return inv;
    }));
  };

  const addInvestor = (investor: Omit<UpdatableInvestor, 'id' | 'date' | 'status' | 'withdrawalHistory'>) => {
    const newEntry: Investor = {
      ...investor,
      id: `inv_${Date.now()}`,
      status: 'نشط',
      date: new Date().toISOString().split('T')[0],
      withdrawalHistory: [],
      defaultedFunds: 0, // Initially zero
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


  const value = { borrowers, investors, addBorrower, updateBorrower, addInvestor, updateInvestor, withdrawFromInvestor };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
