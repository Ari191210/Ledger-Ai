// ═══════════════════════════════════════════════════════════════════════════
// M18-2 — THE SERVER WIRING FOR O.3's ONE ENTRY POINT.
//
// `lib/correction.ts` decides WHAT should happen (pure). This module does it:
// writes the `correction_requests` row (030), and — for an accepted outcome —
// appends the superseding fact and triggers M18-3's forced restatement; for a
// disputed outcome, opens the standing marker (V.10.1) and touches nothing
// else, per O.3.a.
//
// REUSE, NOT DUPLICATION. `target_type ∈ {question, assessment_attempt}` with
// an accepted outcome delegates to M10-6's `lib/assessment-revocation.ts`
// (`buildRevocation`, `supersedingEventDraft`, `withdrawalPatch`) — the exact
// mechanism EXECUTION_PLAN's own M18 header names as already existing and not
// to be duplicated ("`AuditEntry` already exists... reuse it"), extended here
// to the two remaining M10 machinery never wired: F.8's rows 2 and 3.
//
// A RECORDED SCOPE DECISION — F.8 row 2's occurrence half. F.8: "a superseding
// attempt with `is_correct = true` is appended; the occurrence created from it
// is superseded." A superseding ATTEMPT is unambiguous and V.10.2 tests it
// directly — this module appends one. A literal superseding OCCURRENCE is not
// constructible for this row: `007`'s `occurrences_has_error` CHECK requires
// `cognitive_error` or `execution_error`, and an attempt corrected to
// `is_correct = true` has no error to classify. Rather than fabricate one to
// satisfy the word "superseded", this module records the superseded
// occurrence's id on the `correction_requests` row's `resolution_ref` /
// `details` so the audit trail and export both show which occurrence stopped
// being evidence and why — the same "state it, never invent it" posture
// `mistakes/engine.ts`'s own TODOs (G.1.a, G.6.a) use for a gap this
// architecture leaves genuinely open. Flagged here rather than silently
// resolved either way.
// ═══════════════════════════════════════════════════════════════════════════

import { supabaseServer } from "./supabase-server";
import { ingestEvents, writeAuditEntry } from "./events";
import {
  buildCorrectionRequest,
  buildDispute,
  declarationCorrectionEventDraft,
  occurrenceCorrectionPatch,
  type CorrectionRequestInput,
  type CorrectionRequestRecord,
} from "./correction";
import {
  buildRevocation,
  supersedingEventDraft,
  withdrawalPatch,
  type RevocationInput,
} from "./assessment-revocation";
import { decideCorrectionRestatement } from "./restatement";
import { recomputeAndRestate, readPriorSnapshot } from "./score-recompute-server";
import { randomUUID } from "node:crypto";

export type SubmitCorrectionRefusal =
  | { code: "invalid_request"; detail: string }
  | { code: "target_not_found"; detail: string }
  | { code: "no_superseded_fact"; detail: string }
  | { code: "write_failed"; detail: string };

export interface SubmitCorrectionResult {
  ok: boolean;
  correction: CorrectionRequestRecord | null;
  refusal?: SubmitCorrectionRefusal;
}

function newId(): string {
  return randomUUID();
}

async function markResolved(correctionId: string, ref: string): Promise<void> {
  await supabaseServer
    .from("correction_requests")
    .update({ resolution_ref: ref })
    .eq("correction_id", correctionId)
    .is("resolution_ref", null);
}

/**
 * O.3's whole diagram, run end to end. `studentId` from the caller's verified
 * session, never the body (D.1.a). Never throws — every failure is typed and
 * returned, so a caller shows the student what happened.
 */
export async function submitCorrection(
  studentId: string,
  input: Omit<CorrectionRequestInput, "correction_id" | "student_id" | "at">,
  opts: { now?: () => number } = {},
): Promise<SubmitCorrectionResult> {
  const now = opts.now ?? (() => Date.now());
  const at = new Date(now()).toISOString();
  const correctionId = newId();

  const built = buildCorrectionRequest({ ...input, correction_id: correctionId, student_id: studentId, at });
  if (!built.ok) {
    return { ok: false, correction: null, refusal: { code: "invalid_request", detail: built.detail } };
  }
  const correction = built.record;

  const { error: insertErr } = await supabaseServer.from("correction_requests").insert({
    correction_id: correction.correction_id,
    student_id: correction.student_id,
    target_type: correction.target_type,
    target_id: correction.target_id,
    claim: correction.claim,
    reason: correction.reason,
    claim_kind: correction.claim_kind,
    outcome: correction.outcome,
    requested_at: correction.requested_at,
  });
  if (insertErr) {
    return { ok: false, correction: null, refusal: { code: "write_failed", detail: insertErr.message } };
  }

  await writeAuditEntry({
    actor: "student",
    action: "correction_requested",
    student_id: studentId,
    target_table: "correction_requests",
    target_id: correction.correction_id,
    reason: correction.reason,
    details: { target_type: correction.target_type, target_id: correction.target_id, outcome: correction.outcome },
    policy_version: null,
    at,
  });

  if (correction.outcome === "disputed") {
    return openDispute(correction, at);
  }

  switch (correction.target_type) {
    case "declaration":
      return acceptDeclarationCorrection(correction, at);
    case "question":
      return acceptQuestionCorrection(correction, at, now);
    case "assessment_attempt":
      return acceptAttemptCorrection(correction, at, now);
    case "occurrence":
      return acceptOccurrenceCorrection(correction, at);
    default:
      return { ok: false, correction, refusal: { code: "invalid_request", detail: "unreachable target_type" } };
  }
}

// ── DISPUTE (O.3.a) — never silently rejected, never silently wins ─────────

async function openDispute(correction: CorrectionRequestRecord, at: string): Promise<SubmitCorrectionResult> {
  let attemptId: string | null = null;
  let questionId: string | null = null;

  if (correction.target_type === "assessment_attempt") {
    const { data } = await supabaseServer
      .from("assessment_attempts")
      .select("attempt_id, question_id")
      .eq("attempt_id", correction.target_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, correction, refusal: { code: "target_not_found", detail: "attempt not found" } };
    }
    attemptId = data.attempt_id as string;
    questionId = data.question_id as string;
  } else if (correction.target_type === "question") {
    questionId = correction.target_id;
  } else if (correction.target_type === "occurrence") {
    const { data } = await supabaseServer
      .from("occurrences")
      .select("id, assessment_attempt_id")
      .eq("id", correction.target_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, correction, refusal: { code: "target_not_found", detail: "occurrence not found" } };
    }
    if (!data.assessment_attempt_id) {
      // A dispute record needs an attempt or a question to stand against
      // (030's own constraint). An extraction-originated occurrence has
      // neither, and this module refuses rather than fabricate one.
      return {
        ok: false,
        correction,
        refusal: { code: "invalid_request", detail: "this occurrence has no assessment attempt to dispute against" },
      };
    }
    attemptId = data.assessment_attempt_id as string;
  }

  const dispute = buildDispute({
    dispute_id: newId(),
    correction,
    attempt_id: attemptId,
    at,
  });

  const { error } = await supabaseServer.from("assessment_attempt_disputes").insert({
    dispute_id: dispute.dispute_id,
    correction_id: dispute.correction_id,
    student_id: dispute.student_id,
    attempt_id: dispute.attempt_id,
    question_id: questionId,
    reason: dispute.reason,
    status: "open",
    opened_at: dispute.opened_at,
  });
  if (error) return { ok: false, correction, refusal: { code: "write_failed", detail: error.message } };

  await markResolved(correction.correction_id, dispute.dispute_id);

  await writeAuditEntry({
    actor: "system",
    action: "dispute_opened",
    student_id: correction.student_id,
    target_table: "assessment_attempt_disputes",
    target_id: dispute.dispute_id,
    reason: correction.reason,
    details: { correction_id: correction.correction_id, target_type: correction.target_type },
    policy_version: null,
    at,
  });

  // V.10.1: the original stands, but is excluded from every score dimension
  // in both directions, effective immediately — the same recompute path an
  // accepted correction triggers, because the exclusion is itself a change to
  // the student's evidence.
  await restateFor(correction, "This attempt is now under an open dispute and is excluded from scoring until resolved.");

  return { ok: true, correction };
}

// ── DECLARATION — auto-accepted, always ─────────────────────────────────────

async function acceptDeclarationCorrection(
  correction: CorrectionRequestRecord,
  at: string,
): Promise<SubmitCorrectionResult> {
  const { data: original } = await supabaseServer
    .from("academic_events")
    .select("event_id")
    .eq("event_id", correction.target_id)
    .maybeSingle();
  if (!original) {
    return { ok: false, correction, refusal: { code: "target_not_found", detail: "declaration event not found" } };
  }

  const draft = declarationCorrectionEventDraft({
    client_event_id: `correction:${correction.correction_id}`,
    correction,
    supersedes_event_id: correction.target_id,
    occurred_at: at,
  });

  const result = await ingestEvents(correction.student_id, { events: [draft] });
  const outcome = result.results[0];
  if (!result.ok || !outcome || outcome.outcome === "quarantined") {
    return {
      ok: false,
      correction,
      refusal: { code: "no_superseded_fact", detail: "the superseding event was refused" },
    };
  }

  await markResolved(correction.correction_id, outcome.event_id ?? "unavailable");
  await writeAuditEntry({
    actor: "system",
    action: "correction_resolved",
    student_id: correction.student_id,
    target_table: "academic_events",
    target_id: outcome.event_id,
    reason: correction.reason,
    details: { correction_id: correction.correction_id, outcome: "auto_accepted" },
    policy_version: null,
    at,
  });

  // O.4.b's own example: a corrected declaration moves no score dimension by
  // itself (D.2.b), so there is no restatement to force here — the record
  // corrects; the score, which never read the declared text as evidence, has
  // nothing to recompute.
  return { ok: true, correction };
}

// ── QUESTION (F.8 row 1) — reuse M10-6's revocation, verbatim ──────────────

async function acceptQuestionCorrection(
  correction: CorrectionRequestRecord,
  at: string,
  now: () => number,
): Promise<SubmitCorrectionResult> {
  const { data: q } = await supabaseServer
    .from("assessment_questions")
    .select("question_id, student_id, provenance")
    .eq("question_id", correction.target_id)
    .maybeSingle();
  if (!q) return { ok: false, correction, refusal: { code: "target_not_found", detail: "question not found" } };

  const revInput: RevocationInput = {
    revocation_id: newId(),
    question: { question_id: q.question_id, student_id: q.student_id, provenance: q.provenance },
    scope: "question",
    selector: q.question_id,
    reason: correction.reason,
    revoked_by: "student_dispute",
    at,
  };
  const rev = buildRevocation(revInput);
  if (!rev.ok) return { ok: false, correction, refusal: { code: "invalid_request", detail: rev.detail } };

  const { error: revErr } = await supabaseServer.from("assessment_question_revocations").insert({
    revocation_id: rev.revocation.revocation_id,
    question_id: rev.revocation.question_id,
    student_id: rev.revocation.student_id,
    scope: rev.revocation.scope,
    selector: rev.revocation.selector,
    reason: rev.revocation.reason,
    revoked_by: rev.revocation.revoked_by,
    revoked_at: rev.revocation.revoked_at,
  });
  if (revErr) return { ok: false, correction, refusal: { code: "write_failed", detail: revErr.message } };

  // F.8: "the question is withdrawn from the bank" — 023 §9's one permitted edit.
  await supabaseServer.from("assessment_questions").update(withdrawalPatch()).eq("question_id", q.question_id);

  const { data: attempt } = await supabaseServer
    .from("assessment_attempts")
    .select("attempt_id")
    .eq("question_id", q.question_id)
    .order("attempt_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  let supersedingEventId: string | null = null;
  if (attempt) {
    const { data: factEvent } = await supabaseServer
      .from("academic_events")
      .select("event_id")
      .eq("student_id", correction.student_id)
      .in("event_type", ["QUESTION_WRONG", "QUESTION_CORRECT"])
      .contains("payload", { attempt_id: attempt.attempt_id })
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (factEvent) {
      const draft = supersedingEventDraft({
        client_event_id: `correction:${correction.correction_id}`,
        revocation: rev.revocation,
        attempt_id: attempt.attempt_id,
        supersedes_event_id: factEvent.event_id,
        occurred_at: at,
      });
      const result = await ingestEvents(correction.student_id, { events: [draft] });
      supersedingEventId = result.results[0]?.event_id ?? null;
      if (supersedingEventId) {
        await supabaseServer
          .from("assessment_question_revocations")
          .update({ superseding_event_id: supersedingEventId })
          .eq("revocation_id", rev.revocation.revocation_id);
      }
    }
  }

  await markResolved(correction.correction_id, rev.revocation.revocation_id);
  await writeAuditEntry({
    actor: "system",
    action: "correction_resolved",
    student_id: correction.student_id,
    target_table: "assessment_question_revocations",
    target_id: rev.revocation.revocation_id,
    reason: correction.reason,
    details: { correction_id: correction.correction_id, question_id: q.question_id, superseding_event_id: supersedingEventId },
    policy_version: null,
    at,
  });

  await restateFor(correction, "A question was found wrong or ambiguous; it and its answers no longer count as evidence.", now);

  return { ok: true, correction };
}

// ── ASSESSMENT_ATTEMPT (F.8 row 2) — a superseding attempt, appended ───────

async function acceptAttemptCorrection(
  correction: CorrectionRequestRecord,
  at: string,
  now: () => number,
): Promise<SubmitCorrectionResult> {
  const { data: original } = await supabaseServer
    .from("assessment_attempts")
    .select("*")
    .eq("attempt_id", correction.target_id)
    .maybeSingle();
  if (!original) return { ok: false, correction, refusal: { code: "target_not_found", detail: "attempt not found" } };

  const { data: maxRow } = await supabaseServer
    .from("assessment_attempts")
    .select("attempt_no")
    .eq("question_id", original.question_id)
    .order("attempt_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextAttemptNo = (maxRow?.attempt_no ?? original.attempt_no) + 1;

  const { data: superseding, error: insErr } = await supabaseServer
    .from("assessment_attempts")
    .insert({
      question_id: original.question_id,
      assessment_id: original.assessment_id,
      session_id: original.session_id,
      student_id: original.student_id,
      attempt_no: nextAttemptNo,
      submitted_answer: original.submitted_answer,
      is_correct: true,
      marks_awarded: Math.max(1, original.marks_awarded || 1),
      grade_rule: "correction_override",
      time_ms: original.time_ms,
    })
    .select("attempt_id")
    .single();
  if (insErr || !superseding) {
    return { ok: false, correction, refusal: { code: "write_failed", detail: insErr?.message ?? "insert failed" } };
  }

  const { data: occurrence } = await supabaseServer
    .from("occurrences")
    .select("id")
    .eq("assessment_attempt_id", original.attempt_id)
    .maybeSingle();

  await markResolved(correction.correction_id, superseding.attempt_id);
  await writeAuditEntry({
    actor: "system",
    action: "correction_resolved",
    student_id: correction.student_id,
    target_table: "assessment_attempts",
    target_id: superseding.attempt_id,
    reason: correction.reason,
    details: {
      correction_id: correction.correction_id,
      original_attempt_id: original.attempt_id,
      // See this file's header: the occurrence is not literally superseded by
      // a same-shape row (007's has_error CHECK forbids an errorless one) —
      // its id is recorded here so the export and the record both show it
      // stopped being evidence, and why.
      superseded_occurrence_id: occurrence?.id ?? null,
    },
    policy_version: null,
    at,
  });

  await restateFor(correction, "An answer marked wrong was corrected to right; the original attempt still exists but no longer counts as a miss.", now);

  return { ok: true, correction };
}

// ── OCCURRENCE (F.8 row 3) — a superseding occurrence, appended ────────────

async function acceptOccurrenceCorrection(
  correction: CorrectionRequestRecord,
  at: string,
): Promise<SubmitCorrectionResult> {
  const { data: original } = await supabaseServer
    .from("occurrences")
    .select("*")
    .eq("id", correction.target_id)
    .maybeSingle();
  if (!original) return { ok: false, correction, refusal: { code: "target_not_found", detail: "occurrence not found" } };

  // The claim's payload — which classification is being corrected TO — rides
  // in `claim` as `cognitive:<value>` or `execution:<value>`; anything else is
  // refused rather than guessed.
  const [kind, value] = correction.claim.split(":");
  const cognitive = kind === "cognitive" ? value : null;
  const execution = kind === "execution" ? value : null;
  if (!cognitive && !execution) {
    return {
      ok: false,
      correction,
      refusal: { code: "invalid_request", detail: "claim must be 'cognitive:<type>' or 'execution:<type>'" },
    };
  }

  const patch = occurrenceCorrectionPatch(cognitive, execution, original.id);

  const { data: inserted, error } = await supabaseServer
    .from("occurrences")
    .insert({
      student_id: original.student_id,
      evidence_id: original.evidence_id,
      source: original.source,
      subject: original.subject,
      chapter: original.chapter,
      topic: original.topic,
      concept_id: original.concept_id,
      question_ref: original.question_ref,
      marks_lost: original.marks_lost,
      marks_available: original.marks_available,
      cognitive_error: patch.cognitive_error,
      execution_error: patch.execution_error,
      confidence_before: original.confidence_before,
      student_answer: original.student_answer,
      expected_answer: original.expected_answer,
      marker_note: original.marker_note,
      origin: original.origin,
      supersedes: patch.supersedes,
      assessment_attempt_id: original.assessment_attempt_id,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    return { ok: false, correction, refusal: { code: "write_failed", detail: error?.message ?? "insert failed" } };
  }

  await markResolved(correction.correction_id, inserted.id);
  await writeAuditEntry({
    actor: "system",
    action: "correction_resolved",
    student_id: correction.student_id,
    target_table: "occurrences",
    target_id: inserted.id,
    reason: correction.reason,
    details: { correction_id: correction.correction_id, supersedes: original.id },
    policy_version: null,
    at,
  });

  // A reclassification changes WHICH pattern an occurrence's history feeds,
  // not whether it counts as a mark lost at all — recovery counts unaffected.
  // No restatement forced; M11's merge (not M18's) is what re-derives pattern
  // membership from the superseding row's presence.
  return { ok: true, correction };
}

// ── M18-3 — force the recompute, mark the snapshot restated ────────────────

async function restateFor(
  correction: CorrectionRequestRecord,
  reason: string,
  now: () => number = () => Date.now(),
): Promise<void> {
  const prior = await readPriorSnapshot(correction.student_id);
  const restatement = decideCorrectionRestatement({
    prior,
    correctionId: correction.correction_id,
    reason,
  });

  const result = await recomputeAndRestate(correction.student_id, restatement, { nowMs: now() });

  await writeAuditEntry({
    actor: "system",
    action: "score_restatement",
    student_id: correction.student_id,
    target_table: "score_history",
    target_id: result.ok ? String(result.snapshot.captured_on) : null,
    reason,
    details: {
      correction_id: correction.correction_id,
      restatement_of: restatement.restatementOf,
      ok: result.ok,
      ...(result.ok ? {} : { detail: result.detail }),
    },
    policy_version: null,
    at: new Date(now()).toISOString(),
  });
}
