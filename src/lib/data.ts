import type { Borrower, Investor } from '@/lib/types';

export const borrowersData: Borrower[] = [
  {
    id: 'bor_001',
    name: 'خالد الغامدي',
    amount: 75000,
    rate: 5.5,
    term: 5,
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-١٥',
  },
  {
    id: 'bor_002',
    name: 'فاطمة الزهراء',
    amount: 30000,
    rate: 6,
    term: 3,
    status: 'متأخر',
    next_due: '٢٠٢٤-٠٦-٢٥',
  },
  {
    id: 'bor_003',
    name: 'مؤسسة البناء الحديث',
    amount: 250000,
    rate: 4.8,
    term: 10,
    status: 'متعثر',
    next_due: '٢٠٢٤-٠٧-٠١',
  },
  {
    id: 'bor_004',
    name: 'سارة إبراهيم',
    amount: 15000,
    rate: 7.2,
    term: 2,
    status: 'مسدد بالكامل',
    next_due: '-',
  },
  {
    id: 'bor_005',
    name: 'عبدالرحمن الشهري',
    amount: 120000,
    rate: 5,
    term: 7,
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-١٠',
  },
  {
    id: 'bor_006',
    name: 'شركة النقل السريع',
    amount: 95000,
    rate: 5.2,
    term: 4,
    status: 'معلق',
    next_due: '٢٠٢٤-٠٧-٢٠',
  },
];

export const investorsData: Omit<Investor, 'defaultedFunds'>[] = [
  {
    id: 'inv_001',
    name: 'شركة الاستثمار الرائدة',
    amount: 500000,
    date: '٢٠٢٣-٠١-١٥',
    status: 'نشط',
    withdrawalHistory: [{ id: 'wd_001', amount: 10000, reason: 'سحب دوري', date: '٢٠٢٤-٠٥-١٠' }],
  },
  {
    id: 'inv_002',
    name: 'صندوق النمو المستدام',
    amount: 250000,
    date: '٢٠٢٣-٠٢-٢٠',
    status: 'نشط',
    withdrawalHistory: [],
  },
  {
    id: 'inv_003',
    name: 'أحمد عبدالله (المستثمر)',
    amount: 100000,
    date: '٢٠٢٣-٠٣-١٠',
    status: 'نشط',
    withdrawalHistory: [
      { id: 'wd_002', amount: 5000, reason: 'أرباح', date: '٢٠٢٤-٠٦-٠١' },
      { id: 'wd_003', amount: 2000, reason: 'شخصي', date: '٢٠٢٤-٠٤-١٥' },
    ],
  },
  {
    id: 'inv_004',
    name: 'نورة السعد',
    amount: 300000,
    date: '٢٠٢٣-٠٤-٠٥',
    status: 'غير نشط',
    withdrawalHistory: [],
  },
  {
    id: 'inv_005',
    name: 'مجموعة الأفق القابضة',
    amount: 1000000,
    date: '٢٠٢٣-٠٥-٠١',
    status: 'نشط',
    withdrawalHistory: [],
  },
];

// Simulate mapping of defaulted loans to investors
export const defaultedLoanInvestorMap: { [loanId: string]: string } = {
  'bor_003': 'inv_005', // 'مؤسسة البناء الحديث' -> 'مجموعة الأفق القابضة'
  'bor_006': 'inv_001', // 'شركة النقل السريع' -> 'شركة الاستثمار الرائدة'
};

// Simulate mapping of loans to investors
export const investorLoanMap: { [investorId: string]: string[] } = {
  'inv_001': ['bor_006'],
  'inv_003': [], // This investor has defaulted loans in the main data, let's connect one
  'inv_005': ['bor_003'],
};
