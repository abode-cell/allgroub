'use client';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

const staticNotifications = {
  all: [
    {
      id: 's1',
      title: 'تم صرف قرض جديد',
      description: 'تم صرف قرض بقيمة ٥٠٬٠٠٠ ر.س لأحمد المحمدي.',
    },
    {
      id: 's2',
      title: 'دفعة مستثمر جديدة',
      description: 'تم استلام دفعة بقيمة ١٠٠٬٠٠٠ ر.س من شركة الأفق.',
    },
  ],
  investor: [
    { id: 's3', title: 'استحقاق أرباح', description: 'تم إضافة أرباح جديدة إلى حسابك.' },
    {
      id: 's4',
      title: 'تعثر قرض مرتبط',
      description: 'أحد القروض التي تمولها قد تعثر.',
    },
  ],
};


export default function NotificationsPage() {
  const { role } = useAuth();
  const { borrowers, investors } = useData();

  const getNotificationsForRole = () => {
    let roleNotifications = [...staticNotifications.all];

    if (role === 'مستثمر') {
      roleNotifications.push(...staticNotifications.investor);
    }

    if (role === 'مدير النظام' || role === 'مدير المكتب') {
      const pendingBorrowers = borrowers.filter((b) => b.status === 'معلق');
      const pendingInvestors = investors.filter((i) => i.status === 'معلق');

      pendingBorrowers.forEach((b) => {
        roleNotifications.push({
          id: `req-${b.id}`,
          title: 'طلب مقترض جديد معلق',
          description: `يوجد طلب لإضافة المقترض "${b.name}" ينتظر المراجعة.`,
        });
      });

      pendingInvestors.forEach((i) => {
        roleNotifications.push({
          id: `req-${i.id}`,
          title: 'طلب مستثمر جديد معلق',
          description: `يوجد طلب لإضافة المستثمر "${i.name}" ينتظر المراجعة.`,
        });
      });
    }

    return roleNotifications.reverse();
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
                <CardDescription>هذه هي قائمة بآخر التنبيهات الخاصة بك.</CardDescription>
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
