import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS. Server-only — never import into a
// Client Component or expose to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
