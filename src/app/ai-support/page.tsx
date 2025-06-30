'use client';

import React, { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { onDiagnose, type FormState } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Bot } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useData } from '@/contexts/data-context';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';


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


const initialState: FormState = {
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          جاري التشخيص...
        </>
      ) : (
        <>
          <Sparkles className="ml-2 h-4 w-4" />
          تشخيص المشكلة
        </>
      )}
    </Button>
  );
}

export default function AiSupportPage() {
  const [state, formAction] = useFormState(onDiagnose, initialState);
  const { currentUser } = useData();
  const router = useRouter();
  
  const role = currentUser?.role;

  useEffect(() => {
    if (currentUser && role !== 'مدير النظام') {
      router.replace('/');
    }
  }, [currentUser, role, router]);

  if (!currentUser || role !== 'مدير النظام') {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            مساعد الدعم الفني بالذكاء الاصطناعي
          </h1>
          <p className="text-muted-foreground mt-1">
            صف المشكلة التي تواجهها في الموقع، وسيقوم الذكاء الاصطناعي بتشخيصها واقتراح حل.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>وصف المشكلة</CardTitle>
               <CardDescription>
                كن وصفيًا قدر الإمكان. يمكنك لصق رسائل الخطأ من سجلات الخادم للمساعدة في التشخيص.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="problemDescription">تفاصيل المشكلة</Label>
                  <Textarea
                    id="problemDescription"
                    name="problemDescription"
                    placeholder="مثال: 'عندما أحاول إضافة مستخدم جديد، تظهر لي صفحة بيضاء فارغة...'"
                    className="min-h-[300px] resize-y"
                    required
                  />
                  {state.issues?.problemDescription && (
                    <p className="text-sm font-medium text-destructive">
                      {state.issues.problemDescription[0]}
                    </p>
                  )}
                </div>
                <SubmitButton />
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot />
                الحل المقترح
              </CardTitle>
               <CardDescription>
                سيقوم مساعد الذكاء الاصطناعي بتقديم تحليل وخطوات مقترحة هنا.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {state.message && !state.solution && (
                 <Alert variant={state.issues ? "destructive" : "default"}>
                   <AlertTitle>{state.issues ? 'خطأ في الإدخال' : 'الحالة'}</AlertTitle>
                   <AlertDescription>{state.message}</AlertDescription>
                 </Alert>
              )}
              {state.solution ? (
                <div className="space-y-6">
                   <Alert variant="default" className='bg-primary/10 border-primary/20'>
                    <AlertTitle className='text-primary'>اكتمل التشخيص!</AlertTitle>
                    <AlertDescription className='text-primary/80'>
                       {state.message}
                    </AlertDescription>
                  </Alert>
                  <div className="prose prose-sm max-w-none text-foreground dark:prose-invert whitespace-pre-wrap p-4 bg-muted rounded-md border">
                    <p>{state.solution}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] bg-muted rounded-md">
                  <p className="text-muted-foreground text-center">
                    في انتظار وصف المشكلة لبدء التشخيص...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
