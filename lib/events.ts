// ═══════════════════════════════════════════════════════════════════════════
// M7-1 / M7-2 / M7-4 — THE EVENT LAYER'S I/O HALF.
//
// The decisions are in `lib/event-contract.ts` (validation), `lib/event-ingest.ts`
// (append / quarantine, ordering) and `lib/audit.ts` (the hash chain). This
// module is everything those three deliberately refuse to contain: a Supabase
// client, a clock, and the `ON CONFLICT` that makes a retry idempotent.
//
// The split is the M4 `lib/auth-routes.ts` pattern and the M6
// `lib/concept-resolution.ts` pattern, for the reason both of them state: the
// done-when conditions are properties of a decision, and a decision with no I/O
// is provable with no live database in reach (U.3).
//
//
// WHICH CLIENT, AND WHY THIS ONE
//
// `supabaseServer` — the service role. Not `createStudentServerClient()`, which
// M5/M6 use, and the difference is deliberate:
//
//   · The quarantine table has no student INSERT policy, on purpose (015 §5:
//     *"an account a client could author is not an account"*). The ingest must
//     be able to write it.
//   · `public.append_audit_entry()` is service-role only (016 §3).
//   · `ON CONFLICT DO NOTHING` needs to SEE the conflicting row to return its
//     `event_id`, and under RLS a student can see their own rows — so this one
//     would work either way, and consistency wins.
//
// The identity still never comes from the service role. `studentId` is passed
// in by the route, which got it from `auth.getUser()` — D.1.a, *"from the
// verified bearer token, NEVER the body"*. A service-role client that took a
// `student_id` from a request body would be the whole vulnerability class R.4
// exists to close, so every function here takes `studentId` as its FIRST
// argument and none of them parses one out of a payload.
//
//
// PRE-DEPLOYMENT POSTURE
//
// 015 and 016 have NOT been applied to any database. Following the M5-2 and
// M6-1 precedent exactly, every read degrades honestly and says which path it
// took, rather than throwing and taking a caller down with it. Nothing in the
// product calls this yet — M7 builds the pipe — so the degradation is currently
// unobservable, and it is here so that it stays honest when it stops being.
//
// DELETE THE `unavailable` BRANCHES when `select * from public.migration_ledger()
// where version in ('015','016')` returns two rows — the same removal condition
// M1-3, M5-2 and M6-1 each wrote into their own fallbacks.
// ═══════════════════════════════════════════════════════════════════════════

import { supabaseServer } from "./supabase-server";
import { toolBySlug } from "./tools-registry";
import {
  MAX_EVENTS_PER_MINUTE,
  type AcademicEventInsert,
  type AcademicEventRow,
  type ToolEmitDeclaration,
  type ValidationProblem,
} from "./event-contract";
import {
  decideIngest,
  orderEvents,
  quarantineRowFor,
  readBatch,
  type IngestContext,
} from "./event-ingest";
import {
  AUDIT_CHAIN_GENESIS,
  linkAuditEntry,
  type AuditEntryContent,
} from "./audit";

const EVENTS_TABLE = "academic_events";
const QUARANTINE_TABLE = "academic_event_quarantine";

/**
 * D.3.4's registry gate, wired to the real capability manifest.
 *
 * `toolBySlug()` resolves the manifest; `emits_events` is the declaration. As
 * of M7 every tool declares `[]`, so this returns an empty `emits` for every
 * slug and every tool-sourced event is refused. That is the boundary working:
 * a tool starts emitting when a later milestone edits its manifest, which
 * raises its derived `integration_level` in the same edit — so the capability
 * and the permission cannot diverge (P.3).
 */
export function registryToolLookup(slug: string): ToolEmitDeclaration | null {
  const tool = toolBySlug(slug);
  if (!tool) return null;
  return { slug: tool.slug, emits: tool.emits_events };
}

export type IngestOutcome = "appended" | "duplicate" | "quarantined" | "unavailable";

export interface IngestResult {
  client_event_id: string | null;
  outcome: IngestOutcome;
  event_id: string | null;
  seq: number | null;
  problems?: ValidationProblem[];
  detail?: string;
}

export interface IngestBatchResult {
  ok: boolean;
  results: IngestResult[];
  appended: number;
  duplicates: number;
  quarantined: number;
  /** Set when the batch was refused wholesale (size or rate). */
  refused?: { code: string; detail: string };
}

/**
 * D.3, end to end, for one authenticated student.
 *
 * `studentId` comes from the caller's verified session and from nowhere else.
 */
export async function ingestEvents(
  studentId: string,
  body: unknown,
  opts: { now?: () => number } = {},
): Promise<IngestBatchResult> {
  const now = opts.now ?? (() => Date.now());

  const recent = await countRecentEvents(studentId);
  const gate = readBatch(body, recent);
  if (!gate.ok) {
    return {
      ok: false,
      results: [],
      appended: 0,
      duplicates: 0,
      quarantined: 0,
      refused: { code: gate.code, detail: gate.detail },
    };
  }

  const ctx: IngestContext = {
    studentId,
    receivedAtMs: now(),
    toolLookup: registryToolLookup,
    // E.4's session resolver is M9. Until it exists every event is
    // session-less, which D.1 marks as legal rather than missing.
    sessionId: null,
  };

  const results: IngestResult[] = [];

  for (const raw of gate.events) {
    const decision = decideIngest(raw, ctx);

    if (decision.outcome === "quarantine") {
      const stored = await writeQuarantine(quarantineRowFor(decision, raw, studentId));
      results.push({
        client_event_id: decision.clientEventId,
        outcome: stored ? "quarantined" : "unavailable",
        event_id: null,
        seq: null,
        problems: decision.problems,
        detail: stored ? undefined : "quarantine table unavailable — event NOT recorded",
      });
      continue;
    }

    results.push(await appendEvent(studentId, decision.row));
  }

  return {
    ok: true,
    results,
    appended: results.filter(r => r.outcome === "appended").length,
    duplicates: results.filter(r => r.outcome === "duplicate").length,
    quarantined: results.filter(r => r.outcome === "quarantined").length,
  };
}

/**
 * The append, and the dedup, in one statement plus one fallback read.
 *
 * D.3.6: *"`INSERT … ON CONFLICT (student_id, client_event_id) DO NOTHING`,
 * returning the existing `event_id`. Retry-safe by construction."*
 *
 * `ignoreDuplicates: true` is PostgREST's `ON CONFLICT DO NOTHING`. It returns
 * ZERO ROWS on a conflict — which is the only race-free way to learn that the
 * id was already there, because a SELECT-then-INSERT has a window between the
 * two in which a concurrent tab inserts. The follow-up SELECT then reads back
 * the `event_id` the caller asked for.
 */
async function appendEvent(
  studentId: string,
  row: AcademicEventInsert,
): Promise<IngestResult> {
  const { data, error } = await supabaseServer
    .from(EVENTS_TABLE)
    .upsert(row as unknown as Record<string, unknown>, {
      onConflict: "student_id,client_event_id",
      ignoreDuplicates: true,
    })
    .select("event_id, seq");

  if (error) {
    return {
      client_event_id: row.client_event_id,
      outcome: "unavailable",
      event_id: null,
      seq: null,
      detail: error.message,
    };
  }

  const inserted = data?.[0] as { event_id: string; seq: number } | undefined;
  if (inserted) {
    return {
      client_event_id: row.client_event_id,
      outcome: "appended",
      event_id: inserted.event_id,
      seq: inserted.seq,
    };
  }

  // Zero rows means the unique constraint absorbed it. The event is already in
  // the record; the caller is told SUCCESS with the id it already has, which is
  // what makes a retry safe rather than merely tolerated.
  const existing = await findByClientEventId(studentId, row.client_event_id);
  return {
    client_event_id: row.client_event_id,
    outcome: "duplicate",
    event_id: existing?.event_id ?? null,
    seq: existing?.seq ?? null,
  };
}

export async function findByClientEventId(
  studentId: string,
  clientEventId: string,
): Promise<{ event_id: string; seq: number } | null> {
  const { data, error } = await supabaseServer
    .from(EVENTS_TABLE)
    .select("event_id, seq")
    .eq("student_id", studentId)
    .eq("client_event_id", clientEventId)
    .maybeSingle();

  if (error || !data) return null;
  return data as { event_id: string; seq: number };
}

/**
 * The student's stream, in server order.
 *
 * `.order("seq")` and nothing else — R.10. There is no parameter on this
 * function that could ask for a different ordering, which is the point:
 * `occurred_at` is a claim and a reader that sorted by it would be reading a
 * history the student could have authored.
 */
export async function listEventsForStudent(
  studentId: string,
  opts: { afterSeq?: number; limit?: number } = {},
): Promise<{ events: AcademicEventRow[]; available: boolean }> {
  let query = supabaseServer
    .from(EVENTS_TABLE)
    .select("*")
    .eq("student_id", studentId)
    .order("seq", { ascending: true })
    .limit(opts.limit ?? 500);

  if (opts.afterSeq !== undefined) query = query.gt("seq", opts.afterSeq);

  const { data, error } = await query;
  if (error || !data) return { events: [], available: false };

  // Sorted again, locally, by `orderEvents`. Not paranoia about PostgREST — a
  // guarantee about THIS function's return value that holds no matter what the
  // transport did, and one a test can assert without a database.
  return { events: orderEvents(data as unknown as AcademicEventRow[]), available: true };
}

async function countRecentEvents(studentId: string): Promise<number> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabaseServer
    .from(EVENTS_TABLE)
    .select("event_id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("received_at", since);

  // A table that cannot be counted must not silently disable the cap; but nor
  // may it block ingest before 015 is applied. Zero is the honest pre-migration
  // answer — there are no events — and the cap re-engages the moment there are.
  if (error || count == null) return 0;
  return Math.min(count, MAX_EVENTS_PER_MINUTE);
}

/**
 * D.3's failure policy. Returns false when the quarantine table itself is
 * unreachable, so the caller can tell the client *"we did not record this"*
 * rather than reporting a refusal that was itself lost.
 *
 * `upsert … ignoreDuplicates` on `(student_id, client_event_id)` so a client
 * retrying a permanently-invalid event does not accumulate one quarantine row
 * per attempt.
 */
async function writeQuarantine(row: {
  student_id: string;
  client_event_id: string | null;
  event_type: string | null;
  schema_version: number | null;
  problems: ValidationProblem[];
  raw_body: unknown;
}): Promise<boolean> {
  const { error } = await supabaseServer
    .from(QUARANTINE_TABLE)
    .upsert(row, { onConflict: "student_id,client_event_id", ignoreDuplicates: true });

  if (error) return false;

  // O.6 — a refusal is the system declining to record a claim the student made,
  // and nothing else in the product would ever show that it happened.
  await writeAuditEntry({
    actor: "system",
    action: "event_quarantined",
    student_id: row.student_id,
    target_table: QUARANTINE_TABLE,
    target_id: row.client_event_id,
    reason: row.problems.map(p => p.code).join(","),
    details: { event_type: row.event_type, problems: row.problems },
    policy_version: null,
    at: new Date().toISOString(),
  });

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// M7-4 — writing an audit entry
//
// The chain is computed by `lib/audit.ts`; the tip and the append are here.
// `append_audit_entry()` refuses an entry whose `before_hash` is not the tip,
// so a lost race retries once against the new tip rather than corrupting the
// chain.
// ═══════════════════════════════════════════════════════════════════════════

export async function auditChainTip(): Promise<string | null> {
  const { data, error } = await supabaseServer.rpc("audit_chain_tip");
  if (error || typeof data !== "string") return null;
  return data;
}

/**
 * Append one entry to the chain.
 *
 * NEVER THROWS. An audit write failing must not roll back the academic act it
 * describes: losing the event because the note about the event could not be
 * written is strictly worse than losing the note. The return value says which
 * happened, and a caller that cares can act on it.
 */
export async function writeAuditEntry(
  content: AuditEntryContent,
  attempt = 0,
): Promise<{ written: boolean; after_hash: string | null; detail?: string }> {
  const tip = (await auditChainTip()) ?? AUDIT_CHAIN_GENESIS;
  const entry = linkAuditEntry(content, tip);

  const { error } = await supabaseServer.rpc("append_audit_entry", {
    p_actor: entry.actor,
    p_action: entry.action,
    p_student_id: entry.student_id,
    p_target_table: entry.target_table,
    p_target_id: entry.target_id,
    p_reason: entry.reason,
    p_details: entry.details,
    p_policy_version: entry.policy_version,
    p_at: entry.at,
    p_hash_version: entry.hash_version,
    p_before_hash: entry.before_hash,
    p_after_hash: entry.after_hash,
  });

  if (!error) return { written: true, after_hash: entry.after_hash };

  // One retry, and one only. A lost advisory-lock race moves the tip; a second
  // failure is a real fault (the function is absent, or the chain is broken)
  // and retrying it forever would turn one bad write into a loop.
  if (attempt === 0 && /chain conflict|before_hash/i.test(error.message ?? "")) {
    return writeAuditEntry(content, 1);
  }

  return { written: false, after_hash: null, detail: error.message };
}
