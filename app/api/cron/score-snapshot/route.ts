// ═══════════════════════════════════════════════════════════════════════════
// THE DAILY CLOSE — M14-6. THE CUTOVER. THE NEW ENGINE IS NOW THE CLOSE OF
// RECORD, AND THE OLD ONE IS THE SHADOW.
//
// EXECUTION_PLAN M14-6: *"Cut over via the existing shadow-mode cron; **stop
// discarding the candidate result.** KEEP the mechanism. Done when: T3
// mitigation — an explicit restatement, never a silent recompute (O.4.3)."*
//
//
// WHAT THIS FILE USED TO DO, AND WHAT CHANGED
//
// J.9's own words: *"v2 is computed by `app/api/cron/score-snapshot/route.ts`,
// logged as a delta, and **discarded** — the row written to `score_history` is
// v1."* That was correct for shadow mode and is the exact behaviour M14-6
// exists to end.
//
// THE DIRECTION IS NOW REVERSED, and the mechanism is untouched:
//
//   PERSISTED   `lib/score-engine.ts` — four dimensions, `insufficient
//               evidence` as a state, a baseline period, and a snapshot
//               carrying `formula_version`, `as_of`, `confidence`,
//               `evidence_counts` and the input watermark (M14-5). This is the
//               close of record.
//   SHADOWED    `lib/ledger-score.ts` (v1) — computed from the blob and logged
//               as a delta, so the size of the cutover is MEASURED per user
//               rather than discovered by a student. T3 names this cron as the
//               measurement tool and it stays one; only which engine is being
//               measured has swapped.
//   GONE        `lib/ledger-score-v2.ts` is no longer read here at all. It was
//               the shadow CANDIDATE, and the candidate lost: J.8 lists what
//               the target keeps from it (the decay, the log volume factor, the
//               proof gate) and `lib/score-engine.ts` carries all of it. Two
//               shadows would have made "which formula is live" a question with
//               more than one answer.
//
// **There are not two live formulas.** Exactly one thing is persisted, and it
// is the new engine.
//
//
// "AN EXPLICIT RESTATEMENT, NEVER A SILENT RECOMPUTE" — WHAT THAT MEANS HERE
//
// O.4.3: *"L3 snapshots are NOT rewritten. A new snapshot is appended with a
// `restatement_of` pointer and a reason. The history shows both the number we
// believed and the correction — which is how a financial ledger handles a
// restatement."* T3 applies it to this cutover by name.
//
// So on the first close a student receives under `ledger-score/3.0.0`, this
// route reads their most recent existing snapshot, sees a different
// `formula_version` (or the NULL a pre-M14 row carries, which is also
// "different"), and writes the new row with `restatement_of` pointing at the
// old one and `restatement_reason` saying in plain language why the number
// moved. The old rows are NEVER edited and never deleted.
//
// Three things that follows from, all deliberate:
//
//   1. The pointer is decided from DATA — the previous row's own
//      `formula_version` — and not from a deploy flag. A flag can be forgotten
//      in exactly the way T3 is about; a comparison cannot.
//   2. It is per-student and self-healing. A student whose first close under
//      the new engine is in November still gets their restatement in November.
//   3. It happens exactly once per student per formula change: the day after,
//      the previous row already carries the new version, and
//      `decideRestatement` returns nothing.
//
// **WHAT THIS FILE DOES NOT DO, AND MUST NOT.** EXECUTION_PLAN's Launch
// checkpoint §4 decided *"before, not with"*: the plain-language explanation of
// why scores are recalculating is published AHEAD of the change taking effect.
// This route builds the restatement mechanism; it does not announce anything,
// and deploying it is the act that starts the cutover. The announcement is a
// deployment step recorded in EXECUTION_PLAN's M14 completion record, not a
// branch here — a code path that kept writing v1 "until announced" would be
// the two-live-formulas state the milestone exists to end.
//
//
// WHAT IS PRESERVED FROM THE OLD ROUTE, DELIBERATELY AND IN FULL
//
//   · SERVICE-ROLE ONLY. `score_history` has no client INSERT/UPDATE/DELETE
//     policy, so a student cannot manufacture a track record (R.9).
//   · `isInternalCaller` — fail-closed, constant-time (`lib/cron-auth.ts`).
//   · IDEMPOTENCY. `UNIQUE (user_id, captured_on)` and `onConflict:
//     "user_id,captured_on"`, so a retried or double-fired cron upserts rather
//     than duplicating.
//   · CHUNKED UPSERTS at 500, one round trip per chunk rather than per user.
//   · Runs from GitHub Actions, not vercel.json — Vercel Hobby caps cron count.
//
//
// TWO THINGS THAT CHANGED BESIDES THE ENGINE
//
// 1 · **THE CLOSE DAY IS NOW THE IST DAY, NOT THE UTC DAY** (M14-8, D.1.b).
//     `new Date().toISOString().slice(0, 10)` was one of the three disagreeing
//     day definitions that made up the IST/UTC boundary bug; the close now uses
//     `dayKeyInZone`, the same function the client stamp and the corroboration
//     evidence use. See `lib/active-close.ts`.
//
// 2 · **A MISSING PROVENANCE COLUMN NOW ABORTS THE CLOSE INSTEAD OF DEGRADING
//     IT.** The old route caught a missing `score_history.active` and retried
//     without the flag, on the reasoning that the close of record must never be
//     blocked by schema lag (M1-3). That trade INVERTS for 027's columns: a row
//     written without `formula_version`, `as_of` and the watermark is a row
//     that cannot be reproduced, and V.6.8 — *"replay … every snapshot
//     reproduces"* — is M14-5's done-when. Silently writing unreplayable
//     history is worse than writing none: the close is idempotent, so applying
//     027 and re-running recovers the day in full, whereas an unprovenanced row
//     is indistinguishable from a good one forever. The abort names the
//     migration.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { computeScoreFromInputs, scoreInputsFromBlob } from "@/lib/ledger-score";
import { corroborateActiveDay } from "@/lib/active-close";
import { dayKeyInZone } from "@/lib/client-claim-corroboration";
import { isInternalCaller } from "@/lib/cron-auth";
import { loadScoreInputs, type Row, type ScoreInputsDb } from "@/lib/score-inputs";
import {
  FORMULA_VERSION,
  NO_WATERMARK,
  buildScoreSnapshot,
  computeLedgerScore,
  decideRestatement,
  type PriorSnapshot,
  type ScoreSnapshotRow,
  type SnapshotWatermark,
} from "@/lib/score-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** How many students are read concurrently. The new engine needs six reads per
 *  student where the blob needed none, so the close is now I/O-shaped; this
 *  bounds the fan-out without serialising it. */
const READ_CONCURRENCY = 20;

/** One round trip per 500 rows, unchanged from the shadow-mode route. */
const UPSERT_CHUNK = 500;

/** PostgREST's shape for "that column/relation is not in the schema". */
const isMissingSchema = (message: string): boolean =>
  /column|schema cache|relation/i.test(message) && /does not exist|could not find|not found/i.test(message);

/** The six reads `lib/score-inputs.ts` declares, bound to the service role.
 *  Six reads and NO write verb — the interface has none to bind. */
function serviceScoreDb(): ScoreInputsDb {
  const wrap = (data: unknown, error: { code?: string | null; message: string } | null) => ({
    data: (data as Row[]) ?? null,
    error: error ? { code: error.code, message: error.message } : null,
  });

  const all = async (relation: string, ownerColumn: string, studentId: string) => {
    const { data, error } = await supabaseServer.from(relation).select("*").eq(ownerColumn, studentId);
    return wrap(data, error);
  };

  return {
    listSessions: id => all("study_sessions", "student_id", id),
    listRecordedConcepts: id => all("academic_record", "student_id", id),

    // `assessment_attempts` carries the grade; `depth`, `concept_ref` and
    // `counts_toward_coverage` live on the QUESTION, and the question must be
    // UNREVOKED — F.4.b: a revoked question is not evidence, so an attempt
    // against one may not reach the score. The join is done here, in the I/O
    // layer, because `lib/score-inputs.ts` is pure and never sees a client.
    async listAssessedItems(studentId) {
      const [attempts, questions] = await Promise.all([
        supabaseServer.from("assessment_attempts").select("*").eq("student_id", studentId),
        supabaseServer
          .from("unrevoked_assessment_questions")
          .select("question_id, depth, concept_ref, counts_toward_coverage")
          .eq("student_id", studentId),
      ]);
      if (attempts.error) return wrap(null, attempts.error);
      if (questions.error) return wrap(null, questions.error);

      const byQuestion = new Map<string, Row>();
      for (const q of (questions.data ?? []) as Row[]) {
        const id = q.question_id;
        if (typeof id === "string") byQuestion.set(id, q);
      }

      const joined: Row[] = [];
      for (const a of (attempts.data ?? []) as Row[]) {
        const q = typeof a.question_id === "string" ? byQuestion.get(a.question_id) : undefined;
        // No unrevoked question → the attempt is dropped, not repaired.
        // `readAssessedItem` would refuse it anyway (no `depth`); dropping it
        // here keeps the refusal count honest about what it counted.
        if (!q) continue;
        joined.push({ ...a, ...q });
      }
      return wrap(joined, null);
    },

    listPatterns: id => all("patterns", "student_id", id),
    listConfirmedOccurrences: id => all("confirmed_occurrences", "student_id", id),
    listResolutions: id => all("mistake_resolutions", "student_id", id),
  };
}

/**
 * R.9 / O.4.2 — where in the event stream this snapshot was computed from.
 *
 * Ordered by server `seq` and never by a client `occurred_at` (R.10). A student
 * with no events has no watermark, and inventing one would be a claim.
 */
async function readWatermark(studentId: string): Promise<SnapshotWatermark> {
  const { data, error } = await supabaseServer
    .from("academic_events")
    .select("event_id, seq")
    .eq("student_id", studentId)
    .order("seq", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return NO_WATERMARK;
  const row = data[0] as { event_id?: unknown; seq?: unknown };
  return {
    eventId: typeof row.event_id === "string" ? row.event_id : null,
    seq: typeof row.seq === "number" ? row.seq : Number(row.seq ?? NaN) || null,
  };
}

/** The student's most recent existing snapshot — what a restatement points at. */
async function readPriorSnapshot(studentId: string, before: string): Promise<PriorSnapshot | null> {
  const { data, error } = await supabaseServer
    .from("score_history")
    .select("id, formula_version, captured_on")
    .eq("user_id", studentId)
    .lt("captured_on", before)
    .order("captured_on", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  const row = data[0] as { id: number; formula_version: string | null; captured_on: string };
  return { id: row.id, formulaVersion: row.formula_version ?? null, capturedOn: row.captured_on };
}

export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // M14-8 / D.1.b — the close day is the DECLARED-ZONE day, computed by the one
  // function the client stamp and the corroboration evidence also use. The UTC
  // slice this replaced is why every 00:00–05:30 IST session was closed onto
  // the previous day.
  const nowMs = Date.now();
  const capturedOn = dayKeyInZone(nowMs);

  // WHO IS CLOSED. `students` (012) is the identity table, and the score is a
  // fact about a student. The blob is read alongside for two transitional
  // purposes ONLY — the v1 shadow delta and the corroborated `active` flag —
  // and for nothing the persisted score is derived from (J.7).
  const [students, profiles, blobs] = await Promise.all([
    supabaseServer.from("students").select("student_id"),
    supabaseServer.from("student_profiles").select("student_id, subjects").eq("is_current", true),
    supabaseServer.from("user_data").select("id, blob"),
  ]);

  if (students.error) {
    return NextResponse.json({ error: `read students: ${students.error.message}` }, { status: 500 });
  }

  const ids = ((students.data ?? []) as { student_id: string }[])
    .map(r => r.student_id)
    .filter((id): id is string => typeof id === "string");

  if (ids.length === 0) {
    return NextResponse.json({ captured_on: capturedOn, formula_version: FORMULA_VERSION, users: 0, written: 0 });
  }

  const subjectsOf = new Map<string, string[]>();
  for (const p of ((profiles.data ?? []) as { student_id: string; subjects: string[] | null }[])) {
    subjectsOf.set(p.student_id, Array.isArray(p.subjects) ? p.subjects : []);
  }

  const blobOf = new Map<string, Record<string, string> | null>();
  for (const b of ((blobs.data ?? []) as { id: string; blob?: Record<string, string> | null }[])) {
    blobOf.set(b.id, b.blob ?? null);
  }

  // ── COMPUTE ────────────────────────────────────────────────────────────────
  const snapshots: ScoreSnapshotRow[] = [];
  const failures: string[] = [];
  let restatements = 0;
  let baselineUsers = 0;
  let watermarked = 0;

  // The SHADOW is now v1. Same instrument as before, pointed the other way:
  // the delta says how far each student moves at the cutover, which is what
  // makes T3 a measured risk instead of a discovered one.
  let shadowCount = 0, shadowAbsSum = 0, shadowMax = 0;

  const db = serviceScoreDb();

  const closeOne = async (studentId: string) => {
    const loaded = await loadScoreInputs(db, studentId, {
      asOfMs: nowMs,
      declaredSubjects: subjectsOf.get(studentId) ?? [],
    });
    if (!loaded.ok) {
      failures.push(`${studentId}: ${loaded.error.message}`);
      return;
    }

    const score = computeLedgerScore(loaded.built.inputs);
    const [watermark, prior] = await Promise.all([
      readWatermark(studentId),
      readPriorSnapshot(studentId, capturedOn),
    ]);

    const restatement = decideRestatement(prior, FORMULA_VERSION);
    if (restatement.restatementOf !== null) restatements += 1;
    if (score.state === "baseline") baselineUsers += 1;
    if (watermark.eventId !== null) watermarked += 1;

    const blob = blobOf.get(studentId) ?? null;

    // The v1 shadow. Logged, never persisted — the exact inversion of what this
    // route did before M14-6. A student below baseline has NO total, so there
    // is no delta to report for them: J.3.a forbids treating the absence of a
    // number as a zero, and that includes in a log line.
    if (blob && score.total !== null) {
      try {
        const v1 = computeScoreFromInputs(scoreInputsFromBlob(blob));
        const delta = score.total - v1.total;
        shadowCount += 1;
        shadowAbsSum += Math.abs(delta);
        if (Math.abs(delta) > Math.abs(shadowMax)) shadowMax = delta;
        console.log(
          `[cutover] user=${studentId} v1=${v1.total} new=${score.total} Δ=${delta} ` +
          `conf=${score.confidence} measuredMax=${score.measuredMax}`,
        );
      } catch (e) {
        console.error(`[cutover] user=${studentId} v1 shadow failed:`, e);
      }
    }

    snapshots.push(
      buildScoreSnapshot({
        score,
        counts: loaded.built.counts,
        capturedOn,
        watermark,
        restatement,
        active: corroborateActiveDay(blob, capturedOn),
      }),
    );
  };

  for (let i = 0; i < ids.length; i += READ_CONCURRENCY) {
    await Promise.all(ids.slice(i, i + READ_CONCURRENCY).map(closeOne));
  }

  // ── WRITE ──────────────────────────────────────────────────────────────────
  let written = 0;

  for (let i = 0; i < snapshots.length; i += UPSERT_CHUNK) {
    const chunk = snapshots.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabaseServer
      .from("score_history")
      .upsert(chunk, { onConflict: "user_id,captured_on" });

    if (!error) {
      written += chunk.length;
      continue;
    }

    // See the header, "TWO THINGS THAT CHANGED", item 2: an unprovenanced row
    // cannot be replayed and is indistinguishable from a good one forever, so
    // schema lag aborts the close instead of degrading it. The close is
    // idempotent — apply the migration and re-run, and the day is recovered.
    if (isMissingSchema(error.message)) {
      return NextResponse.json({
        error:
          "score_history is missing snapshot provenance columns — refusing to write " +
          "snapshots that could not be replayed (V.6.8). Apply " +
          "supabase/migrations/027_score_snapshot_provenance.sql (and 010 if the " +
          "ledger does not yet record it), then re-run this close: it is idempotent.",
        detail: error.message,
        captured_on: capturedOn,
        formula_version: FORMULA_VERSION,
        users: ids.length,
        written,
      }, { status: 503 });
    }

    failures.push(error.message);
  }

  return NextResponse.json({
    captured_on: capturedOn,
    formula_version: FORMULA_VERSION,
    users: ids.length,
    written,
    // J.4 — how many students correctly have NO score yet. A number, not a
    // problem: V.6.1 says a new account has no score, not zero.
    baseline_users: baselineUsers,
    // O.4.3 — how many rows say, in the data, that the figure was recalculated.
    restatements,
    watermarked,
    // T3's measurement, now pointed at the engine being retired.
    shadowV1: shadowCount > 0
      ? { users: shadowCount, meanAbsDelta: Math.round(shadowAbsSum / shadowCount), maxDelta: shadowMax }
      : null,
    ...(failures.length ? { failures } : {}),
  }, { status: failures.length ? 500 : 200 });
}
