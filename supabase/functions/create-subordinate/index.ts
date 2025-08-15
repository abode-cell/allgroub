// supabase/functions/create-subordinate/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface SubordinatePayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'موظف' | 'مساعد مدير المكتب';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let newAuthUserId: string | null = null;
  const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: manager } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!manager) throw new Error("Manager not found");
    if (manager.user_metadata?.role !== 'مدير المكتب') throw new Error("Only office managers can create subordinates.");
    
    // TODO: Check if the manager has exceeded their employee/assistant limit.

    const payload: SubordinatePayload = await req.json();

    const { data: { user: newAuthUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password || "default-password-123",
      email_confirm: true,
      phone: payload.phone,
      user_metadata: {
        name: payload.name,
        phone: payload.phone,
        role: payload.role,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
      }
      throw new Error(`Auth Error: ${authError.message}`);
    }
    if (!newAuthUser) throw new Error("Failed to create auth user.");

    newAuthUserId = newAuthUser.id;

     // Now insert into the public.users table
    const { error: publicUserError } = await supabaseAdmin
      .from("users")
      .insert({
        id: newAuthUser.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        managedBy: manager.id,
        submittedBy: manager.id,
        status: "نشط",
      });
    
    if (publicUserError) throw new Error(`Public users table insert error: ${publicUserError.message}`);


    return new Response(JSON.stringify({ success: true, userId: newAuthUser.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
     if (newAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(newAuthUserId);
    }
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
