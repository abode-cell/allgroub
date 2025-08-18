// supabase/functions/update-user-credentials/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface UpdatePayload {
  userId: string;
  updates: {
    email?: string;
    password?: string;
    officeName?: string;
  };
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

    // 1. Get the invoker's identity
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: invoker } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!invoker) throw new Error("User not found or invalid token");

    // 2. Get the payload
    const { userId, updates }: UpdatePayload = await req.json();
    
    const { data: invokerProfile } = await supabaseAdmin.from('users').select('role').eq('id', invoker.id).single();
    if (!invokerProfile) throw new Error("Could not find invoker profile.");


    // 3. Authorization Check: Ensure only authorized users can perform this action
    const { data: userToUpdate, error: userFetchError } = await supabaseAdmin
        .from('users')
        .select('role, managedBy')
        .eq('id', userId)
        .single();
    
    if(userFetchError) throw new Error(`Could not fetch user to update: ${userFetchError.message}`);

    const isSystemAdmin = invokerProfile.role === 'مدير النظام';
    const isOfficeManager = invokerProfile.role === 'مدير المكتب';
    
    let isAuthorized = false;
    if (isSystemAdmin) {
        // System admin can update anyone except another system admin
        if(userToUpdate.role !== 'مدير النظام') {
            isAuthorized = true;
        }
    } else if (isOfficeManager) {
        // Office manager can update their subordinates
        if (userToUpdate.managedBy === invoker.id) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        throw new Error("Not authorized to update this user's credentials.");
    }

    // 4. Update Auth User
    const authUpdates: any = {};
    if (updates.email) authUpdates.email = updates.email;
    if (updates.password) authUpdates.password = updates.password;

    if (Object.keys(authUpdates).length > 0) {
        const { data: { user: updatedAuthUser }, error: adminAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            authUpdates
        );
        if (adminAuthError) {
          if (adminAuthError.message.includes('already registered')) {
            throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
          }
          throw new Error(`Auth update error: ${adminAuthError.message}`);
        }
    }

    // 5. Update public.users table 
    const dbUpdates: any = {};
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.officeName && userToUpdate.role === 'مدير المكتب') {
      dbUpdates.office_name = updates.officeName;
    }

    if (Object.keys(dbUpdates).length > 0) {
        const { error: dbError } = await supabaseAdmin
            .from("users")
            .update(dbUpdates)
            .eq("id", userId);
        if (dbError) throw new Error(`DB update error: ${dbError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
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
