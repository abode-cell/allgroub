'use client';
import { useState, useEffect } from 'react';
import { getRemainingDaysDetails } from '@/lib/utils';
import type { Borrower } from '@/lib/types';
import { cn } from '@/lib/utils';

export const RemainingDays = ({ borrower }: { borrower: Borrower }) => {
  const [details, setDetails] = useState<{ text: string; isOverdue: boolean } | null>(null);

  useEffect(() => {
    // getRemainingDaysDetails requires the current date, so we pass it from the client.
    setDetails(getRemainingDaysDetails(borrower, new Date()));
  }, [borrower]);

  if (!details) {
    // Render a placeholder or null on the server and initial client render.
    return <span>-</span>;
  }

  return (
    <span className={cn(details.isOverdue && 'text-destructive font-medium')}>
      {details.text}
    </span>
  );
};
