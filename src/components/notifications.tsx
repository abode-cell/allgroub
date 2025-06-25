'use client';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';

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

export function Notifications() {
  const { role } = useAuth();
  const { borrowers, investors } = useData();

  const getNotificationsForRole = () => {
    let roleNotifications = [...staticNotifications.all];

    if (role === 'مستثمر') {
      roleNotifications.push(...staticNotifications.investor);
    }

    // Dynamic notifications for managers for pending tasks
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

    return roleNotifications.reverse(); // Show newest first
  };

  const relevantNotifications = getNotificationsForRole();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative shrink-0">
          <Bell className="h-4 w-4" />
          <span className="sr-only">فتح التنبيهات</span>
          {relevantNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 font-medium border-b">التنبيهات</div>
        <div className="p-2 max-h-80 overflow-y-auto">
          {relevantNotifications.length > 0 ? (
            relevantNotifications.map((notif) => (
              <div
                key={notif.id}
                className="mb-2 grid grid-cols-[25px_1fr] items-start pb-2 last:mb-0 last:pb-0"
              >
                <span className="flex h-2 w-2 translate-y-1.5 rounded-full bg-primary" />
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
            <p className="text-sm text-muted-foreground text-center p-4">
              لا توجد تنبيهات جديدة.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
