// supabase/functions/create-office-manager/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface OfficeManagerPayload {
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

    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("User not found or invalid token");
    
    const { officeName }: OfficeManagerPayload = await req.json();

    // 1. Create a new office
    const { data: office, error: officeError } = await supabaseAdmin
      .from('offices')
      .insert({ name: officeName, manager_id: user.id })
      .select()
      .single();

    if (officeError) throw new Error(`Failed to create office: ${officeError.message}`);

    // 2. Fetch the default trial period days
    const { data: config, error: configError } = await supabaseAdmin
        .from('app_config')
        .select('value')
        .eq('key', 'defaultTrialPeriodDays')
        .single();
    if (configError) throw new Error(`Could not fetch trial period config: ${configError.message}`);
    const trialPeriodDays = (config.value as any)?.value ?? 14;
    const trialEndsAt = new Date(Date.now() + trialPeriodDays * 24 * 60 * 60 * 1000).toISOString();

    // 3. Update the user profile with office_id and trial period
    // The user record in public.users is already created by the initial trigger
    const { error: userProfileError } = await supabaseAdmin
      .from('users')
      .update({
        office_id: office.id,
        trialEndsAt: trialEndsAt
      })
      .eq('id', user.id);
      
    if (userProfileError) {
        // If user profile update fails, attempt to clean up the created office
        await supabaseAdmin.from('offices').delete().eq('id', office.id);
        throw new Error(`Failed to update user profile with office: ${userProfileError.message}`);
    }

    return new Response(JSON.stringify({ success: true, officeId: office.id }), {
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
