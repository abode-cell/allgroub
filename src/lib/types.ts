export type Borrower = {
  id: string;
  name: string;
  amount: number;
  rate: number;
  term: number; // in years
  status: 'منتظم' | 'متأخر' | 'مسدد بالكامل' | 'متعثر' | 'معلق';
  next_due: string;
};

export type Payment = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

export type Withdrawal = {
  id: string;
  amount: number;
  reason: string;
  date: string;
};

export type Investor = {
  id: string;
  name: string;
  amount: number;
  date: string;
  status: 'نشط' | 'غير نشط' | 'معلق';
  withdrawalHistory: Withdrawal[];
  fundedLoanIds: string[];
  defaultedFunds: number;
};
