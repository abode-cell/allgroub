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
  context: z.string().describe('A pre-formatted string containing all the data points for the summary.'),
});
export type GenerateDailySummaryInput = z.infer<typeof GenerateDailySummaryInputSchema>;

const GenerateDailySummaryOutputSchema = z.object({
  summary: z.string().describe('ملخص يومي احترافي وجذاب باللغة العربية، باستخدام صيغة ماركداون. استخدم العناوين والنقاط (*) والعلامات (**) لتوضيح الأرقام والأنشطة الأكثر أهمية.'),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;

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
أنت محلل مالي محترف. مهمتك هي أخذ السياق النصي المنظم التالي وتحويله إلى ملخص يومي احترافي وجذاب باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) والعلامات (**) لتوضيح الأرقام والأنشطة الأكثر أهمية.
لا تضف أي عبارات ترحيبية أو ختامية أو مقدمات. ابدأ مباشرة بالملخص.
هام جداً: يجب أن تكون إجابتك بتنسيق كائن JSON يحتوي على مفتاح واحد "summary" وقيمته هي نص الملخص المنسق.

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
  async (input) => {
    try {
      const {output} = await dailySummaryPrompt(input);
      // If the output is null (e.g., parsing failed, or model returned nothing),
      // return a user-facing error message within the summary field.
      if (!output || !output.summary) {
        return { summary: 'ERROR:AI_FAILED_TO_GENERATE' };
      }
      return output;
    } catch (error) {
      // Log the actual error for debugging, but don't let the flow crash.
      console.error("An error occurred within the generateDailySummaryFlow:", error);
      // Return a predictable, user-facing error message on any failure.
      return { summary: 'ERROR:AI_SYSTEM_FAILURE' };
    }
  }
);
