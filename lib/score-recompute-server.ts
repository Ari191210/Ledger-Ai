// ═══════════════════════════════════════════════════════════════════════════
// M18-3 — ON-DEMAND, SINGLE-STUDENT RECOMPUTE, FORCED TO RESTATE.
//
// The daily close (`app/api/cron/score-snapshot/route.ts`, M14-6) computes
// every student's score once a day and decides a FORMULA restatement.
// M18-3 needs the same computation — `lib/score-inputs.ts` →
// `computeLedgerScore` → `lib/score-engine.ts`'s `buildScoreSnapshot` — run
// for ONE student, RIGHT NOW, forced to restate for a CORRECTION
// (`lib/restatement.ts`'s `decideCorrectionRestatement`, not the cron's
// formula-version one).
//
// The I/O glue (`serviceScoreDb`, `readWatermark`, `readPriorSnapshot`) is
// NOT imported from that route — it is a route module with no exports, and
// editing an M14 file to export internals is a bigger touch than this module
// needs. What is reused, verbatim, is every PURE function: `loadScoreInputs`,
// `computeLedgerScore`, `buildScoreSnapshot`. Only the read-adapter is
// rewritten, and it is rewritten NARROWER than the cron's, in the one place
// V.10.1 requires it to differ:
//
//   `assessment_score_eligible_questions` (030), not
//   `unrevoked_assessment_questions` (024) — the correction path is exactly
//   the path that can have just created an open dispute, and a recompute that
//   read the 024 view alone would count the very attempt the correction
//   disputed. This is V.10.1's "excluded from every dimension in both
//   directions", enforced at the read the score is computed from rather than
//   trusted to a filter applied after.
// ═══════════════════════════════════════════════════════════════════════════

import { supabaseServer } from "./supabase-server";
import { loadScoreInputs, type Row, type ScoreInputsDb } from "./score-inputs";
import {
  NO_WATERMARK,
  buildScoreSnapshot,
  computeLedgerScore,
  type PriorSnapshot,
  type RestatementDecision,
  type ScoreSnapshotRow,
  type SnapshotWatermark,
} from "./score-engine";
import { dayKeyInZone } from "./client-claim-corroboration";

function wrap(data: unknown, error: { code?: string | null; message: string } | null) {
  return { data: (data as Row[]) ?? null, error: error ? { code: error.code, message: error.message } : null };
}

/** V.10.1's read-side, narrower than the daily close's own (see header). */
function correctionAwareScoreDb(): ScoreInputsDb {
  const all = async (relation: string, ownerColumn: string, studentId: string) => {
    const { data, error } = await supabaseServer.from(relation).select("*").eq(ownerColumn, studentId);
    return wrap(data, error);
  };

  return {
    listSessions: id => all("study_sessions", "student_id", id),
    listRecordedConcepts: id => all("academic_record", "student_id", id),

    async listAssessedItems(studentId) {
      const [attempts, questions] = await Promise.all([
        supabaseServer.from("assessment_attempts").select("*").eq("student_id", studentId),
        // 030's eligible-questions view — unrevoked AND not under an open
        // dispute. V.10.1's bidirectional exclusion, structural at this join.
        supabaseServer
          .from("assessment_score_eligible_questions")
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
        if (!q) continue; // revoked, disputed, or not-yet-bound — dropped, not repaired.
        joined.push({ ...a, ...q });
      }
      return wrap(joined, null);
    },

    listPatterns: id => all("patterns", "student_id", id),
    listConfirmedOccurrences: id => all("confirmed_occurrences", "student_id", id),
    listResolutions: id => all("mistake_resolutions", "student_id", id),
  };
}

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

export async function readPriorSnapshot(studentId: string): Promise<PriorSnapshot | null> {
  const { data, error } = await supabaseServer
    .from("score_history")
    .select("id, formula_version, captured_on")
    .eq("user_id", studentId)
    .order("captured_on", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const row = data[0] as { id: number; formula_version: string | null; captured_on: string };
  return { id: row.id, formulaVersion: row.formula_version ?? null, capturedOn: row.captured_on };
}

export type RecomputeResult =
  | { ok: true; snapshot: ScoreSnapshotRow }
  | { ok: false; detail: string };

/**
 * Recompute one student's score right now and write it, forced to carry the
 * given restatement decision. `capturedOn` follows the same declared-zone day
 * key the daily close uses (M14-8) — a correction landing at 23:58 IST and one
 * at 00:02 IST are different trading days, and this must agree with the cron
 * about which one "today" is, or the two writers could each believe they own
 * the row.
 */
export async function recomputeAndRestate(
  studentId: string,
  restatement: RestatementDecision,
  opts: { nowMs?: number; declaredSubjects?: readonly string[] } = {},
): Promise<RecomputeResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const capturedOn = dayKeyInZone(nowMs);
  const db = correctionAwareScoreDb();

  const loaded = await loadScoreInputs(db, studentId, {
    asOfMs: nowMs,
    declaredSubjects: opts.declaredSubjects ?? [],
  });
  if (!loaded.ok) return { ok: false, detail: loaded.error.message };

  const score = computeLedgerScore(loaded.built.inputs);
  const watermark = await readWatermark(studentId);

  const snapshot = buildScoreSnapshot({
    score,
    counts: loaded.built.counts,
    capturedOn,
    watermark,
    restatement,
    active: true,
  });

  const { error } = await supabaseServer
    .from("score_history")
    .upsert(snapshot, { onConflict: "user_id,captured_on" });

  if (error) return { ok: false, detail: error.message };
  return { ok: true, snapshot };
}
