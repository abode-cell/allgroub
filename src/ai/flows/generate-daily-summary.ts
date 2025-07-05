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
  // We removed the output schema from the prompt itself.
  // The AI will now return raw text, which is more reliable.
  prompt: `
مهمتك هي أخذ السياق النصي التالي الذي يحتوي على بيانات منظمة وتحويله إلى ملخص يومي احترافي وجذاب باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) والعلامات (**) لتغميق النص لتوضيح الأرقام والأنشطة الأكثر أهمية.
لا تضف أي عبارات ترحيبية أو ختامية أو مقدمات. ابدأ مباشرة بالملخص.
الأهم: لا تقم بتغليف إجابتك في تنسيق "json" أو أي تنسيق آخر، فقط أعد الملخص كنص ماركداون خام.

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

// The flow is now responsible for handling the raw text and wrapping it.
const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: GenerateDailySummaryInputSchema,
    outputSchema: GenerateDailySummaryOutputSchema, // The final output of the flow must still match this schema.
  },
  async (input) => {
    try {
      // The prompt now returns a raw text response.
      const response = await dailySummaryPrompt(input);
      const summaryText = response.text;

      // Check if the AI returned a valid text.
      if (!summaryText || summaryText.trim() === '') {
        console.error("AI returned an empty summary.");
        return {
          summary: 'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص صالح. يرجى المحاولة مرة أخرى.',
        };
      }
      
      // Manually wrap the valid text in the required object structure.
      return {
        summary: summaryText,
      };

    } catch (error) {
      console.error("Error in generateDailySummaryFlow:", error);
      const errorMessage = 'فشل إنشاء الملخص بسبب خطأ في خدمة الذكاء الاصطناعي. قد يعود السبب إلى سياسات المحتوى أو مشكلة مؤقتة. الرجاء المحاولة مرة أخرى.';
      // We are catching any error and RETURNING a valid object with an error message.
      // This prevents the entire flow from crashing.
      return {
        summary: errorMessage,
      };
    }
  }
);
