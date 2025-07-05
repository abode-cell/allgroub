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

const GenerateDailySummaryInputSchema = z
  .string()
  .describe(
    'A pre-formatted context string in Arabic containing all the data points for the summary.'
  );
export type GenerateDailySummaryInput = z.infer<
  typeof GenerateDailySummaryInputSchema
>;

// This is the final object structure the application expects, and what we'll ask the model for.
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
  prompt: `مهمتك هي أخذ البيانات التالية وتحويلها إلى ملخص يومي مفصل ومنظم باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) والعلامات (**) لتغميق النص لتوضيح الأرقام والأنشطة الأكثر أهمية.
لا تضف أي عبارات ترحيبية أو ختامية أو مقدمات. ابدأ مباشرة بالملخص.
يجب وضع الملخص بالكامل داخل حقل 'summary' في كائن JSON الناتج.

البيانات:
{{{prompt}}}
`,
});

const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: GenerateDailySummaryInputSchema,
    outputSchema: GenerateDailySummaryOutputSchema,
  },
  async input => {
    // The prompt now expects the input string directly, not an object.
    const {output} = await dailySummaryPrompt(input);

    // If the model fails to generate a valid output object, Genkit will throw an error,
    // which will be caught by the calling component. We add a fallback here for safety.
    if (!output || !output.summary) {
      return {
        summary:
          'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص صالح. يرجى المحاولة مرة أخرى.',
      };
    }

    return output;
  }
);
