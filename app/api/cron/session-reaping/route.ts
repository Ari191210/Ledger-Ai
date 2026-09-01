import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isInternalCaller } from "@/lib/cron-auth";
import { ingestEvents } from "@/lib/events";
import { EVENT_SCHEMA_VERSION } from "@/lib/event-contract";
import { LIVE_STATES, type SessionState } from "@/lib/study-session";
import type {
  SessionPatch,
  SessionRow,
  SessionStore,
} from "@/lib/session-resolver";
import { runReaping } from "@/lib/session-reaping";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ═══════════════════════════════════════════════════════════════════════════
// M9-1 — the reaper's I/O half.
//
// The decision is `lib/session-reaping.ts` + `lib/study-session.ts` and both
// are pure; this file is the three things they refuse to contain — a Supabase
// client, a clock, and a `SessionStore`. Same split as M7-2's
// `lib/event-ingest.ts` / `app/api/events/route.ts` and M7-7's
// `lib/event-compaction.ts` / `app/api/cron/event-compaction/route.ts`.
//
// NOT SCHEDULED. Nothing in `vercel.json` calls this — the posture
// `app/api/cron/event-compaction` documents, and for the same two reasons:
// Vercel Hobby caps cron count, and scheduling a sweep before any session
// exists would make the first real run also the first tested run of the close
// path. Wiring it to a clock is one line in `vercel.json` or one step in the
// GitHub Actions job, and it is named in M9's completion record.
//
// It is safe to call today and does nothing: `study_sessions` does not exist
// until `021` is applied, so `listLive()` returns zero rows and the sweep
// plans nothing.
//
//
// THREE THINGS THIS ROUTE MUST NOT DO — V.1.7, *"the score does not fall; no
// notification shames"*
//
//   1. IT DOES NOT IMPORT `lib/notifications.ts` OR `lib/push.ts`, and it never
//      will. M0-6 deleted the last loss-framed send in this product; *"you left
//      a session open"* is the same message wearing a new noun. Asserted by a
//      test over this file's source, not by intent.
//   2. IT DOES NOT WRITE A SCORE, and cannot: nothing here reads or writes
//      `lib/ledger-score.ts` or `lib/ledger-score-v2.ts`, and the only state it
//      can produce is CLOSED_UNVERIFIED, whose
//      `sessionScoreContribution()` arm is `{ kind: 'none' }` — an arm with no
//      sign and no magnitude. See SESSION_SCORE_CONTRACT in
//      `lib/study-session.ts`, addressed to M14.
//   3. IT DOES NOT WRITE AN AUDIT ENTRY. `016`'s own footnote: entries for
//      actions no one observed would be fabrication (Law 7), and `AUDIT_ACTIONS`
//      is a closed set mirrored by a CHECK. The reap's record is the
//      `SESSION_CLOSED_UNVERIFIED` academic event below, which is where a
//      session's history belongs (B.3).
//
// The event it emits carries FACTS ONLY — no `message`, no `encouragement`,
// nothing a model could fill (E.8.a). `client_event_id` is derived from the
// session id, so a re-run of the sweep deduplicates against D.3.6 rather than
// appending a second closure of the same session.
// ═══════════════════════════════════════════════════════════════════════════

const SWEEP_LIMIT = 2000;

/** The live predicate, derived from `LIVE_STATES` rather than written out —
 *  it is the same list `021` §4's partial unique index is defined over, and a
 *  hand-copied second list is how the SQL and the code stop agreeing. */
const LIVE = LIVE_STATES as unknown as string[];

export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowMs = Date.now();

  const store: SessionStore = {
    async findLive(studentId) {
      const { data, error } = await supabaseServer
        .from("study_sessions")
        .select("*")
        .eq("student_id", studentId)
        .in("state", LIVE)
        .maybeSingle();
      if (error || !data) return null;
      return data as unknown as SessionRow;
    },

    async findById(sessionId) {
      const { data, error } = await supabaseServer
        .from("study_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (error || !data) return null;
      return data as unknown as SessionRow;
    },

    async insertOpen(draft) {
      const { data, error } = await supabaseServer
        .from("study_sessions")
        .insert({ ...draft, state: "ACTIVE" satisfies SessionState })
        .select("*")
        .maybeSingle();
      // 23505 is the partial unique index refusing a second live session —
      // the ordinary path (V.1.3), not a fault. Anything else is a real fault
      // and is also reported as a conflict, because the caller's recovery
      // (re-read, attach to whoever is live) is correct either way and is the
      // only recovery this adapter can offer without inventing a session.
      if (error || !data) return { conflict: true };
      return { row: data as unknown as SessionRow };
    },

    // E.7.1 verbatim: a CONDITIONAL update. `.eq('state', from)` is the
    // `WHERE state = 'ACTIVE'` clause, and zero matched rows return `null`
    // rather than raising — *"a second tab's identical request affects zero
    // rows and receives the current state instead of an error."*
    //
    // `expect.last_activity_at` widens that WHERE clause for the sweep, and
    // only for the sweep: it is what makes a student who answers a question
    // between this route's read and its write win the race. Without it the
    // student's own write leaves the session ACTIVE, the state guard still
    // matches, and a live session is put to sleep under them.
    async transition(sessionId, from, patch: SessionPatch, expect) {
      let q = supabaseServer
        .from("study_sessions")
        .update(patch)
        .eq("session_id", sessionId)
        .eq("state", from);
      if (expect?.last_activity_at !== undefined) {
        q = q.eq("last_activity_at", expect.last_activity_at);
      }
      const { data, error } = await q.select("*").maybeSingle();
      if (error || !data) return null;
      return data as unknown as SessionRow;
    },
  };

  try {
    const { data, error } = await supabaseServer
      .from("study_sessions")
      .select("*")
      .in("state", LIVE)
      .order("last_activity_at", { ascending: true })
      .limit(SWEEP_LIMIT);

    // No table yet (021 unapplied) is not a failure — it is the honest state
    // of a substrate that has never met a Postgres. Report it and change
    // nothing, the same way `lib/events.ts` answers `unavailable`.
    if (error) {
      return NextResponse.json({
        swept: 0,
        planned: 0,
        idled: 0,
        reaped: 0,
        unchanged: 0,
        events_emitted: 0,
        store: "unavailable",
        detail: error.message,
      });
    }

    const live = (data ?? []) as unknown as SessionRow[];
    const report = await runReaping(store, live, nowMs);

    // One event per session the sweep actually closed. Facts only.
    let emitted = 0;
    for (const closed of report.closed) {
      const result = await ingestEvents(closed.student_id, {
        events: [
          {
            client_event_id: `session-reap:${closed.session_id}`,
            schema_version: EVENT_SCHEMA_VERSION,
            occurred_at: new Date(nowMs).toISOString(),
            event_type: "SESSION_CLOSED_UNVERIFIED",
            surface: "cron",
            // D.2.a: `SESSION_CLOSED_UNVERIFIED` may only be emitted with
            // `source = 'system'`. The ingest layer refuses any other, which
            // is the third refusal protecting a state no student may forge.
            source: "system",
            payload: {
              reason: "reaped",
              quiet_ms: closed.quiet_ms,
              reap_ms: report.reap_ms,
            },
          },
        ],
      });
      emitted += result.appended;
    }

    return NextResponse.json({
      swept: live.length,
      planned: report.planned,
      idled: report.idled,
      reaped: report.reaped,
      unchanged: report.unchanged,
      events_emitted: emitted,
      idle_ms: report.idle_ms,
      reap_ms: report.reap_ms,
      store: "live",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "session reaping failed" },
      { status: 500 },
    );
  }
}
