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
import { Inbox, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import Link from 'next/link';

export default function SupportPage() {
  const { user, role } = useAuth();
  const { addSupportTicket } = useData();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب عليك تسجيل الدخول لإرسال طلب دعم.',
      });
      return;
    }

    setIsSubmitting(true);

    await addSupportTicket({
      subject,
      message,
      fromUserId: user.id,
      fromUserName: user.name,
      fromUserEmail: user.email,
    });

    setSubject('');
    setMessage('');
    setIsSubmitting(false);
  };

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

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>إرسال طلب دعم</CardTitle>
            <CardDescription>
              لأي استفسار أو طلب، املأ النموذج أدناه وسيتم إرساله مباشرة إلى
              مدير النظام.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject">الموضوع</Label>
                <Input
                  id="subject"
                  placeholder="مثال: طلب إضافة موظف جديد"
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
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
      </main>
    </div>
  );
}
