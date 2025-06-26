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

const transactions: {
  id: string;
  type: string;
  user: string;
  amount: string;
  date: string;
  status: string;
}[] = [];

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
          قائمة بآخر المعاملات المالية التي تمت على المنصة.
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
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
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
