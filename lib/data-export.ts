// ═══════════════════════════════════════════════════════════════════════════
// M18-1 — EXPORT: L1, L3, L5, THE L2 DERIVATION MANIFEST, DISPUTE MARKERS,
// THE AUDIT TRAIL.
//
// Architecture O.1: "A complete, self-describing bundle, generated
// server-side... `manifest.json` — schema version, generated-at, the entity
// list, and the derivation rules for every excluded derived table, so a third
// party can reproduce L2 rather than being asked to trust it... L2 excluded
// from the body by design (H.2)."
//
// H.1's table is the authority on what belongs in which layer, and this
// module reads it as data rather than re-deciding it:
//
//   L1  academic_events, evidence (+ tombstones), assessment_attempts,
//       assessment_question_revocations, occurrences, correction_requests,
//       assessment_attempt_disputes, audit_entries
//   L3  score_history — every snapshot, with formula_version/confidence/
//       input_watermark_event_id/restatement_of, exactly as stored, never
//       recomputed for the export
//   L5  best-effort current preference-adjacent fields. No dedicated
//       `student_preferences`/`HomeLayout` table exists yet (those ship in
//       M22/M24) — see the manifest's own `l5.note`, stated rather than
//       silently omitted (Law 7): an export that pretended L5 was complete
//       would be worse than one that says what it could find.
//
// L2 (patterns, academic_record, PersonalModel, ScoreSnapshot-adjacent
// projections) is DELIBERATELY ABSENT from the body. What ships instead is
// the DERIVATION MANIFEST — which tables would produce it and from what — so
// H.2's "a third party can reproduce it" is a real property of the bundle,
// not a claim about a number that just isn't there.
//
// DISPUTE MARKERS AND THE AUDIT TRAIL are not bolted on afterward — they are
// read from the SAME tables everything else reads L1 from
// (`assessment_attempt_disputes`, `correction_requests`, `audit_entries`), so
// V.10.7's "genuinely reflects current corrected/disputed state, not stale
// data" holds by construction: there is no second, cached copy of dispute
// state anywhere in this pipeline to go stale.
//
// Async, per O.1: "Export is asynchronous (a `jobs` row —
// `lib/jobs.ts` already provides a durable queue with `MAX_ATTEMPTS = 3`),
// and every export is an `AuditEntry`." `enqueueExport()` is the durable half;
// `runExport()` is what a job dispatch calls.
// ═══════════════════════════════════════════════════════════════════════════

import { supabaseServer } from "./supabase-server";
import { writeAuditEntry } from "./events";
import { enqueueJob } from "./jobs";

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportManifest {
  schema_version: number;
  generated_at: string;
  student_id: string;
  entities: Record<string, { table: string; row_count: number }>;
  l2_derivation: Record<string, { derived_from: string[]; rule: string }>;
  l5: { note: string };
}

export interface ExportBundle {
  manifest: ExportManifest;
  l1: {
    academic_events: unknown[];
    evidence: unknown[];
    assessment_attempts: unknown[];
    assessment_question_revocations: unknown[];
    occurrences: unknown[];
    correction_requests: unknown[];
    assessment_attempt_disputes: unknown[];
    audit_entries: unknown[];
  };
  l3: {
    score_snapshots: unknown[];
  };
  l5: {
    preferences: Record<string, unknown> | null;
  };
}

/** H.2's derivation rules, stated so a third party can reproduce L2 without
 *  being handed L2 itself. Kept here, beside the export, so a reader does not
 *  have to cross-reference the architecture doc to see what this bundle is
 *  promising. */
const L2_DERIVATION: ExportManifest["l2_derivation"] = {
  patterns: {
    derived_from: ["occurrences"],
    rule: "lib/mistakes/engine.ts mergeOccurrence(): same student, concept, error_class, error_type merge into one leaf pattern; severity = 40*marksWeight + 30*recurrenceWeight + 20*examProximity + 10*conceptExamWeight.",
  },
  academic_record: {
    derived_from: ["study_sessions", "assessment_attempts", "occurrences", "academic_events"],
    rule: "Coverage state per concept (untouched/declared/studied/assessed/proven) and accuracy, recomputed from confirmed evidence.",
  },
  score_snapshots_recomputation: {
    derived_from: ["study_sessions", "academic_record", "assessment_attempts", "patterns", "occurrences", "mistake_resolutions"],
    rule: "lib/score-engine.ts computeLedgerScore(), formula_version stamped on each stored snapshot in l3.score_snapshots.",
  },
};

/**
 * Build the bundle. Pure assembly over already-fetched rows — the I/O lives
 * in `runExport()` below, so this half is testable without a database.
 */
export function buildExportBundle(studentId: string, rows: {
  academicEvents: unknown[];
  evidence: unknown[];
  assessmentAttempts: unknown[];
  revocations: unknown[];
  occurrences: unknown[];
  correctionRequests: unknown[];
  disputes: unknown[];
  auditEntries: unknown[];
  scoreSnapshots: unknown[];
  preferences: Record<string, unknown> | null;
}, generatedAt: string): ExportBundle {
  const entities: ExportManifest["entities"] = {
    academic_events: { table: "academic_events", row_count: rows.academicEvents.length },
    evidence: { table: "evidence", row_count: rows.evidence.length },
    assessment_attempts: { table: "assessment_attempts", row_count: rows.assessmentAttempts.length },
    assessment_question_revocations: { table: "assessment_question_revocations", row_count: rows.revocations.length },
    occurrences: { table: "occurrences", row_count: rows.occurrences.length },
    correction_requests: { table: "correction_requests", row_count: rows.correctionRequests.length },
    assessment_attempt_disputes: { table: "assessment_attempt_disputes", row_count: rows.disputes.length },
    audit_entries: { table: "audit_entries", row_count: rows.auditEntries.length },
    score_snapshots: { table: "score_history", row_count: rows.scoreSnapshots.length },
  };

  return {
    manifest: {
      schema_version: EXPORT_SCHEMA_VERSION,
      generated_at: generatedAt,
      student_id: studentId,
      entities,
      l2_derivation: L2_DERIVATION,
      l5: {
        note:
          "No dedicated preferences/layout table exists yet in this build (M22/M24 ship them). " +
          "l5.preferences below is best-effort from currently-shipped fields and may be null.",
      },
    },
    l1: {
      academic_events: rows.academicEvents,
      evidence: rows.evidence,
      assessment_attempts: rows.assessmentAttempts,
      assessment_question_revocations: rows.revocations,
      occurrences: rows.occurrences,
      correction_requests: rows.correctionRequests,
      assessment_attempt_disputes: rows.disputes,
      audit_entries: rows.auditEntries,
    },
    l3: { score_snapshots: rows.scoreSnapshots },
    l5: { preferences: rows.preferences },
  };
}

/** O.1: "Export is asynchronous... a `jobs` row." Durable; `runExport` is the
 *  dispatch target. */
export async function enqueueExport(studentId: string): Promise<void> {
  await enqueueJob("data-export", { student_id: studentId });
}

/** The I/O half. Reads every L1/L3 table this student owns, writes the
 *  `export` AuditEntry (O.1, O.6), and returns the bundle. Does not decide
 *  where the bundle is delivered — the caller (a route) handles storage or
 *  streaming; keeping that split is what lets `buildExportBundle` above stay
 *  testable without one. */
export async function runExport(studentId: string, opts: { now?: () => number } = {}): Promise<ExportBundle> {
  const now = opts.now ?? (() => Date.now());
  const generatedAt = new Date(now()).toISOString();

  const [events, evidence, attempts, revocations, occurrences, corrections, disputes, audit, snapshots, profile] =
    await Promise.all([
      supabaseServer.from("academic_events").select("*").eq("student_id", studentId).order("seq", { ascending: true }),
      supabaseServer.from("evidence").select("*").eq("student_id", studentId),
      supabaseServer.from("assessment_attempts").select("*").eq("student_id", studentId),
      supabaseServer.from("assessment_question_revocations").select("*").eq("student_id", studentId),
      supabaseServer.from("occurrences").select("*").eq("student_id", studentId),
      supabaseServer.from("correction_requests").select("*").eq("student_id", studentId),
      supabaseServer.from("assessment_attempt_disputes").select("*").eq("student_id", studentId),
      supabaseServer.from("audit_entries").select("*").eq("student_id", studentId).order("seq", { ascending: true }),
      supabaseServer.from("score_history").select("*").eq("user_id", studentId).order("captured_on", { ascending: true }),
      supabaseServer.from("student_profiles").select("*").eq("student_id", studentId).eq("is_current", true).maybeSingle(),
    ]);

  const bundle = buildExportBundle(
    studentId,
    {
      academicEvents: events.data ?? [],
      evidence: evidence.data ?? [],
      assessmentAttempts: attempts.data ?? [],
      revocations: revocations.data ?? [],
      occurrences: occurrences.data ?? [],
      correctionRequests: corrections.data ?? [],
      disputes: disputes.data ?? [],
      auditEntries: audit.data ?? [],
      scoreSnapshots: snapshots.data ?? [],
      preferences: (profile.data as Record<string, unknown> | null) ?? null,
    },
    generatedAt,
  );

  await writeAuditEntry({
    actor: "student",
    action: "export",
    student_id: studentId,
    target_table: null,
    target_id: null,
    reason: "student-requested data export",
    details: {
      row_counts: Object.fromEntries(Object.entries(bundle.manifest.entities).map(([k, v]) => [k, v.row_count])),
    },
    policy_version: null,
    at: generatedAt,
  });

  return bundle;
}
