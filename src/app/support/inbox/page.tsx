'use client';

import { useDataState, useDataActions } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Inbox, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SupportTicket } from '@/lib/types';

const PageSkeleton = () => (
    <div className="flex flex-col flex-1 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);

export default function SupportInboxPage() {
  const { currentUser, supportTickets } = useDataState();
  const { deleteSupportTicket } = useDataActions();
  const router = useRouter();
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(null);

  const role = currentUser?.role;

  useEffect(() => {
    if (currentUser && role !== 'مدير النظام') {
      router.replace('/');
    }
  }, [currentUser, role, router]);

  if (!currentUser || role !== 'مدير النظام') {
    return <PageSkeleton />;
  }

  const sortedTickets = [...supportTickets].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const handleConfirmDelete = () => {
    if (ticketToDelete) {
        deleteSupportTicket(ticketToDelete.id);
        setTicketToDelete(null);
    }
  };

  return (
    <>
      <div className="flex flex-col flex-1">
        <main className="flex-1 space-y-8 p-4 md:p-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">
              صندوق الدعم الفني
            </h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة رسائل الدعم الفني الواردة من المستخدمين.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>الرسائل الواردة</CardTitle>
              <CardDescription>
                قائمة بجميع طلبات الدعم التي تم إرسالها.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedTickets.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {sortedTickets.map((ticket) => (
                    <AccordionItem value={ticket.id} key={ticket.id}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4 items-center">
                          <div className="flex items-center gap-4 text-right">
                            {!ticket.isRead && <Badge>جديد</Badge>}
                            <span className="font-medium text-sm md:text-base">
                              {ticket.subject}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground text-left hidden md:block">
                            <span>{ticket.fromUserName}</span> -{' '}
                            <span>
                              {format(new Date(ticket.date), 'yyyy/MM/dd')}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 bg-muted/50 p-4 rounded-b-md">
                        <div className="text-sm text-muted-foreground border-b pb-2">
                          <p>
                            <strong>من:</strong> {ticket.fromUserName} (
                            {ticket.fromUserEmail})
                          </p>
                          <p>
                            <strong>التاريخ:</strong>{' '}
                            {format(new Date(ticket.date), 'PPpp', {
                              locale: arSA,
                            })}
                          </p>
                        </div>
                        <p className="whitespace-pre-wrap text-foreground">
                          {ticket.message}
                        </p>
                         <div className="flex justify-end pt-2 border-t mt-4">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setTicketToDelete(ticket)}
                            >
                                <Trash2 className="ml-2 h-4 w-4" />
                                حذف الرسالة
                            </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-4">
                  <Inbox className="h-12 w-12 text-muted-foreground/50" />
                  <p>صندوق الوارد فارغ. لا توجد رسائل دعم حتى الآن.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      <AlertDialog
        open={!!ticketToDelete}
        onOpenChange={(open) => !open && setTicketToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد حذف هذه الرسالة بشكل دائم؟ لا يمكن التراجع عن
              هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTicketToDelete(null)}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
