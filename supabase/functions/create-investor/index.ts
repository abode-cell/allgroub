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
  office_id: string; // Added office_id to be passed from the frontend
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
    
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: invoker } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!invoker) throw new Error("User not found or invalid token");

    const payload: NewInvestorPayload = await req.json();

    const { data: invokerProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role, office_id, investorLimit')
        .eq('id', invoker.id)
        .single();

    if (profileError || !invokerProfile) throw new Error("Could not find invoker profile or user is not authorized.");
    if (invokerProfile.role !== 'مدير المكتب') throw new Error("Only office managers can create new investors.");
    if (invokerProfile.office_id !== payload.office_id) throw new Error("Unauthorized: Cannot create investor for another office.");
    
    const { data: investors, error: countError } = await supabaseAdmin
      .from('investors')
      .select('id', { count: 'exact' })
      .eq('office_id', invokerProfile.office_id);

    if (countError) throw new Error(`Could not count investors: ${countError.message}`);
    
    if (investors && investors.length >= (invokerProfile.investorLimit || 0)) {
        throw new Error(`لقد وصلت للحد الأقصى للمستثمرين (${invokerProfile.investorLimit}).`);
    }
    
    if (!payload.password) throw new Error("Password is required for the new investor account.");

    const { data: { user: newUser }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true,
        user_metadata: {
            user_role: 'مستثمر',
            full_name: payload.name,
            raw_phone_number: payload.phone,
            managedBy: invoker.id,
            office_id: payload.office_id,
            branch_id: payload.branch_id || null
        }
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
        throw new Error(`Failed to create auth user: ${signUpError.message}`);
    }
    if (!newUser) throw new Error("User creation did not return a user object.");

    const { error: rpcError } = await supabaseAdmin.rpc('create_investor_profile', {
        p_user_id: newUser.id,
        p_name: payload.name,
        p_office_id: payload.office_id,
        p_branch_id: payload.branch_id || null,
        p_managed_by: invoker.id,
        p_submitted_by: invoker.id,
        p_installment_profit_share: payload.installmentProfitShare,
        p_grace_period_profit_share: payload.gracePeriodProfitShare,
        p_initial_installment_capital: payload.installmentCapital,
        p_initial_grace_capital: payload.graceCapital
    });
    
    if (rpcError) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.id);
        throw new Error(`Failed to create investor profile: ${rpcError.message}`);
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
