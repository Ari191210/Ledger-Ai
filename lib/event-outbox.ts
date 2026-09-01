// ═══════════════════════════════════════════════════════════════════════════
// M7-3 — THE CLIENT OUTBOX CONTRACT.
//
// EXECUTION_PLAN M7-3: *"Client outbox contract — `client_event_id` derived
// from stable content, persisted before the first attempt. Done when: mitigates
// T7 — a retry cannot regenerate the id."*
//
//
// THE FAILURE THIS EXISTS TO PREVENT, EXACTLY
//
// T7: *"Largely designed out by `client_event_id` idempotency and append-only
// semantics, but a client that regenerates `client_event_id` on retry defeats
// it entirely."*
//
// Concretely: a student answers a question, the browser POSTs the event, the
// train goes into a tunnel, the request times out. The retry runs. If the retry
// calls `crypto.randomUUID()` again, the server sees a second `client_event_id`
// it has never seen, `ON CONFLICT DO NOTHING` does not fire, and one answer
// becomes two events — two attempts, possibly two mistakes, and a score that
// moved twice for one piece of work. Nothing downstream can detect it, because
// by the time it reaches a projection the two rows are indistinguishable from
// a student who genuinely answered twice.
//
//
// THE GUARANTEE, AND HOW IT IS STRUCTURAL RATHER THAN DOCUMENTED
//
// Three properties, each provable:
//
//   1. THE ID IS A PURE FUNCTION OF THE RECORD. `clientEventId(record)` is
//      SHA-256 over canonical JSON of the draft plus the record's nonce. Same
//      record in, same id out, on any device, in any runtime, forever.
//
//   2. THE NONCE IS DRAWN ONCE, AT ENQUEUE, AND PERSISTED WITH THE RECORD.
//      It is never re-drawn. A retry reads the stored record — nonce included —
//      so it recomputes the identical id by construction. Two genuinely
//      distinct events with byte-identical content still differ, because their
//      nonces differ; a student may legitimately view the same concept twice.
//
//   3. THE WRITE HAPPENS BEFORE THE FIRST ATTEMPT. `enqueue()` persists and
//      only then returns; the caller receives a record that is already durable.
//      A crash between "the student did the thing" and "the server heard about
//      it" therefore loses nothing, and the resume path is `pending()`.
//
// `markAttempt()` is the fourth property, stated as a refusal: it increments a
// counter and touches nothing else. There is no code path in this module that
// changes a `client_event_id` after it has been assigned. The test asserts that
// by re-reading the store after a simulated crash and a failed attempt.
//
//
// SCOPE — WHAT THIS IS NOT
//
// It is not an offline queue with a scheduler, a backoff policy or a service
// worker. It is the CONTRACT: a store interface, a deterministic id, a
// persisted lifecycle, and the exact body to POST. `flushOutbox()` composes it
// with a caller-supplied sender so the shipped path is one line, but no timer
// lives here and nothing here mounts. Tools begin emitting in a later
// milestone; M7 builds the pipe.
//
// Imports: `./sha256` and `./ingest/hash` (canonical JSON) and `./event-contract`
// (types and the † list). No clock except an injected one. No network.
// ═══════════════════════════════════════════════════════════════════════════

import { sha256Hex } from "./sha256";
import { stableStringify } from "./ingest/hash";
import {
  EVENT_SCHEMA_VERSION,
  SERVER_ASSIGNED_FIELDS,
  type AcademicEventType,
  type ClientEventDraft,
  type ConfirmationState,
  type EventSource,
  type EventSurface,
} from "./event-contract";

/** The prefix is a version marker on the DERIVATION, not on the envelope. If
 *  the canonical form ever changes, this changes with it, and an old pending
 *  record keeps its old id — which is the whole point. */
export const OUTBOX_ID_VERSION = "e1";

export type OutboxState = "pending" | "sent" | "quarantined";

/** What the caller describes. No id, no nonce, no timestamps — the outbox
 *  assigns all three, which is what makes them impossible to regenerate. */
export interface OutboxDraft {
  event_type: AcademicEventType;
  surface: EventSurface;
  source: EventSource;
  payload: Record<string, unknown>;

  occurred_at?: string;
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

export interface OutboxRecord {
  /** Assigned at enqueue. Never recomputed, never regenerated. */
  client_event_id: string;
  /** Drawn once, persisted, and part of the id's preimage. Retained after
   *  sending so the id stays reproducible for audit. */
  nonce: string;
  state: OutboxState;
  attempts: number;
  enqueued_at: string;
  last_attempt_at: string | null;
  /** The server's `event_id`, once the server has one. Presence of this is the
   *  only proof the record reached the table. */
  server_event_id: string | null;
  /** Why it was quarantined, when the server said so. */
  refusal: string | null;
  draft: OutboxDraft & { occurred_at: string; schema_version: number };
}

export interface OutboxSnapshot {
  version: number;
  records: OutboxRecord[];
}

/** The persistence seam. `localStorage`, `sessionStorage`, an IndexedDB shim or
 *  a `Map` in a test all satisfy it. Synchronous on purpose: `enqueue()` must
 *  be durable BEFORE it returns, and an async write is a window in which the
 *  tab can close. */
export interface OutboxStore {
  read(): string | null;
  write(serialised: string): void;
}

export interface OutboxOptions {
  now?: () => number;
  /** Injected so the test can pin it. In the browser this is
   *  `crypto.randomUUID()`; the value only has to be unique, never secret. */
  nonce?: () => string;
  /** Cap on retained `sent` records. They are kept briefly so a duplicate
   *  submission from the same tab is caught locally, then pruned. */
  keepSent?: number;
}

const SNAPSHOT_VERSION = 1;
const DEFAULT_KEEP_SENT = 50;

/**
 * The preimage of a `client_event_id`.
 *
 * Canonical JSON (`stableStringify` sorts keys recursively) so two runtimes
 * with different property insertion orders agree — the property
 * `lib/ingest/hash.ts` was written for and, until now, the only thing that used
 * it was a test. This is its first production importer (T12).
 *
 * The nonce is inside the hash rather than concatenated after it so that no
 * caller can construct a colliding id by choosing content that ends in another
 * record's nonce.
 */
export function deriveClientEventId(
  draft: OutboxDraft & { occurred_at: string; schema_version: number },
  nonce: string,
): string {
  const preimage = stableStringify({
    v: OUTBOX_ID_VERSION,
    nonce,
    schema_version: draft.schema_version,
    event_type: draft.event_type,
    occurred_at: draft.occurred_at,
    surface: draft.surface,
    source: draft.source,
    tool_slug: draft.tool_slug ?? null,
    device_id: draft.device_id ?? null,
    subject: draft.subject ?? null,
    chapter: draft.chapter ?? null,
    concept_id: draft.concept_id ?? null,
    declared_text: draft.declared_text ?? null,
    assessment_id: draft.assessment_id ?? null,
    question_id: draft.question_id ?? null,
    payload: draft.payload,
    result: draft.result ?? null,
    evidence_id: draft.evidence_id ?? null,
    confidence: draft.confidence ?? null,
    confirmation: draft.confirmation ?? "not_required",
    supersedes_event_id: draft.supersedes_event_id ?? null,
  });
  // 40 hex characters — 160 bits, well inside the contract's 128-character cap
  // and far beyond any collision concern for a per-student namespace.
  return `${OUTBOX_ID_VERSION}_${sha256Hex(preimage).slice(0, 40)}`;
}

/**
 * The body that is POSTed.
 *
 * Built by NAMING the client-supplied fields rather than by deleting the
 * server-assigned ones from a spread. A denylist that a future edit forgets to
 * extend fails open; an allowlist fails closed. `assertNoServerFields()` below
 * checks the result anyway, because the cost of the belt is nothing.
 */
export function toEnvelope(record: OutboxRecord): ClientEventDraft {
  const d = record.draft;
  return {
    client_event_id: record.client_event_id,
    schema_version: d.schema_version,
    occurred_at: d.occurred_at,
    event_type: d.event_type,
    surface: d.surface,
    source: d.source,
    payload: d.payload,
    tool_slug: d.tool_slug ?? null,
    device_id: d.device_id ?? null,
    subject: d.subject ?? null,
    chapter: d.chapter ?? null,
    concept_id: d.concept_id ?? null,
    declared_text: d.declared_text ?? null,
    assessment_id: d.assessment_id ?? null,
    question_id: d.question_id ?? null,
    result: d.result ?? null,
    evidence_id: d.evidence_id ?? null,
    confidence: d.confidence ?? null,
    confirmation: d.confirmation ?? "not_required",
    metadata: d.metadata ?? {},
    supersedes_event_id: d.supersedes_event_id ?? null,
  };
}

/** D.1: *"a client that sends one is rejected, not corrected."* This is the
 *  client side of the same rule — it refuses to SEND one. */
export function assertNoServerFields(envelope: Record<string, unknown>): void {
  for (const f of SERVER_ASSIGNED_FIELDS) {
    if (f in envelope) {
      throw new Error(`outbox tried to send server-assigned field ${f} — D.1 forbids it`);
    }
  }
}

export interface Outbox {
  enqueue(draft: OutboxDraft): OutboxRecord;
  all(): OutboxRecord[];
  pending(): OutboxRecord[];
  get(clientEventId: string): OutboxRecord | null;
  markAttempt(clientEventId: string): OutboxRecord | null;
  markSent(clientEventId: string, serverEventId: string | null): OutboxRecord | null;
  markQuarantined(clientEventId: string, refusal: string): OutboxRecord | null;
  prune(): void;
}

export function createOutbox(store: OutboxStore, opts: OutboxOptions = {}): Outbox {
  const now = opts.now ?? (() => Date.now());
  const nonceSource = opts.nonce ?? defaultNonce;
  const keepSent = opts.keepSent ?? DEFAULT_KEEP_SENT;

  const load = (): OutboxRecord[] => {
    const raw = store.read();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as OutboxSnapshot;
      if (!parsed || !Array.isArray(parsed.records)) return [];
      return parsed.records;
    } catch {
      // A corrupt outbox is not a reason to throw on every subsequent write.
      // It IS a reason not to silently discard: the record is unreadable, so
      // there is nothing honest to recover, and starting empty is the only
      // non-fabricating option.
      return [];
    }
  };

  const save = (records: OutboxRecord[]) => {
    store.write(JSON.stringify({ version: SNAPSHOT_VERSION, records } satisfies OutboxSnapshot));
  };

  const mutate = (
    clientEventId: string,
    fn: (r: OutboxRecord) => OutboxRecord,
  ): OutboxRecord | null => {
    const records = load();
    const idx = records.findIndex(r => r.client_event_id === clientEventId);
    if (idx === -1) return null;
    const next = fn(records[idx]);
    // The one invariant every mutation must preserve. Checked here, once,
    // rather than trusted in each caller.
    if (next.client_event_id !== records[idx].client_event_id) {
      throw new Error("an outbox mutation changed client_event_id — T7 forbids it");
    }
    records[idx] = next;
    save(records);
    return next;
  };

  return {
    enqueue(draft: OutboxDraft): OutboxRecord {
      const at = now();
      const full = {
        ...draft,
        occurred_at: draft.occurred_at ?? new Date(at).toISOString(),
        schema_version: EVENT_SCHEMA_VERSION,
      };
      const nonce = nonceSource();
      const record: OutboxRecord = {
        client_event_id: deriveClientEventId(full, nonce),
        nonce,
        state: "pending",
        attempts: 0,
        enqueued_at: new Date(at).toISOString(),
        last_attempt_at: null,
        server_event_id: null,
        refusal: null,
        draft: full,
      };

      // ── THE LOAD-BEARING LINE OF THIS MODULE ────────────────────────────
      // Persist, THEN return. Everything after this point — the first attempt
      // included — reads the id off a record that is already durable. There is
      // no ordering in which a send happens against an id the store has not
      // seen.
      const records = load();
      records.push(record);
      save(records);

      return record;
    },

    all: () => load(),
    pending: () => load().filter(r => r.state === "pending"),
    get: id => load().find(r => r.client_event_id === id) ?? null,

    markAttempt: id =>
      mutate(id, r => ({
        ...r,
        attempts: r.attempts + 1,
        last_attempt_at: new Date(now()).toISOString(),
      })),

    markSent: (id, serverEventId) =>
      mutate(id, r => ({ ...r, state: "sent", server_event_id: serverEventId })),

    markQuarantined: (id, refusal) =>
      mutate(id, r => ({ ...r, state: "quarantined", refusal })),

    prune() {
      const records = load();
      const sent = records.filter(r => r.state === "sent");
      if (sent.length <= keepSent) return;
      const drop = new Set(sent.slice(0, sent.length - keepSent).map(r => r.client_event_id));
      save(records.filter(r => !drop.has(r.client_event_id)));
    },
  };
}

/**
 * The shipped flush, composed from the pieces above.
 *
 * `send` is injected — this module does not know `fetch` exists. On a network
 * failure the record stays `pending` with its id untouched, which is precisely
 * the T7 mitigation: the next call re-sends the SAME id and the server's
 * `ON CONFLICT DO NOTHING` absorbs it.
 */
export interface FlushResult {
  attempted: number;
  sent: number;
  quarantined: number;
  failed: number;
}

export type OutboxSender = (
  envelopes: ClientEventDraft[],
) => Promise<{ client_event_id: string; outcome: "appended" | "duplicate" | "quarantined"; event_id?: string | null; detail?: string }[]>;

export async function flushOutbox(outbox: Outbox, send: OutboxSender): Promise<FlushResult> {
  const pending = outbox.pending();
  if (pending.length === 0) return { attempted: 0, sent: 0, quarantined: 0, failed: 0 };

  const envelopes = pending.map(r => {
    const e = toEnvelope(r);
    assertNoServerFields(e as unknown as Record<string, unknown>);
    return e;
  });

  for (const r of pending) outbox.markAttempt(r.client_event_id);

  let results;
  try {
    results = await send(envelopes);
  } catch {
    // Nothing is marked. Every record keeps its id and its pending state, and
    // the next flush is byte-identical.
    return { attempted: pending.length, sent: 0, quarantined: 0, failed: pending.length };
  }

  let sent = 0;
  let quarantined = 0;
  const answered = new Set<string>();

  for (const res of results) {
    answered.add(res.client_event_id);
    if (res.outcome === "quarantined") {
      outbox.markQuarantined(res.client_event_id, res.detail ?? "refused at ingest");
      quarantined += 1;
    } else {
      // `duplicate` counts as sent. The server already has it; that is success.
      outbox.markSent(res.client_event_id, res.event_id ?? null);
      sent += 1;
    }
  }

  outbox.prune();

  return {
    attempted: pending.length,
    sent,
    quarantined,
    failed: pending.length - answered.size,
  };
}

/** `localStorage`, guarded. Returns a no-op store on the server so an import
 *  from a module that also runs during SSR does not throw. */
export function browserOutboxStore(key = "ledger-event-outbox"): OutboxStore {
  return {
    read() {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    },
    write(serialised) {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(key, serialised);
    },
  };
}

/** In-memory store — tests, and the SSR no-op above's honest sibling. */
export function memoryOutboxStore(initial: string | null = null): OutboxStore {
  let value = initial;
  return {
    read: () => value,
    write: s => {
      value = s;
    },
  };
}

function defaultNonce(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Only reached in an environment with no Web Crypto at all. Uniqueness, not
  // unpredictability, is what the nonce is for.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
