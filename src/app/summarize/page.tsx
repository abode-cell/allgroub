
'use client';

import React, { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { onSummarize, type FormState } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
          جاري التحليل...
        </>
      ) : (
        <>
          <Wand2 className="ml-2 h-4 w-4" />
          حلل المستند
        </>
      )}
    </Button>
  );
}

export default function SummarizePage() {
  const [state, formAction] = useActionState(onSummarize, initialState);
  const { currentUser } = useData();
  const router = useRouter();

  const role = currentUser?.role;
  const hasAccess = role === 'مدير المكتب' || role === 'مساعد مدير المكتب';

  useEffect(() => {
    if (currentUser && !hasAccess) {
      router.replace('/');
    }
  }, [currentUser, hasAccess, router]);

  if (!currentUser || !hasAccess) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            تحليل المستندات بالذكاء الاصطناعي
          </h1>
          <p className="text-muted-foreground mt-1">
            احصل على ملخص سريع وقرار مدعوم بالذكاء الاصطناعي حول أهمية المعلومات.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>المستند الأصلي</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="documentText">نص المستند</Label>
                  <Textarea
                    id="documentText"
                    name="documentText"
                    placeholder="ألصق محتوى التقرير أو المستند هنا..."
                    className="min-h-[300px] resize-y"
                    required
                  />
                  {state.issues?.documentText && (
                    <p className="text-sm font-medium text-destructive">
                      {state.issues.documentText[0]}
                    </p>
                  )}
                </div>
                <SubmitButton />
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التحليل والقرار</CardTitle>
            </CardHeader>
            <CardContent>
              {state.message && !state.summary && (
                 <Alert variant={state.issues ? "destructive" : "default"}>
                   <AlertTitle>{state.issues ? 'خطأ في الإدخال' : 'الحالة'}</AlertTitle>
                   <AlertDescription>{state.message}</AlertDescription>
                 </Alert>
              )}
              {state.summary ? (
                <div className="space-y-6">
                   <Alert variant="default" className='bg-primary/10 border-primary/20'>
                    <AlertTitle className='text-primary'>تحليل ناجح!</AlertTitle>
                    <AlertDescription className='text-primary/80'>
                       {state.message}
                    </AlertDescription>
                  </Alert>
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">الملخص</h3>
                    <div className="prose prose-sm max-w-none text-foreground dark:prose-invert whitespace-pre-wrap p-4 bg-muted rounded-md">
                      {state.summary}
                    </div>
                  </div>

                  {state.decision && (
                    <div>
                      <h3 className="font-semibold mb-2 text-lg">قرار الذكاء الاصطناعي</h3>
                      <div className="p-4 bg-muted rounded-md space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">هل يجب دمج المعلومة؟</span>
                          <Badge variant={state.decision.shouldIntegrate ? 'default' : 'destructive'}>
                            {state.decision.shouldIntegrate ? 'نعم' : 'لا'}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium mb-1">السبب:</p>
                          <p className="text-sm text-muted-foreground">{state.decision.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] bg-muted rounded-md">
                  <p className="text-muted-foreground">
                    سيظهر الملخص والقرار هنا بعد التحليل.
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
