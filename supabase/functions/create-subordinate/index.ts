

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SubordinatePayload {
    name: string;
    email: string;
    phone: string;
    password?: string;
    role: 'موظف' | 'مساعد مدير المكتب';
    office_id: string;
    branch_id?: string | null;
    managed_by: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // The invoker of this function is the manager, whose identity is trusted from the client-side call
    // A more secure implementation would verify the invoker's JWT from the headers.

    const payload: SubordinatePayload = await req.json();
    if (!payload.password) {
        throw new Error("Password is required for new user.");
    }

    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true,
        user_metadata: {
            full_name: payload.name,
            phone: payload.phone
        }
    });

    if (authError) {
        throw authError;
    }
    
    const newUserId = data.user.id;

    const { error: userProfileError } = await supabaseAdmin
        .from('users')
        .insert({
            id: newUserId,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            role: payload.role,
            status: 'نشط',
            office_id: payload.office_id,
            branch_id: payload.branch_id,
            managedBy: payload.managed_by,
            registrationDate: new Date().toISOString(),
        });
        
    if (userProfileError) {
        // Cleanup failed user creation
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw new Error(`Failed to create user profile: ${userProfileError.message}`);
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
