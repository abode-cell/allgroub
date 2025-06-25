'use server';

import { z } from 'zod';
import { summarizeInvestmentDocument } from '@/ai/flows/summarize-investment-documents';

const formSchema = z.object({
  documentText: z.string().min(100, {
    message: 'يجب أن يكون المستند 100 حرف على الأقل.',
  }),
});

export type FormState = {
  message: string;
  summary?: string;
  issues?: Record<string, string[]>;
  decision?: {
    shouldIntegrate: boolean;
    reasoning: string;
  };
};

export async function onSummarize(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = formSchema.safeParse({
    documentText: formData.get('documentText'),
  });

  if (!validatedFields.success) {
    return {
      message: 'الرجاء تصحيح الأخطاء أدناه.',
      issues: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await summarizeInvestmentDocument({ documentText: validatedFields.data.documentText });
    if (!result.summary || !result.decision) {
       return { message: 'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص وقرار. حاول مرة أخرى بنص مختلف.' };
    }
    return {
      message: 'تم تحليل المستند بنجاح!',
      summary: result.summary,
      decision: result.decision,
    };
  } catch (error) {
    console.error(error);
    return {
      message: 'حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.',
    };
  }
}
