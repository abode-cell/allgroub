
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
    
    // Step 1: Create the auth user securely
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true, 
        user_metadata: {
            full_name: payload.name,
            office_name: payload.officeName,
            user_role: 'مدير المكتب'
        }
    });

    if (authError) {
        throw new Error(`Auth Error: ${authError.message}`);
    }

    if (!authData.user) {
        throw new Error("User creation did not return a user object.");
    }
    
    const newUserId = authData.user.id;

    // Step 2: Call the RPC function to create the public profiles
    const { error: rpcError } = await supabaseAdmin.rpc('create_office_manager_profiles', {
        p_user_id: newUserId,
        p_email: payload.email,
        p_phone: payload.phone,
        p_name: payload.name,
        p_office_name: payload.officeName
    });

    if (rpcError) {
        // If RPC fails, try to clean up the auth user to prevent orphaned users
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw new Error(`RPC Error: ${rpcError.message}`);
    }

    return new Response(JSON.stringify({ success: true, userId: newUserId }), {
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
