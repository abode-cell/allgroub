import { createClient as originalCreateClient } from '@supabase/supabase-js'

// Create a single supabase client for the browser
export const createBrowserClient = (url: string, key: string) => originalCreateClient(
  url,
  key
);
