// supabase/functions/create-investor/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface InvestorPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  installmentCapital: number;
  graceCapital: number;
  installmentProfitShare: number;
  gracePeriodProfitShare: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let newAuthUserId: string | null = null;
  const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: invoker } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!invoker) throw new Error("User not found");

    const payload: InvestorPayload = await req.json();

    const { data: { user: newAuthUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password || "default-password-123",
      email_confirm: true,
       phone: payload.phone,
      user_metadata: {
        full_name: payload.name,
        raw_phone_number: payload.phone,
        user_role: "مستثمر",
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
      }
      throw new Error(`Auth Error: ${authError.message}`);
    }
    if (!newAuthUser) throw new Error("Failed to create auth user.");
    
    newAuthUserId = newAuthUser.id;

    // The handle_new_user trigger will automatically create an entry in the public.users table.
    // We just need to create the investor-specific entry.

    const { error: investorError } = await supabaseAdmin
      .from("investors")
      .insert({
        id: newAuthUser.id,
        name: payload.name,
        status: "نشط",
        submittedBy: invoker.id,
        installmentProfitShare: payload.installmentProfitShare,
        gracePeriodProfitShare: payload.gracePeriodProfitShare,
        date: new Date().toISOString(),
      });

    if (investorError) {
        throw new Error(`Investor DB Error: ${investorError.message}`);
    }
    
    const transactionsToInsert = [];
    if (payload.installmentCapital > 0) {
      transactionsToInsert.push({
        investor_id: newAuthUser.id,
        type: 'إيداع رأس المال',
        amount: payload.installmentCapital,
        description: 'رأس مال تأسيسي (محفظة الأقساط)',
        capitalSource: 'installment',
        date: new Date().toISOString(),
      });
    }
    if (payload.graceCapital > 0) {
      transactionsToInsert.push({
        investor_id: newAuthUser.id,
        type: 'إيداع رأس المال',
        amount: payload.graceCapital,
        description: 'رأس مال تأسيسي (محفظة المهلة)',
        capitalSource: 'grace',
        date: new Date().toISOString(),
      });
    }

    if (transactionsToInsert.length > 0) {
        const { error: txError } = await supabaseAdmin.from('transactions').insert(transactionsToInsert);
        if (txError) {
            throw new Error(`Transaction DB Error: ${txError.message}`);
        }
    }

    return new Response(JSON.stringify({ success: true, userId: newAuthUser.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    if (newAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(newAuthUserId);
    }
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
