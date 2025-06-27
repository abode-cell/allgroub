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
import { useState, useEffect, useRef } from 'react';

const staticNotifications: { all: any[]; investor: any[] } = {
  all: [],
  investor: [],
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
  }).format(value);


export function Notifications() {
  const { user, role } = useAuth();
  const { borrowers, investors } = useData();
  const [hasUnseen, setHasUnseen] = useState(false);

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
      const myBorrowerRequests = borrowers.filter(b => b.submittedBy === user?.id);
      const myInvestorRequests = investors.filter(i => i.submittedBy === user?.id);
      
      myBorrowerRequests.forEach(b => {
          if (b.status === 'مرفوض') {
              notifications.push({
                  id: `status-bor-${b.id}`,
                  title: 'تم تحديث حالة طلب',
                  description: `تم رفض طلب المقترض "${b.name}". السبب: ${b.rejectionReason}`
              });
          } else if (b.status !== 'معلق' && b.status !== 'مرفوض') { // Approved
              notifications.push({
                  id: `status-bor-${b.id}`,
                  title: 'تم تحديث حالة طلب',
                  description: `تمت الموافقة على طلب المقترض "${b.name}".`
              });
          }
      });
      
       myInvestorRequests.forEach(i => {
          if (i.status === 'مرفوض') {
              notifications.push({
                  id: `status-inv-${i.id}`,
                  title: 'تم تحديث حالة طلب',
                  description: `تم رفض طلب المستثمر "${i.name}". السبب: ${i.rejectionReason}`
              });
          } else if (i.status !== 'معلق' && i.status !== 'مرفوض') { // Approved
              notifications.push({
                  id: `status-inv-${i.id}`,
                  title: 'تم تحديث حالة طلب',
                  description: `تمت الموافقة على طلب المستثمر "${i.name}".`
              });
          }
      });
    }
    
    // Notifications for Investors
    if (role === 'مستثمر') {
      notifications.push(...staticNotifications.investor);
      const investor = investors.find(i => i.id === user?.id);
      if(investor) {
        const defaultedLoans = borrowers.filter(b => 
            investor.fundedLoanIds.includes(b.id) && b.status === 'متعثر'
        );

        defaultedLoans.forEach(loan => {
            notifications.push({
                id: `def-loan-${loan.id}`,
                title: 'تنبيه: تعثر قرض مرتبط',
                description: `القرض الخاص بالمقترض "${loan.name}" قد تعثر، مما قد يؤثر على استثماراتك.`
            });
        });

        investor.transactionHistory.forEach(w => {
            if (w.type.includes('سحب')) {
                 notifications.push({
                    id: `wd-${w.id}`,
                    title: 'عملية سحب ناجحة',
                    description: `تم سحب مبلغ ${formatCurrency(w.amount)} من حسابك.`
                });
            }
        });
      }
    }

    const uniqueNotifications = Array.from(new Map(notifications.map(item => [item.id, item])).values());
    
    return uniqueNotifications.reverse();
  };

  const relevantNotifications = getNotificationsForRole();
  const notificationCount = relevantNotifications.length;
  const prevNotificationCountRef = useRef(notificationCount);

  useEffect(() => {
    if (notificationCount > prevNotificationCountRef.current) {
      setHasUnseen(true);
    }
    prevNotificationCountRef.current = notificationCount;
  }, [notificationCount]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setHasUnseen(false);
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative shrink-0">
          <Bell className="h-4 w-4" />
          <span className="sr-only">فتح التنبيهات</span>
          {hasUnseen && relevantNotifications.length > 0 && (
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
