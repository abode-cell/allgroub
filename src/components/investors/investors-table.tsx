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

const investors = [
  {
    id: 'inv_001',
    name: 'شركة الاستثمار الرائدة',
    amount: '٥٠٠٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠١-١٥',
    status: 'نشط',
  },
  {
    id: 'inv_002',
    name: 'صندوق النمو المستدام',
    amount: '٢٥٠٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠٢-٢٠',
    status: 'نشط',
  },
  {
    id: 'inv_003',
    name: 'أحمد عبدالله',
    amount: '١٠٠٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠٣-١٠',
    status: 'نشط',
  },
  {
    id: 'inv_004',
    name: 'نورة السعد',
    amount: '٣٠٠٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠٤-٠٥',
    status: 'غير نشط',
  },
  {
    id: 'inv_005',
    name: 'مجموعة الأفق القابضة',
    amount: '١٬٠٠٠٬٠٠٠ ر.س',
    date: '٢٠٢٣-٠٥-٠١',
    status: 'نشط',
  },
];

const statusVariant: { [key: string]: 'default' | 'secondary' } = {
  نشط: 'default',
  'غير نشط': 'secondary',
};

export function InvestorsTable() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المستثمر</TableHead>
              <TableHead>مبلغ الاستثمار</TableHead>
              <TableHead>تاريخ البدء</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>
                <span className="sr-only">الإجراءات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investors.map((investor) => (
              <TableRow key={investor.id}>
                <TableCell className="font-medium">{investor.name}</TableCell>
                <TableCell>{investor.amount}</TableCell>
                <TableCell>{investor.date}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[investor.status] || 'default'}>
                    {investor.status}
                  </Badge>
                </TableCell>
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
                      <DropdownMenuItem>عرض التفاصيل</DropdownMenuItem>
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
