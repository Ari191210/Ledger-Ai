// ═══════════════════════════════════════════════════════════════════════════
// M7-2 — THE INGEST DECISION, WITH NO I/O.
//
// EXECUTION_PLAN M7-2: *"Ingest endpoint: validation, dedup, quarantine table.
// Done when: invalid events quarantine rather than corrupt (D.3)."*
//
// D.3 says *"A single server endpoint, and nothing else, may write events"* and
// then lists nine steps. Steps 2–5 and 7 are pure and live in
// `lib/event-contract.ts`. This module is the step that says WHAT HAPPENS NEXT
// — append, acknowledge a duplicate, or quarantine — and it is pure too. The
// endpoint (`app/api/events/route.ts`) and the data layer (`lib/events.ts`)
// supply authentication, the duplicate lookup and the insert.
//
//
// THE THREE OUTCOMES, AND WHY THERE IS NO FOURTH
//
//   append      the event is valid and new. It joins the record.
//   duplicate   the event is valid and this `client_event_id` is already in
//               the table. The caller is told SUCCESS and given the existing
//               `event_id`. D.3.6: *"Retry-safe by construction."*
//   quarantine  the event is invalid. The raw body, the typed problems and the
//               student are written to `academic_event_quarantine`.
//
// There is deliberately no "reject and forget". A silently dropped event is a
// piece of the student's academic record that no one can ever find again, and
// D.3's failure policy is explicit: *"an invalid event is rejected with a typed
// error and written to a quarantine table with the raw body. It is never
// coerced into validity."* Quarantine is the same posture as `ingestion_review`
// in `008_ingestion.sql` — *"what the pipeline refused to guess."*
//
//
// ORDERING (R.10) IS ALSO HERE, AND IT IS ONE FUNCTION
//
// `orderEvents()` sorts by `seq` and by nothing else. It exists as a named,
// exported, tested function rather than as an inline `.sort()` in each reader
// so that "ordering is by server `seq`, never client `occurred_at`" is a thing
// the repository CONTAINS, not a convention each future call site re-decides.
//
// No imports beyond `./event-contract`. No clock. No network.
// ═══════════════════════════════════════════════════════════════════════════

import {
  MAX_BATCH_SIZE,
  MAX_EVENTS_PER_MINUTE,
  validateEventDraft,
  type AcademicEventInsert,
  type ClientEventDraft,
  type ToolLookup,
  type ValidationProblem,
} from "./event-contract";

export interface IngestContext {
  /** From the verified bearer token / session cookie. NEVER from the body
   *  (D.1.a). The caller proves this by not having any other way to get one. */
  studentId: string;
  /** Server clock, in ms. Injected so a test can pin it. */
  receivedAtMs: number;
  toolLookup?: ToolLookup;
  /** Events this student has already had accepted in the trailing minute.
   *  D.3.7's rate cap. */
  recentEventCount?: number;
  /** Set by the session resolver (E.4) — M9. Until then every event is
   *  session-less, which is a legal state: D.1 marks `session_id` nullable. */
  sessionId?: string | null;
}

export type IngestDecision =
  | { outcome: "append"; row: AcademicEventInsert; clockSkewMs: number }
  | { outcome: "quarantine"; clientEventId: string | null; problems: ValidationProblem[] };

export interface QuarantineRow {
  student_id: string;
  client_event_id: string | null;
  event_type: string | null;
  schema_version: number | null;
  problems: ValidationProblem[];
  raw_body: unknown;
}

/**
 * D.3 steps 2–5, 7 and 8, for one event.
 *
 * Returns `append` or `quarantine`. It does NOT return `duplicate`: whether a
 * `client_event_id` already exists is a fact about the database, and this
 * module has none. `lib/events.ts` learns that from `ON CONFLICT DO NOTHING`,
 * which is the only place it can be learned without a race.
 */
export function decideIngest(body: unknown, ctx: IngestContext): IngestDecision {
  const validation = validateEventDraft(body, { toolLookup: ctx.toolLookup });

  if (!validation.ok) {
    return {
      outcome: "quarantine",
      clientEventId: readStringField(body, "client_event_id"),
      problems: validation.problems,
    };
  }

  const draft: ClientEventDraft = validation.draft;

  // D.1.b — `occurred_at` is a claim, `received_at` is a fact, and the skew
  // between them is RETAINED rather than reconciled. `lib/active-close.ts`'s
  // header documents the bug this makes diagnosable: a client stamping a local
  // date while a cron closes on a UTC one puts IST 00:00–05:30 events on the
  // previous day. A stored skew turns that from silent into a query.
  const clockSkewMs = ctx.receivedAtMs - Date.parse(draft.occurred_at);

  return {
    outcome: "append",
    clockSkewMs,
    row: {
      ...draft,
      // D.1.a — from the token, never the body. The body could not have
      // carried one: `student_id` is in SERVER_ASSIGNED_FIELDS and a body
      // containing it was quarantined above.
      student_id: ctx.studentId,
      // D.3.8 — *"the ONLY server-side mutation of the envelope"*.
      session_id: ctx.sessionId ?? null,
      confirmation: draft.confirmation ?? "not_required",
    },
  };
}

/** The quarantine row for a refused event. The raw body is stored verbatim:
 *  the whole point is that a human can see what the client actually sent. */
export function quarantineRowFor(
  decision: Extract<IngestDecision, { outcome: "quarantine" }>,
  body: unknown,
  studentId: string,
): QuarantineRow {
  return {
    student_id: studentId,
    client_event_id: decision.clientEventId,
    event_type: readStringField(body, "event_type"),
    schema_version: readNumberField(body, "schema_version"),
    problems: decision.problems,
    raw_body: body,
  };
}

export type BatchGate =
  | { ok: true; events: unknown[] }
  | { ok: false; code: "NOT_A_BATCH" | "BATCH_TOO_LARGE" | "RATE_LIMIT"; detail: string };

/**
 * The envelope around a POST body. Accepts `{events:[…]}` or a bare array or a
 * single event object, because an outbox flush and a one-off emit are the same
 * operation at different sizes and forcing the caller to know which is a
 * needless way to lose an event.
 */
export function readBatch(body: unknown, recentEventCount = 0): BatchGate {
  let events: unknown[];

  if (Array.isArray(body)) events = body;
  else if (body && typeof body === "object" && Array.isArray((body as { events?: unknown }).events)) {
    events = (body as { events: unknown[] }).events;
  } else if (body && typeof body === "object") events = [body];
  else return { ok: false, code: "NOT_A_BATCH", detail: "body must be an event, an array, or {events:[…]}" };

  if (events.length === 0) {
    return { ok: false, code: "NOT_A_BATCH", detail: "batch is empty" };
  }
  if (events.length > MAX_BATCH_SIZE) {
    return { ok: false, code: "BATCH_TOO_LARGE", detail: `batch of ${events.length} exceeds ${MAX_BATCH_SIZE}` };
  }
  // D.3.7. Rejecting the WHOLE batch rather than a suffix keeps the client's
  // outbox simple: nothing was accepted, so nothing needs marking, and the
  // retry is the same request with the same ids.
  if (recentEventCount + events.length > MAX_EVENTS_PER_MINUTE) {
    return {
      ok: false,
      code: "RATE_LIMIT",
      detail: `${recentEventCount} events in the trailing minute; cap is ${MAX_EVENTS_PER_MINUTE}`,
    };
  }

  return { ok: true, events };
}

// ═══════════════════════════════════════════════════════════════════════════
// R.10 — ORDERING
// ═══════════════════════════════════════════════════════════════════════════

/** The only thing the record is ordered by. */
export interface Sequenced {
  seq: number;
}

/**
 * D.4: *"Ordering is by `(student_id, seq)`, server-assigned. `occurred_at` is
 * never used for ordering — it is client-supplied and therefore forgeable."*
 *
 * This function reads no field but `seq`. Its type signature says so: it
 * accepts `Sequenced`, so a caller cannot even pass a comparator that reaches
 * for a timestamp, and a future edit that tried would have to widen the type
 * and fail the test that asserts this ordering against deliberately inverted
 * `occurred_at` values.
 */
export function orderEvents<T extends Sequenced>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => a.seq - b.seq);
}

/** True when a stream is already in server order. Used by the consistency
 *  checks a projection will need (T8) and by the M7 tests. */
export function isInSeqOrder(events: readonly Sequenced[]): boolean {
  for (let i = 1; i < events.length; i += 1) {
    if (events[i].seq <= events[i - 1].seq) return false;
  }
  return true;
}

// ── helpers ────────────────────────────────────────────────────────────────

function readStringField(body: unknown, field: string): string | null {
  if (!body || typeof body !== "object") return null;
  const v = (body as Record<string, unknown>)[field];
  return typeof v === "string" ? v.slice(0, 128) : null;
}

function readNumberField(body: unknown, field: string): number | null {
  if (!body || typeof body !== "object") return null;
  const v = (body as Record<string, unknown>)[field];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
