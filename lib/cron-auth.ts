import { createHash, timingSafeEqual } from "node:crypto";

// Shared, fail-closed authentication for internal callers: Vercel cron jobs
// and the job runner dispatching queued work, all bearing CRON_SECRET.
//
// Replaces the inline `authorization === \`Bearer ${process.env.CRON_SECRET}\``
// checks that were copy-pasted across every cron/internal route. Two hardening
// properties those inline checks lacked:
//
//   1. FAIL CLOSED. If CRON_SECRET is unset, the old check compared against
//      the literal string "Bearer undefined" — so anyone sending
//      `Authorization: Bearer undefined` was authorized. Here, a missing
//      secret authorizes no one.
//   2. CONSTANT TIME. Compares SHA-256 digests with timingSafeEqual so the
//      secret can't be recovered byte-by-byte via response timing. Hashing
//      first also sidesteps timingSafeEqual's equal-length requirement.
export function isInternalCaller(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
