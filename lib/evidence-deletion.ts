// ═══════════════════════════════════════════════════════════════════════════
// M18-4 — DELETION: BINARIES DESTROYED, `content_hash` TOMBSTONES RETAINED.
//
// Architecture O.5: "Delete a category (e.g. all evidence images). Binaries
// are destroyed; metadata and content_hash are retained as tombstones so the
// occurrences that reference them stay valid... ON DELETE RESTRICT makes
// cascade deletion of referenced evidence structurally impossible, and must
// not be worked around."
//
// So this module NEVER deletes an `evidence` row — `030`'s trigger refuses
// the DELETE outright, and this file does not try. What it does: for each
// evidence row the student named, remove the object at `storage_ref` from
// Supabase Storage (`lib/storage.ts` owns the bucket name and path shape),
// then set `binary_deleted_at`/`binary_deleted_reason` — the one movement
// `030`'s `evidence_tombstone_forward_only` trigger permits.
//
// V.10.6's test: occurrences referencing the evidence remain valid, and their
// patterns are unchanged — which is automatic here, because nothing this
// module does touches `occurrences` or `patterns` at all. The FK integrity IS
// the guarantee; this module's only job is to not go around it.
// ═══════════════════════════════════════════════════════════════════════════

import { supabaseServer } from "./supabase-server";
import { writeAuditEntry } from "./events";
import { EVIDENCE_BUCKET } from "./storage";

export interface EvidenceDeletionResult {
  ok: boolean;
  deleted: number;
  alreadyTombstoned: number;
  failures: Array<{ evidenceId: string; detail: string }>;
}

/**
 * Delete the BINARIES for every evidence row the student owns that is not
 * already tombstoned. `evidenceIds`, if given, scopes to a subset (e.g. "all
 * photo evidence"); omitted, it is every evidence row — O.5's "delete a
 * category" at its widest.
 */
export async function deleteEvidenceBinaries(
  studentId: string,
  opts: { evidenceIds?: readonly string[]; reason: string; now?: () => number } = { reason: "student requested" },
): Promise<EvidenceDeletionResult> {
  const now = opts.now ?? (() => Date.now());
  const at = new Date(now()).toISOString();

  let query = supabaseServer
    .from("evidence")
    .select("id, storage_ref, binary_deleted_at")
    .eq("student_id", studentId);
  if (opts.evidenceIds?.length) query = query.in("id", opts.evidenceIds);

  const { data, error } = await query;
  if (error || !data) {
    return { ok: false, deleted: 0, alreadyTombstoned: 0, failures: [{ evidenceId: "*", detail: error?.message ?? "read failed" }] };
  }

  const rows = data as Array<{ id: string; storage_ref: string; binary_deleted_at: string | null }>;
  const pending = rows.filter(r => !r.binary_deleted_at);
  const alreadyTombstoned = rows.length - pending.length;
  const failures: Array<{ evidenceId: string; detail: string }> = [];
  let deleted = 0;

  for (const row of pending) {
    const path = row.storage_ref.startsWith(`${EVIDENCE_BUCKET}/`)
      ? row.storage_ref.slice(EVIDENCE_BUCKET.length + 1)
      : row.storage_ref;

    const { error: rmErr } = await supabaseServer.storage.from(EVIDENCE_BUCKET).remove([path]);
    // A storage object already gone (a retry, or a race with a prior partial
    // run) is not a failure of THIS operation's intent — the bytes are absent
    // either way. Any other storage error is refused rather than tombstoning
    // a row whose bytes might still exist.
    if (rmErr && !/not.?found/i.test(rmErr.message)) {
      failures.push({ evidenceId: row.id, detail: rmErr.message });
      continue;
    }

    const { error: updErr } = await supabaseServer
      .from("evidence")
      .update({ binary_deleted_at: at, binary_deleted_reason: opts.reason })
      .eq("id", row.id)
      .is("binary_deleted_at", null);

    if (updErr) {
      failures.push({ evidenceId: row.id, detail: updErr.message });
      continue;
    }
    deleted += 1;
  }

  await writeAuditEntry({
    actor: "student",
    action: "deletion",
    student_id: studentId,
    target_table: "evidence",
    target_id: null,
    reason: opts.reason,
    details: { deleted, alreadyTombstoned, failed: failures.length, evidenceIds: opts.evidenceIds ?? "all" },
    policy_version: null,
    at,
  });

  return { ok: failures.length === 0, deleted, alreadyTombstoned, failures };
}
