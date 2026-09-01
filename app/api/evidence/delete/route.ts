// ═══════════════════════════════════════════════════════════════════════════
// M18-4 — DELETE A CATEGORY OF EVIDENCE. Binaries destroyed; content_hash
// tombstones retained (O.5, V.10.6).
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import { deleteEvidenceBinaries } from "@/lib/evidence-deletion";

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
    // No body means "delete every evidence binary" — the widest O.5 category.
  }
  const evidenceIds = Array.isArray((body as { evidence_ids?: unknown }).evidence_ids)
    ? ((body as { evidence_ids: unknown[] }).evidence_ids.filter((v): v is string => typeof v === "string"))
    : undefined;
  const reason = typeof (body as { reason?: unknown }).reason === "string"
    ? (body as { reason: string }).reason
    : "student requested evidence deletion";

  const result = await deleteEvidenceBinaries(studentId, { evidenceIds, reason });
  return NextResponse.json(
    { ok: result.ok, deleted: result.deleted, alreadyTombstoned: result.alreadyTombstoned, failures: result.failures },
    { status: result.ok ? 200 : 207 },
  );
}
