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
  isSystemAdmin: z.boolean(),
  isOfficeRole: z.boolean(),
  managerName: z.string().optional(),
  adminTotalUsersCount: z.number().optional(),
  adminActiveManagersCount: z.number().optional(),
  adminPendingManagersCount: z.number().optional(),
  adminTotalCapital: z.number().optional(),
  adminTotalActiveLoans: z.number().optional(),
  adminNewSupportTickets: z.number().optional(),
  managerTotalBorrowers: z.number().optional(),
  managerTotalInvestors: z.number().optional(),
  managerTotalLoanAmount: z.number().optional(),
  managerTotalInvestmentAmount: z.number().optional(),
  managerPendingRequests: z.number().optional(),
  managerNetProfit: z.number().optional(),
  managerDefaultedLoansCount: z.number().optional(),
  managerActiveCapital: z.number().optional(),
  managerIdleCapital: z.number().optional(),
});
export type GenerateDailySummaryInput = z.infer<
  typeof GenerateDailySummaryInputSchema
>;

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
  output: {schema: GenerateDailySummaryOutputSchema},
  prompt: `
مهمتك هي أخذ البيانات المنظمة التالية وتحويلها إلى ملخص يومي مفصل ومنظم باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) والعلامات (**) لتغميق النص لتوضيح الأرقام والأنشطة الأكثر أهمية.
لا تضف أي عبارات ترحيبية أو ختامية أو مقدمات. ابدأ مباشرة بالملخص.
يجب وضع الملخص بالكامل داخل حقل 'summary' في كائن JSON الناتج.

{{#if isSystemAdmin}}
# ملخص مدير النظام

*   **المستخدمون:** لديك ما مجموعه **{{adminTotalUsersCount}}** مستخدمًا في النظام.
*   **مدراء المكاتب:** هناك **{{adminActiveManagersCount}}** مدير مكتب نشط، مع **{{adminPendingManagersCount}}** حسابًا في انتظار التفعيل.
*   **المالية:** إجمالي رأس المال في النظام هو **{{adminTotalCapital}} ريال سعودي**.
*   **العمليات:** يوجد **{{adminTotalActiveLoans}}** قرضًا نشطًا حاليًا، و**{{adminNewSupportTickets}}** طلب دعم جديد في انتظار المراجعة.
{{/if}}

{{#if isOfficeRole}}
# ملخص المكتب لـ {{managerName}}

*   **الحافظة:** تدير حاليًا **{{managerTotalBorrowers}}** مقترضًا و**{{managerTotalInvestors}}** مستثمرًا.
*   **المالية:** إجمالي قيمة القروض الممنوحة هو **{{managerTotalLoanAmount}} ريال سعودي**، بينما يبلغ إجمالي الاستثمارات **{{managerTotalInvestmentAmount}} ريال سعودي**.
*   **الأداء:** صافي الربح المحقق هو **{{managerNetProfit}} ريال سعودي**.
*   **السيولة:** رأس المال النشط (المستثمر) هو **{{managerActiveCapital}} ريال سعودي**، بينما رأس المال الخامل المتاح للاستثمار هو **{{managerIdleCapital}} ريال سعودي**.
*   **المهام:** لديك **{{managerPendingRequests}}** طلبات جديدة في انتظار المراجعة.
*   **المخاطر:** هناك **{{managerDefaultedLoansCount}}** قرضًا متعثرًا يتطلب المتابعة.
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
    const {output} = await dailySummaryPrompt(input);

    if (!output || !output.summary) {
      return {
        summary:
          'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص صالح. يرجى المحاولة مرة أخرى.',
      };
    }

    return output;
  }
);
