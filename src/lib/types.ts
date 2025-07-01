
'use client';

export type UserRole = 'مدير النظام' | 'مدير المكتب' | 'مساعد مدير المكتب' | 'موظف' | 'مستثمر';

export type PermissionKey = 
  | 'manageInvestors'
  | 'manageBorrowers'
  | 'importData'
  | 'viewReports'
  | 'manageRequests'
  | 'useCalculator'
  | 'accessSettings'
  | 'manageEmployeePermissions'
  | 'viewIdleFundsReport'
  | 'allowEmployeeLoanEdits';

export type Permissions = {
  [key in PermissionKey]?: boolean;
};

export type BorrowerPaymentStatus = 'تم السداد' | 'مسدد جزئي' | 'تم الإمهال' | 'متعثر';

export type NewUserPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

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
  assistantLimit?: number;
  allowEmployeeSubmissions?: boolean;
  hideEmployeeInvestorFunds?: boolean;
  allowEmployeeLoanEdits?: boolean;
  permissions?: Permissions;
};

export type Borrower = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  rate: number;
  term: number; // in years
  date: string;
  loanType: 'اقساط' | 'مهلة';
  status: 'منتظم' | 'متأخر' | 'مسدد بالكامل' | 'متعثر' | 'معلق' | 'مرفوض';
  dueDate: string;
  discount?: number;
  submittedBy?: string;
  rejectionReason?: string;
  fundedBy?: { investorId: string; amount: number }[];
  paymentStatus?: BorrowerPaymentStatus;
  isNotified?: boolean;
};

export type Payment = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

export type TransactionType = 'إيداع رأس المال' | 'سحب من رأس المال' | 'إيداع أرباح' | 'سحب أرباح';
export type WithdrawalMethod = 'نقدي' | 'بنكي';

export type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  withdrawalMethod?: WithdrawalMethod;
};

export type Investor = {
  id:string;
  name: string;
  investmentType: 'اقساط' | 'مهلة';
  installmentCapital: number;
  gracePeriodCapital: number;
  date: string;
  status: 'نشط' | 'غير نشط' | 'معلق' | 'مرفوض';
  transactionHistory: Transaction[];
  fundedLoanIds: string[];
  defaultedFunds: number;
  submittedBy?: string;
  rejectionReason?: string;
  isNotified?: boolean;
  installmentProfitShare?: number;
  gracePeriodProfitShare?: number;
};

export type Notification = {
  id: string;
  recipientId: string;
  title: string;
  description: string;
  date: string;
  isRead: boolean;
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

export type UpdatableInvestor = Omit<
  Investor,
  | 'defaultedFunds'
  | 'fundedLoanIds'
  | 'transactionHistory'
  | 'rejectionReason'
  | 'submittedBy'
  | 'isNotified'
>;

export type NewInvestorPayload = {
    name: string;
    status: Investor['status'];
    investmentType: Investor['investmentType'];
    capital: number;
    email: string;
    password: string;
    installmentProfitShare: number;
    gracePeriodProfitShare: number;
};
