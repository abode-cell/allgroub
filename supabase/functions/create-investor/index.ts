// supabase/functions/create-investor/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
            phone: payload.phone
        }
    });

    if (authError) {
      throw authError;
    }
    
    const newUserId = data.user.id;
    const { error: userProfileError } = await supabaseAdmin
        .from('users')
        .insert({
            id: newUserId,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            role: 'مستثمر',
            status: 'معلق',
            office_id: payload.office_id,
            branch_id: payload.branch_id,
            managedBy: payload.managedBy,
            registrationDate: new Date().toISOString(),
        });
        
    if (userProfileError) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw new Error(`Failed to create user profile for investor: ${userProfileError.message}`);
    }
    
    const { error: investorProfileError } = await supabaseAdmin
        .from('investors')
        .insert({
            id: newUserId,
            name: payload.name,
            office_id: payload.office_id,
            branch_id: payload.branch_id,
            date: new Date().toISOString(),
            status: 'معلق',
            managedBy: payload.managedBy,
            submittedBy: payload.submittedBy,
            installmentProfitShare: payload.installmentProfitShare,
            gracePeriodProfitShare: payload.gracePeriodProfitShare,
        });

    if (investorProfileError) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        // The trigger will delete the user profile, so we don't need to do it manually.
        throw new Error(`Failed to create investor profile: ${investorProfileError.message}`);
    }
    
    const transactionsToInsert = [];
    if (payload.installmentCapital > 0) {
        transactionsToInsert.push({
            investor_id: newUserId,
            office_id: payload.office_id,
            date: new Date().toISOString(),
            type: 'إيداع رأس المال',
            amount: payload.installmentCapital,
            description: 'إيداع رأس مال تأسيسي - أقساط',
            capitalSource: 'installment'
        });
    }
    if (payload.graceCapital > 0) {
        transactionsToInsert.push({
            investor_id: newUserId,
            office_id: payload.office_id,
            date: new Date().toISOString(),
            type: 'إيداع رأس المال',
            amount: payload.graceCapital,
            description: 'إيداع رأس مال تأسيسي - مهلة',
            capitalSource: 'grace'
        });
    }

    if (transactionsToInsert.length > 0) {
        const { error: transactionError } = await supabaseAdmin.from('transactions').insert(transactionsToInsert);
        if (transactionError) {
            // Rollback
            await supabaseAdmin.from('investors').delete().eq('id', newUserId);
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            throw new Error(`Failed to insert initial capital transactions: ${transactionError.message}`);
        }
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
