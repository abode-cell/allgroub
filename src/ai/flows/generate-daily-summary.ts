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

// Input schema is now an object, which is more robust and aligns with Genkit best practices.
const GenerateDailySummaryInputSchema = z.object({
  context: z
    .string()
    .describe(
      'A pre-formatted context string in Arabic containing all the data points for the summary.'
    ),
});
export type GenerateDailySummaryInput = z.infer<
  typeof GenerateDailySummaryInputSchema
>;

// The output schema remains the same.
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

/**
 * Public-facing wrapper function. It accepts a simple string for convenience
 * and wraps it into the object structure required by the flow.
 * This avoids needing to change the client-side implementation.
 */
export async function generateDailySummary(
  contextString: string
): Promise<GenerateDailySummaryOutput> {
  return generateDailySummaryFlow({ context: contextString });
}

const dailySummaryPrompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateDailySummaryInputSchema},
  output: {schema: GenerateDailySummaryOutputSchema},
  // The prompt now uses the 'context' field from the input object.
  prompt: `مهمتك هي أخذ البيانات التالية وتحويلها إلى ملخص يومي مفصل ومنظم باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) والعلامات (**) لتغميق النص لتوضيح الأرقام والأنشطة الأكثر أهمية.
لا تضف أي عبارات ترحيبية أو ختامية أو مقدمات. ابدأ مباشرة بالملخص.
يجب وضع الملخص بالكامل داخل حقل 'summary' في كائن JSON الناتج.

البيانات:
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
