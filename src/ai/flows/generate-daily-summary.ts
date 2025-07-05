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
  context: z.string(),
});
export type GenerateDailySummaryInput = z.infer<typeof GenerateDailySummaryInputSchema>;

const GenerateDailySummaryOutputSchema = z.object({
  summary: z.string(),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;


const dailySummaryPrompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: GenerateDailySummaryInputSchema },
  output: { schema: GenerateDailySummaryOutputSchema },
  prompt: `أنت مساعد ذكاء اصطناعي متخصص في التحليل المالي. مهمتك هي قراءة السياق التالي وكتابة ملخص احترافي باللغة العربية باستخدام صيغة ماركداون. ابدأ مباشرة بالملخص دون أي مقدمات.
  
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
    const { output } = await dailySummaryPrompt(input);
    return output || { summary: '' };
  }
);

export async function generateDailySummary(input: GenerateDailySummaryInput): Promise<GenerateDailySummaryOutput> {
  // We add a wrapper to handle potential total failures of the flow itself.
  try {
    const result = await generateDailySummaryFlow(input);
    if (!result.summary) {
       return { summary: 'ERROR:AI_FAILED_TO_GENERATE' };
    }
    return result;
  } catch (error) {
    console.error("Critical error in generateDailySummary wrapper:", error);
    return { summary: 'ERROR:AI_SYSTEM_FAILURE' };
  }
}
