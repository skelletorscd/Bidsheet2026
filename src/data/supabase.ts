// Supabase client — single shared instance for the whole app.
// Env vars are plumbed via Vite, so the publishable key ends up embedded
// in the bundle. That's fine: it's the exact use case that key is for.
// Row-Level Security in Supabase is what actually protects our data.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

/** Returns a shared Supabase client, or `null` if env vars are missing
 *  (lets the rest of the app degrade gracefully to the read-only snapshot
 *  experience while Supabase isn't configured yet). */
let _client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _client;
}

export const SUPABASE_CONFIGURED =
  !!SUPABASE_URL && !!SUPABASE_KEY;
