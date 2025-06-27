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
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function SupportPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الرجاء ملء حقلي الموضوع والرسالة.',
      });
      return;
    }

    // In a real app, this would trigger an API call.
    // For this mock app, we just log it and show a toast.
    console.log('Support Request:', { subject, message, from: user?.email });

    let toastDescription = 'تم إرسال رسالتك إلى فريق الدعم. سيتم التواصل معك قريباً (تجريبياً).';
    if(role === 'مدير المكتب') {
        toastDescription = 'تم إرسال طلبك إلى مدير النظام، وسيتم مراجعته في أقرب وقت (تجريبياً).'
    }

    toast({
      title: 'تم الإرسال بنجاح',
      description: toastDescription,
    });

    setSubject('');
    setMessage('');
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

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>إرسال طلب دعم</CardTitle>
            <CardDescription>
             {role === 'مدير المكتب' 
                ? 'لطلب إضافة موظفين جدد أو أي استفسار آخر، املأ النموذج أدناه.'
                : 'املأ النموذج أدناه وسيقوم فريق الدعم بالرد عليك في أقرب وقت ممكن.'
             }
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
              <Button type="submit" className="w-full">
                <Send className="ml-2 h-4 w-4" />
                إرسال الرسالة
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
