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
  | 'manageEmployeePermissions';

export type Permissions = {
  [key in PermissionKey]?: boolean;
};

export type BorrowerPaymentStatus = 'تم السداد' | 'مسدد جزئي' | 'تم الإمهال' | 'متعثر';

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
  allowEmployeeSubmissions?: boolean;
  hideEmployeeInvestorFunds?: boolean;
  permissions?: Permissions;
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
  discount?: number;
  submittedBy?: string;
  rejectionReason?: string;
  fundedBy?: { investorId: string; amount: number }[];
  paymentStatus?: BorrowerPaymentStatus;
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
  amount: number;
  date: string;
  status: 'نشط' | 'غير نشط' | 'معلق' | 'مرفوض';
  transactionHistory: Transaction[];
  fundedLoanIds: string[];
  defaultedFunds: number;
  submittedBy?: string;
  rejectionReason?: string;
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

export type DataContextType = {
  currentUser: User | undefined;
  borrowers: Borrower[];
  investors: Investor[];
  users: User[];
  supportTickets: SupportTicket[];
  notifications: Notification[];
  salaryRepaymentPercentage: number;
  baseInterestRate: number;
  investorSharePercentage: number;
  graceTotalProfitPercentage: number;
  graceInvestorSharePercentage: number;
  supportEmail: string;
  supportPhone: string;
  updateSupportInfo: (info: { email?: string; phone?: string; }) => Promise<void>;
  updateBaseInterestRate: (rate: number) => Promise<void>;
  updateInvestorSharePercentage: (percentage: number) => Promise<void>;
  updateSalaryRepaymentPercentage: (percentage: number) => Promise<void>;
  updateGraceTotalProfitPercentage: (percentage: number) => Promise<void>;
  updateGraceInvestorSharePercentage: (percentage: number) => Promise<void>;
  addSupportTicket: (
    ticket: Omit<SupportTicket, 'id' | 'date' | 'isRead'>
  ) => Promise<void>;
  registerNewOfficeManager: (
    credentials: Omit<User, 'id' | 'role' | 'status' | 'photoURL' | 'registrationDate'>
  ) => Promise<{ success: boolean; message: string }>;
  addBorrower: (
    borrower: Omit<
      Borrower,
      'id' | 'date' | 'rejectionReason' | 'submittedBy' | 'fundedBy' | 'paymentStatus'
    >,
    investorIds: string[]
  ) => Promise<void>;
  updateBorrower: (borrower: Borrower) => Promise<void>;
  updateBorrowerPaymentStatus: (borrowerId: string, paymentStatus?: BorrowerPaymentStatus) => Promise<void>;
  approveBorrower: (borrowerId: string) => Promise<void>;
  rejectBorrower: (borrowerId: string, reason: string) => Promise<void>;
  addInvestor: (investor: Omit<Investor, 'id' | 'date' | 'transactionHistory' | 'defaultedFunds' | 'fundedLoanIds' | 'rejectionReason' | 'submittedBy'> & { email?: string; password?: string }) => Promise<void>;
  updateInvestor: (investor: Omit<Investor, 'defaultedFunds' | 'fundedLoanIds' | 'transactionHistory' | 'rejectionReason' | 'submittedBy'>) => Promise<void>;
  approveInvestor: (investorId: string) => Promise<void>;
  rejectInvestor: (investorId: string, reason: string) => Promise<void>;
  withdrawFromInvestor: (
    investorId: string,
    withdrawal: Omit<Transaction, 'id'>
  ) => Promise<void>;
  updateUserStatus: (userId: string, status: User['status']) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUserLimits: (
    userId: string,
    limits: { investorLimit: number; employeeLimit: number }
  ) => Promise<void>;
  updateManagerSettings: (
    managerId: string,
    settings: { allowEmployeeSubmissions?: boolean; hideEmployeeInvestorFunds?: boolean }
  ) => Promise<void>;
  updateAssistantPermission: (assistantId: string, key: PermissionKey, value: boolean) => Promise<void>;
  requestCapitalIncrease: (investorId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  clearUserNotifications: (userId: string) => void;
  markUserNotificationsAsRead: (userId: string) => void;
};
