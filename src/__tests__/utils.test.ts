import { formatCurrency, calculateInvestorFinancials, getBorrowerStatus } from '@/lib/utils';
import type { Investor, Borrower, Transaction } from '@/lib/types';

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1000)).toBe('ر.س. ١٬٠٠٠٫٠٠');
      expect(formatCurrency(0)).toBe('ر.س. ٠٫٠٠');
      expect(formatCurrency(1234.56)).toBe('ر.س. ١٬٢٣٤٫٥٦');
    });
  });

  describe('calculateInvestorFinancials', () => {
    const mockInvestor: Investor = {
      id: 'inv1',
      office_id: 'office1',
      branch_id: null,
      name: 'Test Investor',
      date: '2024-01-01',
      status: 'نشط',
    };

    const mockTransactions: Transaction[] = [
      {
        id: 'tx1',
        office_id: 'office1',
        investor_id: 'inv1',
        date: '2024-01-01',
        type: 'إيداع رأس المال',
        amount: 100000,
        description: 'Initial deposit',
        capitalSource: 'installment',
      },
    ];

    it('should calculate investor financials correctly', () => {
      const result = calculateInvestorFinancials(mockInvestor, [], mockTransactions);
      
      expect(result.totalInstallmentCapital).toBe(100000);
      expect(result.totalGraceCapital).toBe(0);
      expect(result.totalCapitalInSystem).toBe(100000);
    });
  });

  describe('getBorrowerStatus', () => {
    const mockBorrower: Borrower = {
      id: 'bor1',
      office_id: 'office1',
      branch_id: null,
      name: 'Test Borrower',
      nationalId: '1234567890',
      phone: '0501234567',
      amount: 50000,
      date: '2024-01-01',
      loanType: 'مهلة',
      status: 'منتظم',
      dueDate: '2024-12-31',
      fundedBy: [],
    };

    it('should return correct status for regular borrower', () => {
      const today = new Date('2024-06-01');
      const result = getBorrowerStatus(mockBorrower, today);
      
      expect(result.text).toBe('منتظم');
      expect(result.variant).toBe('default');
    });

    it('should return correct status for overdue borrower', () => {
      const today = new Date('2025-01-01');
      const result = getBorrowerStatus(mockBorrower, today);
      
      expect(result.text).toBe('متأخر');
      expect(result.variant).toBe('destructive');
    });
  });
});