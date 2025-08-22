
// This function has been deprecated and is no longer needed.
// The logic has been moved to a database trigger for better reliability.
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

    