

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

export type BorrowerPaymentStatus = 
  | 'منتظم'
  | 'متأخر بقسط'
  | 'متأخر بقسطين'
  | 'متعثر'
  | 'تم اتخاذ الاجراءات القانونيه'
  | 'مسدد جزئي'
  | 'تم الإمهال'
  | 'تم السداد';


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
  status: 'نشط' | 'معلق' | 'مرفوض';
  phone?: string;
  password?: string;
  managedBy?: string;
  registrationDate?: string;
  
  // Trial Period Fields
  trialEndsAt?: string; // For Office Managers on trial
  defaultTrialPeriodDays?: number; // For System Admin to configure

  // Office Manager Specific Fields
  investorLimit?: number;
  employeeLimit?: number;
  assistantLimit?: number;
  allowEmployeeSubmissions?: boolean;
  hideEmployeeInvestorFunds?: boolean;
  allowEmployeeLoanEdits?: boolean;
  permissions?: Permissions;
};

export type InstallmentStatus = 'لم يسدد بعد' | 'تم السداد' | 'متأخر';

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
  installments?: { month: number; status: InstallmentStatus }[];
  isNotified?: boolean;
  lastStatusChange?: string;
  paidOffDate?: string;
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
  capitalSource: 'installment' | 'grace'; // To specify which capital pool was used
  meta?: { [key: string]: any }; // For internal tracking, e.g., linking to a borrower status change
};

export type Investor = {
  id:string;
  name: string;
  investmentType: 'اقساط' | 'مهلة';
  date: string;
  status: 'نشط' | 'غير نشط' | 'معلق' | 'مرفوض';
  transactionHistory: Transaction[];
  fundedLoanIds: string[];
  submittedBy?: string;
  rejectionReason?: string;
  isNotified?: boolean;
  installmentProfitShare?: number;
  gracePeriodProfitShare?: number;
};

export type UpdatableInvestor = Omit<
  Investor,
  | 'fundedLoanIds'
  | 'transactionHistory'
  | 'rejectionReason'
  | 'submittedBy'
  | 'isNotified'
>;

export type NewInvestorPayload = {
    name: string;
    capital: number;
    investmentType: Investor['investmentType'];
    email: string;
    phone: string;
    password: string;
    installmentProfitShare: number;
    gracePeriodProfitShare: number;
};
