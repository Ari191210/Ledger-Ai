// ═══════════════════════════════════════════════════════════════════════════
// M12-3 — THE CONSISTENCY JOB. IT DETECTS. IT DOES NOT REPAIR.
//
// EXECUTION_PLAN M12-3: *"Consistency job verifying each projection's watermark
// against the stream. Done when: T8 mitigation."*
//
// T8, verbatim: *"**Historical integrity under correction.** Corrections cascade
// into patterns, records and snapshots. A PARTIAL RECOMPUTE LEAVES THE RECORD
// INTERNALLY INCONSISTENT IN A WAY NO USER CAN SEE. Mitigation: replay-from-
// checkpoint rather than patching (O.4), plus A CONSISTENCY JOB THAT VERIFIES
// EACH PROJECTION'S WATERMARK AGAINST THE STREAM."*
//
//
// DETECTION, NOT CORRECTION — THE JUDGEMENT CALL, AND ITS BASIS
//
// This job REPORTS drift and never silently fixes it. The basis is read rather
// than assumed:
//
//   · T8 asks for a job that *"verifies"*. It does not ask for one that heals,
//     and the risk it names is *"inconsistent IN A WAY NO USER CAN SEE"* —
//     which is an OBSERVABILITY failure. A job that quietly corrected the
//     symptom would leave the cause invisible for exactly as long.
//   · **Part H.1 nowhere authorises self-healing.** Its five-layer table and
//     H.1.a's *"a layer may read downward and may never write downward"* say
//     what may write where; H.2 says L2 *"may be truncated and rebuilt at any
//     time."* Rebuilding is O.4's replay-from-checkpoint, which is a DELIBERATE
//     operation with an audit entry — not something a monitoring job does to a
//     student's record on its own initiative at 3am.
//   · O.4.3, cited by T3 for the same reason: *"an explicit restatement, never a
//     silent recompute."*
//
// So `REPAIR_POLICY` below is the constant `"report_only"`, there is no repair
// verb in this module or in its cron route, and a test asserts the module
// contains no write path. The remedy for a finding is
// `rebuildAccuracyFrom()` (M12-2) or a re-projection, invoked by a human who
// has read the finding.
//
//
// WHAT "INCONSISTENT" MEANS, ENUMERATED
//
// A projection can disagree with the stream in more ways than "behind", and the
// dangerous ones are the ones that are not merely lag:
//
//   behind              the mark trails the stream. EXPECTED between catch-up
//                       runs; a finding only past a stated tolerance.
//   ahead_of_stream     the mark is PAST the stream's own maximum. Either the
//                       projection invented progress or L1 lost rows — and L1
//                       losing rows is the unrecoverable case in H.1's table.
//   dangling_watermark  the mark names an `event_id` no longer in the stream.
//   watermark_mismatch  the named event exists at a DIFFERENT `seq`. R.10's
//                       ordering key and the id disagree about the same event.
//   missing_watermark   the projection has rows and no mark at all — nothing
//                       can be said about how current they are.
//   undercounted        `events_processed` is smaller than the number of stream
//                       events at or below the mark. T8's *"missing a required
//                       update"* — the fold skipped something and moved on.
//   state_disagrees     a CACHED projection row disagrees with the derivation
//                       it is supposed to be a cache of. M12-1's
//                       `concept_coverage` view is the truth; `academic_record`
//                       is the copy, and a copy that has drifted is precisely
//                       the *"internally inconsistent in a way no user can
//                       see"* T8 names.
//
// No I/O, no clock, no randomness, no Supabase, no `next/*`. The cron route
// supplies all three, exactly as `lib/event-compaction.ts` and
// `app/api/cron/event-compaction/route.ts` split them (M7-7).
// ═══════════════════════════════════════════════════════════════════════════

import { ACCURACY_PROJECTION } from "./concept-accuracy";
import { COVERAGE_PROJECTION, type CoverageState } from "./coverage-state";

/**
 * **THE JUDGEMENT, AS A VALUE.** See the header for the basis. A future pass
 * that wants self-healing has to change this constant, which is a visible edit
 * in a reviewed file rather than a new branch somewhere in a job.
 */
export const REPAIR_POLICY = "report_only" as const;
export type RepairPolicy = typeof REPAIR_POLICY;

/** M9's `study_sessions.input_watermark_event_id` is a watermark too, and C.3
 *  says why it exists: *"records how far the projection has consumed, WHICH
 *  MAKES A STALE ROW DETECTABLE rather than silently wrong."* Detecting it is
 *  this job. */
export const SESSION_PROJECTION = "study_session";

/** Every projection this job knows how to check. A projection absent from this
 *  list is unchecked, and `unregistered_projection` says so out loud rather
 *  than letting it pass silently. */
export const CHECKED_PROJECTIONS: readonly string[] = [
  ACCURACY_PROJECTION,
  COVERAGE_PROJECTION,
  SESSION_PROJECTION,
];

/**
 * How far behind is acceptable before lag becomes a finding.
 *
 * U.2 qualification 1 makes catch-up SCHEDULED rather than real-time, so a
 * projection is *supposed* to be behind between runs. A tolerance of zero would
 * make this job report the design as a defect on every run, and a job that
 * always fires is a job nobody reads.
 */
export const LAG_TOLERANCE_EVENTS = 500;

export type ConsistencyFindingKind =
  | "behind"
  | "ahead_of_stream"
  | "dangling_watermark"
  | "watermark_mismatch"
  | "missing_watermark"
  | "undercounted"
  | "state_disagrees"
  | "unregistered_projection";

/** `warn` is drift that the next scheduled run may resolve by itself.
 *  `error` is drift that cannot be explained by lag and needs a human. */
export type ConsistencySeverity = "warn" | "error";

export const FINDING_SEVERITY: Readonly<Record<ConsistencyFindingKind, ConsistencySeverity>> = {
  behind: "warn",
  ahead_of_stream: "error",
  dangling_watermark: "error",
  watermark_mismatch: "error",
  missing_watermark: "error",
  undercounted: "error",
  state_disagrees: "error",
  unregistered_projection: "warn",
};

export interface ConsistencyFinding {
  kind: ConsistencyFindingKind;
  severity: ConsistencySeverity;
  projection: string;
  student_id: string;
  /** The concept a `state_disagrees` finding is about; null otherwise. */
  concept_ref: string | null;
  /** Figures, never a sentence about the student. */
  detail: Readonly<Record<string, string | number | boolean | null>>;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE INPUTS
// ═══════════════════════════════════════════════════════════════════════════

/** One row of `projection_watermarks` (026 §3). */
export interface WatermarkRow {
  projection: string;
  student_id: string;
  last_seq: number;
  last_event_id: string | null;
  events_processed: number;
}

/** What the job needs to know about ONE student's stream. Supplied by the cron
 *  route from `academic_events`, which is the only place it can come from —
 *  H.1's L1 is the thing every one of these marks is a claim about. */
export interface StreamFacts {
  student_id: string;
  /** `MAX(seq)`, or 0 for a student with no events. */
  max_seq: number;
  /** `COUNT(*)`. Compared against `events_processed`. */
  event_count: number;
  /** `seq` of the event the mark names, or null when the id is not in the
   *  stream at all. Two different nulls, distinguished by `has_event_id`. */
  watermark_event_seq?: number | null;
  has_event_id?: boolean;
}

/** A cached coverage row and the freshly-derived state for the same concept.
 *  The cache is `academic_record`; the derivation is `026`'s
 *  `concept_coverage` view or `deriveCoverageState()` — the same rungs, twice,
 *  which is the only way a cache can be checked at all. */
export interface CoverageComparison {
  student_id: string;
  concept_ref: string;
  cached: CoverageState | null;
  derived: CoverageState;
}

export interface ConsistencyInput {
  watermarks: readonly WatermarkRow[];
  /** Keyed by `student_id`. A watermark for a student with no stream facts is
   *  reported, never assumed fine. */
  streams: readonly StreamFacts[];
  coverage?: readonly CoverageComparison[];
  lag_tolerance?: number;
}

export interface ConsistencyReport {
  ok: boolean;
  policy: RepairPolicy;
  checked: {
    watermarks: number;
    students: number;
    coverage_rows: number;
  };
  findings: readonly ConsistencyFinding[];
  errors: number;
  warnings: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CHECK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **THE JOB.** Pure, total, and it cannot throw.
 *
 * It COLLECTS FINDINGS and returns `ok` only when the collection holds no
 * error — `evaluateVerificationGate()`'s shape, for the same reason: a new
 * failure mode is added by pushing a finding, and a failure mode nobody handled
 * cannot be mistaken for a clean bill of health.
 */
export function runConsistencyCheck(input: ConsistencyInput): ConsistencyReport {
  const tolerance = Math.max(0, Math.floor(input.lag_tolerance ?? LAG_TOLERANCE_EVENTS));
  const findings: ConsistencyFinding[] = [];

  const flag = (
    kind: ConsistencyFindingKind,
    projection: string,
    student_id: string,
    detail: ConsistencyFinding["detail"],
    concept_ref: string | null = null,
  ) => {
    findings.push({ kind, severity: FINDING_SEVERITY[kind], projection, student_id, concept_ref, detail });
  };

  const streams = new Map(input.streams.map(s => [s.student_id, s]));
  const known = new Set(CHECKED_PROJECTIONS);

  for (const w of input.watermarks) {
    if (!known.has(w.projection)) {
      flag("unregistered_projection", w.projection, w.student_id, {
        note: "no rule in CHECKED_PROJECTIONS knows how to verify this projection",
      });
    }

    const stream = streams.get(w.student_id);
    if (!stream) {
      // A mark for a student whose stream could not be read says nothing about
      // the stream and everything about the read. It is an error rather than a
      // skip: the alternative is a report that silently covers fewer students
      // each run.
      flag("missing_watermark", w.projection, w.student_id, {
        note: "a watermark exists but the student's event stream was not readable in this run",
        last_seq: w.last_seq,
      });
      continue;
    }

    // ── the mark is past the stream ─────────────────────────────────────────
    if (w.last_seq > stream.max_seq) {
      flag("ahead_of_stream", w.projection, w.student_id, {
        watermark_seq: w.last_seq,
        stream_max_seq: stream.max_seq,
        note: "the projection claims to have consumed events the stream does not contain",
      });
    } else {
      const lag = stream.max_seq - w.last_seq;
      if (lag > tolerance) {
        flag("behind", w.projection, w.student_id, {
          watermark_seq: w.last_seq,
          stream_max_seq: stream.max_seq,
          lag,
          tolerance,
        });
      }
    }

    // ── the mark names an event ────────────────────────────────────────────
    if (w.last_event_id !== null) {
      if (stream.has_event_id === false) {
        flag("dangling_watermark", w.projection, w.student_id, {
          last_event_id: w.last_event_id,
          note: "the watermark names an event that is not in the stream",
        });
      } else if (
        typeof stream.watermark_event_seq === "number"
        && stream.watermark_event_seq !== w.last_seq
      ) {
        flag("watermark_mismatch", w.projection, w.student_id, {
          last_event_id: w.last_event_id,
          watermark_seq: w.last_seq,
          event_seq: stream.watermark_event_seq,
          note: "the watermark's seq and the seq of the event it names disagree (R.10)",
        });
      }
    } else if (w.last_seq > 0) {
      flag("missing_watermark", w.projection, w.student_id, {
        last_seq: w.last_seq,
        note: "the mark has advanced but names no event, so it cannot be verified against L1",
      });
    }

    // ── it consumed fewer events than it passed over ───────────────────────
    //
    // T8's *"missing a required update"*. `event_count` is the whole stream, so
    // the comparison is only sound when the mark is AT the stream's head; below
    // that, a smaller count is simply lag and is already reported above.
    if (w.last_seq === stream.max_seq && w.events_processed < stream.event_count) {
      flag("undercounted", w.projection, w.student_id, {
        events_processed: w.events_processed,
        stream_event_count: stream.event_count,
        note: "the mark is at the head of the stream but fewer events were folded than exist",
      });
    }
  }

  // ── the cache versus the derivation ──────────────────────────────────────
  for (const c of input.coverage ?? []) {
    if (c.cached === c.derived) continue;
    flag(
      "state_disagrees",
      COVERAGE_PROJECTION,
      c.student_id,
      {
        cached: c.cached,
        derived: c.derived,
        note: "the stored academic_record row disagrees with the concept_coverage derivation",
      },
      c.concept_ref,
    );
  }

  const errors = findings.filter(f => f.severity === "error").length;

  return {
    ok: errors === 0,
    policy: REPAIR_POLICY,
    checked: {
      watermarks: input.watermarks.length,
      students: streams.size,
      coverage_rows: (input.coverage ?? []).length,
    },
    findings,
    errors,
    warnings: findings.length - errors,
  };
}

/** The audit `reason` for a run that found something. O.6: a projection found
 *  to be drifting is a fact about the record, and nothing else in the product
 *  would ever show that it was noticed. */
export const consistencyAuditReason = (r: ConsistencyReport): string =>
  `projection consistency: ${r.errors} error(s), ${r.warnings} warning(s) over `
  + `${r.checked.watermarks} watermark(s) and ${r.checked.coverage_rows} coverage row(s); policy=${r.policy}`;

/** §4's discipline. A finding is about a PROJECTION, never about a student, and
 *  none of these strings could be rendered at one. */
export const FINDING_NOTE: Readonly<Record<ConsistencyFindingKind, string>> = {
  behind: "A projection is behind the event stream",
  ahead_of_stream: "A projection has consumed events the stream does not contain",
  dangling_watermark: "A watermark names an event that is not in the stream",
  watermark_mismatch: "A watermark and the event it names disagree on order",
  missing_watermark: "A projection has no verifiable watermark",
  undercounted: "A projection folded fewer events than the stream holds",
  state_disagrees: "A cached record row disagrees with its derivation",
  unregistered_projection: "A projection exists that this job cannot verify",
};

/**
 * The remedy, as TEXT a human acts on — never as a call this job makes.
 *
 * O.4: replay from checkpoint rather than patching. Every remedy below is a
 * deliberate, audited operation, which is exactly what makes it unsuitable for
 * a job that runs on a timer.
 */
export const FINDING_REMEDY: Readonly<Record<ConsistencyFindingKind, string>> = {
  behind: "run the projection's catch-up; no correction is implied",
  ahead_of_stream: "STOP — verify L1 has not lost rows before rebuilding anything",
  dangling_watermark: "reset the watermark to 0 and replay from checkpoint (O.4)",
  watermark_mismatch: "reset the watermark to 0 and replay from checkpoint (O.4)",
  missing_watermark: "reset the watermark to 0 and replay from checkpoint (O.4)",
  undercounted: "reset the watermark to 0 and replay from checkpoint (O.4)",
  state_disagrees: "re-project the student's academic_record from concept_coverage",
  unregistered_projection: "add a rule to CHECKED_PROJECTIONS, or retire the projection",
};
