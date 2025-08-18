
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
    const { data: { user: manager } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!manager) throw new Error("Manager not found");

    const payload: InvestorPayload = await req.json();

    // Create the user in auth.users
    const { data: { user: newAuthUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password || "default-password-123",
      email_confirm: true,
      phone: payload.phone,
      user_metadata: {
        full_name: payload.name,
        raw_phone_number: payload.phone,
        user_role: 'مستثمر',
        managedBy: manager.id,
        submittedBy: manager.id,
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

    // The handle_new_user trigger will create the user in public.users and the basic investor profile.
    
    // Now, update the newly created investor profile with the profit shares
    const { error: investorUpdateError } = await supabaseAdmin
      .from("investors")
      .update({
        "installmentProfitShare": payload.installmentProfitShare,
        "gracePeriodProfitShare": payload.gracePeriodProfitShare,
      })
      .eq('id', newAuthUser.id);
      
    if(investorUpdateError) console.error("Could not update profit shares for investor:", investorUpdateError.message);


    // Create initial capital deposit transactions if provided
    if(payload.installmentCapital > 0) {
      const { error: txError } = await supabaseAdmin.from('transactions').insert({
        investor_id: newAuthUser.id,
        type: 'إيداع رأس المال',
        amount: payload.installmentCapital,
        description: 'إيداع رأس مال تأسيسي (أقساط)',
        capitalSource: 'installment'
      });
      if (txError) console.error("Installment TX Error:", txError.message);
    }
     if(payload.graceCapital > 0) {
      const { error: txError } = await supabaseAdmin.from('transactions').insert({
        investor_id: newAuthUser.id,
        type: 'إيداع رأس المال',
        amount: payload.graceCapital,
        description: 'إيداع رأس مال تأسيسي (مهلة)',
        capitalSource: 'grace'
      });
      if (txError) console.error("Grace TX Error:", txError.message);
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
