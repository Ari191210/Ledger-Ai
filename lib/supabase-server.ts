import { createClient } from "@supabase/supabase-js";

/** Same empty-string guard as lib/supabase.ts — see the note there. An
 *  assigned-but-blank variable is defined, so `??` does not catch it and
 *  createClient throws at module evaluation, taking down every API route
 *  that imports this. */
function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() ? v : fallback;
}

// Server-only Supabase client that bypasses Row Level Security.
// NEVER import this in client components — use lib/supabase.ts there.
export const supabaseServer = createClient(
  env("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co"),
  env("SUPABASE_SERVICE_ROLE_KEY", "placeholder"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);
