import { NextResponse } from "next/server";
import { requireBearerUser, userRpcClient } from "@/lib/parent-space-server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// The student's own pending/past invitations. RLS (parent_invitations_select_own)
// already scopes this to the caller, but the query is additionally filtered
// by student_id defensively — belt and suspenders, not a substitute for RLS.
export async function GET(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("parent_invitations")
    .select("invitation_id, email, status, created_at, expires_at, accepted_at")
    .eq("student_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitations: data ?? [] });
}

// Cancel a pending invitation.
export async function DELETE(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let invitationId: string;
  try {
    const body = await req.json();
    invitationId = String(body.invitationId ?? "");
    if (!invitationId) throw new Error("missing");
  } catch {
    return NextResponse.json({ error: "Expected { invitationId }." }, { status: 400 });
  }

  const client = userRpcClient(auth.token);
  const { error } = await client.rpc("cancel_parent_invitation", { p_invitation_id: invitationId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
