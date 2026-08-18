// ═══════════════════════════════════════════════════════════════════════════
// M8-6 — MANUAL ENTRY. A PAPER CAPTURED WITH ZERO MODEL INVOLVEMENT.
//
// EXECUTION_PLAN M8-6: *"Manual entry fallback. Done when: a paper can be
// captured with zero model involvement."*
//
// THIS FILE IMPORTS NOTHING THAT COULD CALL A MODEL, and a test asserts it over
// the whole file: no Anthropic, no `/api/ai`, no `lib/ai-guard`, no
// `lib/capture-extraction`. It is not extraction with the call skipped — it
// never enters the extraction path at all. What the student typed IS the
// reading, and there is nothing for a model to add to it.
//
//
// WHY IT IS A SEPARATE ROUTE AND NOT A FLAG
//
// A `?skip_ai=true` parameter on the extraction endpoint would put the manual
// path one boolean away from the guard, the meter, the classifier and the key.
// The done-when is *"zero model involvement"*, and the only version of that
// which survives a refactor is a file with no path to a model in it.
//
//
// WHAT IT SHARES, AND WHAT IT MUST SHARE
//
// It shares the confirmation gate — and only that. A typed draft is written by
// the same `writeDraftOccurrences()`, with `confirmed_at` absent for the same
// reason, and is confirmed at the same `/api/capture/confirm` under the same
// `020` policy. `origin` is the ONLY difference between a typed draft and an
// extracted one, and it is provenance, not privilege: `manual` buys the row
// nothing. A hand-typed mistake is not more trusted than a read one, and it is
// not less trusted either — both are proposals until the student confirms.
//
//
// WHERE THE EVIDENCE COMES FROM
//
// `occurrences.evidence_id` is `NOT NULL`, so a typed mistake still needs a
// piece of evidence, and inventing one would be exactly the fabrication §3.2
// forbids. Two honest sources, and the student picks:
//
//   · `evidence_id` — a paper they already photographed at `/capture`. The
//     typed entry describes a mark lost on THAT paper.
//   · `note`        — what they typed, stored verbatim as `manual` evidence
//     through the identical `captureEvidence()` path a photograph takes: same
//     hash, same bucket, same dedup constraint. What the student wrote is the
//     evidence, which is honest, because it is.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient, supabaseServer } from "@/lib/supabase-server";
import { captureEvidence, type DbResult, type EvidenceDb, type Row } from "@/lib/evidence";
import { EVIDENCE_BUCKET, type EvidenceStorage } from "@/lib/storage";
import { beginCaptureIngestion } from "@/lib/capture-intake";
import {
  createSupabaseIngestionStore,
  findRunIdForEvidence,
  type IngestionDb,
  type OrderBy,
} from "@/lib/ingest/supabase-store";
import {
  COGNITIVE_ERRORS,
  EXECUTION_ERRORS,
  OCCURRENCE_SOURCES,
  writeDraftOccurrences,
  type DraftOccurrenceInput,
  type OccurrenceDb,
} from "@/lib/occurrences";
import type { CognitiveError, ExecutionError, OccurrenceSource } from "@/lib/mistakes/types";
import { conceptResolutionContext, listConcepts } from "@/lib/concepts";
import { resolveConceptText } from "@/lib/concept-resolution";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Adapters. The same twenty lines the capture endpoint supplies. ──────────

const evidenceDb: EvidenceDb = {
  async insertEvidence(row: Row): Promise<DbResult<Row>> {
    const { data, error } = await supabaseServer.from("evidence").insert(row).select().single();
    return { data: (data as Row) ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
  async findEvidenceByHash(studentId: string, contentHash: string): Promise<DbResult<Row>> {
    const { data, error } = await supabaseServer
      .from("evidence")
      .select("*")
      .eq("student_id", studentId)
      .eq("content_hash", contentHash)
      .maybeSingle();
    return { data: (data as Row) ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
};

const evidenceStorage: EvidenceStorage = {
  async upload(path, bytes, options) {
    const { error } = await supabaseServer.storage
      .from(EVIDENCE_BUCKET)
      .upload(path, new Blob([new Uint8Array(bytes)], { type: options.contentType }), {
        contentType: options.contentType,
        upsert: options.upsert,
      });
    return { error: error ? { message: error.message } : null };
  },
};

const ingestionDb: IngestionDb = {
  async insert(table, row) {
    const { data, error } = await supabaseServer.from(table).insert(row).select().single();
    return { data: (data as Row) ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
  async selectOne(table, match) {
    let q = supabaseServer.from(table).select("*");
    for (const [column, value] of Object.entries(match)) q = q.eq(column, value as never);
    const { data, error } = await q.maybeSingle();
    return { data: (data as Row) ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
  async selectMany(table, match, order?: OrderBy[]) {
    let q = supabaseServer.from(table).select("*");
    for (const [column, value] of Object.entries(match)) q = q.eq(column, value as never);
    for (const o of order ?? []) q = q.order(o.column, { ascending: o.ascending });
    const { data, error } = await q;
    return { data: (data as Row[]) ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
  async update(table, match, patch) {
    let q = supabaseServer.from(table).update(patch);
    for (const [column, value] of Object.entries(match)) q = q.eq(column, value as never);
    const { error } = await q;
    return { data: null, error: error ? { code: error.code, message: error.message } : null };
  },
};

const occurrenceDb: OccurrenceDb = {
  async insertOccurrences(rows) {
    const { data, error } = await supabaseServer.from("occurrences").insert(rows).select();
    return { data: (data as Row[]) ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
  async confirm() {
    // Manual entry cannot confirm. The gate is one endpoint, for both paths.
    return { data: null, error: { message: "manual entry cannot confirm an occurrence" } };
  },
  async listDrafts(studentId) {
    const { data, error } = await supabaseServer
      .from("occurrences").select("*").eq("student_id", studentId).is("confirmed_at", null);
    return { data: (data as Row[]) ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
  async listConfirmed(studentId) {
    const { data, error } = await supabaseServer
      .from("confirmed_occurrences").select("*").eq("student_id", studentId);
    return { data: (data as Row[]) ?? null, error: error ? { code: error.code, message: error.message } : null };
  },
};

// ── Input ───────────────────────────────────────────────────────────────────

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const int = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};

export async function POST(req: Request) {
  // ── 1 · authenticate ─────────────────────────────────────────────────────
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const studentId = userData?.user?.id;
  if (authError || !studentId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const topicText = str(body.topic, 200);
  const questionRef = str(body.question_ref, 60) || "unstated";
  const marksLost = int(body.marks_lost);
  const marksAvailable = int(body.marks_available);
  const studentAnswer = str(body.student_answer, 2000);
  const note = str(body.note, 2000);

  const cognitiveRaw = str(body.cognitive_error, 60);
  const executionRaw = str(body.execution_error, 60);
  const cognitiveError = COGNITIVE_ERRORS.includes(cognitiveRaw as CognitiveError)
    ? (cognitiveRaw as CognitiveError)
    : null;
  const executionError = EXECUTION_ERRORS.includes(executionRaw as ExecutionError)
    ? (executionRaw as ExecutionError)
    : null;

  const sourceRaw = str(body.source, 40);
  const source: OccurrenceSource = OCCURRENCE_SOURCES.includes(sourceRaw as OccurrenceSource)
    ? (sourceRaw as OccurrenceSource)
    : "self-test";

  if (!topicText) {
    return NextResponse.json({ ok: false, error: "no_topic" }, { status: 400 });
  }
  if (!cognitiveError && !executionError) {
    // `occurrences_has_error`. Refused here so the student is told, rather than
    // discovering it as a 500 from a CHECK constraint.
    return NextResponse.json({ ok: false, error: "no_error_classification" }, { status: 400 });
  }
  if (marksLost === null || marksAvailable === null) {
    return NextResponse.json({ ok: false, error: "no_marks" }, { status: 400 });
  }

  // ── 2 · resolve the concept. NO GUESS ────────────────────────────────────
  // The taxonomy answers or it does not. An unresolved topic is refused with
  // the student's own words handed back, because writing a row against the
  // wrong concept records their mistake in someone else's chapter forever.
  const [{ index }, { concepts }] = await Promise.all([conceptResolutionContext(), listConcepts()]);
  const resolution = resolveConceptText(topicText, index);
  if (resolution.status !== "resolved") {
    return NextResponse.json(
      {
        ok: false,
        error: "unresolved_topic",
        declared_text: resolution.declaredText,
        reason: resolution.reason,
      },
      { status: 422 },
    );
  }
  const concept = concepts.find(c => c.id === resolution.conceptId);
  if (!concept) {
    return NextResponse.json({ ok: false, error: "unresolved_topic" }, { status: 422 });
  }

  // ── 3 · the evidence ─────────────────────────────────────────────────────
  const capturedAt = new Date().toISOString();
  const now = () => new Date().toISOString();

  let evidenceId = str(body.evidence_id, 64);

  if (evidenceId) {
    // Read through the student's own client so `007`'s policy answers whether
    // this evidence is theirs.
    const { data: owned } = await supabase
      .from("evidence").select("id").eq("id", evidenceId).maybeSingle();
    if (!owned) {
      return NextResponse.json({ ok: false, error: "no_such_evidence" }, { status: 404 });
    }
  } else {
    // What the student wrote IS the evidence. Same path a photograph takes.
    const written =
      `${topicText}\n${questionRef}\n${marksLost}/${marksAvailable}\n` +
      `${cognitiveError ?? ""} ${executionError ?? ""}\n${studentAnswer}\n${note}`;

    const captured = await captureEvidence(
      { db: evidenceDb, storage: evidenceStorage },
      {
        studentId,
        bytes: new TextEncoder().encode(written),
        contentType: "text/plain",
        kind: "paper",
        capturedAt,
        sourceDescription: note || topicText,
      },
    );

    if (!captured.ok) {
      return NextResponse.json({ ok: false, error: captured.code, detail: captured.detail }, { status: 503 });
    }
    evidenceId = captured.evidence.id;

    // The typed entry enters the same stage ledger a photograph does, so one
    // paper has one history whichever way it arrived.
    try {
      const store = createSupabaseIngestionStore(ingestionDb);
      await beginCaptureIngestion({
        store,
        studentId,
        facts: {
          evidenceId,
          contentHash: captured.contentHash,
          storageRef: captured.evidence.storage_ref,
          byteSize: written.length,
          contentType: "text/plain",
          kind: "paper",
          evidenceType: captured.evidence.type,
        },
        meta: { channel: "web", entry: "manual" },
        now,
        existingRunId: await findRunIdForEvidence(ingestionDb, studentId, evidenceId),
      });
    } catch {
      // The evidence is safe and the draft can still be written. A ledger
      // failure is not a reason to lose what the student typed.
    }
  }

  const runId = await findRunIdForEvidence(ingestionDb, studentId, evidenceId);

  // ── 4 · the draft. Same builder, same absent `confirmed_at` ──────────────
  const draft: DraftOccurrenceInput = {
    studentId,
    evidenceId,
    conceptId: concept.id,
    subject: concept.subject,
    chapter: concept.chapter,
    topic: concept.topic,
    source,
    questionRef,
    marksLost,
    marksAvailable,
    cognitiveError,
    executionError,
    studentAnswer: { kind: "text", text: studentAnswer },
    markerNote: note || null,
    origin: "manual",
    ingestionRunId: runId,
    // No `proposalConfidence`. `buildDraftOccurrence()` REFUSES one on a manual
    // entry: a student typing what they got wrong is not a judgement call with
    // a confidence, and recording one would invent a reading nobody made.
  };

  const result = await writeDraftOccurrences(occurrenceDb, [draft]);

  if (result.error || result.written.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "draft_write_failed",
        detail: result.error?.message ?? result.refused[0]?.detail ?? "the entry was refused",
        refused: result.refused,
      },
      { status: result.refused.length > 0 ? 400 : 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    /** A DRAFT, exactly like an extracted one. It reaches the record through
     *  `/api/capture/confirm` and through no other door. */
    drafts: result.written,
    run_id: runId,
    evidence_id: evidenceId,
    /** Stated so the caller — and any future reader of this response — can see
     *  that nothing read the paper. */
    model: null,
  });
}
