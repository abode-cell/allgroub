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

const transactions = [
  {
    id: 'txn_001',
    type: 'صرف قرض',
    user: 'أحمد المحمدي',
    amount: '٥٠٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠٦-٢٣',
    status: 'مكتمل',
  },
  {
    id: 'txn_002',
    type: 'دفعة مستثمر',
    user: 'شركة الأفق',
    amount: '١٠٠٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠٦-٢٢',
    status: 'مكتمل',
  },
  {
    id: 'txn_003',
    type: 'سداد قسط',
    user: 'فاطمة الزهراء',
    amount: '٢٬٥٠٠ ر.س',
    date: '٢٠٢٣-٠٦-٢١',
    status: 'مكتمل',
  },
  {
    id: 'txn_004',
    type: 'صرف قرض',
    user: 'خالد الغامدي',
    amount: '٧٥٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠٦-٢٠',
    status: 'قيد المعالجة',
  },
  {
    id: 'txn_005',
    type: 'سحب أرباح',
    user: 'نورة السعد',
    amount: '١٥٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠٦-١٩',
    status: 'ملغي',
  },
];

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
    'مكتمل': 'default',
    'قيد المعالجة': 'secondary',
    'ملغي': 'destructive',
}


export function RecentTransactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>المعاملات الأخيرة</CardTitle>
        <CardDescription>
          قائمة بآخر ٥ معاملات مالية تمت على المنصة.
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
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.type}</TableCell>
                <TableCell>{transaction.user}</TableCell>
                <TableCell>{transaction.amount}</TableCell>
                <TableCell>{transaction.date}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[transaction.status] || 'default'}>
                    {transaction.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
