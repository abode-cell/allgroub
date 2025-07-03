'use client';
import { useState, useEffect } from 'react';
import { getRemainingDaysDetails } from '@/lib/utils';
import type { Borrower } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

export const LoanStatusInfo = ({ borrower }: { borrower: Borrower }) => {
  const [details, setDetails] = useState<{ text: string; isOverdue: boolean } | null>(null);

  useEffect(() => {
    // This hook ensures this part only runs on the client, avoiding hydration mismatches.
    setDetails(getRemainingDaysDetails(borrower, new Date()));
  }, [borrower]);

  // The highest priority is to show the paid-off date if available.
  if (borrower.paymentStatus === 'تم السداد' && borrower.paidOffDate) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-1 font-medium text-success">
           <CheckCircle className="h-4 w-4" />
           <span>تم السداد</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(borrower.paidOffDate).toLocaleDateString('ar-SA')}
        </span>
      </div>
    );
  }

  if (!details) {
    // Render a placeholder or null on the server and initial client render.
    return <span>-</span>;
  }

  return (
    <span className={cn('font-medium', details.isOverdue && 'text-destructive')}>
      {details.text}
    </span>
  );
};
