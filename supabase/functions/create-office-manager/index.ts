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
            full_name: payload.name,
            office_name: payload.officeName,
            raw_phone_number: payload.phone,
        }
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
        throw new Error(`Failed to create auth user: ${signUpError.message}`);
    }
    if (!newUser) throw new Error("User creation did not return a user object.");
    
    // NOTE: The handle_new_user trigger in the database will now execute and create the office and user profile.
    // The trigger is now the single source of truth for creating the DB records after auth user creation.

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