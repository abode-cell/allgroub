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
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, clearUserNotifications } = useData();

  if (!user) {
    return null;
  }

  const relevantNotifications = notifications
    .filter((n) => n.recipientId === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">
              مركز التنبيهات
            </h1>
            <p className="text-muted-foreground mt-1">
              عرض جميع التنبيهات والرسائل الخاصة بحسابك.
            </p>
          </header>
          {relevantNotifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف جميع التنبيهات
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد أنك تريد حذف جميع تنبيهاتك؟ لا يمكن التراجع عن
                    هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearUserNotifications(user.id)}
                  >
                    تأكيد الحذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

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
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                        !notif.isRead
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <Bell className="h-5 w-5" />
                    </span>
                    <div className="grid gap-1 flex-1">
                      <div className="flex justify-between items-baseline">
                        <p className="text-sm font-medium leading-none">
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notif.date), 'PPpp', {
                            locale: arSA,
                          })}
                        </p>
                      </div>
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
