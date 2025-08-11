import { createBrowserClient as originalCreateBrowserClient } from '@supabase/ssr'

// Create a single supabase client for the browser
export const createBrowserClient = (url: string, key: string) => originalCreateBrowserClient(
  url,
  key
);
