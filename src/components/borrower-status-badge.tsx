'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { getBorrowerStatus, type BorrowerStatusDetails } from '@/lib/utils';
import type { Borrower } from '@/lib/types';

export const BorrowerStatusBadge = ({ borrower }: { borrower: Borrower }) => {
  const [status, setStatus] = useState<BorrowerStatusDetails | null>(null);

  useEffect(() => {
    // getBorrowerStatus uses new Date(), so it must run on the client after hydration.
    setStatus(getBorrowerStatus(borrower));
  }, [borrower]);

  if (!status) {
    // Render a placeholder or null on the server and initial client render.
    // A simple span is fine, as it will be replaced quickly.
    return <span>-</span>;
  }

  return (
    <Badge variant={status.variant}>
      {status.text}
    </Badge>
  );
};
