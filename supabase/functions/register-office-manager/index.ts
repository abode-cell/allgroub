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
        .eq('role', 'مدير النظام')
        .limit(1);
    
    if (adminError || !systemAdmins || systemAdmins.length === 0) {
        console.error("System admin not found", adminError);
        throw new Error("System admin account not found. Cannot assign manager.");
    }
    const systemAdmin = systemAdmins[0];

    // Create the user in the auth schema
    const { data: { user: newAuthUser }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: false, 
      user_metadata: {
        name: payload.name,
        phone: payload.phone,
        officeName: payload.officeName,
        role: "مدير المكتب",
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

    // Manually insert into the public.users table
    const { error: publicUserError } = await supabaseAdmin
      .from("users")
      .insert({
        id: newAuthUser.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        officeName: payload.officeName,
        role: "مدير المكتب",
        managedBy: systemAdmin.id,
        status: "معلق", // Managers start as pending
      });

    if (publicUserError) {
        // If this fails, we should ideally delete the auth user to avoid orphans.
        await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
        throw new Error(`Failed to create user in public table: ${publicUserError.message}`);
    }
    

    // Generate a confirmation link (this is for email verification)
    const { error: sendError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: payload.email,
        options: {
            redirectTo: `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/auth-confirmed`
        }
    });

    if (sendError) {
        console.error("Error sending confirmation email:", sendError);
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
