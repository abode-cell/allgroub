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
  isAdmin: z.boolean().describe('Specifies if the summary is for a System Admin.'),
  userName: z.string().optional().describe('The name of the user requesting the summary.'),
  userRole: z.string().optional().describe('The role of the user.'),

  // Admin-specific fields
  adminTotalUsersCount: z.number().optional().describe('Total number of users in the system.'),
  adminActiveManagersCount: z.number().optional().describe('Number of active office managers.'),
  adminPendingManagersCount: z.number().optional().describe('Number of office managers pending activation.'),
  adminTotalCapital: z.string().optional().describe('Total capital in the entire system, formatted as currency.'),
  adminTotalActiveLoansCount: z.number().optional().describe('Total number of active loans across the system.'),
  adminNewSupportTicketsCount: z.number().optional().describe('Number of new, unread support tickets.'),

  // Office Manager-specific fields
  officeManagerTotalBorrowers: z.number().optional().describe('Total number of borrowers for this office.'),
  officeManagerTotalInvestors: z.number().optional().describe('Total number of investors for this office.'),
  officeManagerTotalLoansGranted: z.string().optional().describe('Total amount of all loans granted by this office, formatted as currency.'),
  officeManagerTotalInvestments: z.string().optional().describe('Total investment capital for this office, formatted as currency.'),
  officeManagerPendingRequestsCount: z.number().optional().describe('Number of pending loan/investor requests.'),
  officeManagerTotalNetProfit: z.string().optional().describe('Total net profit for this office, formatted as currency.'),
  officeManagerDefaultedLoansCount: z.number().optional().describe('Number of defaulted loans for this office.'),
  officeManagerActiveCapital: z.string().optional().describe('Total active capital for this office, formatted as currency.'),
  officeManagerIdleCapital: z.string().optional().describe('Total idle capital for this office, formatted as currency.'),
});
export type GenerateDailySummaryInput = z.infer<typeof GenerateDailySummaryInputSchema>;

// This is the final object structure the application expects, and what we'll ask the model for.
const GenerateDailySummaryOutputSchema = z.object({
  summary: z.string().describe('ملخص يومي مفصل ومنسق بصيغة ماركداون باللغة العربية. استخدم العناوين والنقاط (*) والعلامات (**) لتغميق النص.'),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;

export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  return generateDailySummaryFlow(input);
}

const dailySummaryPrompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateDailySummaryInputSchema},
  output: {schema: GenerateDailySummaryOutputSchema},
  prompt: `أنت مساعد ذكاء اصطناعي لـ {{userName}}. دوره هو {{userRole}}.
مهمتك هي أخذ البيانات التالية وتحويلها إلى ملخص يومي مفصل ومنظم باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) لتوضيح الأرقام والأنشطة الأكثر أهمية. لا تضف أي عبارات ترحيبية أو ختامية.
يجب وضع الملخص بالكامل داخل حقل 'summary' في كائن JSON الناتج.

{{#if isAdmin}}
# ملخص مدير النظام
* **إجمالي المستخدمين:** {{adminTotalUsersCount}}
* **مدراء المكاتب النشطون:** {{adminActiveManagersCount}}
* **الحسابات التي تنتظر التفعيل:** {{adminPendingManagersCount}}
* **إجمالي رأس المال في النظام:** {{adminTotalCapital}}
* **إجمالي القروض النشطة:** {{adminTotalActiveLoansCount}}
* **طلبات الدعم الجديدة:** {{adminNewSupportTicketsCount}}
{{else}}
# ملخص مدير المكتب
* **إجمالي المقترضين:** {{officeManagerTotalBorrowers}}
* **إجمالي المستثمرين:** {{officeManagerTotalInvestors}}
* **إجمالي مبالغ القروض:** {{officeManagerTotalLoansGranted}}
* **إجمالي مبالغ الاستثمارات:** {{officeManagerTotalInvestments}}
* **الطلبات المعلقة للمراجعة:** {{officeManagerPendingRequestsCount}}
* **الأرباح الصافية:** {{officeManagerTotalNetProfit}}
* **القروض المتعثرة:** {{officeManagerDefaultedLoansCount}}
* **رأس المال النشط:** {{officeManagerActiveCapital}}
* **رأس المال الخامل:** {{officeManagerIdleCapital}}
{{/if}}
`,
});

const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: GenerateDailySummaryInputSchema,
    outputSchema: GenerateDailySummaryOutputSchema,
  },
  async input => {
    // Call the prompt and directly return the structured output.
    const { output } = await dailySummaryPrompt(input);

    // If the model fails to generate a valid output object, Genkit will throw an error,
    // which will be caught by the calling component. We add a fallback here for safety.
    if (!output || !output.summary) {
        return { summary: 'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص صالح. يرجى المحاولة مرة أخرى.' };
    }
    
    return output;
  }
);
