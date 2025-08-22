// supabase/functions/create-office-manager/index.ts

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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: NewManagerPayload = await req.json();

    if (!payload.password) throw new Error("كلمة المرور مطلوبة.");
    if (!payload.email || !payload.name || !payload.officeName || !payload.phone) {
        throw new Error("جميع الحقول مطلوبة.");
    }
    
    // Step 1: Create the user in auth.users
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: true, // User must confirm their email
        user_metadata: {
            full_name: payload.name,
            office_name: payload.officeName,
            raw_phone_number: payload.phone,
        }
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
        throw new Error(`Auth Error: ${signUpError.message}`);
    }
    if (!user) throw new Error("فشل إنشاء المستخدم في نظام المصادقة.");

    // Step 2: Create the office
    const { data: office, error: officeError } = await supabaseAdmin
        .from('offices')
        .insert({ name: payload.officeName })
        .select()
        .single();
    
    if (officeError) throw new Error(`DB Error (Office): ${officeError.message}`);
    if (!office) throw new Error("فشل إنشاء سجل المكتب.");
    
    // Step 3: Create the user profile in public.users
    const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
            id: user.id,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            role: 'مدير المكتب',
            office_id: office.id,
            status: 'معلق'
        });

    if (profileError) {
        // Attempt to clean up if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        await supabaseAdmin.from('offices').delete().eq('id', office.id);
        throw new Error(`DB Error (User Profile): ${profileError.message}`);
    }

    // Step 4: Link the manager_id back to the office
    const { error: updateOfficeError } = await supabaseAdmin
        .from('offices')
        .update({ manager_id: user.id })
        .eq('id', office.id);

    if (updateOfficeError) {
        // This is a critical failure, but the user and office exist. Manual correction might be needed.
        console.error(`CRITICAL: Failed to link manager ${user.id} to office ${office.id}. Error: ${updateOfficeError.message}`);
    }

    return new Response(JSON.stringify({ success: true, userId: user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
