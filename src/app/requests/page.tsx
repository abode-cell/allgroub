'use client';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Borrower, Investor } from '@/lib/types';


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

const statusVariant: {
  [key: string]: 'default' | 'secondary' | 'destructive' | 'outline';
} = {
  منتظم: 'default',
  نشط: 'default',
  معلق: 'secondary',
  مرفوض: 'destructive',
  'مسدد بالكامل': 'default',
  متأخر: 'destructive',
  متعثر: 'destructive',
  'غير نشط': 'secondary',
};


export default function RequestsPage() {
  const { user: authUser, role } = useAuth();
  const router = useRouter();
  const { 
    borrowers, 
    investors, 
    approveBorrower, 
    approveInvestor,
    rejectBorrower,
    rejectInvestor,
    users,
  } = useData();

  const user = users.find(u => u.id === authUser?.id);
  
  const hasAccess = role === 'مدير النظام' || role === 'مدير المكتب' || (role === 'مساعد مدير المكتب' && user?.permissions?.manageRequests);

  useEffect(() => {
    if (role && !hasAccess) {
      router.replace('/');
    }
  }, [role, hasAccess, router]);


  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [itemToReject, setItemToReject] = useState<{id: string; type: 'borrower' | 'investor'} | null>(null);

  const handleRejectClick = (id: string, type: 'borrower' | 'investor') => {
    setItemToReject({ id, type });
    setIsRejectDialogOpen(true);
  }

  const handleConfirmRejection = () => {
    if (!itemToReject || !rejectionReason) return;

    if (itemToReject.type === 'borrower') {
      rejectBorrower(itemToReject.id, rejectionReason);
    } else {
      rejectInvestor(itemToReject.id, rejectionReason);
    }
    
    // Reset state
    setIsRejectDialogOpen(false);
    setRejectionReason('');
    setItemToReject(null);
  };

  const getStatusForBorrower = (borrower: Borrower) => {
    switch (borrower.status) {
      case 'معلق':
        return <Badge variant="secondary">معلق</Badge>;
      case 'مرفوض':
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="default">تمت الموافقة</Badge>;
    }
  };

  const getStatusForInvestor = (investor: Investor) => {
    switch (investor.status) {
      case 'معلق':
        return <Badge variant="secondary">معلق</Badge>;
      case 'مرفوض':
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="default">تمت الموافقة</Badge>;
    }
  };

  if (!hasAccess) {
    return null;
  }

  const borrowerRequests = borrowers.filter(b => b.submittedBy);
  const investorRequests = investors.filter(i => i.submittedBy);

  return (
    <>
      <div className="flex flex-col flex-1">
        <main className="flex-1 space-y-8 p-4 md:p-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">سجل الطلبات</h1>
            <p className="text-muted-foreground mt-1">
              عرض ومراجعة سجل طلبات إضافة القروض والمستثمرين.
            </p>
          </header>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>طلبات القروض</CardTitle>
                <CardDescription>
                  قائمة بجميع طلبات إضافة القروض وحالتها.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المقترض</TableHead>
                      <TableHead>المبلغ المطلوب</TableHead>
                      <TableHead>نوع التمويل</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراء / ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowerRequests.length > 0 ? (
                      borrowerRequests.map((borrower) => (
                        <TableRow key={borrower.id}>
                          <TableCell className="font-medium">{borrower.name}</TableCell>
                          <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                          <TableCell>{borrower.loanType}</TableCell>
                          <TableCell>
                            {getStatusForBorrower(borrower)}
                          </TableCell>
                          <TableCell>
                             {borrower.status === 'معلق' ? (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => approveBorrower(borrower.id)}>
                                  <Check className="ml-2 h-4 w-4" />
                                  موافقة
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectClick(borrower.id, 'borrower')}>
                                  <X className="ml-2 h-4 w-4" />
                                  رفض
                                </Button>
                              </div>
                            ) : borrower.status === 'مرفوض' ? (
                               <span className="text-sm text-destructive">{borrower.rejectionReason || 'تم الرفض'}</span>
                            ) : (
                               <span className="text-sm text-muted-foreground">تمت المعالجة</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          لا توجد طلبات قروض.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>طلبات المستثمرين</CardTitle>
                <CardDescription>
                  قائمة بجميع طلبات إضافة المستثمرين وحالتها.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المستثمر</TableHead>
                      <TableHead>مبلغ الاستثمار</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراء / ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investorRequests.length > 0 ? (
                      investorRequests.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell className="font-medium">{investor.name}</TableCell>
                          <TableCell>{formatCurrency(investor.amount)}</TableCell>
                          <TableCell>
                            {getStatusForInvestor(investor)}
                          </TableCell>
                          <TableCell>
                           {investor.status === 'معلق' ? (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => approveInvestor(investor.id)}>
                                  <Check className="ml-2 h-4 w-4" />
                                  موافقة
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectClick(investor.id, 'investor')}>
                                  <X className="ml-2 h-4 w-4" />
                                  رفض
                                </Button>
                              </div>
                            ) : investor.status === 'مرفوض' ? (
                               <span className="text-sm text-destructive">{investor.rejectionReason || 'تم الرفض'}</span>
                            ) : (
                               <span className="text-sm text-muted-foreground">تمت المعالجة</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          لا توجد طلبات مستثمرين.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>تأكيد الرفض</DialogTitle>
              <DialogDescription>
                الرجاء إدخال سبب الرفض. سيظهر هذا السبب للموظف.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">سبب الرفض</Label>
                <Textarea
                  id="reason"
                  placeholder="أدخل سبب الرفض هنا..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  إلغاء
                </Button>
              </DialogClose>
              <Button variant="destructive" type="button" onClick={handleConfirmRejection} disabled={!rejectionReason}>
                تأكيد الرفض
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
