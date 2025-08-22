
// supabase/functions/create-investor/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface InvestorPayload {
    name: string;
    email: string;
    phone: string;
    password?: string;
    office_id: string;
    branch_id?: string;
    managedBy: string;
    submittedBy: string;
    installmentProfitShare: number;
    gracePeriodProfitShare: number;
    installmentCapital: number;
    graceCapital: number;
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

    const payload: InvestorPayload = await req.json();

    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true,
        user_metadata: {
            full_name: payload.name,
            phone: payload.phone,
            user_role: 'مستثمر',
            office_id: payload.office_id,
            branch_id: payload.branch_id,
            managed_by: payload.managedBy,
            submitted_by: payload.submittedBy,
            installment_profit_share: payload.installmentProfitShare,
            grace_period_profit_share: payload.gracePeriodProfitShare,
            initial_installment_capital: payload.installmentCapital,
            initial_grace_capital: payload.graceCapital
        }
    });

    if (authError) {
      throw authError;
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function Error:", error);
    const errorMessage = error.message.includes('already registered')
        ? "البريد الإلكتروني أو رقم الهاتف مسجل بالفعل."
        : `فشل في إنشاء مستخدم المصادقة: ${error.message}`;

    return new Response(JSON.stringify({ message: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
