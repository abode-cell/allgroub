'use client';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth-context';

const notifications = {
    all: [
        { id: 1, title: 'تم صرف قرض جديد', description: 'تم صرف قرض بقيمة ٥٠٬٠٠٠ ر.س لأحمد المحمدي.' },
        { id: 2, title: 'دفعة مستثمر جديدة', description: 'تم استلام دفعة بقيمة ١٠٠٬٠٠٠ ر.س من شركة الأفق.' },
    ],
    investor: [
        { id: 3, title: 'استحقاق أرباح', description: 'تم إضافة أرباح جديدة إلى حسابك.' },
        { id: 4, title: 'تعثر قرض مرتبط', description: 'أحد القروض التي تمولها قد تعثر.' },
    ],
    manager: [
        { id: 5, title: 'طلب إضافة مقترض', description: 'الموظف "علي" رفع طلب إضافة مقترض جديد.' },
        { id: 6, title: 'طلب تعديل مستثمر', description: 'الموظف "علي" رفع طلب تعديل بيانات مستثمر.' },
    ],
};

export function Notifications() {
    const { role } = useAuth();

    const getNotificationsForRole = () => {
        let roleNotifications = [...notifications.all];
        if (role === 'مستثمر') {
            roleNotifications.push(...notifications.investor);
        }
        if (role === 'مدير النظام' || role === 'مدير المكتب') {
            roleNotifications.push(...notifications.manager);
        }
        return roleNotifications;
    }
    
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
                            <div key={notif.id} className="mb-2 grid grid-cols-[25px_1fr] items-start pb-2 last:mb-0 last:pb-0">
                                <span className="flex h-2 w-2 translate-y-1.5 rounded-full bg-primary" />
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{notif.title}</p>
                                    <p className="text-sm text-muted-foreground">{notif.description}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center p-4">لا توجد تنبيهات جديدة.</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
