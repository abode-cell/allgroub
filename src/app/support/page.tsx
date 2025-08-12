

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Inbox, Loader2, Send, Mail, Phone } from 'lucide-react';
import { useDataState } from '@/contexts/data-context';
import Link from 'next/link';

export default function SupportPage() {
  const { currentUser, supportEmail, supportPhone, addSupportTicket } = useDataState();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const role = currentUser?.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الرجاء ملء حقلي الموضوع والرسالة.',
      });
      return;
    }

    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب عليك تسجيل الدخول لإرسال طلب دعم.',
      });
      return;
    }

    setIsSubmitting(true);

    addSupportTicket({
      subject,
      message,
      fromUserId: currentUser.id,
      fromUserName: currentUser.name,
      fromUserEmail: currentUser.email,
    });

    setSubject('');
    setMessage('');
    setIsSubmitting(false);
  };

  const descriptionText =
    role === 'مدير المكتب'
      ? 'لطلب زيادة عدد الموظفين أو المستثمرين، أو لأي استفسار آخر، املأ النموذج أدناه وسيتم إرساله مباشرة إلى مدير النظام.'
      : 'لأي استفسار أو طلب، املأ النموذج أدناه وسيتم إرساله مباشرة إلى مدير النظام.';

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">الدعم الفني</h1>
          <p className="text-muted-foreground mt-1">
            هل تواجه مشكلة أو لديك طلب؟ تواصل معنا وسنكون سعداء بمساعدتك.
          </p>
        </header>

        {role === 'مدير النظام' && (
          <div className="flex justify-end mb-6">
            <Button asChild variant="outline">
              <Link href="/support/inbox">
                <Inbox className="ml-2 h-4 w-4" />
                عرض صندوق الوارد
              </Link>
            </Button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-5">
            <div className='lg:col-span-3'>
                <Card>
                <CardHeader>
                    <CardTitle>إرسال طلب دعم</CardTitle>
                    <CardDescription>{descriptionText}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="subject">الموضوع</Label>
                        <Input
                        id="subject"
                        placeholder="مثال: طلب زيادة عدد المستثمرين"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">الرسالة</Label>
                        <Textarea
                        id="message"
                        placeholder="يرجى وصف طلبك بالتفصيل هنا..."
                        className="min-h-[150px]"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting || !currentUser}>
                        {isSubmitting ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Send className="ml-2 h-4 w-4" />
                        )}
                        إرسال الرسالة
                    </Button>
                    </form>
                </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>معلومات التواصل المباشر</CardTitle>
                        <CardDescription>
                        للمساعدة العاجلة، يمكنك التواصل معنا مباشرة عبر القنوات التالية.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Mail className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                                <a href={`mailto:${supportEmail}`} className="font-semibold text-primary" dir="ltr">
                                    {supportEmail}
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Phone className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">الهاتف</p>
                                <a href={`tel:${supportPhone}`} className="font-semibold text-primary" dir="ltr">
                                    {supportPhone}
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
