import { NextResponse } from "next/server";
import { requireBearerUser, userRpcClient } from "@/lib/parent-space-server";

export const dynamic = "force-dynamic";

// Immediate revocation (V.8.6) — student-initiated only. The next call to
// get_parent_projection() for this connection fails at the connection-state
// check inside 029_parent_space.sql §7; there is no cache or TTL sitting
// between this write and that check.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await params;
  const client = userRpcClient(auth.token);
  const { data, error } = await client.rpc("revoke_parent_connection", { p_connection_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, connection: data });
}
