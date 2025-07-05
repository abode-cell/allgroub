'use server';
/**
 * @fileOverview An AI support assistant to help diagnose and solve application problems.
 *
 * - getAiSupport - A function that provides a diagnosis and solution for a described problem.
 * - AiSupportInput - The input type for the getAiSupport function.
 * - AiSupportOutput - The return type for the getAiSupport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiSupportInputSchema = z.object({
  problemDescription: z
    .string()
    .describe('A detailed description of the problem the user is facing with the web application.'),
});
export type AiSupportInput = z.infer<typeof AiSupportInputSchema>;

const AiSupportOutputSchema = z.object({
  solution: z.string().describe("حل مفصل وخطوة بخطوة مكتوب باللغة العربية. يجب أن يشرح السبب المحتمل ويقدم إصلاحًا واضحًا، بما في ذلك مقتطفات من التعليمات البرمجية إذا لزم الأمر. يجب أن تكون النبرة مفيدة ومهنية، مثل شريك مهندس برمجيات خبير."),
});
export type AiSupportOutput = z.infer<typeof AiSupportOutputSchema>;

export async function getAiSupport(
  input: AiSupportInput
): Promise<AiSupportOutput> {
  return aiSupportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSupportPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: AiSupportInputSchema},
  output: {schema: AiSupportOutputSchema},
  prompt: `أنت مهندس برمجيات خبير متخصص في Next.js, React, Tailwind CSS, و Genkit. وظيفتك هي أن تكون مساعد دعم فني لمسؤول النظام.
مهمتك هي تحليل وصف المشكلة التي يقدمها المستخدم وتقديم حل واضح وقابل للتنفيذ باللغة العربية.
يجب أن يشرح حلك السبب المحتمل للمشكلة، وأن يقدم تعليمات خطوة بخطوة أو أمثلة برمجية لإصلاحها.
حافظ على نبرة متعاونة واحترافية. لا تضف أي تحيات أو عبارات ختامية، فقط قدم الحل مباشرة.

وصف المشكلة:
{{{problemDescription}}}
`,
});

const aiSupportFlow = ai.defineFlow(
  {
    name: 'aiSupportFlow',
    inputSchema: AiSupportInputSchema,
    outputSchema: AiSupportOutputSchema,
  },
  async input => {
    try {
        const {output} = await prompt(input);
        if (!output || !output.solution) {
            // This should be caught by the client and displayed as a proper error.
            return { solution: 'ERROR:AI_FAILED_TO_GENERATE_SOLUTION' };
        }
        return output;
    } catch (error) {
        console.error("An error occurred within the aiSupportFlow:", error);
        return { solution: 'ERROR:AI_SYSTEM_FAILURE' };
    }
  }
);
