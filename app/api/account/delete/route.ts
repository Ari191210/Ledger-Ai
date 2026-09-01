// ═══════════════════════════════════════════════════════════════════════════
// M18-5 — ACCOUNT DELETION ENDPOINT. O.5's third scope, over HTTP.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import { deleteAccount } from "@/lib/account-deletion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const studentId = userData?.user?.id;
  if (authError || !studentId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // A body is optional here — confirmation UI may send only the header.
  }
  const reason = typeof (body as { reason?: unknown }).reason === "string"
    ? (body as { reason: string }).reason
    : "student requested account deletion";

  const result = await deleteAccount(studentId, reason);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.refusal?.code, detail: result.refusal?.detail }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    parentConnectionsRevoked: result.parentConnectionsRevoked,
    evidenceObjectsRemoved: result.evidenceObjectsRemoved,
  });
}
