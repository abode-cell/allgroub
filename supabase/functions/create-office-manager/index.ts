// This function has been deprecated and its logic is now handled by a database trigger.
// It is no longer needed and has been removed from the project configuration.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (_req) => {
  return new Response(
    JSON.stringify({ message: "This function is deprecated and no longer in use." }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 410, // Gone
    }
  );
});
