// supabase/functions/create-investor/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface NewInvestorPayload {
    name: string;
    installmentCapital: number;
    graceCapital: number;
    email: string;
    phone: string;
    password?: string;
    installmentProfitShare: number;
    gracePeriodProfitShare: number;
    branch_id?: string | null;
    office_id: string;
    managedBy?: string;
    submittedBy?: string;
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

    const payload: NewInvestorPayload = await req.json();

    if (!payload.password) {
      return new Response(JSON.stringify({ message: "Password is required for new investor." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Step 1: Create the auth user securely
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      email_confirm: true,
      user_metadata: {
        full_name: payload.name,
        user_role: 'مستثمر',
        office_id: payload.office_id,
        branch_id: payload.branch_id,
        managed_by: payload.managedBy,
        submitted_by: payload.submittedBy,
        installment_profit_share: payload.installmentProfitShare,
        grace_period_profit_share: payload.gracePeriodProfitShare,
        initial_installment_capital: payload.installmentCapital,
        initial_grace_capital: payload.graceCapital,
      },
    });

    if (authError) {
      console.error('Auth Error:', authError.message);
      return new Response(JSON.stringify({ message: `Auth Error: ${authError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ message: "User creation did not return a user object." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
