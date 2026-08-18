// ═══════════════════════════════════════════════════════════════════════════
// M13-1 — THE DIAGNOSIS ENDPOINT. READ-ONLY, AND STRUCTURALLY SO.
//
// EXECUTION_PLAN M13-1: *"Done when: every claim on the surface reaches a
// record."* This route is where the surface meets the record: it reads `020`'s
// `confirmed_occurrences` view and `007`'s `patterns`, hands both to
// `lib/diagnosis.ts`, and returns what that pure module derived.
//
//
// TWO DECISIONS, BOTH ABOUT WHAT THIS FILE CANNOT DO
//
// 1 · IT USES THE STUDENT'S OWN CLIENT, never `supabaseServer`. The service
//     role bypasses RLS, so a diagnosis assembled by it would be one policy
//     mistake away from showing one student another's marked paper.
//     `occurrences_select_own` and `patterns_select_own` (`007:338,349`) are
//     the enforcement, exactly as `/api/capture/confirm` reasons about `020`.
//
// 2 · IT EXPORTS `GET` AND NOTHING ELSE. No POST, no PATCH, no DELETE.
//     Architecture P.4 records what the tool this surface replaces used to be:
//     *"`post-exam` — reads `ledger-mistakes`; `:140` **deletes it** …
//     effective level: **negative** … the only tool that can destroy the
//     record."* Its target is *"**3** (it becomes `/diagnosis`, read + status
//     transitions only, **with deletion removed**)."*
//
//     Level 3 is reached by reading the durable record instead of a browser
//     key. Deletion is removed by there being no verb here that could delete —
//     `DiagnosisDb` has two read methods and no write method, and the database
//     agrees: `007` declares no DELETE policy on `occurrences` or `patterns`,
//     so `authenticated` could not destroy a row through this route even if the
//     route asked it to. Two mechanisms, neither of them a comment.
//
//     Status transitions (`acknowledged`, `practising`) are the other half of
//     Level 3 and are NOT built here: `patterns_update_own` already admits
//     them, but a transition is a write and M13-1's done-when is about claims
//     reaching records. It is recorded in EXECUTION_PLAN as M13's remaining
//     work rather than smuggled into a read endpoint.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import {
  DIAGNOSIS_OCCURRENCE_SOURCE,
  DIAGNOSIS_PATTERN_SOURCE,
  loadDiagnosis,
  type DiagnosisDb,
  type Row,
} from "@/lib/diagnosis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A cap, not a page. A student with more confirmed occurrences than this has a
 *  record `/record` paginates (M13-3); the diagnosis reads the most recent
 *  window and says so rather than silently truncating a total. */
const MAX_OCCURRENCES = 1000;
const MAX_PATTERNS = 500;

type StudentClient = Awaited<ReturnType<typeof createStudentServerClient>>;

/** The two reads, bound to the student's client. No write verb exists. */
function studentDiagnosisDb(supabase: StudentClient): DiagnosisDb {
  return {
    async listConfirmedOccurrences(studentId) {
      // `020`'s view, never the table: a reader that forgets
      // `WHERE confirmed_at IS NOT NULL` counts proposals as facts.
      const { data, error } = await supabase
        .from(DIAGNOSIS_OCCURRENCE_SOURCE)
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(MAX_OCCURRENCES);
      return {
        data: (data as Row[]) ?? null,
        error: error ? { code: error.code, message: error.message } : null,
      };
    },

    async listPatterns(studentId) {
      const { data, error } = await supabase
        .from(DIAGNOSIS_PATTERN_SOURCE)
        .select("*")
        .eq("student_id", studentId)
        .limit(MAX_PATTERNS);
      return {
        data: (data as Row[]) ?? null,
        error: error ? { code: error.code, message: error.message } : null,
      };
    },
  };
}

export async function GET(req: Request) {
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data, error } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const studentId = error ? null : data?.user?.id ?? null;
  if (!studentId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const result = await loadDiagnosis(studentDiagnosisDb(supabase), studentId);
  if (!result.ok) {
    // An honest failure, not an empty diagnosis. A read that did not happen is
    // not the same fact as a record with nothing in it (Law 7).
    return NextResponse.json(
      { ok: false, error: "read_failed", detail: result.error.message },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, diagnosis: result.diagnosis });
}
