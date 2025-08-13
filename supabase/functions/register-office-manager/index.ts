// supabase/functions/register-office-manager/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

interface ManagerPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
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
        throw new Error("Password is required");
    }

    const { data: { user: systemAdmin }, error: adminError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'مدير النظام')
        .limit(1)
        .single();
    
    if (adminError || !systemAdmin) {
        console.error("System admin not found", adminError);
        throw new Error("System admin account not found. Cannot assign manager.");
    }

    const { data: { user: newAuthUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: false, // User must confirm their email
      user_metadata: {
        name: payload.name,
        phone: payload.phone,
        officeName: payload.officeName,
        role: "مدير المكتب",
        managedBy: systemAdmin.id
      },
    });

    if (authError) {
        if (authError.message.includes("Email rate limit exceeded")) {
             throw new Error("تم تجاوز حد إرسال رسائل البريد الإلكتروني. يرجى المحاولة مرة أخرى لاحقًا.");
        }
        if (authError.message.includes("User already registered")) {
            throw new Error("البريد الإلكتروني مسجل بالفعل.");
        }
        throw new Error(`Auth Error: ${authError.message}`);
    }
    if (!newAuthUser) throw new Error("Failed to create auth user.");

    // The user will be created in the public.users table by a trigger.
    // We don't need to insert it manually here.
    // We just need to send the confirmation email.
    
    const { error: sendError } = await supabaseAdmin.auth.resetPasswordForEmail(payload.email, {
        redirectTo: `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/auth-confirmed`
    });

    if (sendError) {
        console.error("Error sending confirmation email:", sendError);
        // Don't throw, as the user is already created. They can request another confirmation later.
    }


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
