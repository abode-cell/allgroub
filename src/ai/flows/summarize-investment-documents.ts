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
});
export type SummarizeInvestmentDocumentOutput = z.infer<typeof SummarizeInvestmentDocumentOutputSchema>;

export async function summarizeInvestmentDocument(
  input: SummarizeInvestmentDocumentInput
): Promise<SummarizeInvestmentDocumentOutput> {
  return summarizeInvestmentDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeInvestmentDocumentPrompt',
  input: {schema: SummarizeInvestmentDocumentInputSchema},
  output: {schema: SummarizeInvestmentDocumentOutputSchema},
  prompt: `You are an expert financial analyst. Please provide a concise summary of the following investment document:\n\n{{{documentText}}}`,
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
