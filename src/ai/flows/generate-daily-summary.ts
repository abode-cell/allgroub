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

export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  const result = await generateDailySummaryFlow(input);
  // The flow now handles the null case, so we can be more confident in the result.
  if (!result || !result.summary) {
    // This provides a fallback if the AI returns an empty summary.
    return { summary: 'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص.' };
  }
  return result;
}

const dailySummaryPrompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  // Using the same, proven model as the AI Support Assistant.
  model: 'googleai/gemini-2.0-flash', 
  input: {schema: GenerateDailySummaryInputSchema},
  // Providing a structured output schema is more reliable.
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
    // Destructuring 'output' is the standard way to get schema-validated results.
    const {output} = await dailySummaryPrompt(input);
    
    // If the output is null (e.g., parsing failed, or model returned nothing),
    // we return a safe, empty object instead of crashing. This is a critical fix.
    if (!output) {
      return { summary: '' };
    }

    return output;
  }
);
