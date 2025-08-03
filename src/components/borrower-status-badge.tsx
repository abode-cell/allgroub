
'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { getBorrowerStatus, type BorrowerStatusDetails } from '@/lib/utils';
import type { Borrower } from '@/lib/types';

export const BorrowerStatusBadge = ({ borrower }: { borrower: Borrower }) => {
  const [status, setStatus] = useState<BorrowerStatusDetails | null>(null);

  useEffect(() => {
    // This hook ensures this part only runs on the client, avoiding hydration mismatches.
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
