
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Borrower } from "./types"
import { differenceInDays, addMonths, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type BorrowerStatusDetails = {
  text: string;
  variant: 'success' | 'default' | 'secondary' | 'destructive' | 'outline';
};

const normalizeDate = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

export const getBorrowerStatus = (borrower: Borrower, today: Date): BorrowerStatusDetails => {
  // First, check for statuses that are absolute and not based on time.
  if (borrower.status === 'معلق') return { text: 'طلب معلق', variant: 'secondary' };
  if (borrower.status === 'مرفوض') return { text: 'مرفوض', variant: 'destructive' };

  // If payment status is explicitly set to 'Paid Off', this has the highest priority for display.
  if (borrower.paymentStatus === 'تم السداد') {
    return { text: 'تم السداد', variant: 'success' };
  }
  
  // For all other cases, including when paymentStatus is undefined or any other ongoing status,
  // we calculate the status based on the due date.
  const todayDate = normalizeDate(today);

  if (!borrower.dueDate) {
    return { text: 'لا يوجد تاريخ', variant: 'secondary' };
  }
  
  const dueDate = new Date(borrower.dueDate);
  if (!isValid(dueDate)) { // Use isValid from date-fns for robust check
    console.error(`Invalid dueDate for borrower ${borrower.id}: ${borrower.dueDate}`);
    return { text: 'تاريخ غير صالح', variant: 'destructive' };
  }

  const normalizedDueDate = normalizeDate(dueDate);
  
  const daysDiff = differenceInDays(normalizedDueDate, todayDate);

  if (daysDiff < 0) {
      return { text: `متأخر ${Math.abs(daysDiff)} يوم`, variant: 'destructive' };
  }
  
  return { text: `متبقي ${daysDiff} يوم`, variant: 'default' };
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
