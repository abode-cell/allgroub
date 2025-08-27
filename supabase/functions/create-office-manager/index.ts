// supabase/functions/create-office-manager/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    
    // Step 1: Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        email_confirm: false, // User needs to confirm their email
    });

    if (authError) {
      throw authError;
    }
    
    const newUserId = authData.user.id;
    let newOfficeId = '';

    try {
        // Step 2: Create the office
        const { data: officeData, error: officeError } = await supabaseAdmin
            .from('offices')
            .insert({ name: payload.officeName, manager_id: newUserId })
            .select()
            .single();
        
        if (officeError) {
            throw new Error(`Failed to create office: ${officeError.message}`);
        }
        newOfficeId = officeData.id;

        // Step 3: Create the user profile in public.users
        const { error: userProfileError } = await supabaseAdmin
            .from('users')
            .insert({
                id: newUserId,
                name: payload.name,
                email: payload.email,
                phone: payload.phone,
                role: 'مدير المكتب',
                status: 'معلق',
                office_id: newOfficeId,
                registrationDate: new Date().toISOString(),
            });
        
        if (userProfileError) {
            // Clean up office if profile creation fails
            await supabaseAdmin.from('offices').delete().eq('id', newOfficeId);
            throw new Error(`Failed to create user profile: ${userProfileError.message}`);
        }
    } catch (dbError) {
        // If any DB operation fails, we must delete the auth user to keep things clean
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw dbError; // re-throw the error to be caught by the outer catch block
    }


    return new Response(JSON.stringify({ success: true, message: "تم إنشاء الحساب بنجاح. يرجى مراجعة بريدك الإلكتروني للتفعيل." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Create Office Manager Error:", error);
    let errorMessage = error.message;
    if (error.message.includes('User already registered')) {
        errorMessage = "البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.";
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
