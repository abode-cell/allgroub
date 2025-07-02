import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Borrower } from "./types"
import { differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type BorrowerStatusDetails = {
  text: string;
  variant: 'success' | 'default' | 'secondary' | 'destructive' | 'outline';
};

export const getBorrowerStatus = (borrower: Borrower, today: Date): BorrowerStatusDetails => {
  // Terminal statuses set by user actions take priority
  if (borrower.status === 'مسدد بالكامل' || borrower.paymentStatus === 'تم السداد') return { text: 'تم السداد', variant: 'success' };
  if (borrower.status === 'متعثر' || borrower.paymentStatus === 'متعثر' || borrower.paymentStatus === 'تم اتخاذ الاجراءات القانونيه') return { text: 'متعثر', variant: 'destructive' };
  if (borrower.status === 'معلق') return { text: 'طلب معلق', variant: 'secondary' };
  if (borrower.status === 'مرفوض') return { text: 'مرفوض', variant: 'destructive' };

  // If a payment status is set, that has high priority for display, but the logic above already handles terminal ones.
  // The 'Due Status' column should reflect time-based status for ongoing loans.
  if (borrower.paymentStatus === 'مسدد جزئي') return { text: 'مسدد جزئي', variant: 'default' };
  if (borrower.paymentStatus === 'تم الإمهال') return { text: 'تم الإمهال', variant: 'secondary' };

  // Automated statuses based on dates for ongoing loans
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);
  const dueDate = new Date(borrower.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const daysDiff = differenceInDays(dueDate, todayDate);

  if (daysDiff < 0) {
      return { text: `متأخر ${Math.abs(daysDiff)} يوم`, variant: 'destructive' };
  }
  
  return { text: `متبقي ${daysDiff} يوم`, variant: 'default' };
};
