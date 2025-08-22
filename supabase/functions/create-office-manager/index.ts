
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
        email_confirm: false, // User needs to confirm their email
        user_metadata: {
            full_name: payload.name,
            office_name: payload.officeName,
            user_role: 'مدير المكتب'
        }
    });

    if (authError) {
        if(authError.message.includes('already registered')) {
            throw new Error("البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.");
        }
        throw new Error(`فشل في إنشاء مستخدم المصادقة: ${authError.message}`);
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
