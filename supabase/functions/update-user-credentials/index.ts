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
    branch_id?: string | null;
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
    
    const { data: invokerProfile } = await supabaseAdmin.from('users').select('role, office_id').eq('id', invoker.id).single();
    if (!invokerProfile) throw new Error("Could not find invoker profile.");


    // 3. Authorization Check: Ensure only authorized users can perform this action
    const { data: userToUpdate, error: userFetchError } = await supabaseAdmin
        .from('users')
        .select('role, office_id')
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
        // Office manager can update their subordinates (users in the same office)
        if (userToUpdate.office_id === invokerProfile.office_id) {
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

    // 5. Update public.users and public.offices tables
    const userDbUpdates: any = {};
    if (updates.email) userDbUpdates.email = updates.email;
    if (updates.branch_id !== undefined) userDbUpdates.branch_id = updates.branch_id;
    
    if (Object.keys(userDbUpdates).length > 0) {
        const { error: dbError } = await supabaseAdmin
            .from("users")
            .update(userDbUpdates)
            .eq("id", userId);
        if (dbError) throw new Error(`User DB update error: ${dbError.message}`);
    }

    if (updates.officeName && userToUpdate.role === 'مدير المكتب') {
      const { data: office, error: officeFetchError } = await supabaseAdmin.from('offices').select('id').eq('manager_id', userId).single();
      if (officeFetchError) throw new Error(`Could not find office for manager: ${officeFetchError.message}`);
      
      const { error: officeUpdateError } = await supabaseAdmin
        .from('offices')
        .update({ name: updates.officeName })
        .eq('id', office.id);
      if (officeUpdateError) throw new Error(`Office name update error: ${officeUpdateError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: