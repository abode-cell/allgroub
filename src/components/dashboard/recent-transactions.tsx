
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useDataState } from '@/contexts/data-context';
import { cn } from '@/lib/utils';
import type { Borrower, Investor } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
    'مكتمل': 'default',
    'قيد المعالجة': 'secondary',
    'ملغي': 'destructive',
};

export function RecentTransactions({ borrowers: propsBorrowers, investors: propsInvestors }: { borrowers?: Borrower[], investors?: Investor[] }) {
  const { investors: allInvestors, borrowers: allBorrowers } = useDataState();
  const borrowers = propsBorrowers ?? allBorrowers;
  const investors = propsInvestors ?? allInvestors;


  const investorTransactions = investors.flatMap(investor => 
    investor.transactionHistory.map(tx => ({
      id: tx.id,
      type: tx.type,
      user: investor.name,
      amount: tx.amount,
      isDeposit: tx.type.includes('إيداع'),
      date: tx.date,
      status: 'مكتمل' as const,
      rawDate: new Date(tx.date)
    }))
  );

  const loanTransactions = borrowers
    .filter(b => b.status !== 'معلق' && b.status !== 'مرفوض')
    .map(borrower => ({
      id: `loan-${borrower.id}`,
      type: `تمويل قرض جديد`,
      user: borrower.name,
      amount: borrower.amount,
      isDeposit: false, // Funding a loan is an outflow from the platform's perspective
      date: borrower.date,
      status: 'مكتمل' as const,
      rawDate: new Date(borrower.date)
  }));
  
  const allTransactions = [...investorTransactions, ...loanTransactions];

  const sortedTransactions = allTransactions
    .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
    .slice(0, 10); // Show top 10 recent transactions

  return (
    <Card>
      <CardHeader>
        <CardTitle>المعاملات الأخيرة</CardTitle>
        <CardDescription>
          قائمة بآخر 10 معاملات مالية تمت على المنصة.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>النوع</TableHead>
              <TableHead>المستخدم</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.length > 0 ? (
              sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.type}</TableCell>
                  <TableCell>{transaction.user}</TableCell>
                  <TableCell className={cn(
                    'font-semibold',
                    transaction.isDeposit ? 'text-green-600' : (transaction.type.includes('سحب') ? 'text-destructive' : 'text-foreground')
                  )}>
                    {transaction.isDeposit ? '+' : (transaction.type.includes('سحب') ? '-' : '')}
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell>{new Date(transaction.date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusVariant[transaction.status] || 'default'}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        لا توجد معاملات حديثة.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
