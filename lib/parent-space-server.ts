// lib/parent-space-server.ts — the I/O half of the parent space. Kept apart
// from lib/parent-space.ts (pure) the same way lib/parent-digest.ts (pure) is
// kept apart from app/api/send-parent-digest/route.ts (I/O).
//
// Every RPC here (`create_parent_invitation`, `accept_parent_invitation`,
// `revoke_parent_connection`, `set_parent_share_policy`,
// `get_parent_projection`) resolves identity from `auth.uid()` inside
// Postgres (029_parent_space.sql §6/§7), which means it must be called with
// the CALLER's own JWT, not the service-role key — the service role has no
// `auth.uid()` at all. `userRpcClient()` is that caller-scoped client.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";

export function userRpcClient(accessToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}

/** Extracts and verifies the bearer token on a request. Returns null if
 *  absent or invalid — every route below treats that as 401, never as
 *  "proceed unauthenticated" (the exact defect the old parentCode route had). */
export async function requireBearerUser(req: Request): Promise<{ token: string; userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user) return null;
  return { token, userId: user.id };
}
