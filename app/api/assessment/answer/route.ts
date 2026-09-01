// ═══════════════════════════════════════════════════════════════════════════
// M10-5 / M10-7 — THE ANSWER ENDPOINT. GRADE, RECORD, LOG, THEN ADVANCE.
//
// EXECUTION_PLAN M10-5: *"Deterministic grading against a stored `answer_key`."*
// EXECUTION_PLAN M10-7: *"Immediate mistake logging on a wrong answer. Done
// when: V.4.1 — the occurrence exists **before the next question renders**."*
//
// **THIS ROUTE IMPORTS NO MODEL AND NO SDK.** `app/api/assessment/generate` is
// the one place in the assessment path that reaches Anthropic (Q.4 — *"one
// module owns every model call"*), and this file is the demonstration that the
// grading half genuinely does not: there is no `Anthropic`, no `ai-guard`, no
// classifier and no meter here, because grading a closed-form answer against a
// stored key needs none of them (F.4.a, P.3.a).
//
//
// THE ORDER OF THIS ENDPOINT IS THE MILESTONE
//
//   1 authenticate                  identity is the token's, never the body's
//   2 read the question AS THE STUDENT   RLS answers "is this yours?"
//   3 grade                          pure, synchronous, no I/O, no model
//   4 write the attempt              F.5, append-only with `attempt_no`
//   5 write the evidence             007: no occurrence without proof
//   6 write the occurrence           V.4.1
//   7 confirm it, where a rule decided the classification (024 §7)
//   8 ONLY THEN answer `advance: { permitted: true }`
//
// Steps 5–8 are `logAssessmentMistake()`'s, and the ordering is a DATA
// DEPENDENCY inside it rather than the order of statements here: the value that
// grants permission to advance is constructed from the resolved write. A client
// cannot render the next question without a response, and the response cannot
// exist before the occurrence does.
//
// **The answer key never leaves the server.** It is read here, compared here,
// and the response carries a verdict — never the key, never the correct option,
// never an explanation (F.3.b: generating the explanation of a right answer is
// teaching, and PRINCIPLES §1.4 puts it out of scope).
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createStudentServerClient, supabaseServer } from "@/lib/supabase-server";
import {
  attemptRowFor,
  gradeAttempt,
  nextAttemptNo,
  type GradableQuestion,
  type SubmittedAnswer,
} from "@/lib/assessment-grading";
import {
  logAssessmentMistake,
  questionWrongEventDraft,
  type ConceptPath,
  type MistakeDb,
} from "@/lib/assessment-mistakes";
import type { Row } from "@/lib/occurrences";
import {
  ingestOccurrenceIntoDna,
  type MistakeDnaDb,
  type PatternKey,
} from "@/lib/mistakes/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Parse the submission. A shape this does not recognise is REFUSED, never
 *  coerced into `blank` — Q.4's *"output that fails validation is rejected, not
 *  degraded"*, applied to input, and for a sharper reason: coercing an
 *  unreadable submission into a blank would write a mistake the student did not
 *  make. */
function parseSubmitted(raw: unknown): SubmittedAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const idx = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

  if (a.kind === "blank") return { kind: "blank" };
  if (a.kind === "mcq" && idx(a.selected_index)) {
    return { kind: "mcq", selected_index: a.selected_index };
  }
  if (a.kind === "numeric" && typeof a.value === "number" && Number.isFinite(a.value)) {
    const unit = typeof a.unit === "string" ? a.unit : null;
    return { kind: "numeric", value: a.value, unit };
  }
  if (a.kind === "ordering" && Array.isArray(a.order) && a.order.every(idx)) {
    return { kind: "ordering", order: a.order as number[] };
  }
  if (a.kind === "match" && Array.isArray(a.pairs)) {
    const pairs: [number, number][] = [];
    for (const p of a.pairs) {
      if (!Array.isArray(p) || p.length !== 2 || !idx(p[0]) || !idx(p[1])) return null;
      pairs.push([p[0], p[1]]);
    }
    return { kind: "match", pairs };
  }
  return null;
}

/** The four writes M10-7 needs, over the service-role client.
 *
 *  `confirmAsSystem` is `024` §7's confirmation and is deliberately NOT M8-5's
 *  `confirm`: that one must run under the STUDENT's credentials so `020`'s RLS
 *  policy decides, and conflating the two would let one refactor turn a student
 *  gate into a service-role one. */
const mistakeDb: MistakeDb = {
  async insertAttemptEvidence(row: Row) {
    const { data, error } = await supabaseServer
      .from("evidence")
      .insert(row)
      .select()
      .maybeSingle();
    // 23505 is `evidence_student_hash_unique` — the same paper twice is one
    // piece of evidence (M8-2), and here it means the same attempt twice is one.
    if (error && error.code === "23505") {
      const { data: existing, error: readError } = await supabaseServer
        .from("evidence")
        .select("*")
        .eq("id", row.id as string)
        .maybeSingle();
      return { data: existing ?? null, error: readError ? { code: readError.code, message: readError.message } : null };
    }
    return { data: data ?? null, error: error ? { code: error.code, message: error.message } : null };
  },

  async insertOccurrences(rows: Row[]) {
    const { data, error } = await supabaseServer.from("occurrences").insert(rows).select();
    return { data: data ?? null, error: error ? { code: error.code, message: error.message } : null };
  },

  async confirm(occurrenceId, studentId, at) {
    // M8-5's student path is not reachable from this route and is present only
    // because `OccurrenceDb` declares it. It is implemented rather than thrown
    // so a future caller gets the real, RLS-bound behaviour.
    const supabase = await createStudentServerClient();
    const { data, error } = await supabase
      .from("occurrences")
      .update({ confirmed_at: at })
      .eq("id", occurrenceId)
      .eq("student_id", studentId)
      .is("confirmed_at", null)
      .select();
    return { data: data ?? null, error: error ? { code: error.code, message: error.message } : null };
  },

  async confirmAsSystem(occurrenceId, studentId, at) {
    const { data, error } = await supabaseServer
      .from("occurrences")
      .update({ confirmed_at: at, confirmed_by: "assessment" })
      .eq("id", occurrenceId)
      .eq("student_id", studentId)
      .eq("origin", "assessment")
      .is("confirmed_at", null)
      .select();
    return { data: data ?? null, error: error ? { code: error.code, message: error.message } : null };
  },

  async listDrafts(studentId) {
    const { data, error } = await supabaseServer
      .from("occurrences").select("*").eq("student_id", studentId).is("confirmed_at", null);
    return { data: data ?? null, error: error ? { code: error.code, message: error.message } : null };
  },

  async listConfirmed(studentId) {
    const { data, error } = await supabaseServer
      .from("confirmed_occurrences").select("*").eq("student_id", studentId);
    return { data: data ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// M11-1 — MISTAKE DNA's PRODUCTION CALL SITE.
//
// `lib/mistakes/engine.ts` had ZERO production importers from M1 until this
// line (architecture T12, G.1: *"**CURRENT FACT: zero production importers.**
// … What is missing is a server data-access layer and a capture path — **not
// domain logic.**"*). `lib/mistakes/store.ts` is that layer, and this is the
// path: a confirmed, assessment-originated occurrence becomes a pattern, a
// severity and a retest schedule, through `mergeOccurrence()` and
// `computeSeverity()` — the engine's own functions, running in the shipped
// request.
//
// **It runs AFTER `advance` has been decided and can never withhold it.** F.6's
// ordering guarantee is about the OCCURRENCE, which `logAssessmentMistake()`
// has already written by the time this runs. Mistake DNA is an INFERENCE over
// that fact (G.2: *"Recurring pattern … An inference."*), and an inference that
// could not be drawn must never cost a student the answer they already gave.
//
// The verbs below are the service role's because `007` gives `patterns` no
// UPDATE path a client may use for a derived column, and `025` §6 revokes the
// rest. Identity still comes only from the question row, which was read as the
// student in step 2.
// ═══════════════════════════════════════════════════════════════════════════

/** Statuses whose leaves count toward G.6's *"open leaves"* denominator.
 *  `resolved` and `dormant` are excluded: neither is currently costing marks. */
const OPEN_LEAF_STATUSES = ["open", "acknowledged", "practising", "recurred"];

const err = (e: { code?: string | null; message: string } | null) =>
  e ? { code: e.code ?? null, message: e.message } : null;

const dnaDb: MistakeDnaDb = {
  async listLeafCandidates(studentId, conceptId) {
    const { data, error } = await supabaseServer
      .from("patterns")
      .select("*")
      .eq("student_id", studentId)
      .eq("concept_id", conceptId)
      .eq("tier", "concept");
    return { data: data ?? null, error: err(error) };
  },

  async findPattern(key: PatternKey) {
    let q = supabaseServer
      .from("patterns")
      .select("*")
      .eq("student_id", key.studentId)
      .eq("tier", key.tier)
      .eq("error_class", key.errorClass)
      .eq("error_type", key.errorType);
    // `007`'s partial unique indexes key the subject tier on `subject` and the
    // global tier on its absence, so the predicate has to distinguish them.
    q = key.subject === null ? q.is("subject", null) : q.eq("subject", key.subject);
    const { data, error } = await q.maybeSingle();
    return { data: data ?? null, error: err(error) };
  },

  async insertPattern(row: Row) {
    const { data, error } = await supabaseServer.from("patterns").insert(row).select().maybeSingle();
    return { data: data ?? null, error: err(error) };
  },

  async updatePatternDerived(patternId, patch: Row) {
    const { data, error } = await supabaseServer
      .from("patterns")
      .update(patch)
      .eq("id", patternId)
      .select()
      .maybeSingle();
    return { data: data ?? null, error: err(error) };
  },

  async linkOccurrence(occurrenceId, patternId) {
    // `007`'s composite FK `occurrences_pattern_is_leaf` refuses a parent tier
    // here; this call relies on that rather than re-checking it.
    const { data, error } = await supabaseServer
      .from("occurrences")
      .update({ pattern_id: patternId })
      .eq("id", occurrenceId)
      .select();
    return { data: data ?? null, error: err(error) };
  },

  async leafMarksLost(patternId) {
    const { data, error } = await supabaseServer
      .from("occurrences")
      .select("marks_lost")
      .eq("pattern_id", patternId);
    if (error) return { data: null, error: err(error) };
    return { data: (data ?? []).reduce((sum, r) => sum + Number(r.marks_lost ?? 0), 0), error: null };
  },

  async openLeavesMarksLost(studentId) {
    const { data: leaves, error: leafError } = await supabaseServer
      .from("patterns")
      .select("id")
      .eq("student_id", studentId)
      .eq("tier", "concept")
      .in("status", OPEN_LEAF_STATUSES);
    if (leafError) return { data: null, error: err(leafError) };

    const ids = (leaves ?? []).map((l) => String(l.id));
    if (ids.length === 0) return { data: 0, error: null };

    const { data, error } = await supabaseServer
      .from("occurrences")
      .select("marks_lost")
      .in("pattern_id", ids);
    if (error) return { data: null, error: err(error) };
    return { data: (data ?? []).reduce((sum, r) => sum + Number(r.marks_lost ?? 0), 0), error: null };
  },

  async countOccurrencesSince(patternId, sinceIso) {
    const { count, error } = await supabaseServer
      .from("occurrences")
      .select("id", { count: "exact", head: true })
      .eq("pattern_id", patternId)
      .gte("created_at", sinceIso);
    return { data: count ?? 0, error: err(error) };
  },

  async conceptExamWeights(conceptId) {
    const { data: concept, error } = await supabaseServer
      .from("concepts")
      .select("subject, exam_weight")
      .eq("id", conceptId)
      .maybeSingle();
    if (error) return { data: null, error: err(error) };
    if (!concept) return { data: { concept: 0, maxInSubject: 0 }, error: null };

    const { data: siblings, error: siblingError } = await supabaseServer
      .from("concepts")
      .select("exam_weight")
      .eq("subject", concept.subject);
    if (siblingError) return { data: null, error: err(siblingError) };

    const max = (siblings ?? []).reduce((m, c) => Math.max(m, Number(c.exam_weight ?? 0)), 0);
    return { data: { concept: Number(concept.exam_weight ?? 0), maxInSubject: max }, error: null };
  },

  async upsertRetestSchedule(row: Row) {
    const { data, error } = await supabaseServer
      .from("mistake_retest_schedule")
      .upsert(row, { onConflict: "pattern_id" })
      .select()
      .maybeSingle();
    return { data: data ?? null, error: err(error) };
  },
};

export async function POST(req: Request) {
  // ── 1 · authenticate ─────────────────────────────────────────────────────
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const user = userData?.user;
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: { question_id?: unknown; answer?: unknown; time_ms?: unknown; client_event_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const questionId = typeof body.question_id === "string" ? body.question_id : "";
  if (!questionId) return NextResponse.json({ ok: false, error: "no_question" }, { status: 400 });

  const submitted = parseSubmitted(body.answer);
  if (!submitted) return NextResponse.json({ ok: false, error: "unreadable_answer" }, { status: 400 });

  const timeMs =
    typeof body.time_ms === "number" && Number.isFinite(body.time_ms) && body.time_ms >= 0
      ? Math.floor(body.time_ms)
      : null;

  // ── 2 · the question, read AS THE STUDENT ────────────────────────────────
  // 023 §6's `assessment_questions_select_own` is what answers "is this yours?"
  // — an ownership check written here would be a second answer to a question the
  // database already answers.
  const { data: question } = await supabase
    .from("assessment_questions")
    .select("question_id, assessment_id, session_id, student_id, slot_index, concept_ref, concept_id, format, answer_key, marks, options")
    .eq("question_id", questionId)
    .maybeSingle();

  if (!question) return NextResponse.json({ ok: false, error: "no_such_question" }, { status: 404 });

  // ── 3 · GRADE. Pure, synchronous, and there is no model in this file ─────
  const gradable = {
    question_id: String(question.question_id),
    format: question.format,
    answer_key: question.answer_key,
    marks: Number(question.marks),
    options: (question.options as string[] | null) ?? null,
  } as GradableQuestion;

  const graded = gradeAttempt(gradable, submitted);
  if (!graded.ok) {
    // A submission that does not fit the question is refused rather than marked
    // wrong: recording it would put a mistake in the record the student never
    // made (T4, one door along).
    return NextResponse.json(
      { ok: false, error: "ungradable", reason: graded.reason, detail: graded.detail },
      { status: 422 },
    );
  }

  // ── 4 · the attempt, appended ────────────────────────────────────────────
  const { count } = await supabaseServer
    .from("assessment_attempts")
    .select("attempt_id", { count: "exact", head: true })
    .eq("question_id", questionId);

  const attemptId = crypto.randomUUID();
  const at = new Date().toISOString();

  const { error: attemptError } = await supabaseServer.from("assessment_attempts").insert(
    attemptRowFor({
      attempt_id: attemptId,
      question_id: questionId,
      assessment_id: String(question.assessment_id),
      session_id: String(question.session_id),
      student_id: String(question.student_id),
      attempt_no: nextAttemptNo(count ?? 0),
      submitted,
      grade: graded.grade,
      time_ms: timeMs,
      graded_at: at,
    }),
  );

  if (attemptError) {
    Sentry.captureException(new Error(attemptError.message), {
      tags: { route: "api/assessment/answer", phase: "attempt_write" },
    });
    // The attempt is the evidence every later step hangs off. If it did not
    // land, nothing downstream may proceed and the student is not advanced.
    return NextResponse.json({ ok: false, error: "attempt_write_failed" }, { status: 502 });
  }

  // ── 5–8 · evidence, occurrence, confirmation, and only then advance ──────
  let path: ConceptPath | null = null;
  if (!graded.grade.is_correct && question.concept_id) {
    const { data: concept } = await supabaseServer
      .from("concepts")
      .select("id, subject, chapter, topic")
      .eq("id", question.concept_id)
      .maybeSingle();
    if (concept) {
      path = {
        concept_id: String(concept.id),
        subject: String(concept.subject),
        chapter: String(concept.chapter),
        topic: String(concept.topic),
      };
    }
  }

  const logged = await logAssessmentMistake(mistakeDb, {
    question: {
      question_id: String(question.question_id),
      assessment_id: String(question.assessment_id),
      session_id: String(question.session_id),
      student_id: String(question.student_id),
      slot_index: Number(question.slot_index),
      concept_ref: String(question.concept_ref),
      concept_id: (question.concept_id as string | null) ?? null,
      format: question.format,
      answer_key: question.answer_key,
      marks: Number(question.marks),
    },
    attempt_id: attemptId,
    evidence_id: crypto.randomUUID(),
    submitted,
    grade: graded.grade,
    time_ms: timeMs,
    path,
    at,
  });

  // ── 9 · MISTAKE DNA (M11-1) ──────────────────────────────────────────────
  // Only for a CONFIRMED occurrence. M8-5's gate decides what is confirmed and
  // `020`'s view is THE RECORD; drawing a pattern from a draft would infer
  // recurrence from a proposal the student has not agreed with, which is the
  // one thing the confirmation gate exists to prevent.
  let dna: Awaited<ReturnType<typeof ingestOccurrenceIntoDna>> | null = null;
  if (logged.occurrence && logged.confirmed) {
    dna = await ingestOccurrenceIntoDna(dnaDb, {
      occurrence: logged.occurrence,
      ids: { leaf: crypto.randomUUID(), subject: crypto.randomUUID(), global: crypto.randomUUID() },
      at,
      // G.6: `1` at ≤3 days to a goal exam, decaying to `0` at ≥60. V1 stores no
      // exam DATE anywhere (`012` carries `target_exam` as a NAME), so this is
      // null and the factor is 0 with `examProximityKnown: false` — the product
      // does not know of an exam, rather than knowing none is near.
      daysToGoalExam: null,
    });
    if (dna && !dna.ok) {
      // A pattern that could not be drawn is reported, never swallowed and never
      // fatal. The occurrence — the FACT — is already written and confirmed.
      Sentry.captureMessage(`mistake dna refused: ${dna.refusal}`, {
        level: "warning",
        tags: { route: "api/assessment/answer", phase: "mistake_dna" },
        extra: { detail: dna.detail, occurrence_id: String(logged.occurrence.id ?? "") },
      });
    }
  }

  // F.6's `QUESTION_WRONG`, built here and handed to M7's outbox by the client.
  // It is returned rather than emitted server-side because M7 owns the ingest
  // and `client_event_id` idempotency, and a second, unvalidated write path into
  // the event stream is what T7 is about.
  const event = graded.grade.is_correct
    ? null
    : questionWrongEventDraft({
        client_event_id: `qw:${attemptId}`,
        question: {
          question_id: String(question.question_id),
          assessment_id: String(question.assessment_id),
          concept_id: (question.concept_id as string | null) ?? null,
        },
        attempt_id: attemptId,
        evidence_id: String((logged.occurrence?.evidence_id as string | undefined) ?? ""),
        occurred_at: at,
        classification: logged.classification,
      });

  return NextResponse.json({
    ok: true,
    attempt_id: attemptId,
    question_id: questionId,
    /** The verdict. NOT the key, NOT the correct option, NOT an explanation
     *  (F.3.b — the explanation is teaching and is out of V1 scope). */
    is_correct: graded.grade.is_correct,
    marks_awarded: graded.grade.marks_awarded,
    grader: graded.grade.grader,
    grade_rule: graded.grade.rule,
    /** M10-7's guarantee, as a value the client must respect. The occurrence
     *  already exists when this is `true`. */
    advance: logged.advance,
    /** The ordering, readable from the response. `occurrence_written` precedes
     *  `advance` on every path where an occurrence was owed. */
    steps: logged.steps,
    occurrence_id: (logged.occurrence?.id as string | undefined) ?? null,
    occurrence_confirmed: logged.confirmed,
    /** M11-1. `null` when there was no confirmed occurrence to draw an
     *  inference from; a typed refusal when one could not be drawn. Never a
     *  silent absence. */
    mistake_dna: dna === null ? null : dna.ok ? dna.value : { refused: dna.refusal, detail: dna.detail },
    event,
  });
}
