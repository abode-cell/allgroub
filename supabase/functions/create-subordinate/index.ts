// supabase/functions/create-subordinate/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
      user_metadata: {
        name: payload.name,
        phone: payload.phone,
        role: payload.role,
        managedBy: manager.id,
        submittedBy: manager.id,
      },
    });

    if (authError) throw new Error(`Auth Error: ${authError.message}`);
    if (!newAuthUser) throw new Error("Failed to create auth user.");

    return new Response(JSON.stringify({ success: true, userId: newAuthUser.id }), {
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
