'use client';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDataState, useDataActions } from '@/contexts/data-context';

export function Notifications() {
  const { currentUser, notifications } = useDataState();
  const { markUserNotificationsAsRead } = useDataActions();

  if (!currentUser) return null;

  const relevantNotifications = notifications
    .filter((n) => n.recipientId === currentUser.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const hasUnseen = relevantNotifications.some((n) => !n.isRead);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && hasUnseen) {
      markUserNotificationsAsRead(currentUser.id);
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative shrink-0">
          <Bell className="h-4 w-4" />
          <span className="sr-only">فتح التنبيهات</span>
          {hasUnseen && (
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
                {!notif.isRead && (
                  <span className="flex h-2 w-2 translate-y-1.5 rounded-full bg-primary" />
                )}
                <div
                  className={`grid gap-1 ${
                    notif.isRead ? 'col-start-1 col-span-2' : 'col-start-2'
                  }`}
                >
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
