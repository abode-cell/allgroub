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
    const { data: { user: newUser }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true,
        user_metadata: {
            user_role: 'مدير المكتب', // This is just for context in JWT, not for DB insertion here.
        }
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
        throw new Error(`Failed to create auth user: ${signUpError.message}`);
    }
    if (!newUser) throw new Error("User creation did not return a user object.");

    // Step 2: Create the office
    const { data: newOffice, error: officeError } = await supabaseAdmin
      .from('offices')
      .insert({ name: payload.officeName, manager_id: newUser.id })
      .select()
      .single();

    if (officeError || !newOffice) {
      // Cleanup: delete the auth user if office creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw new Error(`Failed to create office: ${officeError?.message}`);
    }

    // Step 3: Get trial period days from config
    const { data: config, error: configError } = await supabaseAdmin.from('app_config').select('value').eq('key', 'defaultTrialPeriodDays').single();
    if(configError) console.error("Could not fetch trial period config, will use default.");
    const trial_period_days = config?.value?.value ?? 14;
    const trial_end_date = new Date();
    trial_end_date.setDate(trial_end_date.getDate() + trial_period_days);

    // Step 4: Create the user profile in public.users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUser.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: 'مدير المكتب',
        status: 'معلق',
        office_id: newOffice.id,
        "trialEndsAt": trial_end_date.toISOString()
      });

    if (profileError) {
      // Cleanup: delete both auth user and office if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      await supabaseAdmin.from('offices').delete().eq('id', newOffice.id);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }
    
    // Step 5: Update the JWT claims for the new user
    const { data: updatedUser, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
        newUser.id,
        {
          user_metadata: {
            user_role: 'مدير المكتب',
            office_id: newOffice.id,
          }
        }
      )
    if(updateUserError) throw new Error(`Failed to update user claims: ${updateUserError.message}`);


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
