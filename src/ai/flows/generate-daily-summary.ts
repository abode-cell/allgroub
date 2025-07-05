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

// The component expects an object with a summary property.
export type GenerateDailySummaryOutput = {
  summary: string;
};

export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  const summaryText = await generateDailySummaryFlow(input);
  if (!summaryText) {
    throw new Error('لم يتمكن الذكاء الاصطناعي من إنشاء ملخص صالح.');
  }
  return { summary: summaryText };
}

const dailySummaryPrompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateDailySummaryInputSchema},
  // No output schema - we want raw text.
  prompt: `
مهمتك هي أخذ السياق النصي التالي الذي يحتوي على بيانات منظمة وتحويله إلى ملخص يومي احترافي وجذاب باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) والعلامات (**) لتغميق النص لتوضيح الأرقام والأنشطة الأكثر أهمية.
لا تضف أي عبارات ترحيبية أو ختامية أو مقدمات. ابدأ مباشرة بالملخص.
الأهم: لا تقم بتغليف إجابتك في أي تنسيق مثل JSON أو \`\`\`json، فقط أعد الملخص كنص ماركداون خام.

السياق:
{{{context}}}
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: GenerateDailySummaryInputSchema,
    outputSchema: z.string(), // The flow now returns a raw string.
  },
  async (input) => {
    // Calling the prompt without an output schema returns the full response object.
    const llmResponse = await dailySummaryPrompt(input);
    
    // We extract the text content.
    const summaryText = llmResponse.text;

    // We still validate that we got something back.
    if (!summaryText) {
      throw new Error('لم يتمكن الذكاء الاصطناعي من إنشاء ملخص صالح.');
    }

    return summaryText;
  }
);
