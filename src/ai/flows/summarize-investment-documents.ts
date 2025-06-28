'use server';
/**
 * @fileOverview AI tool to summarize investment and loan documents.
 *
 * - summarizeInvestmentDocument - A function that handles the summarization of investment documents.
 * - SummarizeInvestmentDocumentInput - The input type for the summarizeInvestmentDocument function.
 * - SummarizeInvestmentDocumentOutput - The return type for the summarizeInvestmentDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInvestmentDocumentInputSchema = z.object({
  documentText: z
    .string()
    .describe('The text content of the investment or loan document.'),
});
export type SummarizeInvestmentDocumentInput = z.infer<typeof SummarizeInvestmentDocumentInputSchema>;

const SummarizeInvestmentDocumentOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the document.'),
  decision: z
    .object({
      shouldIntegrate: z
        .boolean()
        .describe(
          'Whether the information in this document is critical and should be integrated.'
        ),
      reasoning: z
        .string()
        .describe('The reasoning behind the decision to integrate or not.'),
    })
    .describe(
      'An AI-powered decision on whether to integrate the information from the document.'
    ),
});
export type SummarizeInvestmentDocumentOutput = z.infer<typeof SummarizeInvestmentDocumentOutputSchema>;

export async function summarizeInvestmentDocument(
  input: SummarizeInvestmentDocumentInput
): Promise<SummarizeInvestmentDocumentOutput> {
  return summarizeInvestmentDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeInvestmentDocumentPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: SummarizeInvestmentDocumentInputSchema},
  output: {schema: SummarizeInvestmentDocumentOutputSchema},
  prompt: `You are an expert financial analyst. Your task is to analyze the following investment document.
First, provide a concise summary of the document.
Second, make a decision on whether the information presented is critical and should be integrated into our system. Provide a clear "yes" or "no" for the 'shouldIntegrate' field.
Third, provide a brief reasoning for your decision.

Document Text:
{{{documentText}}}`,
});

const summarizeInvestmentDocumentFlow = ai.defineFlow(
  {
    name: 'summarizeInvestmentDocumentFlow',
    inputSchema: SummarizeInvestmentDocumentInputSchema,
    outputSchema: SummarizeInvestmentDocumentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
