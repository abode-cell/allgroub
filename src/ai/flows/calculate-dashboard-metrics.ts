'use server';
/**
 * @fileOverview A Genkit flow for calculating dashboard metrics on the server.
 *
 * - calculateDashboardMetrics - A function that handles dashboard data processing.
 * - DashboardMetricsInput - The input type for the function.
 * - DashboardMetricsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { calculateAllDashboardMetrics } from '@/services/dashboard-service';
import type { Borrower, Investor, User } from '@/lib/types';

// Using z.any() for simplicity as the full types are complex and defined in @/lib/types
// This avoids duplicating large type definitions in Zod schemas.
const DashboardMetricsInputSchema = z.object({
    borrowers: z.any().describe('Array of all borrower objects.'),
    investors: z.any().describe('Array of all investor objects.'),
    users: z.any().describe('Array of all user objects.'),
    currentUser: z.any().describe('The currently logged-in user object.'),
    config: z.object({
        investorSharePercentage: z.number(),
        graceTotalProfitPercentage: z.number(),
        graceInvestorSharePercentage: z.number(),
    }).describe('Configuration for profit calculations.'),
});
export type DashboardMetricsInput = z.infer<typeof DashboardMetricsInputSchema>;

// The output schema will also use z.any() for the complex nested structures.
// The actual type is defined in the service.
const DashboardMetricsOutputSchema = z.any();
export type DashboardMetricsOutput = Awaited<ReturnType<typeof calculateAllDashboardMetrics>>;


export async function calculateDashboardMetrics(
  input: DashboardMetricsInput
): Promise<DashboardMetricsOutput> {
  return calculateDashboardMetricsFlow(input);
}


const calculateDashboardMetricsFlow = ai.defineFlow(
  {
    name: 'calculateDashboardMetricsFlow',
    inputSchema: DashboardMetricsInputSchema,
    outputSchema: DashboardMetricsOutputSchema,
  },
  async (input) => {
    // Cast the 'any' types back to the actual types for the service function
    const typedInput = {
      ...input,
      borrowers: input.borrowers as Borrower[],
      investors: input.investors as Investor[],
      users: input.users as User[],
      currentUser: input.currentUser as User,
    }
    // The core logic is in the service, not in a prompt.
    // This is more efficient, reliable, and testable for complex calculations.
    return calculateAllDashboardMetrics(typedInput);
  }
);
