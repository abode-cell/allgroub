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
  summary: z.string().describe('ملخص يومي واضح ومختصر جداً باللغة العربية، بحد أقصى جملتين.'),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;

export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  return generateDailySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateDailySummaryInputSchema},
  output: {schema: GenerateDailySummaryOutputSchema},
  prompt: `أنت مساعد ذكاء اصطناعي متخصص في التحليل المالي. مهمتك هي إنشاء ملخص يومي واضح ومختصر جدًا باللغة العربية لمدير المنصة.
يجب أن لا يتجاوز الملخص جملة إلى جملتين. ركز فقط على الأرقام والأنشطة الأكثر أهمية. لا تضف أي عبارات ترحيبية أو ختامية.

بيانات اليوم:
- المقترضون الجدد: {{{newBorrowersCount}}}
- المستثمرون الجدد: {{{newInvestorsCount}}}
- إجمالي القروض الجديدة: {{{totalLoansGranted}}} ريال
- إجمالي الاستثمارات الجديدة: {{{totalNewInvestments}}} ريال
- الطلبات المعلقة: {{{pendingRequestsCount}}}`,
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
