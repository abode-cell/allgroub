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
  context: z.string().describe("A markdown-formatted string containing the day's metrics."),
});
export type GenerateDailySummaryInput = z.infer<typeof GenerateDailySummaryInputSchema>;

const GenerateDailySummaryOutputSchema = z.object({
  summary: z.string().describe("ملخص احترافي مكتوب باللغة العربية بناءً على السياق المقدم. يجب أن يكون الملخص موجزًا وواضحًا ومباشرًا، دون أي تحيات أو عبارات ختامية."),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;

// The exported function is the public API for this flow.
// It simply calls the flow and returns the result.
export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  return generateDailySummaryFlow(input);
}

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

// The flow itself, containing the core logic and error handling.
const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: GenerateDailySummaryInputSchema,
    outputSchema: GenerateDailySummaryOutputSchema,
  },
  async (input) => {
    try {
        const {output} = await dailySummaryPrompt(input);
        // Ensure the output is valid and contains a summary.
        if (!output || !output.summary) {
            // This custom error will be caught and handled by the calling action.
            return { summary: 'ERROR:AI_FAILED_TO_GENERATE' };
        }
        return output;
    } catch (error) {
        // Log the actual error for debugging, but return a generic failure message.
        console.error("An error occurred within the generateDailySummaryFlow:", error);
        return { summary: 'ERROR:AI_SYSTEM_FAILURE' };
    }
  }
);
