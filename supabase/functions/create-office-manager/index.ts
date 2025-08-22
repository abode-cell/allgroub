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
  // This is needed if you're planning to invoke your function from a browser.
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
      throw new Error("Password is required for new manager.");
    }
    
    // Step 1: Create the auth user securely using the Admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      email_confirm: true, // The user will need to confirm their email
      user_metadata: {
        full_name: payload.name,
        office_name: payload.officeName,
        user_role: 'مدير المكتب'
      },
    });

    if (authError) {
      console.error('Auth Error:', authError.message);
      // Check for specific, common errors to return clearer messages
      if (authError.message.includes('already registered')) {
          throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
      }
      throw new Error(`Auth Error: ${authError.message}`);
    }

    if (!authData.user) {
      // This case should ideally not happen if authError is null, but as a safeguard:
      throw new Error("User creation did not return a user object.");
    }
    
    // The handle_new_user trigger in the database will handle profile creation.
    
    return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Function Error:', error.message);
    // Ensure that even in case of an error, a valid JSON response is sent.
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400, // Use 400 for client-side errors or 500 for server-side.
    });
  }
});
