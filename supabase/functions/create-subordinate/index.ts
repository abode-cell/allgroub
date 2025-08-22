
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface SubordinatePayload {
    name: string;
    email: string;
    phone: string;
    password?: string;
    role: 'موظف' | 'مساعد مدير المكتب';
    office_id: string;
    branch_id?: string;
    managed_by: string;
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

    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: invoker } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!invoker) throw new Error("User not found or invalid token");
    
    const { data: invokerProfile } = await supabaseAdmin.from('users').select('role').eq('id', invoker.id).single();
    if (!invokerProfile || invokerProfile.role !== 'مدير المكتب') {
        throw new Error("Not authorized to create subordinate users.");
    }

    const payload: SubordinatePayload = await req.json();

    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
            full_name: payload.name,
            phone: payload.phone,
            user_role: payload.role,
            office_id: payload.office_id,
            branch_id: payload.branch_id,
            managed_by: payload.managed_by
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
    console.error("Function Error:", error);
    const errorMessage = error.message.includes('already registered')
        ? "البريد الإلكتروني أو رقم الهاتف مسجل بالفعل."
        : `فشل في إنشاء مستخدم المصادقة: ${error.message}`;

    return new Response(JSON.stringify({ message: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
