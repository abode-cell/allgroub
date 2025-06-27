export type UserRole = 'مدير النظام' | 'مدير المكتب' | 'موظف' | 'مستثمر';

export type User = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  status: 'نشط' | 'معلق';
  phone?: string;
  password?: string;
  managedBy?: string;
  registrationDate?: string;
  investorLimit?: number;
  employeeLimit?: number;
};

export type Borrower = {
  id: string;
  name: string;
  amount: number;
  rate: number;
  term: number; // in years
  date: string;
  loanType: 'اقساط' | 'مهلة';
  status: 'منتظم' | 'متأخر' | 'مسدد بالكامل' | 'متعثر' | 'معلق' | 'مرفوض';
  dueDate: string;
  submittedBy?: string;
  rejectionReason?: string;
  fundedBy?: { investorId: string; amount: number }[];
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
  id:string;
  name: string;
  amount: number;
  date: string;
  status: 'نشط' | 'غير نشط' | 'معلق' | 'مرفوض';
  withdrawalHistory: Withdrawal[];
  fundedLoanIds: string[];
  defaultedFunds: number;
  submittedBy?: string;
  rejectionReason?: string;
};

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  date: string;
  isRead: boolean;
};
