import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const borrowers = [
  {
    id: 'bor_001',
    name: 'خالد الغامدي',
    amount: '٧٥٬٠٠٠ ر.س',
    rate: '٥.٥٪',
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-١٥',
  },
  {
    id: 'bor_002',
    name: 'فاطمة الزهراء',
    amount: '٣٠٬٠٠٠ ر.س',
    rate: '٦٪',
    status: 'متأخر',
    next_due: '٢٠٢٤-٠٦-٢٥',
  },
  {
    id: 'bor_003',
    name: 'مؤسسة البناء الحديث',
    amount: '٢٥٠٬٠٠٠ ر.س',
    rate: '٤.٨٪',
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-٠١',
  },
  {
    id: 'bor_004',
    name: 'سارة إبراهيم',
    amount: '١٥٬٠٠٠ ر.س',
    rate: '٧.٢٪',
    status: 'مسدد بالكامل',
    next_due: '-',
  },
  {
    id: 'bor_005',
    name: 'عبدالرحمن الشهري',
    amount: '١٢٠٬٠٠٠ ر.س',
    rate: '٥٪',
    status: 'منتظم',
    next_due: '٢٠٢٤-٠٧-١٠',
  },
];

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  منتظم: 'default',
  متأخر: 'destructive',
  'مسدد بالكامل': 'secondary',
};

export function BorrowersTable() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المقترض</TableHead>
              <TableHead>مبلغ القرض</TableHead>
              <TableHead>نسبة الفائدة</TableHead>
              <TableHead>حالة السداد</TableHead>
              <TableHead>الدفعة التالية</TableHead>
              <TableHead>
                <span className="sr-only">الإجراءات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {borrowers.map((borrower) => (
              <TableRow key={borrower.id}>
                <TableCell className="font-medium">{borrower.name}</TableCell>
                <TableCell>{borrower.amount}</TableCell>
                <TableCell>{borrower.rate}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[borrower.status] || 'outline'}>
                    {borrower.status}
                  </Badge>
                </TableCell>
                <TableCell>{borrower.next_due}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">فتح القائمة</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>تعديل</DropdownMenuItem>
                      <DropdownMenuItem>عرض جدول السداد</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
