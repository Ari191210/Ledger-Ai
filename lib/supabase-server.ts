import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client that bypasses Row Level Security.
// NEVER import this in client components — use lib/supabase.ts there.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);
