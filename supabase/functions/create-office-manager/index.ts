
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

    if (!payload.password) {
        throw new Error("Password is required.");
    }
    
    // 1. Create the user in auth.users
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true, // Auto-confirm email for simplicity in this flow
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('User with this email or phone already registered.');
        }
        throw new Error(`Auth user creation failed: ${authError.message}`);
    }
    
    if (!authUser) {
      throw new Error("Auth user was not created successfully.");
    }
    
    // 2. Create the office
    const { data: office, error: officeError } = await supabaseAdmin
      .from('offices')
      .insert({ name: payload.officeName })
      .select()
      .single();

    if (officeError) {
        // Cleanup: delete the auth user if office creation fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        throw new Error(`Office creation failed: ${officeError.message}`);
    }

    // 3. Create the user profile in public.users
    const trialPeriodDays = 14; // Default trial period
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: 'مدير المكتب',
        office_id: office.id,
        status: 'نشط', // Activate immediately
        "trialEndsAt": new Date(Date.now() + trialPeriodDays * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (profileError) {
        // Cleanup: delete auth user and office
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        await supabaseAdmin.from('offices').delete().eq('id', office.id);
        throw new Error(`User profile creation failed: ${profileError.message}`);
    }

    // 4. Link the office to the manager
    const { error: linkError } = await supabaseAdmin
        .from('offices')
        .update({ manager_id: authUser.id })
        .eq('id', office.id);

    if(linkError){
        // Cleanup...
        throw new Error(`Failed to link office to manager: ${linkError.message}`);
    }

    return new Response(JSON.stringify({ success: true, userId: authUser.id, officeId: office.id }), {
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
