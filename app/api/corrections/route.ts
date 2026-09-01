// ═══════════════════════════════════════════════════════════════════════════
// M18-2 — THE CORRECTION/DISPUTE ENDPOINT. O.3's one entry point, over HTTP.
//
// Same authentication discipline as `app/api/events/route.ts` (M7-2): the
// bearer token or cookie session decides `studentId`; the body's opinion of
// who is asking is never consulted (D.1.a).
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import { submitCorrection } from "@/lib/correction-server";
import { CLAIM_KINDS, CORRECTION_TARGET_TYPES } from "@/lib/correction";

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const targetType = b.target_type;
  const targetId = b.target_id;
  const claim = b.claim;
  const reason = b.reason;
  const claimKind = b.claim_kind;

  if (!(CORRECTION_TARGET_TYPES as readonly string[]).includes(targetType as string)) {
    return NextResponse.json({ ok: false, error: "unknown_target_type" }, { status: 422 });
  }
  if (!(CLAIM_KINDS as readonly string[]).includes(claimKind as string)) {
    return NextResponse.json({ ok: false, error: "unknown_claim_kind" }, { status: 422 });
  }
  if (typeof targetId !== "string" || typeof claim !== "string" || typeof reason !== "string") {
    return NextResponse.json({ ok: false, error: "missing_field" }, { status: 422 });
  }

  const result = await submitCorrection(studentId, {
    target_type: targetType as (typeof CORRECTION_TARGET_TYPES)[number],
    target_id: targetId,
    claim,
    reason,
    claim_kind: claimKind as (typeof CLAIM_KINDS)[number],
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.refusal?.code, detail: result.refusal?.detail }, { status: 422 });
  }

  return NextResponse.json({ ok: true, correction: result.correction });
}
