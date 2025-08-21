// supabase/functions/create-office-manager/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user from the authorization header.
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("User not found or invalid token");
    
    // Check if the user already has an office_id. If so, they are already set up.
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('users')
        .select('office_id')
        .eq('id', user.id)
        .maybeSingle();
    
    if(profileCheckError) {
        throw new Error(`Error checking user profile: ${profileCheckError.message}`);
    }

    if(existingProfile && existingProfile.office_id) {
        return new Response(JSON.stringify({ success: true, message: "Manager already configured." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
    }

    const officeName = user.user_metadata?.office_name;
    if (!officeName) throw new Error("Office name not found in user metadata.");
    
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
    
    // 3. Insert the user profile in public.users
    const { error: userProfileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        name: user.user_metadata?.full_name,
        email: user.email,
        phone: user.user_metadata?.raw_phone_number,
        role: 'مدير المكتب',
        status: 'نشط', // The user is active because they confirmed their email
        office_id: office.id,
        trialEndsAt: trialEndsAt
      });
      
    if (userProfileError) {
        // If user profile creation fails, attempt to clean up the created office
        await supabaseAdmin.from('offices').delete().eq('id', office.id);
        throw new Error(`Failed to create user profile: ${userProfileError.message}`);
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
