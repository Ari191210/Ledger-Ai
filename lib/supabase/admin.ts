// Importing this from a Client Component is a build error, not a code
// review note. The comment below said "never import into a Client
// Component" and nothing enforced it, so one careless import would have
// inlined the service role key into a browser bundle. The failure mode is
// total, and the guard is one line.
import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS. Server-only, never import into a
// Client Component or expose to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
