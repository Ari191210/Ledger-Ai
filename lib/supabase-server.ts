import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// Server-only Supabase client that bypasses Row Level Security.
// NEVER import this in client components — use lib/supabase.ts there.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ═══════════════════════════════════════════════════════════════════════════
// M4-1 — the STUDENT-scoped server client.
//
// `supabaseServer` above is the service role: it is the system acting as
// itself, and it sees every row. This is the other one — the anon key, reading
// the caller's own session out of the request cookies, so every query it makes
// is RLS-scoped to `auth.uid()` exactly as the browser client's are.
//
// It exists because M4-1 moved the session onto cookie transport
// (`lib/supabase.ts`). That is what makes a server-side read of the CALLER's
// identity possible at all; before it, the server had no way to know who was
// asking. Nothing server-renders student data yet — that is M5, where
// `getStudentContext()` becomes the server-side identity — so today this has no
// call sites. It is here so that when M5 needs it, the client is already
// derived from the same cookie the middleware gate reads, rather than a second,
// divergent notion of "the session".
//
// `next/headers` is imported dynamically rather than at module scope on
// purpose: `supabaseServer` is imported by cron and API routes that must keep
// working in every runtime, and a static `next/headers` import would drag a
// request-scoped module into all of them.
// ═══════════════════════════════════════════════════════════════════════════
export async function createStudentServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
    {
      auth: { detectSessionInUrl: false },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          // A Server Component cannot write cookies; Next throws when one
          // tries. That is harmless here — the browser client owns the write
          // path, and a refresh it misses will simply happen on the next
          // client-side call — so the throw is absorbed rather than surfaced
          // as a render error. In a Route Handler or Server Action the write
          // succeeds normally.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* read-only cookie store — see above */
          }
        },
      },
    },
  );
}
