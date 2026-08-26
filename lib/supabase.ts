import { createClient } from "@supabase/supabase-js";

/** Treat an empty or whitespace-only variable as absent.
 *
 *  `??` only falls back on undefined and null, so `NEXT_PUBLIC_SUPABASE_URL=`
 *  in a .env file is a *defined empty string* that sails past the fallback and
 *  reaches createClient, which throws "supabaseUrl is required" at module
 *  evaluation — taking down every route that imports the client, including the
 *  root layout. A half-filled env file is the normal state of a project being
 *  set up, so it must degrade to the placeholder rather than crash. */
function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() ? v : fallback;
}

export const supabase = createClient(
  env("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co"),
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY", "placeholder"),
  { auth: { flowType: "pkce", detectSessionInUrl: false } }
);
