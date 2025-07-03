
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
  userName: z.string().optional().describe('The name of the user requesting the summary.'),
  userRole: z.string().optional().describe('The role of the user.'),
  
  // Financial fields for Office Manager
  newBorrowersCount: z.number().optional().describe('The number of new borrowers added today.'),
  newInvestorsCount: z.number().optional().describe('The number of new investors added today.'),
  totalLoansGranted: z.number().optional().describe('The total amount of new loans granted today.'),
  totalNewInvestments: z.number().optional().describe('The total amount of new investments received today.'),
  pendingRequestsCount: z.number().optional().describe('The number of pending requests that need review.'),
  defaultedLoansCount: z.number().optional().describe('Number of loans that defaulted.'),
  totalNetProfit: z.number().optional().describe('Total net profit generated.'),
  idleCapital: z.number().optional().describe('Total idle capital available for investment.'),
  activeCapital: z.number().optional().describe('Total capital currently active in loans.'),
  
  // System fields for System Admin
  totalUsersCount: z.number().optional().describe('The total number of users in the system.'),
  activeManagersCount: z.number().optional().describe('The number of active office managers.'),
  pendingActivationsCount: z.number().optional().describe('The number of office managers pending activation.'),
  totalCapitalInSystem: z.number().optional().describe('The total capital across all investors in the system.'),
  totalActiveLoansCount: z.number().optional().describe('The total number of active loans in the system.'),
  newSupportTicketsCount: z.number().optional().describe('The number of new support tickets received.'),
});
export type GenerateDailySummaryInput = z.infer<typeof GenerateDailySummaryInputSchema>;

const GenerateDailySummaryOutputSchema = z.object({
  summary: z.string().describe('ملخص يومي مفصل ومنسق بصيغة ماركداون باللغة العربية. استخدم النقاط (*) للتعداد والعلامات (**) لتغميق النص.'),
});
export type GenerateDailySummaryOutput = z.infer<typeof GenerateDailySummaryOutputSchema>;

export async function generateDailySummary(
  input: GenerateDailySummaryInput
): Promise<GenerateDailySummaryOutput> {
  return generateDailySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailySummaryPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateDailySummaryInputSchema},
  output: {schema: GenerateDailySummaryOutputSchema},
  prompt: `أنت مساعد ذكاء اصطناعي لـ {{userName}}. دوره هو {{userRole}}.
مهمتك هي إنشاء ملخص يومي مفصل ومنظم باللغة العربية، باستخدام صيغة ماركداون.
استخدم العناوين والنقاط (*) لتوضيح الأرقام والأنشطة الأكثر أهمية. لا تضف أي عبارات ترحيبية أو ختامية.

{{#if totalUsersCount}}
أنت تتحدث إلى مدير النظام. قدم ملخصًا إداريًا شاملًا عن صحة المنصة وأدائها.

**نظرة عامة على النظام:**
* **إجمالي المستخدمين:** {{{totalUsersCount}}} مستخدم
* **مدراء المكاتب النشطون:** {{{activeManagersCount}}} مدير
* **الحسابات التي تنتظر التفعيل:** {{{pendingActivationsCount}}} طلب

**النشاط المالي:**
* **إجمالي رأس المال في النظام:** {{{totalCapitalInSystem}}} ريال
* **إجمالي القروض النشطة:** {{{totalActiveLoansCount}}} قرض

**الدعم الفني:**
* **طلبات الدعم الجديدة:** {{{newSupportTicketsCount}}} طلب

{{else}}
أنت تتحدث إلى مدير مكتب. قدم ملخصًا مفصلاً عن الأداء المالي والتشغيلي لمكتبه.

**نظرة عامة على النشاط:**
* **إجمالي المقترضين:** {{{newBorrowersCount}}} مقترض
* **إجمالي المستثمرين:** {{{newInvestorsCount}}} مستثمر
* **إجمالي مبالغ القروض:** {{{totalLoansGranted}}} ريال
* **إجمالي مبالغ الاستثمارات:** {{{totalNewInvestments}}} ريال
* **الطلبات المعلقة للمراجعة:** {{{pendingRequestsCount}}} طلب

**أداء المحفظة:**
* **الأرباح الصافية:** {{{totalNetProfit}}} ريال
* **القروض المتعثرة:** {{{defaultedLoansCount}}} قرض
* **رأس المال النشط:** {{{activeCapital}}} ريال
* **رأس المال الخامل:** {{{idleCapital}}} ريال
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
    const {output} = await prompt(input);
    return output!;
  }
);
