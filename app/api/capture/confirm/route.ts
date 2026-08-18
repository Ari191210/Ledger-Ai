// ═══════════════════════════════════════════════════════════════════════════
// M8-5 — THE CONFIRMATION ENDPOINT. THE GATE.
//
// EXECUTION_PLAN M8-5: *"Student confirmation — once, and only forwards. Done
// when: the `confirmed_at` RLS policy is the enforcement, not the UI (S.1)."*
//
//
// THE ONE DECISION THIS FILE MAKES, AND IT IS ABOUT WHICH CLIENT
//
// It uses `createStudentServerClient()` — the ANON key, carrying the caller's
// own session — for the UPDATE. It does NOT use `supabaseServer`.
//
// That is the whole file. The service role bypasses RLS, so a confirmation
// performed by it would make `020`'s policy decorative and this endpoint the
// real enforcement — which is precisely the failure mode the done-when names
// ("the RLS policy is the enforcement, not the UI"). Running as the student
// means the refusal comes from Postgres:
//
//   USING      (auth.uid() = student_id AND confirmed_at IS NULL)
//   WITH CHECK (auth.uid() = student_id AND confirmed_at IS NOT NULL)
//
// A second confirmation matches no row under `USING`. An un-confirm fails
// `WITH CHECK`. Someone else's draft matches neither. And `020`'s column grant
// means the statement below could not smuggle a `marks_lost` edit alongside the
// confirmation even if this file tried to.
//
// The endpoint therefore has no power the student does not already have. It
// exists to give the browser one round trip instead of N, and to set the
// RUN-level `confirmed_at` afterwards — which is `008`'s identically-shaped
// policy, one level up, and is what unblocks the commit phase for the
// milestones that build it (M11+).
//
//
// WHY CONFIRMING IS NOT SELF-REPORTED MASTERY (§3.1)
//
// §3.1 forbids a student marking their own mistake FIXED. This is the opposite
// direction: the student is attesting that a mistake is REAL — that the paper
// in their hand says what the reading claims it says. The student is the only
// witness to that and there is no other way to establish it. Resolution still
// belongs to the system, still needs assessment evidence, and still lives on
// `patterns.status`, whose `007` policy this pass does not touch.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import {
  confirmOccurrences,
  listDraftOccurrences,
  OCCURRENCES_TABLE,
  type OccurrenceDb,
  type Row,
} from "@/lib/occurrences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** One request may confirm at most this many drafts. A paper produces a handful;
 *  a request naming five hundred ids is not a student reviewing their work. */
const MAX_PER_REQUEST = 50;

type StudentClient = Awaited<ReturnType<typeof createStudentServerClient>>;

/**
 * The occurrence verbs, bound to the STUDENT'S client.
 *
 * `insertOccurrences` is refused here rather than implemented: a student's
 * browser proposing its own occurrences would bypass extraction's confidence
 * floor and the manual endpoint's validation in one step. Drafts are written
 * server-side, by `/api/capture/extract` and `/api/capture/manual`.
 */
function studentOccurrenceDb(supabase: StudentClient): OccurrenceDb {
  return {
    async insertOccurrences() {
      return { data: null, error: { message: "the confirm endpoint does not create occurrences" } };
    },

    async confirm(occurrenceId, studentId, at) {
      // `confirmed_at` is the ONLY column in the SET clause, and `020`'s column
      // grant means it is the only one this role could name anyway. The two
      // predicates restate the policy so a refusal returns zero rows instead of
      // a policy error; the policy is what enforces them.
      const { data, error } = await supabase
        .from(OCCURRENCES_TABLE)
        .update({ confirmed_at: at })
        .eq("id", occurrenceId)
        .eq("student_id", studentId)
        .is("confirmed_at", null)
        .select();
      return {
        data: (data as Row[]) ?? null,
        error: error ? { code: error.code, message: error.message } : null,
      };
    },

    async listDrafts(studentId) {
      const { data, error } = await supabase
        .from(OCCURRENCES_TABLE)
        .select("*")
        .eq("student_id", studentId)
        .is("confirmed_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      return {
        data: (data as Row[]) ?? null,
        error: error ? { code: error.code, message: error.message } : null,
      };
    },

    async listConfirmed(studentId) {
      // `020`'s view. The record, with the drafts already absent.
      const { data, error } = await supabase
        .from("confirmed_occurrences")
        .select("*")
        .eq("student_id", studentId)
        .order("confirmed_at", { ascending: false })
        .limit(200);
      return {
        data: (data as Row[]) ?? null,
        error: error ? { code: error.code, message: error.message } : null,
      };
    },
  };
}

async function authed(req: Request) {
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data, error } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();
  return { supabase, studentId: error ? null : data?.user?.id ?? null };
}

/** What is waiting to be looked at. The confirmation surface's only read. */
export async function GET(req: Request) {
  const { supabase, studentId } = await authed(req);
  if (!studentId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const db = studentOccurrenceDb(supabase);
  const { drafts, error } = await listDraftOccurrences(db, studentId);
  if (error) {
    return NextResponse.json({ ok: false, error: "read_failed", detail: error.message }, { status: 503 });
  }

  return NextResponse.json({ ok: true, drafts });
}

export async function POST(req: Request) {
  const { supabase, studentId } = await authed(req);
  if (!studentId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: { occurrence_ids?: unknown; run_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const ids = Array.isArray(body.occurrence_ids)
    ? body.occurrence_ids.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "nothing_to_confirm" }, { status: 400 });
  }
  if (ids.length > MAX_PER_REQUEST) {
    return NextResponse.json(
      { ok: false, error: "too_many", detail: `at most ${MAX_PER_REQUEST} at a time` },
      { status: 400 },
    );
  }

  const at = new Date().toISOString();
  const db = studentOccurrenceDb(supabase);

  const { confirmed, refused } = await confirmOccurrences(db, {
    occurrenceIds: [...new Set(ids)],
    studentId,
    at,
  });

  // ── The run-level gate (`008`), set once the student has decided ──────────
  // Same policy shape, one level up: `USING (confirmed_at IS NULL)`. A second
  // call is refused by the database and reported as zero rows, so this is safe
  // to attempt on every request and is never restamped.
  let runConfirmed = false;
  if (confirmed.length > 0 && typeof body.run_id === "string" && body.run_id) {
    const { data } = await supabase
      .from("ingestion_runs")
      .update({ confirmed_at: at })
      .eq("id", body.run_id)
      .eq("student_id", studentId)
      .is("confirmed_at", null)
      .select("id");
    runConfirmed = Array.isArray(data) && data.length > 0;
  }

  return NextResponse.json({
    ok: true,
    confirmed_at: confirmed.length > 0 ? at : null,
    confirmed,
    /** Refusals are REPORTED, never retried differently. A refusal here means
     *  the database said no — already confirmed, not yours, or not there — and
     *  the three are deliberately indistinguishable to the caller. */
    refused,
    run_confirmed: runConfirmed,
  });
}
