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

    const { data: systemAdmins, error: adminError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'مدير النظام');
    
    if (adminError || !systemAdmins || systemAdmins.length === 0) {
        console.error("System admin not found", adminError);
        throw new Error("System admin account not found. Cannot assign manager.");
    }
    const systemAdmin = systemAdmins[0];

    const { data: { user: newAuthUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: false, // User will confirm via the link
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

    // This is the correct way to send a confirmation link when creating a user as an admin.
    const { error: sendError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: payload.email,
        options: {
            redirectTo: `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/auth-confirmed`
        }
    });


    if (sendError) {
        console.error("Error sending confirmation email:", sendError);
        // Don't throw here, as the user is already created. Log the error.
        // We still return a success response to the client because the account was made.
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
