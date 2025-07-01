import type { Borrower, Investor, User, SupportTicket, Notification } from '@/lib/types';

export const usersData: User[] = [
  { id: '1', name: 'مدير النظام', email: 'admin@example.com', role: 'مدير النظام', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000001', registrationDate: '2023-01-10T10:00:00.000Z', allowEmployeeSubmissions: true, permissions: {} },
  { id: '2', name: 'مدير المكتب', email: 'manager@example.com', role: 'مدير المكتب', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000002', registrationDate: '2023-01-12T11:00:00.000Z', investorLimit: 10, employeeLimit: 5, assistantLimit: 2, allowEmployeeSubmissions: true, hideEmployeeInvestorFunds: false, permissions: {} },
  { id: '3', name: 'أحمد الموظف', email: 'employee@example.com', role: 'موظف', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000003', managedBy: '2', registrationDate: '2023-01-13T09:00:00.000Z', permissions: {} },
  { id: '4', name: 'خالد المستثمر', email: 'investor@example.com', role: 'مستثمر', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000004', registrationDate: '2023-02-05T10:00:00.000Z', permissions: {} },
  { id: '5', name: 'علي مستخدم معلق', email: 'pending@example.com', role: 'موظف', status: 'معلق', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000005', managedBy: '2', registrationDate: '2024-05-20T09:30:00.000Z', permissions: {} },
  { id: '6', name: 'مساعد المدير', email: 'assistant@example.com', role: 'مساعد مدير المكتب', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000006', managedBy: '2', registrationDate: '2024-06-01T10:30:00.000Z', permissions: { manageInvestors: false, manageBorrowers: false, importData: false, viewReports: false, manageRequests: false, useCalculator: false, accessSettings: false, manageEmployeePermissions: false, viewIdleFundsReport: false } },
  { id: 'inv-4', name: 'محفظة الأصول الجديدة', email: 'assets@example.com', role: 'مستثمر', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000007', managedBy: '2', registrationDate: '2024-03-15T10:00:00.000Z', permissions: {} },
];

export const investorsData: Investor[] = [
  {
    id: 'inv-1',
    name: 'صندوق الاستثمار الأول',
    investmentType: 'اقساط',
    installmentCapital: 350000, // Initial 500k, funded 150k for bor-1
    gracePeriodCapital: 0,
    date: '2023-01-15T14:00:00.000Z',
    status: 'نشط',
    transactionHistory: [
      { id: 't-1-1', date: '2023-01-15T14:00:00.000Z', type: 'إيداع رأس المال', amount: 500000, description: 'الإيداع الأولي للمحفظة' }
    ],
    fundedLoanIds: ['bor-1'],
    defaultedFunds: 0,
    isNotified: false,
  },
  {
    id: 'inv-2',
    name: 'مجموعة الاستثمار الذهبي',
    investmentType: 'مهلة',
    installmentCapital: 0, 
    gracePeriodCapital: 450000, // Initial 750k, withdrew 25k, funded 200k for bor-2 (now أقساط), funded 75k for bor-3 (now defaulted)
    date: '2023-03-20T12:00:00.000Z',
    status: 'نشط',
    transactionHistory: [
        { id: 't-2-1', date: '2023-03-20T12:00:00.000Z', type: 'إيداع رأس المال', amount: 750000, description: 'استثمار تأسيسي' },
        { id: 't-2-2', date: '2024-05-10T13:00:00.000Z', type: 'سحب أرباح', amount: 25000, description: 'توزيعات أرباح الربع الأول', withdrawalMethod: 'بنكي' },
        { id: 't-2-3', date: '2024-06-01T10:00:00.000Z', type: 'إيداع أرباح', amount: 15000, description: 'أرباح محققة من قرض مكتمل' },
    ],
    fundedLoanIds: [],
    defaultedFunds: 75000,
    isNotified: false,
  },
   {
    id: 'inv-3',
    name: 'شركة رؤى المستقبل',
    investmentType: 'مهلة',
    installmentCapital: 0,
    gracePeriodCapital: 200000,
    date: '2024-02-10T11:30:00.000Z',
    status: 'معلق',
    transactionHistory: [
       { id: 't-3-1', date: '2024-02-10T11:30:00.000Z', type: 'إيداع رأس المال', amount: 200000, description: 'إيداع معلق' }
    ],
    fundedLoanIds: [],
    defaultedFunds: 0,
    submittedBy: '3',
    isNotified: false,
  },
  {
    id: '4', // Corresponds to user 'خالد المستثمر'
    name: 'خالد المستثمر',
    investmentType: 'اقساط',
    installmentCapital: 800000,
    gracePeriodCapital: 0,
    date: '2023-02-05T10:05:00.000Z',
    status: 'نشط',
    transactionHistory: [
      { id: 't-khaled-1', date: '2023-02-05T10:05:00.000Z', type: 'إيداع رأس المال', amount: 800000, description: 'إيداع أولي' }
    ],
    fundedLoanIds: [],
    defaultedFunds: 0,
    isNotified: false,
  },
   {
    id: 'inv-4',
    name: 'محفظة الأصول الجديدة',
    investmentType: 'اقساط',
    installmentCapital: 1000000,
    gracePeriodCapital: 0,
    date: '2024-03-15T10:00:00.000Z',
    status: 'نشط',
    transactionHistory: [
       { id: 't-4-1', date: '2024-03-15T10:00:00.000Z', type: 'إيداع رأس المال', amount: 1000000, description: 'إيداع أولي' }
    ],
    fundedLoanIds: [],
    defaultedFunds: 0,
    submittedBy: '2',
    isNotified: false,
  }
];

export const borrowersData: Borrower[] = [
  {
    id: 'bor-1',
    name: 'شركة المشاريع الحديثة',
    phone: '0512345671',
    amount: 150000,
    rate: 5.5,
    term: 5,
    date: '2023-02-01T15:00:00.000Z',
    loanType: 'اقساط',
    status: 'منتظم',
    dueDate: '2028-02-01',
    fundedBy: [{ investorId: 'inv-1', amount: 150000 }],
    paymentStatus: 'مسدد جزئي',
    isNotified: false,
  },
  {
    id: 'bor-2',
    name: 'مؤسسة البناء المتكامل',
    phone: '0512345672',
    amount: 200000,
    rate: 6,
    term: 7,
    date: '2023-04-10T16:00:00.000Z',
    loanType: 'اقساط',
    status: 'متأخر',
    dueDate: '2030-04-10',
    fundedBy: [{ investorId: 'inv-4', amount: 200000 }],
    paymentStatus: 'تم الإمهال',
    isNotified: true,
  },
  {
    id: 'bor-3',
    name: 'متجر التجزئة السريع',
    phone: '0512345673',
    amount: 75000,
    rate: 0,
    term: 0,
    date: '2023-05-15T11:00:00.000Z',
    loanType: 'مهلة',
    status: 'متعثر',
    dueDate: '2024-05-15',
    fundedBy: [{ investorId: 'inv-2', amount: 75000 }],
    discount: 0,
    isNotified: true,
  },
  {
    id: 'bor-4',
    name: 'شركة التقنية المبتكرة',
    phone: '0512345674',
    amount: 300000,
    rate: 4.8,
    term: 10,
    date: '2024-01-20T14:00:00.000Z',
    loanType: 'اقساط',
    status: 'معلق',
    dueDate: '2034-01-20',
    submittedBy: '3',
    isNotified: false,
  },
];

export const notificationsData: Notification[] = [];
export const supportTicketsData: SupportTicket[] = [];
