'use server';

import { z } from 'zod';
import { getAiSupport } from '@/ai/flows/ai-support-assistant';

const formSchema = z.object({
  problemDescription: z.string().min(20, {
    message: 'الرجاء تقديم وصف مفصل للمشكلة (20 حرفًا على الأقل).',
  }),
});

export type FormState = {
  message: string;
  solution?: string;
  issues?: Record<string, string[]>;
};

export async function onDiagnose(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = formSchema.safeParse({
    problemDescription: formData.get('problemDescription'),
  });

  if (!validatedFields.success) {
    return {
      message: 'الرجاء تصحيح الأخطاء أدناه.',
      issues: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await getAiSupport({ problemDescription: validatedFields.data.problemDescription });
    if (!result.solution) {
       return { message: 'لم يتمكن الذكاء الاصطناعي من إيجاد حل. حاول إعادة صياغة المشكلة.' };
    }
    return {
      message: 'تم تحليل المشكلة بنجاح!',
      solution: result.solution,
    };
  } catch (error) {
    console.error(error);
    return {
      message: 'حدث خطأ أثناء الاتصال بمساعد الذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.',
    };
  }
}
