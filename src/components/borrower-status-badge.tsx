'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { getBorrowerStatus, type BorrowerStatusDetails } from '@/lib/utils';
import type { Borrower } from '@/lib/types';

export const BorrowerStatusBadge = ({ borrower }: { borrower: Borrower }) => {
  const [status, setStatus] = useState<BorrowerStatusDetails | null>(null);

  useEffect(() => {
    // getBorrowerStatus now requires the current date, so we pass it from the client.
    setStatus(getBorrowerStatus(borrower, new Date()));
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
