
// supabase/functions/create-investor/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// This function is now deprecated and its logic has been moved to the frontend
// in data-context.tsx for better reliability in a Vercel environment.
// The trigger 'handle_new_user' in the database will now manage profile creation.

serve(async (req) => {
  // Respond to OPTIONS requests for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Return a message indicating that this function is deprecated.
    const responseBody = {
      success: false,
      message: "This Edge Function is deprecated. User creation is now handled by the client-side Supabase SDK and a database trigger.",
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 410, // 410 Gone
    });

  } catch (error) {
    // Generic error handler
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
