'use server';

import { generateDailySummary } from '@/ai/flows/generate-daily-summary';
import type { DashboardMetricsOutput as ServiceMetrics } from '@/services/dashboard-service';
import { formatCurrency } from '@/lib/utils';

export type DailySummaryState = {
  summary?: string;
  error?: string;
};

// This is a standard async server function, not a form action.
export async function getDailySummary(metrics: ServiceMetrics | null): Promise<DailySummaryState> {
  if (!metrics) {
    return { error: 'لا توجد بيانات كافية لإنشاء ملخص.' };
  }

  try {
    const { role, admin, manager } = metrics;
    let summaryContext = '';

    if (role === 'مدير النظام' && admin) {
      summaryContext += `# ملخص مدير النظام\n`;
      summaryContext += `*   **المستخدمون:** لديك ما مجموعه **${admin.totalUsersCount}** مستخدمًا في النظام.\n`;
      summaryContext += `*   **مدراء المكاتب:** هناك **${admin.activeManagersCount}** مدير مكتب نشط، مع **${admin.pendingManagersCount}** حسابًا في انتظار التفعيل.\n`;
      summaryContext += `*   **المالية:** إجمالي رأس المال في النظام هو **${formatCurrency(admin.totalCapital)}**.\n`;
      summaryContext += `*   **العمليات:** يوجد **${admin.totalActiveLoans}** قرضًا نشطًا حاليًا، و**${admin.newSupportTickets}** طلب دعم جديد في انتظار المراجعة.\n`;
    } else if (['مدير المكتب', 'مساعد مدير المكتب', 'موظف'].includes(role) && manager) {
      const totalLoanAmount = (manager.installments?.loansGranted ?? 0) + (manager.gracePeriod?.loansGranted ?? 0);
      const netProfit = (manager.installments?.netProfit ?? 0) + (manager.gracePeriod?.netProfit ?? 0);
      const defaultedLoansCount = (manager.installments?.defaultedLoans?.length ?? 0) + (manager.gracePeriod?.defaultedLoans?.length ?? 0);
      const idleCapital = manager.idleFunds?.totalIdleFunds ?? 0;
      
      summaryContext += `# ملخص المكتب لـ ${manager.managerName}\n`;
      summaryContext += `*   **الحافظة:** تدير حاليًا **${manager.totalBorrowers}** مقترضًا و**${manager.filteredInvestors?.length ?? 0}** مستثمرًا.\n`;
      summaryContext += `*   **المالية:** إجمالي قيمة القروض الممنوحة هو **${formatCurrency(totalLoanAmount)}**، بينما يبلغ إجمالي الاستثمارات **${formatCurrency(manager.totalInvestments)}**.\n`;
      summaryContext += `*   **الأداء:** صافي الربح المحقق هو **${formatCurrency(netProfit)}**.\n`;
      summaryContext += `*   **السيولة:** رأس المال النشط (المستثمر) هو **${formatCurrency(manager.capital?.active ?? 0)}**، بينما رأس المال الخامل المتاح للاستثمار هو **${formatCurrency(idleCapital)}**.\n`;
      summaryContext += `*   **المهام:** لديك **${manager.pendingRequestsCount}** طلبات جديدة في انتظار المراجعة.\n`;
      summaryContext += `*   **المخاطر:** هناك **${defaultedLoansCount}** قرضًا متعثرًا يتطلب المتابعة.\n`;
    }

    if (summaryContext.trim() === '') {
      return { error: 'لا يوجد بيانات كافية لإنشاء ملخص لهذا الدور.' };
    }

    const result = await generateDailySummary({ context: summaryContext });
    
    if (result && result.summary && !result.summary.startsWith('ERROR:')) {
      return { summary: result.summary };
    } else {
      const errorMessage =
        result.summary === 'ERROR:AI_FAILED_TO_GENERATE'
          ? 'لم يتمكن الذكاء الاصطناعي من إنشاء ملخص. قد تكون هناك مشكلة مؤقتة.'
          : 'حدث خطأ في نظام الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.';
      return { error: errorMessage };
    }
  } catch (e) {
    console.error("An unexpected error occurred in getDailySummary action:", e);
    return { error: 'حدث خطأ غير متوقع أثناء إنشاء الملخص.' };
  }
}
