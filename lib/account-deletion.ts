// ═══════════════════════════════════════════════════════════════════════════
// M18-5 — ACCOUNT DELETION: PARENT CONNECTIONS REVOKE; REPORTS INVALIDATE.
//
// Architecture O.5: "Delete the account. Full erasure of student-scoped data
// with a stated irreversibility window; AuditEntry retains a minimal,
// non-academic tombstone (that an account existed and was deleted, when, by
// whom)... Parent connections revoke; parent-held reports are invalidated
// server-side."
//
// THE ERASURE MECHANISM IS THE SCHEMA, NOT THIS FILE. Every student-scoped
// table this repository has built references `auth.users(id)` with
// `ON DELETE CASCADE` (007, 012, 015, 019's storage folder keyed on the same
// id, 021, 023, 024, 029, 030) — the one deliberate exception is
// `audit_entries.student_id`, which is `ON DELETE SET NULL` (016), and THAT
// asymmetry is O.5's tombstone, built in from the day audit entries shipped.
// So the actual row erasure is `supabaseServer.auth.admin.deleteUser()` —
// Supabase's own cascade does the rest — and this module's job is everything
// that must happen AROUND that one call:
//
//   1. Write the audit entry BEFORE deletion (student_id must still resolve
//      to a real row for the FK, though SET NULL means it would survive the
//      cascade either way — writing first is simply the honest order of
//      events: the record of the act precedes the act).
//   2. Revoke every parent connection (030 §5) — which is what makes the very
//      next parent read to any of this student's data 404 (029 §7 re-checks
//      `state = 'active'` on every call, no cache). There is no separate
//      "invalidate the report" step because there is no separate report row
//      (029's reports are generated live).
//   3. Destroy the evidence BINARIES explicitly, ahead of the cascade. The
//      database cascade removes the `evidence` ROWS; it does not know about
//      Supabase Storage OBJECTS, which carry no foreign key to any table at
//      all. A cascade that deleted every row and left every object orphaned
//      in the bucket would be the storage equivalent of the localStorage leak
//      O.4.b names as the failure this whole Part exists to prevent.
//   4. Delete the auth.users row. Cascade erases everything else.
//
// FULL ERASURE, NOT A TOMBSTONE. O.5 draws tombstoning as the CATEGORY
// deletion's behaviour (M18-4) and full erasure as the ACCOUNT deletion's —
// two different verbs for two different scopes, and this module implements
// the second. `evidence` rows are not tombstoned here; they are gone, along
// with everything else, because there is no longer an account for a
// tombstone to be legible against.
// ═══════════════════════════════════════════════════════════════════════════

import { supabaseServer } from "./supabase-server";
import { writeAuditEntry } from "./events";
import { EVIDENCE_BUCKET } from "./storage";

export type AccountDeletionRefusal =
  | { code: "no_such_account"; detail: string }
  | { code: "delete_failed"; detail: string };

export interface AccountDeletionResult {
  ok: boolean;
  parentConnectionsRevoked: number;
  evidenceObjectsRemoved: number;
  refusal?: AccountDeletionRefusal;
}

/**
 * O.5's third scope, end to end. `studentId` from the caller's own verified
 * session — this function performs no privilege check of its own beyond that,
 * exactly like `revoke_parent_connection` (029): a caller can only ever name
 * themselves.
 */
export async function deleteAccount(
  studentId: string,
  reason: string,
  opts: { now?: () => number } = {},
): Promise<AccountDeletionResult> {
  const now = opts.now ?? (() => Date.now());
  const at = new Date(now()).toISOString();

  // 1 · THE TOMBSTONE, WRITTEN BEFORE THE ERASURE IT DESCRIBES.
  await writeAuditEntry({
    actor: "student",
    action: "deletion",
    student_id: studentId,
    target_table: "auth.users",
    target_id: studentId,
    reason,
    details: { scope: "account" },
    policy_version: null,
    at,
  });

  // 2 · PARENT CONNECTIONS REVOKE (030 §5) — immediate, no cache TTL (V.8.6),
  // and structurally the same act as invalidating every report that would
  // ever have been generated from them (029 has no stored report to expire
  // separately).
  const { data: revokedCount, error: revokeErr } = await supabaseServer.rpc(
    "revoke_all_parent_connections_for_deletion",
    { p_student_id: studentId },
  );
  if (revokeErr) {
    return {
      ok: false,
      parentConnectionsRevoked: 0,
      evidenceObjectsRemoved: 0,
      refusal: { code: "delete_failed", detail: `parent revocation: ${revokeErr.message}` },
    };
  }

  // 3 · EVIDENCE BINARIES, EXPLICITLY — the cascade does not reach Storage.
  let evidenceObjectsRemoved = 0;
  const { data: evidenceRows } = await supabaseServer
    .from("evidence")
    .select("storage_ref")
    .eq("student_id", studentId);
  const paths = ((evidenceRows ?? []) as Array<{ storage_ref: string }>).map(r =>
    r.storage_ref.startsWith(`${EVIDENCE_BUCKET}/`) ? r.storage_ref.slice(EVIDENCE_BUCKET.length + 1) : r.storage_ref,
  );
  if (paths.length > 0) {
    const { error: rmErr } = await supabaseServer.storage.from(EVIDENCE_BUCKET).remove(paths);
    if (!rmErr) evidenceObjectsRemoved = paths.length;
    // A storage failure here does not abort the deletion — leaving orphaned
    // bytes behind an already-deleted account is a cleanup task, not a reason
    // to refuse the student's own erasure request (the account row itself is
    // the thing V.10.8 tests, and it must not be held hostage to a bucket
    // call).
  }

  // 4 · THE ACTUAL ERASURE. Supabase's admin API, not a bare SQL DELETE —
  // `auth.users` is GoTrue-managed and this is the one supported door into
  // it. Every FK this repository has written since 007 cascades from here.
  const { error: delErr } = await supabaseServer.auth.admin.deleteUser(studentId);
  if (delErr) {
    return {
      ok: false,
      parentConnectionsRevoked: (revokedCount as number) ?? 0,
      evidenceObjectsRemoved,
      refusal: { code: "delete_failed", detail: delErr.message },
    };
  }

  return { ok: true, parentConnectionsRevoked: (revokedCount as number) ?? 0, evidenceObjectsRemoved };
}
