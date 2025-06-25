'use client';

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { onSummarize, type FormState } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
          جاري التلخيص...
        </>
      ) : (
        <>
          <Wand2 className="ml-2 h-4 w-4" />
          لخص المستند
        </>
      )}
    </Button>
  );
}

export default function SummarizePage() {
  const [state, formAction] = useFormState(onSummarize, initialState);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            تلخيص المستندات بالذكاء الاصطناعي
          </h1>
          <p className="text-muted-foreground mt-1">
            ألصق نص المستند أدناه للحصول على ملخص سريع ودقيق.
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
              <CardTitle>الملخص</CardTitle>
            </CardHeader>
            <CardContent>
              {state.message && !state.summary && (
                 <Alert variant={state.issues ? "destructive" : "default"}>
                   <AlertTitle>{state.issues ? 'خطأ في الإدخال' : 'الحالة'}</AlertTitle>
                   <AlertDescription>{state.message}</AlertDescription>
                 </Alert>
              )}
              {state.summary ? (
                <div className="space-y-4">
                   <Alert variant="default" className='bg-primary/10 border-primary/20'>
                    <AlertTitle className='text-primary'>تلخيص ناجح!</AlertTitle>
                    <AlertDescription className='text-primary/80'>
                       {state.message}
                    </AlertDescription>
                  </Alert>
                  <div className="prose prose-sm max-w-none text-foreground dark:prose-invert whitespace-pre-wrap p-4 bg-muted rounded-md">
                    {state.summary}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] bg-muted rounded-md">
                  <p className="text-muted-foreground">
                    سيظهر الملخص هنا بعد التحليل.
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
