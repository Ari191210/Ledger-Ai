import { NextResponse } from "next/server";
import { requireBearerUser, userRpcClient } from "@/lib/parent-space-server";
import { hashInvitationToken } from "@/lib/parent-space";

export const dynamic = "force-dynamic";

// The PARENT accepts, authenticated as themselves. This is the step that
// turns "possession of a link" into "an authenticated identity connected to
// a student" — the property the retired `/parent/[code]` route never had.
export async function POST(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let token: string;
  try {
    const body = await req.json();
    token = String(body.token ?? "");
    if (!token) throw new Error("missing");
  } catch {
    return NextResponse.json({ error: "Expected { token }." }, { status: 400 });
  }

  const client = userRpcClient(auth.token);
  const { data, error } = await client.rpc("accept_parent_invitation", {
    p_token_hash: hashInvitationToken(token),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, connection: data });
}
