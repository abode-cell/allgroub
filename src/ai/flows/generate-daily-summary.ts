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

export const GenerateDailySummaryInputSchema = z.object({
  context: z.string().describe('A pre-formatted string containing all the data points for the summary.'),
});
export type GenerateDailySummaryInput = z.infer<typeof GenerateDailySummaryInputSchema>;

const GenerateDailySummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'ملخص يومي مفصل ومنسق بصيغة ماركداون باللغة العربية. استخدم العناوين والنقاط (*) والعلامات (**) لتغميق النص.'
    ),
});
export type GenerateDailySummaryOutput = z.infer<
  typeof GenerateDailySummaryOutputSchema
>;

export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  return generateDailySummaryFlow(input);
}

const dailySummaryPrompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateDailySummaryInputSchema},
  output: {schema: GenerateDailySummaryOutputSchema},
  prompt: `
مهمتك هي أخذ السياق النصي التالي الذي يحتوي على بيانات منظمة وتحويله إلى ملخص يومي احترافي وجذاب باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) والعلامات (**) لتغميق النص لتوضيح الأرقام والأنشطة الأكثر أهمية.
لا تضف أي عبارات ترحيبية أو ختامية أو مقدمات. ابدأ مباشرة بالملخص كما هو في السياق.
يجب وضع الملخص بالكامل داخل حقل 'summary' في كائن JSON الناتج.

السياق:
{{{context}}}
`,
});

const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: GenerateDailySummaryInputSchema,
    outputSchema: GenerateDailySummaryOutputSchema,
  },
  async input => {
    const {output} = await dailySummaryPrompt(input);

    if (!output || !output.summary) {
      return {
        summary:
          'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص صالح. يرجى المحاولة مرة أخرى.',
      };
    }

    return output;
  }
);
