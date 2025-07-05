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
  summary: z.string().describe("ملخص احترافي مكتوب باللغة العربية بناءً على السياق المقدم."),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;


const dailySummaryPrompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: GenerateDailySummaryInputSchema },
  output: { schema: GenerateDailySummaryOutputSchema },
  prompt: `أنت مساعد ذكاء اصطناعي متخصص في التحليل المالي. مهمتك هي قراءة السياق التالي وكتابة ملخص احترافي باللغة العربية. ابدأ مباشرة بالملخص دون أي مقدمات.
  
  السياق:
  {{{context}}}
  `,
});

// The flow is now simpler, just calling the prompt.
const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: GenerateDailySummaryInputSchema,
    outputSchema: GenerateDailySummaryOutputSchema,
  },
  async (input) => {
    const { output } = await dailySummaryPrompt(input);
    // If output is null or undefined, the wrapper will catch it.
    return output || { summary: '' }; 
  }
);

// The exported function is the main entry point and handles all error cases.
export async function generateDailySummary(input: GenerateDailySummaryInput): Promise<GenerateDailySummaryOutput> {
  try {
    const result = await generateDailySummaryFlow(input);
    // Check for an empty or invalid summary from the flow.
    if (!result || !result.summary) {
       return { summary: 'ERROR:AI_FAILED_TO_GENERATE' };
    }
    return result;
  } catch (error) {
    console.error("Critical error in generateDailySummary wrapper:", error);
    // This catches crashes inside the flow itself (e.g., network issues).
    return { summary: 'ERROR:AI_SYSTEM_FAILURE' };
  }
}
