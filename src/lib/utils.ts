
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Borrower, Investor, Transaction } from "./types"
import { differenceInDays, addMonths, isPast, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export type BorrowerStatusDetails = {
  text: string;
  variant: 'success' | 'default' | 'secondary' | 'destructive' | 'outline';
};

const normalizeDate = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

export const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  if (words.length === 1 && words[0].length > 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  if(words.length === 1 && words[0].length === 1) {
    return words[0].toUpperCase();
  }
  return '';
};


export const getBorrowerStatus = (borrower: Borrower, today: Date): BorrowerStatusDetails => {
  if (borrower.status === 'معلق') return { text: 'طلب معلق', variant: 'secondary' };
  if (borrower.status === 'مرفوض') return { text: 'مرفوض', variant: 'destructive' };
  if (borrower.status === 'مسدد بالكامل' || borrower.paymentStatus === 'تم السداد') {
    return { text: 'مسدد بالكامل', variant: 'success' };
  }

  const todayDate = normalizeDate(today);

  if (borrower.loanType === 'مهلة') {
    if (!borrower.dueDate || !isValid(new Date(borrower.dueDate))) {
        return { text: 'تاريخ غير صالح', variant: 'destructive' };
    }
    const dueDate = normalizeDate(new Date(borrower.dueDate));
    if (isPast(dueDate)) {
      return { text: 'متأخر', variant: 'destructive' };
    }
    return { text: 'منتظم', variant: 'default' };
  }
  
  if (borrower.loanType === 'اقساط') {
      if (!borrower.term || !borrower.installments || !isValid(new Date(borrower.date))) {
          return { text: 'بيانات ناقصة', variant: 'secondary' };
      }
      const startDate = new Date(borrower.date);
      const nextInstallment = [...borrower.installments]
          .filter(i => i.status === 'لم يسدد بعد' || i.status === 'متأخر')
          .sort((a, b) => a.month - b.month)[0];

      if (!nextInstallment) {
        return { text: 'منتظم', variant: 'default' };
      }
      
      const nextPaymentDate = normalizeDate(addMonths(startDate, nextInstallment.month));

      if (isPast(nextPaymentDate)) {
        return { text: 'متأخر', variant: 'destructive' };
      }
      return { text: 'منتظم', variant: 'default' };
  }
  
  return { text: borrower.status, variant: 'default' };
};

export const getRemainingDaysDetails = (borrower: Borrower, today: Date): { text: string; isOverdue: boolean } => {
    const todayDate = normalizeDate(today);

    if (borrower.status === 'مسدد بالكامل' || borrower.paymentStatus === 'تم السداد') {
        return { text: 'مسدد', isOverdue: false };
    }
    
    if (borrower.status === 'مرفوض' || borrower.status === 'معلق') {
        return { text: '-', isOverdue: false };
    }
    
    if (!borrower.dueDate || !isValid(new Date(borrower.dueDate))) {
        return { text: 'تاريخ غير صالح', isOverdue: true };
    }

    if (borrower.loanType === 'مهلة') {
        const dueDate = normalizeDate(new Date(borrower.dueDate));
        const daysDiff = differenceInDays(dueDate, todayDate);

        if (daysDiff < 0) {
            return { text: `متأخر ${Math.abs(daysDiff)} يوم`, isOverdue: true };
        }
        return { text: `${daysDiff} يوم`, isOverdue: false };
    }

    if (borrower.loanType === 'اقساط') {
        if (!borrower.term || !borrower.installments || !isValid(new Date(borrower.date))) {
            return { text: '-', isOverdue: false };
        }
        
        const startDate = new Date(borrower.date);
        
        const nextInstallment = [...borrower.installments]
            .filter(i => i.status === 'لم يسدد بعد' || i.status === 'متأخر')
            .sort((a, b) => a.month - b.month)[0];

        if (!nextInstallment) {
            return { text: 'مسدد', isOverdue: false };
        }
        
        const nextPaymentDate = normalizeDate(addMonths(startDate, nextInstallment.month));

        if (!isValid(nextPaymentDate)) {
             return { text: 'تاريخ غير صالح', isOverdue: true };
        }

        const daysDiff = differenceInDays(nextPaymentDate, todayDate);

        if (daysDiff < 0) {
            return { text: `متأخر ${Math.abs(daysDiff)} يوم`, isOverdue: true };
        }
        return { text: `${daysDiff} يوم`, isOverdue: false };
    }
    
    return { text: '-', isOverdue: false };
};


export const calculateInvestorFinancials = (investor: Investor, allBorrowers: Borrower[], allTransactions: Transaction[]) => {
  const investorTransactions = allTransactions.filter(tx => tx.investor_id === investor.id);
  const installmentTransactions = investorTransactions.filter(tx => tx.capitalSource === 'installment') || [];
  const graceTransactions = investorTransactions.filter(tx => tx.capitalSource === 'grace') || [];

  const totalInstallmentDeposits = installmentTransactions.filter(tx => tx.type === 'إيداع رأس المال').reduce((sum, tx) => sum + tx.amount, 0);
  const totalInstallmentWithdrawals = installmentTransactions.filter(tx => tx.type === 'سحب من رأس المال').reduce((sum, tx) => sum + tx.amount, 0);
  const totalInstallmentCapital = totalInstallmentDeposits - totalInstallmentWithdrawals;

  const totalGraceDeposits = graceTransactions.filter(tx => tx.type === 'إيداع رأس المال').reduce((sum, tx) => sum + tx.amount, 0);
  const totalGraceWithdrawals = graceTransactions.filter(tx => tx.type === 'سحب من رأس المال').reduce((sum, tx) => sum + tx.amount, 0);
  const totalGraceCapital = totalGraceDeposits - totalGraceWithdrawals;

  const fundedLoans = allBorrowers.filter(b => b.fundedBy?.some(f => f.investorId === investor.id));

  let activeInstallmentCapital = 0;
  let activeGraceCapital = 0;
  let defaultedInstallmentFunds = 0;
  let defaultedGraceFunds = 0;

  fundedLoans.forEach(loan => {
    const funding = loan.fundedBy?.find(f => f.investorId === investor.id);
    if (!funding) return;

    const isDefaulted = loan.status === 'متعثر' || loan.paymentStatus === 'متعثر' || loan.paymentStatus === 'تم اتخاذ الاجراءات القانونيه';
    const isActive = !isDefaulted && loan.status !== 'مسدد بالكامل' && loan.paymentStatus !== 'تم السداد' && loan.status !== 'معلق' && loan.status !== 'مرفوض';
    
    if (loan.loanType === 'اقساط') {
        if (isActive) activeInstallmentCapital += funding.amount;
        if (isDefaulted) defaultedInstallmentFunds += funding.amount;
    } else if (loan.loanType === 'مهلة') {
        if (isActive) activeGraceCapital += funding.amount;
        if (isDefaulted) defaultedGraceFunds += funding.amount;
    }
  });

  const idleInstallmentCapital = totalInstallmentCapital - activeInstallmentCapital - defaultedInstallmentFunds;
  const idleGraceCapital = totalGraceCapital - activeGraceCapital - defaultedGraceFunds;

  return {
    totalInstallmentCapital,
    totalGraceCapital,
    totalCapitalInSystem: totalInstallmentCapital + totalGraceCapital,
    activeInstallmentCapital,
    activeGraceCapital,
    activeCapital: activeInstallmentCapital + activeGraceCapital,
    idleInstallmentCapital,
    idleGraceCapital,
    defaultedInstallmentFunds,
    defaultedGraceFunds,
    defaultedFunds: defaultedInstallmentFunds + defaultedGraceFunds,
  };
};
