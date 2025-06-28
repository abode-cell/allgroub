'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useData } from '@/contexts/data-context';

export default function SupportSettingsPage() {
  const { role } = useAuth();
  const router = useRouter();
  const { supportEmail, supportPhone, updateSupportInfo } = useData();

  const [localEmail, setLocalEmail] = useState(supportEmail);
  const [localPhone, setLocalPhone] = useState(supportPhone);

  const canViewPage = role === 'مدير النظام';

  useEffect(() => {
    if (role && !canViewPage) {
      router.replace('/');
    }
  }, [role, canViewPage, router]);
  
  useEffect(() => {
    setLocalEmail(supportEmail);
    setLocalPhone(supportPhone);
  }, [supportEmail, supportPhone]);


  if (!canViewPage) {
    return null;
  }

  const handleSaveChanges = () => {
    updateSupportInfo({ email: localEmail, phone: localPhone });
  };
  
  const isChanged = localEmail !== supportEmail || localPhone !== supportPhone;

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            إعدادات معلومات الدعم
          </h1>
          <p className="text-muted-foreground mt-1">
            تحديث البريد الإلكتروني ورقم الهاتف الظاهرين في صفحة الدعم الفني.
          </p>
        </header>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>معلومات التواصل</CardTitle>
            <CardDescription>
              هذه المعلومات ستكون ظاهرة لجميع المستخدمين في صفحة الدعم.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-2">
              <Label htmlFor="support-email">البريد الإلكتروني للدعم</Label>
              <Input
                id="support-email"
                type="email"
                value={localEmail}
                onChange={(e) => setLocalEmail(e.target.value)}
                placeholder="support@example.com"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-4">
               <Label htmlFor="support-phone">رقم الهاتف للدعم</Label>
               <Input
                id="support-phone"
                type="tel"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                placeholder="920000000"
                dir="ltr"
                className="text-left"
              />
            </div>
             <Button className="w-full" onClick={handleSaveChanges} disabled={!isChanged}>
                <Save className="ml-2 h-4 w-4" />
                حفظ التغييرات
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
