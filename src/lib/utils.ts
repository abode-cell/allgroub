import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Borrower, Investor } from "./types"
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

  // For Grace period loans, status depends on the single due date.
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
  
  // For Installment loans, status depends on the next unpaid installment.
  if (borrower.loanType === 'اقساط') {
      if (!borrower.term || !borrower.installments || !isValid(new Date(borrower.date))) {
          return { text: 'بيانات ناقصة', variant: 'secondary' };
      }
      const startDate = new Date(borrower.date);
      const nextInstallment = [...borrower.installments]
          .filter(i => i.status === 'لم يسدد بعد' || i.status === 'متأخر')
          .sort((a, b) => a.month - b.month)[0];

      if (!nextInstallment) {
        // This case is covered by the 'مسدد بالكامل' check at the top, but as a fallback:
        return { text: 'منتظم', variant: 'default' };
      }
      
      const nextPaymentDate = normalizeDate(addMonths(startDate, nextInstallment.month));

      if (isPast(nextPaymentDate)) {
        return { text: 'متأخر', variant: 'destructive' };
      }
      return { text: 'منتظم', variant: 'default' };
  }
  
  return { text: borrower.status, variant: 'default' }; // Fallback
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
        
        // Find the first unpaid installment
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

export function calculateInvestorFinancials(investor: Investor, relevantBorrowers: Borrower[]) {
  const { installmentDeposits, graceDeposits, installmentWithdrawals, graceWithdrawals } = 
    (investor.transactionHistory || []).reduce(
        (acc, tx) => {
            if (tx.type.includes('إيداع')) {
                if (tx.capitalSource === 'installment') acc.installmentDeposits += tx.amount;
                else if (tx.capitalSource === 'grace') acc.graceDeposits += tx.amount;
            } else if (tx.type.includes('سحب')) {
                if (tx.capitalSource === 'installment') acc.installmentWithdrawals += tx.amount;
                else if (tx.capitalSource === 'grace') acc.graceWithdrawals += tx.amount;
            }
            return acc;
        },
        { installmentDeposits: 0, graceDeposits: 0, installmentWithdrawals: 0, graceWithdrawals: 0 }
    );
  
  const totalInstallmentCapital = installmentDeposits - installmentWithdrawals;
  const totalGraceCapital = graceDeposits - graceWithdrawals;
  const totalCapitalInSystem = totalInstallmentCapital + totalGraceCapital;
  
  let activeInstallmentCapital = 0;
  let activeGraceCapital = 0;
  let defaultedInstallmentFunds = 0;
  let defaultedGraceFunds = 0;

  const fundedLoanIds = investor.fundedLoanIds || [];
  const fundedBorrowers = relevantBorrowers.filter(b => fundedLoanIds.includes(b.id));

  for (const loan of fundedBorrowers) {
    const fundingDetails = loan.fundedBy?.find(f => f.investorId === investor.id);
    if (!fundingDetails) continue;

    const isDefaulted = loan.status === 'متعثر' || loan.paymentStatus === 'متعثر' || loan.paymentStatus === 'تم اتخاذ الاجراءات القانونيه';
    const isPaid = loan.status === 'مسدد بالكامل' || loan.paymentStatus === 'تم السداد';
    const isPendingOrRejected = loan.status === 'معلق' || loan.status === 'مرفوض';

    if (isDefaulted) {
        if (loan.loanType === 'اقساط') defaultedInstallmentFunds += fundingDetails.amount;
        else defaultedGraceFunds += fundingDetails.amount;
    } else if (!isPaid && !isPendingOrRejected) {
        if (loan.loanType === 'اقساط') activeInstallmentCapital += fundingDetails.amount;
        else activeGraceCapital += fundingDetails.amount;
    }
  }
  
  const activeCapital = activeInstallmentCapital + activeGraceCapital;
  const defaultedFunds = defaultedInstallmentFunds + defaultedGraceFunds;

  const idleInstallmentCapital = totalInstallmentCapital - activeInstallmentCapital - defaultedInstallmentFunds;
  const idleGraceCapital = totalGraceCapital - activeGraceCapital - defaultedGraceFunds;
  
  return {
    totalInstallmentCapital,
    totalGraceCapital,
    activeInstallmentCapital,
    activeGraceCapital,
    defaultedInstallmentFunds,
    defaultedGraceFunds,
    idleInstallmentCapital: Math.max(0, idleInstallmentCapital),
    idleGraceCapital: Math.max(0, idleGraceCapital),
    activeCapital,
    defaultedFunds,
    totalCapitalInSystem
  };
}
