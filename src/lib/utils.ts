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
  // First, check for statuses that are absolute and not based on time.
  if (borrower.status === 'معلق') return { text: 'طلب معلق', variant: 'secondary' };
  if (borrower.status === 'مرفوض') return { text: 'مرفوض', variant: 'destructive' };

  // If payment status is explicitly set to 'Paid Off', this has the highest priority for display.
  if (borrower.paymentStatus === 'تم السداد') {
    return { text: 'تم السداد', variant: 'success' };
  }
  
  // For all other cases, including when paymentStatus is undefined or any other ongoing status,
  // we calculate the status based on the due date.
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
