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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

export default function RequestsPage() {
  const { role } = useAuth();
  const router = useRouter();
  const { 
    borrowers, 
    investors, 
    approveBorrower, 
    approveInvestor,
    rejectBorrower,
    rejectInvestor,
  } = useData();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [itemToReject, setItemToReject] = useState<{id: string; type: 'borrower' | 'investor'} | null>(null);

  const canViewPage = role === 'مدير النظام' || role === 'مدير المكتب';

  useEffect(() => {
    if (!canViewPage) {
      router.replace('/');
    }
  }, [role, canViewPage, router]);

  if (!canViewPage) {
    return null;
  }

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

  const pendingBorrowers = borrowers.filter(b => b.status === 'معلق');
  const pendingInvestors = investors.filter(i => i.status === 'معلق');

  return (
    <>
      <div className="flex flex-col flex-1">
        <main className="flex-1 space-y-8 p-4 md:p-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">مراجعة الطلبات</h1>
            <p className="text-muted-foreground mt-1">
              مراجعة والموافقة على طلبات إضافة المقترضين والمستثمرين الجديدة.
            </p>
          </header>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>طلبات المقترضين المعلقة</CardTitle>
                <CardDescription>
                  قائمة بطلبات إضافة مقترضين جدد تنتظر موافقتك.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المقترض</TableHead>
                      <TableHead>المبلغ المطلوب</TableHead>
                      <TableHead>نوع التمويل</TableHead>
                      <TableHead>الفائدة</TableHead>
                      <TableHead>المدة (سنوات)</TableHead>
                      <TableHead>الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingBorrowers.length > 0 ? (
                      pendingBorrowers.map((borrower) => (
                        <TableRow key={borrower.id}>
                          <TableCell className="font-medium">{borrower.name}</TableCell>
                          <TableCell>{formatCurrency(borrower.amount)}</TableCell>
                          <TableCell>{borrower.loanType}</TableCell>
                          <TableCell>{borrower.loanType === 'اقساط' ? `${borrower.rate}%` : '-'}</TableCell>
                          <TableCell>{borrower.loanType === 'اقساط' ? borrower.term : '-'}</TableCell>
                          <TableCell className="flex gap-2">
                            <Button size="sm" onClick={() => approveBorrower(borrower.id)}>
                              <Check className="ml-2 h-4 w-4" />
                              موافقة
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectClick(borrower.id, 'borrower')}>
                              <X className="ml-2 h-4 w-4" />
                              رفض
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          لا توجد طلبات مقترضين معلقة.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>طلبات المستثمرين المعلقة</CardTitle>
                <CardDescription>
                  قائمة بطلبات إضافة مستثمرين جدد تنتظر موافقتك.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المستثمر</TableHead>
                      <TableHead>مبلغ الاستثمار</TableHead>
                      <TableHead>الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvestors.length > 0 ? (
                      pendingInvestors.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell className="font-medium">{investor.name}</TableCell>
                          <TableCell>{formatCurrency(investor.amount)}</TableCell>
                          <TableCell className="flex gap-2">
                            <Button size="sm" onClick={() => approveInvestor(investor.id)}>
                              <Check className="ml-2 h-4 w-4" />
                              موافقة
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectClick(investor.id, 'investor')}>
                              <X className="ml-2 h-4 w-4" />
                              رفض
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          لا توجد طلبات مستثمرين معلقة.
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
