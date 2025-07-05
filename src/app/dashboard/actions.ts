'use server';

import { generateDailySummary } from '@/ai/flows/generate-daily-summary';
import type { DashboardMetricsOutput as ServiceMetrics } from '@/services/dashboard-service';
import { formatCurrency } from '@/lib/utils';

export type DailySummaryState = {
  summary?: string;
  error?: string;
};

export async function getDailySummary(metrics: ServiceMetrics | null): Promise<DailySummaryState> {
  if (!metrics) {
    return { error: 'لا توجد بيانات كافية لإنشاء ملخص.' };
  }

  try {
    const { role, admin, manager } = metrics;
    let summaryContext = '';

    if (role === 'مدير النظام' && admin) {
      summaryContext = `
        # ملخص مدير النظام
        *   **المستخدمون:** لديك ما مجموعه **${admin.totalUsersCount ?? 0}** مستخدمًا في النظام.
        *   **مدراء المكاتب:** هناك **${admin.activeManagersCount ?? 0}** مدير مكتب نشط، مع **${admin.pendingManagersCount ?? 0}** حسابًا في انتظار التفعيل.
        *   **المالية:** إجمالي رأس المال في النظام هو **${formatCurrency(admin.totalCapital ?? 0)}**.
        *   **العمليات:** يوجد **${admin.totalActiveLoans ?? 0}** قرضًا نشطًا حاليًا، و**${admin.newSupportTickets ?? 0}** طلب دعم جديد في انتظار المراجعة.
      `;
    } else if (['مدير المكتب', 'مساعد مدير المكتب', 'موظف'].includes(role) && manager) {
      const totalLoanAmount = (manager.installments?.loansGranted ?? 0) + (manager.gracePeriod?.loansGranted ?? 0);
      const netProfit = (manager.installments?.netProfit ?? 0) + (manager.gracePeriod?.netProfit ?? 0);
      const defaultedLoansCount = (manager.installments?.defaultedLoans?.length ?? 0) + (manager.gracePeriod?.defaultedLoans?.length ?? 0);
      const idleCapital = manager.idleFunds?.totalIdleFunds ?? 0;
      
      summaryContext = `
        # ملخص المكتب لـ ${manager.managerName || 'غير متوفر'}
        *   **الحافظة:** تدير حاليًا **${manager.totalBorrowers ?? 0}** مقترضًا و**${manager.filteredInvestors?.length ?? 0}** مستثمرًا.
        *   **المالية:** إجمالي قيمة القروض الممنوحة هو **${formatCurrency(totalLoanAmount)}**، بينما يبلغ إجمالي الاستثمارات **${formatCurrency(manager.totalInvestments ?? 0)}**.
        *   **الأداء:** صافي الربح المحقق هو **${formatCurrency(netProfit)}**.
        *   **السيولة:** رأس المال النشط (المستثمر) هو **${formatCurrency(manager.capital?.active ?? 0)}**، بينما رأس المال الخامل المتاح للاستثمار هو **${formatCurrency(idleCapital)}**.
        *   **المهام:** لديك **${manager.pendingRequestsCount ?? 0}** طلبات جديدة في انتظار المراجعة.
        *   **المخاطر:** هناك **${defaultedLoansCount}** قرضًا متعثرًا يتطلب المتابعة.
      `;
    }

    if (summaryContext.trim() === '') {
      return { error: 'لا يوجد بيانات كافية لإنشاء ملخص لهذا الدور.' };
    }

    const result = await generateDailySummary({ context: summaryContext.trim() });
    
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
