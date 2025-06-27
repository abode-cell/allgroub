'use client';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bell } from 'lucide-react';

const staticNotifications: { all: any[]; investor: any[] } = {
  all: [],
  investor: [],
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);

export default function NotificationsPage() {
  const { user, role } = useAuth();
  const { borrowers, investors } = useData();

  const getNotificationsForRole = () => {
    let notifications: { id: string; title: string; description: string }[] = [];

    // General notifications for everyone
    notifications.push(...staticNotifications.all);

    // Notifications for Managers
    if (role === 'مدير النظام' || role === 'مدير المكتب') {
      const pendingBorrowers = borrowers.filter((b) => b.status === 'معلق');
      const pendingInvestors = investors.filter((i) => i.status === 'معلق');

      pendingBorrowers.forEach((b) => {
        notifications.push({
          id: `req-bor-${b.id}`,
          title: 'طلب مقترض جديد معلق',
          description: `يوجد طلب لإضافة المقترض "${b.name}" ينتظر المراجعة.`,
        });
      });

      pendingInvestors.forEach((i) => {
        notifications.push({
          id: `req-inv-${i.id}`,
          title: 'طلب مستثمر جديد معلق',
          description: `يوجد طلب لإضافة المستثمر "${i.name}" ينتظر المراجعة.`,
        });
      });
    }

    // Notifications for Employees
    if (role === 'موظف') {
      // Use logged-in employee's ID
      const myBorrowerRequests = borrowers.filter(
        (b) => b.submittedBy === user?.id
      );
      const myInvestorRequests = investors.filter(
        (i) => i.submittedBy === user?.id
      );

      myBorrowerRequests.forEach((b) => {
        if (b.status === 'مرفوض') {
          notifications.push({
            id: `status-bor-${b.id}`,
            title: 'تم تحديث حالة طلب',
            description: `تم رفض طلب المقترض "${b.name}". السبب: ${b.rejectionReason}`,
          });
        } else if (b.status !== 'معلق' && b.status !== 'مرفوض') {
          // Approved
          notifications.push({
            id: `status-bor-${b.id}`,
            title: 'تم تحديث حالة طلب',
            description: `تمت الموافقة على طلب المقترض "${b.name}".`,
          });
        }
      });

      myInvestorRequests.forEach((i) => {
        if (i.status === 'مرفوض') {
          notifications.push({
            id: `status-inv-${i.id}`,
            title: 'تم تحديث حالة طلب',
            description: `تم رفض طلب المستثمر "${i.name}". السبب: ${i.rejectionReason}`,
          });
        } else if (i.status !== 'معلق' && i.status !== 'مرفوض') {
          // Approved
          notifications.push({
            id: `status-inv-${i.id}`,
            title: 'تم تحديث حالة طلب',
            description: `تمت الموافقة على طلب المستثمر "${i.name}".`,
          });
        }
      });
    }

    // Notifications for Investors
    if (role === 'مستثمر') {
      notifications.push(...staticNotifications.investor);
      // Use logged-in investor's ID
      const investor = investors.find((i) => i.id === user?.id);
      if (investor) {
        // Find defaulted loans funded by this investor
        const defaultedLoans = borrowers.filter(
          (b) =>
            investor.fundedLoanIds.includes(b.id) && b.status === 'متعثر'
        );

        defaultedLoans.forEach((loan) => {
          notifications.push({
            id: `def-loan-${loan.id}`,
            title: 'تنبيه: تعثر قرض مرتبط',
            description: `القرض الخاص بالمقترض "${loan.name}" قد تعثر، مما قد يؤثر على استثماراتك.`,
          });
        });

        // Notifications for recent withdrawals
        investor.transactionHistory.forEach((w) => {
          if (w.type.includes('سحب')) {
            notifications.push({
              id: `wd-${w.id}`,
              title: 'عملية سحب ناجحة',
              description: `تم سحب مبلغ ${formatCurrency(
                w.amount
              )} من حسابك.`,
            });
          }
        });
      }
    }

    // Using a Set to remove duplicate notifications by id, then converting back to array
    const uniqueNotifications = Array.from(
      new Map(notifications.map((item) => [item.id, item])).values()
    );

    return uniqueNotifications.reverse(); // Show newest first
  };

  const relevantNotifications = getNotificationsForRole();

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">مركز التنبيهات</h1>
          <p className="text-muted-foreground mt-1">
            عرض جميع التنبيهات والرسائل الخاصة بحسابك.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>قائمة التنبيهات</CardTitle>
            <CardDescription>
              هذه هي قائمة بآخر التنبيهات الخاصة بك.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {relevantNotifications.length > 0 ? (
                relevantNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-start gap-4 p-4 border-b last:border-b-0"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Bell className="h-5 w-5" />
                    </span>
                    <div className="grid gap-1">
                      <p className="text-sm font-medium leading-none">
                        {notif.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notif.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center p-8">
                  لا توجد تنبيهات جديدة.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
