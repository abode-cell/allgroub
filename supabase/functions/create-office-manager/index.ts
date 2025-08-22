
// supabase/functions/create-office-manager/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface ManagerPayload {
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

    const payload: ManagerPayload = await req.json();

    if (!payload.password) {
        throw new Error("كلمة المرور مطلوبة.");
    }
    
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: false,
        user_metadata: {
            full_name: payload.name,
            office_name: payload.officeName,
            user_role: 'مدير المكتب'
        }
    });

    if (authError) {
      throw authError;
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Create Office Manager Error:", error);
    const errorMessage = error.message.includes('User already registered')
        ? "البريد الإلكتروني أو رقم الهاتف مسجل بالفعل."
        : error.message || 'فشل في إنشاء حساب مدير المكتب.';

    return new Response(JSON.stringify({ message: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
