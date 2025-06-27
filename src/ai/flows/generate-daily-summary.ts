'use server';
/**
 * @fileOverview An AI flow to generate a daily summary for the dashboard.
 *
 * - generateDailySummary - A function that generates a summary of the day's financial activities.
 * - GenerateDailySummaryInput - The input type for the generateDailySummary function.
 * - GenerateDailySummaryOutput - The return type for the generateDailySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDailySummaryInputSchema = z.object({
  newBorrowersCount: z.number().describe('The number of new borrowers added today.'),
  newInvestorsCount: z.number().describe('The number of new investors added today.'),
  totalLoansGranted: z.number().describe('The total amount of new loans granted today.'),
  totalNewInvestments: z.number().describe('The total amount of new investments received today.'),
  pendingRequestsCount: z.number().describe('The number of pending requests that need review.'),
});
export type GenerateDailySummaryInput = z.infer<typeof GenerateDailySummaryInputSchema>;

const GenerateDailySummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, engaging, and informative daily summary written in Arabic. It should be 2-3 sentences long.'),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;

export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  return generateDailySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailySummaryPrompt',
  input: {schema: GenerateDailySummaryInputSchema},
  output: {schema: GenerateDailySummaryOutputSchema},
  prompt: `أنت محلل مالي خبير. بناءً على بيانات اليوم، اكتب ملخصًا يوميًا موجزًا وجذابًا للمدير باللغة العربية.
يجب أن يكون الملخص من جملتين إلى ثلاث جمل. سلط الضوء على الأنشطة والأرقام الرئيسية.

بيانات اليوم:
- مقترضون جدد: {{{newBorrowersCount}}}
- مستثمرون جدد: {{{newInvestorsCount}}}
- إجمالي القروض الجديدة الممنوحة: {{{totalLoansGranted}}} ريال سعودي
- إجمالي الاستثمارات الجديدة: {{{totalNewInvestments}}} ريال سعودي
- الطلبات المعلقة التي تحتاج إلى مراجعة: {{{pendingRequestsCount}}}

ابدأ الملخص بـ "ملخص اليوم:" أو عبارة ترحيبية مشابهة. كن إيجابيًا ومحفزًا ولكن واقعيًا. إذا لم تكن هناك أنشطة، فاذكر أن اليوم كان هادئًا.`,
});

const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: GenerateDailySummaryInputSchema,
    outputSchema: GenerateDailySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
