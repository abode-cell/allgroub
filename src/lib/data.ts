import type { Borrower, Investor, User } from '@/lib/types';

export const usersData: User[] = [
  { id: '1', name: 'مدير النظام', email: 'admin@example.com', role: 'مدير النظام', status: 'نشط', photoURL: 'https://placehold.co/40x40.png' },
  { id: '2', name: 'مدير المكتب', email: 'manager@example.com', role: 'مدير المكتب', status: 'نشط', photoURL: 'https://placehold.co/40x40.png' },
  { id: '3', name: 'أحمد الموظف', email: 'employee@example.com', role: 'موظف', status: 'نشط', photoURL: 'https://placehold.co/40x40.png' },
  { id: '4', name: 'خالد المستثمر', email: 'investor@example.com', role: 'مستثمر', status: 'نشط', photoURL: 'https://placehold.co/40x40.png' },
  { id: '5', name: 'علي مستخدم معلق', email: 'pending@example.com', role: 'موظف', status: 'معلق', photoURL: 'https://placehold.co/40x40.png' },
];

export const investorsData: Investor[] = [
  {
    id: 'inv-1',
    name: 'صندوق الاستثمار الأول',
    amount: 500000,
    date: '2023-01-15',
    status: 'نشط',
    withdrawalHistory: [],
    fundedLoanIds: ['bor-1', 'bor-3'],
    defaultedFunds: 0,
  },
  {
    id: 'inv-2',
    name: 'مجموعة الاستثمار الذهبي',
    amount: 750000,
    date: '2023-03-20',
    status: 'نشط',
    withdrawalHistory: [{ id: 'w-1', amount: 25000, reason: 'سحب أرباح', date: '2024-05-10' }],
    fundedLoanIds: ['bor-2'],
    defaultedFunds: 5000,
  },
   {
    id: 'inv-3',
    name: 'شركة رؤى المستقبل',
    amount: 200000,
    date: '2024-02-10',
    status: 'معلق',
    withdrawalHistory: [],
    fundedLoanIds: [],
    defaultedFunds: 0,
    submittedBy: '3'
  },
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
