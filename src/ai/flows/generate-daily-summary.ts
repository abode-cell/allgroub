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

// This schema defines the expected JSON output from the AI.
const GenerateDailySummaryOutputSchema = z.object({
  summary: z.string().describe('A professional and engaging daily summary in Arabic, using Markdown formatting. Use headings, bullet points (*), and bold markers (**) to highlight the most important numbers and activities.'),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;

const dailySummaryPrompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash', 
  input: {schema: GenerateDailySummaryInputSchema},
  output: {schema: GenerateDailySummaryOutputSchema},
  prompt: `
You are a professional financial analyst. Your task is to take the following structured text context and transform it into a professional and engaging daily summary in Arabic, using Markdown formatting.
Use headings, bullet points (*), and bold markers (**) to highlight the most important numbers and activities.
Do not add any greetings, closings, or introductions. Start directly with the summary.
IMPORTANT: You MUST format your response as a JSON object with a single key "summary" containing the Markdown text.

Context:
{{{context}}}
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
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
      // we return a safe, empty object instead of crashing. This is a critical fix.
      if (!output || !output.summary) {
        return { summary: '' };
      }
      return output;
    } catch (error) {
      // Log the actual error for debugging, but don't let the flow crash.
      console.error("An error occurred within the generateDailySummaryFlow:", error);
      // Return a predictable empty state on any failure.
      return { summary: '' };
    }
  }
);

export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  // The flow is now fortified with a try-catch, so it won't throw exceptions.
  // It will return an empty summary on any failure.
  const result = await generateDailySummaryFlow(input);

  // If the result from the flow is empty, return the user-facing error message.
  if (!result || !result.summary) {
    return { summary: 'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص.' };
  }
  
  return result;
}
