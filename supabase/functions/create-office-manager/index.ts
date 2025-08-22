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
        user_metadata: {
            // This data will be available to the trigger
            full_name: payload.name,
            office_name: payload.officeName,
            raw_phone_number: payload.phone,
            user_role: 'مدير المكتب',
        }
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
        throw new Error(`Auth Error: ${signUpError.message}`);
    }
    if (!user) throw new Error("User creation did not return a user object.");

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