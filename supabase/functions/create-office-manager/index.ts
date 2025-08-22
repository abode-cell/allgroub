// supabase/functions/create-office-manager/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface NewManagerPayload {
    email: string;
    password?: string;
    phone: string;
    name: string;
    officeName: string;
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

    const payload: NewManagerPayload = await req.json();
    if (!payload.password) throw new Error("Password is required.");

    // Step 1: Create the user in auth.users
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true, // User needs to confirm their email
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
        throw new Error(`Auth Error: ${signUpError.message}`);
    }
    if (!user) throw new Error("User creation did not return a user object.");

    // Step 2: Create the office
    const { data: office, error: officeError } = await supabaseAdmin
        .from('offices')
        .insert({ name: payload.officeName, manager_id: user.id })
        .select()
        .single();
    
    if (officeError || !office) {
        // Cleanup: delete the auth user if office creation fails
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        throw new Error(`Office Creation Error: ${officeError?.message}`);
    }

    // Step 3: Get default trial period
    const { data: config, error: configError } = await supabaseAdmin
        .from('app_config')
        .select('value')
        .eq('key', 'defaultTrialPeriodDays')
        .single();
        
    const trial_period_days = config?.value?.value || 14;


    // Step 4: Create the user profile in public.users
    const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
            id: user.id,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            role: 'مدير المكتب',
            office_id: office.id,
            status: 'معلق', // Manager starts as pending until email is confirmed
            "trialEndsAt": new Date(Date.now() + trial_period_days * 24 * 60 * 60 * 1000).toISOString()
        });

    if (profileError) {
        // Cleanup: delete both auth user and office if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        await supabaseAdmin.from('offices').delete().eq('id', office.id);
        throw new Error(`Profile Creation Error: ${profileError.message}`);
    }

    return new Response(JSON.stringify({ success: true, userId: user.id }), {
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
