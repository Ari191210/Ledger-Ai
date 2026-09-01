// ═══════════════════════════════════════════════════════════════════════════
// M13-3 — THE RECORD ENDPOINT. READ-ONLY, WINDOWED, AND PAGED.
//
// EXECUTION_PLAN M13-3: *"`/record`: pattern list and timeline … Done when:
// **≥6 months renders; parity retained.**"*
//
// This is where the surface meets the record. It reads five relations —
// `confirmed_occurrences` (`020`), `patterns` (`007`), `evidence` (`007`),
// `study_sessions` (`021`) and `score_history` (`005`/`010`) — hands the rows
// to `lib/record.ts`, and returns what that pure module derived.
//
//
// THREE DECISIONS, ALL ABOUT WHAT THIS FILE CANNOT DO
//
// 1 · IT USES THE STUDENT'S OWN CLIENT, never `supabaseServer`. `/api/diagnosis`
//     reasons about this at length and the reasoning is unchanged: the service
//     role bypasses RLS, so a record assembled by it would be one policy
//     mistake away from showing one student another's papers.
//
// 2 · IT EXPORTS `GET` AND NOTHING ELSE. No POST, no PATCH, no DELETE. `RecordDb`
//     declares five READ methods and no write method, so there is no verb here
//     that could destroy a row even if a later edit wanted one.
//
// 3 · IT NEVER ASKS FOR "ALL ROWS". Every query carries the window on the
//     column that heads an existing index, and every query carries `.range()`.
//     `lib/record.ts`'s `RECORD_SOURCES` names the index each shape is a range
//     scan on:
//
//       confirmed_occurrences  (student_id, confirmed_at DESC) WHERE confirmed
//       evidence               (student_id, captured_at  DESC)
//       study_sessions         (student_id, opened_at    DESC)
//       score_history          (user_id,    captured_on  DESC)
//       patterns               (student_id, status)  — unwindowed BY DESIGN:
//                              a pattern is a standing inference with no
//                              timestamp of its own, and its weight in the
//                              window is counted from the occurrences that
//                              point at it. It is bounded by the same page
//                              ceiling as every other read.
//
//     THAT IS THE ≥6-MONTH DONE-WHEN, in the only place it can actually be
//     paid: six months of record costs a bounded number of bounded index range
//     scans, and six YEARS costs the same per-month shape with more months in
//     the answer — never a sort of everything the student has ever recorded.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import {
  DEFAULT_WINDOW_MONTHS,
  RECORD_SOURCES,
  buildWindow,
  clampMonths,
  loadRecord,
  type PageRequest,
  type RecordDb,
  type RecordWindow,
  type Row,
} from "@/lib/record";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PostgREST's inclusive, zero-based row range. */
const span = (p: PageRequest): [number, number] => [
  p.page * p.pageSize,
  p.page * p.pageSize + p.pageSize - 1,
];

type StudentClient = Awaited<ReturnType<typeof createStudentServerClient>>;

/** The five reads, bound to the student's client. No write verb exists. */
function studentRecordDb(supabase: StudentClient): RecordDb {
  const result = (data: unknown, error: { code?: string | null; message: string } | null) => ({
    data: (data as Row[]) ?? null,
    error: error ? { code: error.code, message: error.message } : null,
  });

  /** One windowed, ordered, ranged read. Every source uses it, so no source can
   *  quietly become unbounded without deleting a shared helper. */
  const windowed = async (
    source: (typeof RECORD_SOURCES)[keyof typeof RECORD_SOURCES],
    studentId: string,
    w: RecordWindow,
    p: PageRequest,
    from: string,
    to: string,
  ) => {
    const [lo, hi] = span(p);
    const { data, error } = await supabase
      .from(source.relation)
      .select("*")
      .eq(source.ownerColumn, studentId)
      .gte(source.timeColumn, from)
      .lt(source.timeColumn, to)
      .order(source.timeColumn, { ascending: false })
      .range(lo, hi);
    return result(data, error);
  };

  return {
    // `020`'s view, never the table: a reader that forgets
    // `WHERE confirmed_at IS NOT NULL` counts proposals as facts.
    listConfirmedOccurrences: (studentId, w, p) =>
      windowed(RECORD_SOURCES.occurrences, studentId, w, p, w.fromISO, w.toISO),

    // Unwindowed by design — see the header. Bounded by `.range()` all the same.
    async listPatterns(studentId, p) {
      const [lo, hi] = span(p);
      const { data, error } = await supabase
        .from(RECORD_SOURCES.patterns.relation)
        .select("*")
        .eq(RECORD_SOURCES.patterns.ownerColumn, studentId)
        .order("id", { ascending: true })
        .range(lo, hi);
      return result(data, error);
    },

    listEvidence: (studentId, w, p) =>
      windowed(RECORD_SOURCES.evidence, studentId, w, p, w.fromISO, w.toISO),

    listSessions: (studentId, w, p) =>
      windowed(RECORD_SOURCES.sessions, studentId, w, p, w.fromISO, w.toISO),

    // `captured_on` is a DATE, so the window is passed as dates. Comparing a
    // DATE to a timestamptz literal would make the boundary depend on the
    // server's timezone, which is the D.1.b class of bug stated rather than
    // risked.
    listCloses: (studentId, w, p) =>
      windowed(
        RECORD_SOURCES.closes,
        studentId,
        w,
        p,
        w.fromISO.slice(0, 10),
        w.toISO.slice(0, 10),
      ),
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

  const asked = Number(new URL(req.url).searchParams.get("months") ?? DEFAULT_WINDOW_MONTHS);
  const window = buildWindow(new Date().toISOString(), clampMonths(asked));

  const result = await loadRecord(studentRecordDb(supabase), studentId, window);
  if (!result.ok) {
    // An honest failure, not an empty record (Law 7).
    return NextResponse.json(
      { ok: false, error: "read_failed", detail: result.error.message },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, record: result.record });
}
