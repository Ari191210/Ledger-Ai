// ═══════════════════════════════════════════════════════════════════════════
// M7-4 — `AuditEntry`, WITH HASH CHAINING, FROM DAY ONE.
//
// EXECUTION_PLAN M7-4: *"`AuditEntry` with hash chaining, from day one. Done
// when: O.6. Starting it later leaves a hole at the point of maximum change."*
//
// Architecture O.6: *"`AuditEntry` (C.2) is append-only for everyone, including
// the service role (`REVOKE DELETE`), carries `before_hash`/`after_hash` so
// tampering is detectable, and is included in the student's export. It records:
// every correction, every dispute and its outcome, every deletion, every
// export, every parent read, every policy change, every score restatement, and
// every compaction run (D.5.a)."*
//
//
// WHAT "before_hash / after_hash" MEANS HERE, AND WHY
//
// C.2 names the two columns; O.6 gives their purpose — *"so tampering is
// detectable"*. Read as hashes of the target row's state, they do not deliver
// that purpose: an attacker who edits a row and its own audit entry's two
// hashes leaves nothing inconsistent. Read as a CHAIN — `before_hash` is the
// previous entry's `after_hash`, and `after_hash` covers this entry's content
// INCLUDING `before_hash` — they deliver it exactly, because editing or
// removing any historical entry invalidates every hash after it.
//
// So the chain reading is the one implemented, and the target row's own state
// travels in `details` where it is covered by the chain rather than competing
// with it. That is a reading of the specification, and it is recorded here so a
// later reader can disagree with it deliberately rather than by accident.
//
//
// WHERE THE CHAIN IS COMPUTED, AND WHY NOT IN SQL
//
// In TypeScript, here, once. `016_audit_entries.sql` does NOT recompute it —
// it VERIFIES continuity (`p_before_hash` must equal the current tip) and
// refuses the insert otherwise. Two implementations of one canonicalisation is
// the drift M1 exists to prevent, one level down; a canonicalisation that lives
// in a tested pure function and a database that checks the linkage is one
// implementation with a second, independent guard.
//
// What that buys, precisely: a tamper detectable by `verifyAuditChain()` (the
// content no longer hashes to its `after_hash`) AND a gap or reorder refused at
// insert time (`before_hash` does not match the tip). Neither alone is enough.
//
//
// WHAT IT DOES NOT CLAIM
//
// A hash chain in the same database as the data it protects proves INTERNAL
// consistency, not external immutability: an attacker with write access to
// `audit_entries` could rewrite the whole chain from the tampered entry
// onwards. It raises tampering from invisible to expensive-and-detectable-by-
// anyone-who-kept-a-copy-of-a-hash. Publishing the tip periodically is what
// would close that, and it is not M7's job. Saying so here is better than
// implying a guarantee the mechanism does not give (Law 7).
//
// Imports: `./sha256`, `./ingest/hash`. No clock except an injected one. No
// network.
// ═══════════════════════════════════════════════════════════════════════════

import { sha256Hex } from "./sha256";
import { stableStringify } from "./ingest/hash";

/** The version of the CANONICAL FORM below. A change to what is hashed changes
 *  this, and `verifyAuditChain()` uses each entry's own stored version, so old
 *  entries stay verifiable after the form moves on. */
export const AUDIT_HASH_VERSION = "a1";

/** The genesis link. The first entry in a chain has no predecessor, and the
 *  sentinel is a constant rather than NULL so that `after_hash` is computed
 *  identically for the first entry and every entry after it — a NULL would
 *  make entry #1 a special case in every implementation forever. */
export const AUDIT_CHAIN_GENESIS = "0".repeat(64);

/** C.2: `actor ∈ {student, system, service_role, parent}`. */
export const AUDIT_ACTORS = ["student", "system", "service_role", "parent"] as const;
export type AuditActor = (typeof AUDIT_ACTORS)[number];

/**
 * The vocabulary of `action`. O.6 enumerates what must be recorded; this is
 * that list, plus the two M7 owns itself.
 *
 * It is a closed set on purpose. An audit trail whose `action` is free text
 * cannot be queried — "show me every export" becomes a `LIKE` and a hope — and
 * `016` mirrors this list as a CHECK so a typo is refused at write time rather
 * than discovered at read time.
 */
export const AUDIT_ACTIONS = [
  // O.6's enumeration
  "correction_requested",
  "correction_resolved",
  "dispute_opened",
  "dispute_resolved",
  "deletion",
  "export",
  "parent_read",
  "policy_change",
  "score_restatement",
  "compaction_run",
  // M7's own two — see `AUDIT WRITES IN M7` at the foot of this file
  "event_superseded",
  "event_quarantined",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Everything that goes into an entry before the chain is applied. */
export interface AuditEntryContent {
  actor: AuditActor;
  action: AuditAction;
  /** NULL for a system-wide action (a compaction run spans students). */
  student_id: string | null;
  /** Which table the action touched, and which row. Both nullable: an export
   *  targets the whole record. */
  target_table: string | null;
  target_id: string | null;
  /** Why. Free text, and deliberately so — this one is for a human. */
  reason: string | null;
  /** Anything else worth keeping, including the target row's before/after
   *  state. Covered by `after_hash`, so it cannot be edited undetectably. */
  details: Record<string, unknown>;
  /** Which sharing/consent policy was in force. C.2 names it; N.7 needs it. */
  policy_version: string | null;
  /** ISO-8601. Injected, never read from a clock inside this module, so a
   *  chain is reproducible from its own rows in a test. */
  at: string;
}

export interface AuditEntry extends AuditEntryContent {
  hash_version: string;
  before_hash: string;
  after_hash: string;
}

/**
 * The canonical preimage. Every field of the content, plus the link.
 *
 * `stableStringify` sorts keys recursively, so two runtimes that serialise
 * objects in different orders still agree — the property `lib/ingest/hash.ts`
 * was written for.
 */
export function auditPreimage(content: AuditEntryContent, beforeHash: string): string {
  return stableStringify({
    v: AUDIT_HASH_VERSION,
    before_hash: beforeHash,
    actor: content.actor,
    action: content.action,
    student_id: content.student_id ?? null,
    target_table: content.target_table ?? null,
    target_id: content.target_id ?? null,
    reason: content.reason ?? null,
    details: content.details ?? {},
    policy_version: content.policy_version ?? null,
    at: content.at,
  });
}

/** `after_hash` for one entry, given the tip it extends. */
export function auditHash(content: AuditEntryContent, beforeHash: string): string {
  return sha256Hex(auditPreimage(content, beforeHash));
}

/**
 * Link one entry onto a chain.
 *
 * `tip` is the previous entry's `after_hash`, or `AUDIT_CHAIN_GENESIS` for the
 * first. `lib/events.ts` reads the tip from `public.audit_chain_tip()`; a test
 * reads it from the previous element of an array.
 */
export function linkAuditEntry(content: AuditEntryContent, tip: string): AuditEntry {
  const before_hash = tip || AUDIT_CHAIN_GENESIS;
  return {
    ...content,
    hash_version: AUDIT_HASH_VERSION,
    before_hash,
    after_hash: auditHash(content, before_hash),
  };
}

/** Build a whole chain from a list of contents. Used by tests and by any
 *  backfill; the shipped path links one entry at a time. */
export function buildAuditChain(
  contents: readonly AuditEntryContent[],
  tip = AUDIT_CHAIN_GENESIS,
): AuditEntry[] {
  const out: AuditEntry[] = [];
  let current = tip;
  for (const c of contents) {
    const entry = linkAuditEntry(c, current);
    out.push(entry);
    current = entry.after_hash;
  }
  return out;
}

export type ChainFault =
  | { index: number; kind: "BROKEN_LINK"; detail: string }
  | { index: number; kind: "CONTENT_TAMPERED"; detail: string }
  | { index: number; kind: "UNKNOWN_HASH_VERSION"; detail: string };

export interface ChainVerdict {
  ok: boolean;
  faults: ChainFault[];
  /** The chain's tip, if it verified. The value to publish or to compare
   *  against a copy kept elsewhere. */
  tip: string | null;
}

/**
 * Verify a chain, in order, and say exactly where it broke.
 *
 * TWO INDEPENDENT CHECKS PER ENTRY, and they catch different attacks:
 *
 *   BROKEN_LINK       entry[i].before_hash ≠ entry[i-1].after_hash.
 *                     Catches a DELETED or REORDERED entry — the content of
 *                     every surviving entry is untouched and hashes correctly,
 *                     and only the linkage gives it away.
 *
 *   CONTENT_TAMPERED  recomputing `after_hash` from the entry's own content
 *                     and `before_hash` does not reproduce the stored value.
 *                     Catches an EDITED entry.
 *
 * An attacker who edits one entry and recomputes only its own `after_hash`
 * trips BROKEN_LINK at the next entry. One who edits it and leaves the hash
 * trips CONTENT_TAMPERED at that entry. Rewriting the entire suffix is the only
 * way to pass both, which is what makes a published tip meaningful.
 */
export function verifyAuditChain(
  entries: readonly AuditEntry[],
  expectedStart = AUDIT_CHAIN_GENESIS,
): ChainVerdict {
  const faults: ChainFault[] = [];
  let expected = expectedStart;

  entries.forEach((entry, index) => {
    if (entry.before_hash !== expected) {
      faults.push({
        index,
        kind: "BROKEN_LINK",
        detail:
          `entry ${index} links to ${short(entry.before_hash)} but the chain is at ` +
          `${short(expected)} — an entry was removed, reordered or inserted`,
      });
    }

    if (entry.hash_version !== AUDIT_HASH_VERSION) {
      faults.push({
        index,
        kind: "UNKNOWN_HASH_VERSION",
        detail: `entry ${index} was hashed with ${entry.hash_version}, this build knows ${AUDIT_HASH_VERSION}`,
      });
    } else {
      const recomputed = auditHash(entry, entry.before_hash);
      if (recomputed !== entry.after_hash) {
        faults.push({
          index,
          kind: "CONTENT_TAMPERED",
          detail:
            `entry ${index} content hashes to ${short(recomputed)}, stored hash is ` +
            `${short(entry.after_hash)} — the row was edited after it was written`,
        });
      }
    }

    expected = entry.after_hash;
  });

  return {
    ok: faults.length === 0,
    faults,
    tip: faults.length === 0 ? expected : null,
  };
}

const short = (h: string) => (h ? `${h.slice(0, 10)}…` : "(none)");

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT WRITES IN M7 — the judgement, stated so it can be argued with
//
// O.6's list is corrections, disputes, deletions, exports, parent reads, policy
// changes, score restatements and compaction runs. NOT ONE of those subsystems
// exists yet: corrections and exports are M18, parent reads are M17, score
// restatement is M14, compaction is M7-7. So M7-4's job is overwhelmingly the
// MECHANISM — and the plan says exactly that: *"starting it later leaves a hole
// at the point of maximum change."*
//
// The mechanism ships with two call sites, both of which M7 owns outright and
// both of which fall inside O.6's own categories:
//
//   `event_superseded`   an `EVENT_SUPERSEDED` ingest is a CORRECTION — it is
//                        the only edit the record permits (C.2), and O.6 says
//                        every correction is recorded.
//
//   `event_quarantined`  a refused event is the system declining to record a
//                        claim the student made. Nothing else in the product
//                        would show that it happened at all, and D.3's whole
//                        posture is that a refusal must be visible.
//
// A NORMAL APPEND IS NOT AUDITED, deliberately. The event table IS the record;
// an audit entry per event would double the stream to restate what the stream
// already says, and would make the chain — whose value is that it is short
// enough to eyeball — the largest table in the database.
//
// Later milestones add their own actions. The vocabulary above already names
// them, so adding a call site is a call, not a schema change.
// ═══════════════════════════════════════════════════════════════════════════
