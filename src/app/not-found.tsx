import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 text-6xl font-bold text-muted-foreground">
            404
          </div>
          <CardTitle>الصفحة غير موجودة</CardTitle>
          <CardDescription>
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/">
                <Home className="ml-2 h-4 w-4" />
                العودة للصفحة الرئيسية
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowRight className="ml-2 h-4 w-4" />
                الذهاب للوحة التحكم
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}