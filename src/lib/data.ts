import type { Borrower, Investor, User, SupportTicket, Notification } from '@/lib/types';

export const usersData: User[] = [
  { id: '1', name: 'مدير النظام', email: 'admin@example.com', role: 'مدير النظام', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000001', registrationDate: '2023-01-10', allowEmployeeSubmissions: true },
  { id: '2', name: 'مدير المكتب', email: 'manager@example.com', role: 'مدير المكتب', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000002', registrationDate: '2023-01-12', investorLimit: 10, employeeLimit: 5, allowEmployeeSubmissions: true, hideEmployeeInvestorFunds: false },
  { id: '3', name: 'أحمد الموظف', email: 'employee@example.com', role: 'موظف', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000003', managedBy: '2', registrationDate: '2023-01-13' },
  { id: '4', name: 'خالد المستثمر', email: 'investor@example.com', role: 'مستثمر', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000004', registrationDate: '2023-02-05' },
  { id: '5', name: 'علي مستخدم معلق', email: 'pending@example.com', role: 'موظف', status: 'معلق', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000005', managedBy: '2', registrationDate: '2024-05-20' },
  { id: 'inv-4', name: 'محفظة الأصول الجديدة', email: 'assets@example.com', role: 'مستثمر', status: 'نشط', photoURL: 'https://placehold.co/40x40.png', password: 'password123', phone: '0500000007', managedBy: '2', registrationDate: '2024-03-15' },
];

// Note: Investor `amount` represents available (liquid) capital.
// The initial capital is depleted as they fund loans.
export const investorsData: Investor[] = [
  {
    id: 'inv-1',
    name: 'صندوق الاستثمار الأول',
    amount: 350000, // Initial 500k, funded 150k for bor-1
    date: '2023-01-15',
    status: 'نشط',
    transactionHistory: [
      { id: 't-1-1', date: '2023-01-15', type: 'إيداع رأس المال', amount: 500000, description: 'الإيداع الأولي للمحفظة' }
    ],
    fundedLoanIds: ['bor-1'],
    defaultedFunds: 0,
  },
  {
    id: 'inv-2',
    name: 'مجموعة الاستثمار الذهبي',
    amount: 450000, // Initial 750k, withdrew 25k, funded 200k for bor-2, funded 75k for bor-3 (now defaulted)
    date: '2023-03-20',
    status: 'نشط',
    transactionHistory: [
        { id: 't-2-1', date: '2023-03-20', type: 'إيداع رأس المال', amount: 750000, description: 'استثمار تأسيسي' },
        { id: 't-2-2', date: '2024-05-10', type: 'سحب أرباح', amount: 25000, description: 'توزيعات أرباح الربع الأول', withdrawalMethod: 'بنكي' },
        { id: 't-2-3', date: '2024-06-01', type: 'إيداع أرباح', amount: 15000, description: 'أرباح محققة من قرض مكتمل' },
    ],
    fundedLoanIds: ['bor-2'], // bor-3 is defaulted, so it's not an "active" funded loan
    defaultedFunds: 75000, // from bor-3
  },
   {
    id: 'inv-3',
    name: 'شركة رؤى المستقبل',
    amount: 200000,
    date: '2024-02-10',
    status: 'معلق',
    transactionHistory: [
       { id: 't-3-1', date: '2024-02-10', type: 'إيداع رأس المال', amount: 200000, description: 'إيداع معلق' }
    ],
    fundedLoanIds: [],
    defaultedFunds: 0,
    submittedBy: '3'
  },
  {
    id: '4', // Corresponds to user 'خالد المستثمر'
    name: 'خالد المستثمر',
    amount: 0,
    date: '2023-02-05',
    status: 'نشط',
    transactionHistory: [
      { id: 't-khaled-1', date: '2023-02-05', type: 'إيداع رأس المال', amount: 800000, description: 'إيداع أولي' }
    ],
    fundedLoanIds: [],
    defaultedFunds: 0,
  },
   {
    id: 'inv-4',
    name: 'محفظة الأصول الجديدة',
    amount: 1000000,
    date: '2024-03-15',
    status: 'نشط',
    transactionHistory: [
       { id: 't-4-1', date: '2024-03-15', type: 'إيداع رأس المال', amount: 1000000, description: 'إيداع أولي' }
    ],
    fundedLoanIds: [],
    defaultedFunds: 0,
    submittedBy: '2'
  }
];

export const borrowersData: Borrower[] = [
  {
    id: 'bor-1',
    name: 'شركة المشاريع الحديثة',
    amount: 150000,
    rate: 5.5,
    term: 5,
    date: '2023-02-01',
    loanType: 'اقساط',
    status: 'منتظم',
    dueDate: '2028-02-01',
    fundedBy: [{ investorId: 'inv-1', amount: 150000 }],
  },
  {
    id: 'bor-2',
    name: 'مؤسسة البناء المتكامل',
    amount: 200000,
    rate: 6,
    term: 7,
    date: '2023-04-10',
    loanType: 'اقساط',
    status: 'متأخر',
    dueDate: '2030-04-10',
    fundedBy: [{ investorId: 'inv-2', amount: 200000 }],
  },
  {
    id: 'bor-3',
    name: 'متجر التجزئة السريع',
    amount: 75000,
    rate: 0,
    term: 0,
    date: '2023-05-15',
    loanType: 'مهلة',
    status: 'متعثر',
    dueDate: '2024-05-15',
    fundedBy: [{ investorId: 'inv-2', amount: 75000 }],
    discount: 0,
  },
  {
    id: 'bor-4',
    name: 'شركة التقنية المبتكرة',
    amount: 300000,
    rate: 4.8,
    term: 10,
    date: '2024-01-20',
    loanType: 'اقساط',
    status: 'معلق',
    dueDate: '2034-01-20',
    submittedBy: '3',
  },
];

export const notificationsData: Notification[] = [];
export const supportTicketsData: SupportTicket[] = [];
