import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Borrower } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type BorrowerStatusDetails = {
  text: string;
  variant: 'success' | 'default' | 'secondary' | 'destructive' | 'outline';
};

export const getBorrowerStatus = (borrower: Borrower): BorrowerStatusDetails => {
  // Terminal statuses set by user actions take priority
  if (borrower.status === 'مسدد بالكامل') return { text: 'مسدد بالكامل', variant: 'success' };
  if (borrower.status === 'متعثر') return { text: 'متعثر', variant: 'destructive' };
  if (borrower.status === 'معلق') return { text: 'طلب معلق', variant: 'secondary' };
  if (borrower.status === 'مرفوض') return { text: 'مرفوض', variant: 'destructive' };

  // If a payment status is set, that has high priority for display
  if (borrower.paymentStatus === 'تم السداد') return { text: 'تم السداد', variant: 'success' };
  if (borrower.paymentStatus === 'مسدد جزئي') return { text: 'مسدد جزئي', variant: 'default' };
  if (borrower.paymentStatus === 'تم الإمهال') return { text: 'تم الإمهال', variant: 'secondary' };
  if (borrower.paymentStatus === 'متعثر') return { text: 'متعثر', variant: 'destructive' };

  // Automated statuses based on dates for ongoing loans
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(borrower.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  if (today > dueDate) {
      return { text: 'متأخر السداد', variant: 'destructive' };
  }
  
  // If manually set to late, respect that
  if (borrower.status === 'متأخر') {
       return { text: 'متأخر السداد', variant: 'destructive' };
  }
  
  const startDate = new Date(borrower.date);
  startDate.setHours(0, 0, 0, 0);
  
  const totalDuration = dueDate.getTime() - startDate.getTime();
  if (totalDuration <= 0) {
      return { text: 'منتظم', variant: 'default' };
  }

  const elapsedDuration = today.getTime() - startDate.getTime();
  const progress = elapsedDuration / totalDuration;

  if (progress < 0.25) { 
      return { text: 'جديد', variant: 'default' };
  }
  if (progress < 0.80) { 
      return { text: 'منتصف المدة', variant: 'outline' };
  }
  return { text: 'اقترب السداد', variant: 'default' };
};
