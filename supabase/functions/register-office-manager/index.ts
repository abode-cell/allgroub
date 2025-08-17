// supabase/functions/register-office-manager/index.ts

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

  const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const payload: NewManagerPayload = await req.json();

    if (!payload.password) {
      throw new Error("Password is required");
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      email_confirm: true, // User must confirm their email
      user_metadata: {
        full_name: payload.name,
        office_name: payload.officeName,
        user_role: 'مدير المكتب' // Explicitly set the role here
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
      }
      throw error;
    }

    // The `handle_new_user` trigger will automatically populate the public.users table.
    
    return new Response(JSON.stringify({ success: true, user: data.user }), {
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
