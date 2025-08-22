
// supabase/functions/handle-partial-payment/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface PartialPaymentPayload {
  borrowerId: string;
  paidAmount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { borrowerId, paidAmount }: PartialPaymentPayload = await req.json();

    // 1. Fetch the original borrower
    const { data: originalBorrower, error: fetchError } = await supabaseAdmin
      .from("borrowers")
      .select("*")
      .eq("id", borrowerId)
      .single();

    if (fetchError || !originalBorrower) {
      throw new Error("لم يتم العثور على القرض الأصلي.");
    }
    
    if (paidAmount <= 0 || paidAmount >= originalBorrower.amount) {
        throw new Error("المبلغ المسدد يجب أن يكون أكبر من صفر وأقل من إجمالي القرض.");
    }

    const remainingAmount = originalBorrower.amount - paidAmount;
    const newLoanId = `bor_rem_${Date.now()}`;
    
    // 2. Update the original borrower
    const { error: updateError } = await supabaseAdmin
      .from("borrowers")
      .update({
        status: 'مسدد بالكامل',
        paymentStatus: 'تم السداد',
        paidOffDate: new Date().toISOString(),
        partial_payment_paid_amount: paidAmount,
        partial_payment_remaining_loan_id: newLoanId,
      })
      .eq("id", borrowerId);

    if (updateError) {
      throw new Error(`فشل تحديث القرض الأصلي: ${updateError.message}`);
    }

    // 3. Create the new remaining loan
    const { error: insertError } = await supabaseAdmin.from("borrowers").insert({
        id: newLoanId,
        office_id: originalBorrower.office_id,
        branch_id: originalBorrower.branch_id,
        name: `${originalBorrower.name}`,
        nationalId: originalBorrower.nationalId,
        phone: originalBorrower.phone,
        amount: remainingAmount,
        date: new Date().toISOString(),
        loanType: 'مهلة',
        status: 'منتظم',
        dueDate: new Date().toISOString().split("T")[0], // Placeholder, should be updated by user
        submittedBy: originalBorrower.submittedBy,
        managedBy: originalBorrower.managedBy,
        fundedBy: originalBorrower.fundedBy,
        originalLoanId: originalBorrower.id,
    });

    if (insertError) {
      // Rollback the original borrower's status if new loan creation fails
      await supabaseAdmin.from("borrowers").update({
          status: originalBorrower.status,
          paymentStatus: originalBorrower.paymentStatus,
          paidOffDate: originalBorrower.paidOffDate,
          partial_payment_paid_amount: null,
          partial_payment_remaining_loan_id: null,
      }).eq("id", borrowerId);
      
      throw new Error(`فشل إنشاء قرض جديد بالمبلغ المتبقي: ${insertError.message}`);
    }
    
    return new Response(JSON.stringify({ success: true, newLoanId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
