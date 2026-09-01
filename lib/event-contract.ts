// ═══════════════════════════════════════════════════════════════════════════
// M7-1 / M7-2 — THE ACADEMIC EVENT CONTRACT, AS CODE.
//
// This module is architecture Part D, transcribed. It is not a new design: the
// envelope (D.1), the event-type table (D.2) and the validation pipeline (D.3)
// are copied from the specification, and where this file and the architecture
// disagree, this file is the defect.
//
// It holds the CONTRACT and no I/O — no Supabase client, no clock, no network,
// no `next/*`. `lib/events.ts` supplies the database; `app/api/events/route.ts`
// supplies the request; `tests/academic-events.test.mjs` supplies fixtures. The
// same separation `lib/auth-routes.ts` (M4) and `lib/concept-resolution.ts`
// (M6) already use, and for the same reason: the done-when conditions of M7-1
// and M7-2 are properties of a decision, and a decision with no I/O is provable
// without a live database (U.3, the determinism boundary).
//
//
// THE ONE RULE THAT SHAPES EVERYTHING BELOW
//
// D.1: *"Fields marked † are server-assigned and may not be supplied by a
// client; a client that sends one is rejected, not corrected."* So the type a
// client may construct (`ClientEventDraft`) and the type that lands in the
// table (`AcademicEventRow`) are DIFFERENT TYPES, and the server-assigned
// fields exist only on the second. A client cannot even express `seq`.
//
// That is why `SERVER_ASSIGNED_FIELDS` is exported and asserted: the rejection
// is a list, in one place, that a test can read.
//
// No imports. No clock. No network.
// ═══════════════════════════════════════════════════════════════════════════

/** The envelope version this build writes and understands. D.1 `schema_version`. */
export const EVENT_SCHEMA_VERSION = 1;

/** Envelope versions this build can still READ. A stored event is never
 *  rewritten, so every version ever written must remain parseable forever. */
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1];

// ═══════════════════════════════════════════════════════════════════════════
// D.2 — EVENT TYPES
//
// Transcribed from the architecture's own table, in its own order, including
// the ones no subsystem emits yet. Naming them now is the point: the ingest
// endpoint is the boundary, and a boundary that only knows the types already
// implemented would have to be widened by every later milestone — which is how
// a contract stops being a contract.
// ═══════════════════════════════════════════════════════════════════════════

export const EVENT_TYPES = [
  // Session Engine (M9)
  "SESSION_STARTED",
  "SESSION_FINISH_REQUESTED",
  "SESSION_VERIFIED",
  "SESSION_CLOSED_UNVERIFIED",
  // Tools
  "CONCEPT_VIEWED",
  "EXPLANATION_READ",
  "QUESTION_STARTED",
  "QUESTION_ATTEMPTED",
  "QUESTION_CORRECT",
  "QUESTION_WRONG",
  "PRACTICE_COMPLETED",
  "REVISION_COMPLETED",
  // Student declaration
  "EXTERNAL_STUDY_DECLARED",
  "CONCEPT_CONFIRMED",
  "CONCEPT_ADDED",
  // Assessment Engine (M10)
  "ASSESSMENT_STARTED",
  "ASSESSMENT_SKIPPED",
  "ASSESSMENT_COMPLETED",
  // Mistake DNA (M11)
  "MISTAKE_DETECTED",
  "MISTAKE_CORRECTED",
  "MISTAKE_RETESTED",
  "MISTAKE_RESOLVED",
  "MISTAKE_RECURRED",
  "MISTAKE_ACKNOWLEDGED",
  "MISTAKE_PRACTISING",
  // Customisation / recommendation / ownership / sharing
  "PREFERENCE_SET",
  "RECOMMENDATION_SURFACED",
  "RECOMMENDATION_ACTED_ON",
  "RECOMMENDATION_DISMISSED",
  "CORRECTION_REQUESTED",
  "CORRECTION_RESOLVED",
  "PARENT_POLICY_CHANGED",
  "PARENT_REPORT_VIEWED",
  // System
  "EVENT_SUPERSEDED",
] as const;

export type AcademicEventType = (typeof EVENT_TYPES)[number];

const EVENT_TYPE_SET: ReadonlySet<string> = new Set(EVENT_TYPES);

export const isEventType = (v: unknown): v is AcademicEventType =>
  typeof v === "string" && EVENT_TYPE_SET.has(v);

/**
 * D.2's `E` column — types that emit evidence the Ledger Score may consume.
 *
 * Exported here and NOT consumed here. M7 builds the pipe; the score is M14.
 * It lives with the contract because it is a property of the event type, and a
 * later milestone deriving its own list would be the second source of truth
 * H.1.a forbids.
 *
 * `EXTERNAL_STUDY_DECLARED` is deliberately absent — D.2.b: *"It moves no score
 * dimension by itself."*
 */
export const EVIDENCE_BEARING_TYPES: readonly AcademicEventType[] = [
  "QUESTION_CORRECT",
  "QUESTION_WRONG",
  "PRACTICE_COMPLETED",
  "ASSESSMENT_COMPLETED",
  "MISTAKE_DETECTED",
  "MISTAKE_RETESTED",
  "MISTAKE_RESOLVED",
  "MISTAKE_RECURRED",
];

/** D.2's `C` column — weak signals that count only once a `CONCEPT_CONFIRMED`
 *  gate has passed (D.1.d). */
export const CONFIRMATION_REQUIRED_TYPES: readonly AcademicEventType[] = [
  "CONCEPT_VIEWED",
  "EXPLANATION_READ",
  "REVISION_COMPLETED",
  "EXTERNAL_STUDY_DECLARED",
];

// ═══════════════════════════════════════════════════════════════════════════
// D.1 — THE ENVELOPE
// ═══════════════════════════════════════════════════════════════════════════

export const EVENT_SURFACES = ["web", "push", "cron", "import"] as const;
export type EventSurface = (typeof EVENT_SURFACES)[number];

export const EVENT_SOURCES = [
  "tool",
  "assessment",
  "student_declaration",
  "system",
  "migration",
] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export const CONFIRMATION_STATES = [
  "not_required",
  "rule_confirmed",
  "student_confirmed",
  "unconfirmed",
] as const;
export type ConfirmationState = (typeof CONFIRMATION_STATES)[number];

/**
 * The † set from D.1, verbatim. A body carrying any of these is REJECTED —
 * not stripped, not ignored, not overwritten. Stripping would let a client that
 * believes it is setting `student_id` succeed silently against a different
 * student's stream, which is the exact failure D.1.a exists to prevent.
 *
 * `clock_skew_ms` is here as well as the other five because it is DERIVED from
 * `received_at − occurred_at` (D.1.b) — a client that supplies it is claiming
 * authority over the server clock.
 */
export const SERVER_ASSIGNED_FIELDS = [
  "event_id",
  "seq",
  "student_id",
  "session_id",
  "received_at",
  "clock_skew_ms",
] as const;

/** Everything a client MAY send. Anything else is an unknown field (D.3.2). */
export const CLIENT_SUPPLIED_FIELDS = [
  "client_event_id",
  "schema_version",
  "occurred_at",
  "tool_slug",
  "surface",
  "source",
  "device_id",
  "subject",
  "chapter",
  "concept_id",
  "declared_text",
  "assessment_id",
  "question_id",
  "event_type",
  "payload",
  "result",
  "evidence_id",
  "confidence",
  "confirmation",
  "metadata",
  "supersedes_event_id",
] as const;

/**
 * What a client constructs and the outbox persists. Note what is NOT here.
 *
 * This is also the exact set of fields `client_event_id` is derived over
 * (`lib/event-outbox.ts`), which is what makes the id stable across retries:
 * every field in this type is decided before the first send attempt, and none
 * of them is a server response.
 */
export interface ClientEventDraft {
  client_event_id: string;
  schema_version: number;
  occurred_at: string;
  event_type: AcademicEventType;
  surface: EventSurface;
  source: EventSource;
  payload: Record<string, unknown>;

  tool_slug?: string | null;
  device_id?: string | null;
  subject?: string | null;
  chapter?: string | null;
  concept_id?: string | null;
  declared_text?: string | null;
  assessment_id?: string | null;
  question_id?: string | null;
  result?: Record<string, unknown> | null;
  evidence_id?: string | null;
  confidence?: number | null;
  confirmation?: ConfirmationState;
  metadata?: Record<string, unknown>;
  supersedes_event_id?: string | null;
}

/** The row shape the ingest endpoint hands the database. The † fields the
 *  server owns are here; `event_id`, `seq`, `received_at` and `clock_skew_ms`
 *  are set by the table itself (015 §3, the server-assign trigger) and are
 *  therefore absent even from this type. */
export interface AcademicEventInsert extends Omit<ClientEventDraft, "confirmation"> {
  student_id: string;
  session_id: string | null;
  confirmation: ConfirmationState;
}

/** A row read back out of the table. */
export interface AcademicEventRow extends AcademicEventInsert {
  event_id: string;
  seq: number;
  received_at: string;
  clock_skew_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// D.3 — VALIDATION
//
// *"each step rejects rather than repairs"*. Every failure below produces a
// typed code, and the codes are the vocabulary the quarantine table stores. A
// human reading `academic_event_quarantine` a year from now must be able to see
// WHICH rule refused the row, not merely that something did.
// ═══════════════════════════════════════════════════════════════════════════

export type ValidationCode =
  | "NOT_AN_OBJECT"
  | "SERVER_ASSIGNED_FIELD_PRESENT"
  | "UNKNOWN_FIELD"
  | "MISSING_FIELD"
  | "BAD_TYPE"
  | "UNKNOWN_EVENT_TYPE"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "BAD_ENUM"
  | "BAD_TIMESTAMP"
  | "BAD_UUID"
  | "BAD_CONFIDENCE"
  | "PAYLOAD_TOO_LARGE"
  | "PAYLOAD_SHAPE"
  | "TOOL_NOT_IN_REGISTRY"
  | "TOOL_MAY_NOT_EMIT"
  | "SOURCE_MAY_NOT_EMIT"
  | "MISSING_SUPERSEDES"
  | "BAD_DIMENSION";

export interface ValidationProblem {
  code: ValidationCode;
  field: string | null;
  detail: string;
}

export type ValidationResult =
  | { ok: true; draft: ClientEventDraft }
  | { ok: false; problems: ValidationProblem[] };

/** D.3.7, payload byte cap. Deliberately small: an academic event is a fact
 *  about learning, not a document. Evidence goes to `evidence.storage_ref`. */
export const MAX_PAYLOAD_BYTES = 16 * 1024;
/** The whole envelope, after JSON encoding. */
export const MAX_EVENT_BYTES = 32 * 1024;
/** D.3.7, per-student rate cap, enforced with a count query in `lib/events.ts`. */
export const MAX_EVENTS_PER_MINUTE = 240;
/** How many events one POST may carry. */
export const MAX_BATCH_SIZE = 50;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_FIELDS = [
  "concept_id",
  "assessment_id",
  "question_id",
  "evidence_id",
  "supersedes_event_id",
] as const;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** UTF-8 byte length without allocating a second copy of the string. */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * What a tool is declared able to do. Injected rather than imported so this
 * module stays free of `lib/tools-registry.ts` — the registry is 400 lines of
 * navigation data this contract has no business pulling in, and injecting the
 * lookup lets a test prove the registry gate with two lines of fixture.
 *
 * `lib/events.ts` supplies the real adapter over `toolBySlug()`.
 */
export interface ToolEmitDeclaration {
  slug: string;
  emits: readonly string[];
}

export type ToolLookup = (slug: string) => ToolEmitDeclaration | null;

/**
 * D.2's per-type payload cores. Only the fields the architecture NAMES are
 * required; a type may carry more. The table is deliberately partial — a type
 * with no entry has no required payload keys, which is the honest position for
 * the types whose owning subsystem does not exist yet (M9–M13). Adding a
 * requirement later is additive and versioned by `schema_version`.
 */
const REQUIRED_PAYLOAD_KEYS: Partial<Record<AcademicEventType, readonly string[]>> = {
  CONCEPT_VIEWED: ["concept_ref"],
  EXPLANATION_READ: ["concept_ref"],
  QUESTION_STARTED: ["question_id"],
  QUESTION_ATTEMPTED: ["question_id"],
  QUESTION_CORRECT: ["question_id", "attempt_id"],
  QUESTION_WRONG: ["question_id", "attempt_id"],
  PRACTICE_COMPLETED: ["item_count", "correct_count"],
  REVISION_COMPLETED: ["concepts"],
  EXTERNAL_STUDY_DECLARED: ["declared_text"],
  CONCEPT_CONFIRMED: ["session_concept_ref", "accepted"],
  CONCEPT_ADDED: ["declared_text"],
  ASSESSMENT_STARTED: ["assessment_id", "coverage_manifest_hash"],
  ASSESSMENT_COMPLETED: ["assessment_id", "per_concept_outcomes"],
  MISTAKE_DETECTED: ["occurrence_id"],
  MISTAKE_CORRECTED: ["occurrence_id", "immediate_retry_correct"],
  MISTAKE_RETESTED: ["pattern_id", "attempt_id", "is_correct"],
  MISTAKE_RESOLVED: ["pattern_id", "resolution_id"],
  MISTAKE_RECURRED: ["pattern_id", "occurrence_id"],
  PREFERENCE_SET: ["dimension", "value"],
  EVENT_SUPERSEDED: ["reason"],
};

/**
 * D.2.a — the three-layer refusal, at its event-layer layer.
 *
 * *"the event ingest rejects `MISTAKE_RESOLVED` with `source = 'tool'` or
 * `'student_declaration'`"*. Resolution is the single most gameable transition
 * in the product; RLS refuses it, `applyTransition` refuses it, and this is the
 * third refusal. `MISTAKE_RECURRED` and `MISTAKE_RETESTED` join it because both
 * are system judgements about a pattern, not student claims.
 */
/**
 * I.2's bounded dimension list, inlined (this file takes no imports — see
 * header). Mirrors `PERSONAL_MODEL_DIMENSIONS` in `lib/personal-model.ts`,
 * which is the source of truth; `tests/personal-model.test.mjs` asserts the
 * two never drift.
 */
const PERSONAL_MODEL_DIMENSION_SET: ReadonlySet<string> = new Set([
  "explanation_style",
  "communication_tone",
  "question_format_mix",
  "difficulty_preference",
  "session_length",
  "working_window",
  "correction_method",
  "notification_appetite",
  "recommendation_aggressiveness",
]);

const SOURCE_RESTRICTIONS: Partial<Record<AcademicEventType, readonly EventSource[]>> = {
  MISTAKE_RESOLVED: ["system"],
  MISTAKE_RECURRED: ["system"],
  MISTAKE_RETESTED: ["system", "assessment"],
  SESSION_STARTED: ["system"],
  SESSION_VERIFIED: ["system"],
  SESSION_CLOSED_UNVERIFIED: ["system"],
  ASSESSMENT_COMPLETED: ["system", "assessment"],
  EVENT_SUPERSEDED: ["system", "migration"],
  PARENT_REPORT_VIEWED: ["system"],
};

/**
 * The whole of D.3 steps 2–5 and 7, in one pure function.
 *
 * It collects EVERY problem rather than returning on the first: the quarantine
 * row is the only artefact a human will ever see of a refused event, and one
 * error at a time turns a diagnosis into an archaeology exercise.
 */
export function validateEventDraft(
  body: unknown,
  opts: { toolLookup?: ToolLookup } = {},
): ValidationResult {
  const problems: ValidationProblem[] = [];
  const fail = (code: ValidationCode, field: string | null, detail: string) =>
    problems.push({ code, field, detail });

  if (!isPlainObject(body)) {
    return {
      ok: false,
      problems: [{ code: "NOT_AN_OBJECT", field: null, detail: "event body is not a JSON object" }],
    };
  }

  // ── D.3.2 · reject any † field, and reject unknown fields ────────────────
  for (const f of SERVER_ASSIGNED_FIELDS) {
    if (f in body) {
      fail(
        "SERVER_ASSIGNED_FIELD_PRESENT",
        f,
        `${f} is server-assigned (D.1) and may not be supplied by a client`,
      );
    }
  }
  const allowed = new Set<string>(CLIENT_SUPPLIED_FIELDS);
  for (const key of Object.keys(body)) {
    if (allowed.has(key)) continue;
    if ((SERVER_ASSIGNED_FIELDS as readonly string[]).includes(key)) continue; // already reported
    fail("UNKNOWN_FIELD", key, `${key} is not part of the D.1 envelope`);
  }

  // ── size (D.3.7) ─────────────────────────────────────────────────────────
  let encoded = "";
  try {
    encoded = JSON.stringify(body) ?? "";
  } catch {
    fail("BAD_TYPE", null, "event body is not JSON-serialisable");
  }
  if (encoded && utf8Bytes(encoded) > MAX_EVENT_BYTES) {
    fail("PAYLOAD_TOO_LARGE", null, `envelope exceeds ${MAX_EVENT_BYTES} bytes`);
  }

  // ── required scalars ─────────────────────────────────────────────────────
  const clientEventId = body.client_event_id;
  if (typeof clientEventId !== "string" || clientEventId.length === 0) {
    fail("MISSING_FIELD", "client_event_id", "client_event_id is required and must be a string");
  } else if (clientEventId.length > 128) {
    fail("BAD_TYPE", "client_event_id", "client_event_id exceeds 128 characters");
  }

  const schemaVersion = body.schema_version;
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion)) {
    fail("MISSING_FIELD", "schema_version", "schema_version is required and must be an integer");
  } else if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
    fail(
      "UNSUPPORTED_SCHEMA_VERSION",
      "schema_version",
      `schema_version ${schemaVersion} is not one of ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}`,
    );
  }

  const occurredAt = body.occurred_at;
  if (typeof occurredAt !== "string") {
    fail("MISSING_FIELD", "occurred_at", "occurred_at is required (D.1.b — the client's claim)");
  } else if (Number.isNaN(Date.parse(occurredAt))) {
    fail("BAD_TIMESTAMP", "occurred_at", `occurred_at is not a parseable timestamp: ${occurredAt}`);
  }

  const eventType = body.event_type;
  if (!isEventType(eventType)) {
    fail("UNKNOWN_EVENT_TYPE", "event_type", `event_type ${JSON.stringify(eventType)} is not in D.2`);
  }

  const surface = body.surface;
  if (!EVENT_SURFACES.includes(surface as EventSurface)) {
    fail("BAD_ENUM", "surface", `surface must be one of ${EVENT_SURFACES.join(" | ")}`);
  }

  const source = body.source;
  if (!EVENT_SOURCES.includes(source as EventSource)) {
    fail("BAD_ENUM", "source", `source must be one of ${EVENT_SOURCES.join(" | ")}`);
  }

  const confirmation = body.confirmation ?? "not_required";
  if (!CONFIRMATION_STATES.includes(confirmation as ConfirmationState)) {
    fail("BAD_ENUM", "confirmation", `confirmation must be one of ${CONFIRMATION_STATES.join(" | ")}`);
  }

  // ── payload ──────────────────────────────────────────────────────────────
  const payload = body.payload;
  if (!isPlainObject(payload)) {
    fail("MISSING_FIELD", "payload", "payload is required and must be a JSON object");
  } else {
    const bytes = utf8Bytes(JSON.stringify(payload) ?? "");
    if (bytes > MAX_PAYLOAD_BYTES) {
      fail("PAYLOAD_TOO_LARGE", "payload", `payload is ${bytes} bytes, cap is ${MAX_PAYLOAD_BYTES}`);
    }
    if (isEventType(eventType)) {
      for (const key of REQUIRED_PAYLOAD_KEYS[eventType] ?? []) {
        if (!(key in payload)) {
          fail("PAYLOAD_SHAPE", `payload.${key}`, `${eventType} requires payload.${key} (D.2)`);
        }
      }
    }
  }

  if (body.result !== undefined && body.result !== null && !isPlainObject(body.result)) {
    fail("BAD_TYPE", "result", "result must be a JSON object or null");
  }
  if (body.metadata !== undefined && !isPlainObject(body.metadata)) {
    fail("BAD_TYPE", "metadata", "metadata must be a JSON object");
  }

  // ── D.3.5 · reference shape ──────────────────────────────────────────────
  // SHAPE only. That an `assessment_id` BELONGS to this student is a database
  // question and is checked in `lib/events.ts`; that it is a UUID at all is a
  // decision, and decisions live here.
  for (const f of UUID_FIELDS) {
    const v = body[f];
    if (v === undefined || v === null) continue;
    if (!isUuid(v)) fail("BAD_UUID", f, `${f} is not a UUID`);
  }

  for (const f of ["subject", "chapter", "declared_text", "tool_slug", "device_id"] as const) {
    const v = body[f];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string") fail("BAD_TYPE", f, `${f} must be a string or null`);
    else if (v.length > 2000) fail("BAD_TYPE", f, `${f} exceeds 2000 characters`);
  }

  // D.1.c — the SYSTEM's confidence, 0..1. The student's own pre-answer
  // confidence is `payload.confidence_before`, 0..3, and is not this field.
  const confidence = body.confidence;
  if (confidence !== undefined && confidence !== null) {
    if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      fail("BAD_CONFIDENCE", "confidence", "confidence must be a number in 0..1, or null (D.1.c)");
    }
  }

  // ── D.2.a and friends · who may emit what ────────────────────────────────
  if (isEventType(eventType)) {
    const allowedSources = SOURCE_RESTRICTIONS[eventType];
    if (allowedSources && typeof source === "string" && !allowedSources.includes(source as EventSource)) {
      fail(
        "SOURCE_MAY_NOT_EMIT",
        "source",
        `${eventType} may only be emitted with source ${allowedSources.join(" | ")} — got ${source}`,
      );
    }
    if (eventType === "EVENT_SUPERSEDED" && !isUuid(body.supersedes_event_id)) {
      fail(
        "MISSING_SUPERSEDES",
        "supersedes_event_id",
        "EVENT_SUPERSEDED is the only edit (C.2) and must name the event it supersedes",
      );
    }

    // I.2 — "the list is bounded, not open." A second, ingest-layer refusal
    // of an out-of-set dimension, ahead of `031_personal_model.sql`'s CHECK
    // constraint — the same two-layer posture (TS + SQL) every other bounded
    // set in this file already has. This file takes no imports (header
    // rule), so the set is inlined rather than imported from
    // `lib/personal-model.ts`; `tests/personal-model.test.mjs` asserts the
    // two lists are identical, the same way this file's own `EVENT_TYPES` is
    // asserted equal to the SQL CHECK.
    if (eventType === "PREFERENCE_SET" && isPlainObject(payload) && "dimension" in payload) {
      if (!PERSONAL_MODEL_DIMENSION_SET.has(payload.dimension as string)) {
        fail(
          "BAD_DIMENSION",
          "payload.dimension",
          `payload.dimension ${JSON.stringify(payload.dimension)} is not one of the bounded set in I.2`,
        );
      }
    }
  }

  // ── D.3.4 · the registry gate (Part P.2) ─────────────────────────────────
  // *"A tool cannot emit `QUESTION_CORRECT` unless its manifest says it grades
  // deterministically."* The manifest already encodes that; this checks the
  // declaration, and `deriveIntegrationLevel` in the registry is what stops the
  // declaration being free.
  //
  // TODAY EVERY TOOL DECLARES `emits_events: []`, so every tool-sourced event
  // is refused. That is correct and is exactly M7's boundary: this milestone
  // builds the pipe. A tool starts emitting when a later milestone changes its
  // manifest — which raises its integration level in the same edit, so the
  // capability and the permission can never diverge.
  const toolSlug = body.tool_slug;
  if (typeof toolSlug === "string" && toolSlug.length > 0 && opts.toolLookup) {
    const tool = opts.toolLookup(toolSlug);
    if (!tool) {
      fail("TOOL_NOT_IN_REGISTRY", "tool_slug", `${toolSlug} is not in the capability manifest`);
    } else if (isEventType(eventType) && !tool.emits.includes(eventType)) {
      fail(
        "TOOL_MAY_NOT_EMIT",
        "tool_slug",
        `${toolSlug} does not declare ${eventType} in emits_events (P.2)`,
      );
    }
  }
  if (source === "tool" && (typeof toolSlug !== "string" || toolSlug.length === 0)) {
    fail("MISSING_FIELD", "tool_slug", "source 'tool' requires a tool_slug (D.3.4)");
  }

  if (problems.length > 0) return { ok: false, problems };

  const b = body as unknown as ClientEventDraft;
  return {
    ok: true,
    draft: {
      client_event_id: b.client_event_id,
      schema_version: b.schema_version,
      occurred_at: b.occurred_at,
      event_type: b.event_type,
      surface: b.surface,
      source: b.source,
      payload: b.payload,
      tool_slug: b.tool_slug ?? null,
      device_id: b.device_id ?? null,
      subject: b.subject ?? null,
      chapter: b.chapter ?? null,
      concept_id: b.concept_id ?? null,
      declared_text: b.declared_text ?? null,
      assessment_id: b.assessment_id ?? null,
      question_id: b.question_id ?? null,
      result: b.result ?? null,
      evidence_id: b.evidence_id ?? null,
      confidence: b.confidence ?? null,
      confirmation: (b.confirmation ?? "not_required") as ConfirmationState,
      metadata: b.metadata ?? {},
      supersedes_event_id: b.supersedes_event_id ?? null,
    },
  };
}
