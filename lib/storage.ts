// ═══════════════════════════════════════════════════════════════════════════
// M8-2 — OBJECT STORAGE FOR EVIDENCE.
//
// `evidence.storage_ref` is `NOT NULL` in `007_mistakes.sql`, so capture needs
// somewhere durable to put the bytes. Nothing in this repository has ever used
// Supabase Storage — `grep -rn storage lib/` before this file returned auth
// storage adapters and localStorage, and not one bucket — so this module is the
// first, and it is deliberately the ONLY place that names a bucket.
//
//
// THE POSTURE, WHICH IS THE SAME POSTURE AS EVERY RLS POLICY SO FAR
//
// The bucket is PRIVATE. A marked exam paper carries a student's name, their
// school, their handwriting and their marks; a public URL for it would be a
// permanent, unauthenticated, un-revocable disclosure of a minor's academic
// record to anyone who ever saw the link. `019_evidence_storage.sql` creates
// the bucket with `public = false` and scopes `storage.objects` to
// `auth.uid()`, exactly as `007` scopes `evidence` itself.
//
// READ ACCESS IS THEREFORE ALWAYS SIGNED OR SERVER-SIDE. There is no
// `getPublicUrl()` in this file and there must never be one.
//
//
// THE PATH IS THE CONTENT HASH, AND THAT IS LOAD-BEARING
//
//   evidence/<student_id>/<sha256-of-the-bytes>
//
// Two consequences, both wanted:
//
//   · The first segment is the owner, which is what the storage policy matches
//     on (`(storage.foldername(name))[1] = auth.uid()::text`). A student cannot
//     name an object into somebody else's folder, so isolation is structural.
//   · Re-uploading the same paper writes the same bytes to the same key. The
//     upload is therefore idempotent BEFORE the database dedup runs, so the
//     `evidence_student_hash_unique` conflict in `lib/evidence.ts` never leaves
//     an orphaned second object behind.
//
// No extension is appended. The bytes' type travels as the object's
// `contentType` metadata; deriving a filename extension from a MIME type the
// client asserted would put attacker-influenced text in a storage key for no
// benefit.
//
// No imports. No clock. No network. The Supabase client is INJECTED — the same
// split `lib/event-ingest.ts` and `lib/events.ts` use, and for the same reason
// (U.3): a decision with no I/O is provable with no live project in reach.
// ═══════════════════════════════════════════════════════════════════════════

/** The one bucket. Created by `019_evidence_storage.sql`, private. */
export const EVIDENCE_BUCKET = "evidence";

/** What `007`'s `type` CHECK permits. */
export type EvidenceType = "photo" | "pdf" | "manual";

/** What the student was capturing. Provenance only — it is not a column on
 *  `evidence` (007 is frozen), it travels in `ingestion_runs.meta`. */
export type CaptureKind = "paper" | "syllabus";

/** Bytes we accept from a capture. Anything else is refused at the boundary
 *  rather than stored and puzzled over later. */
export const ACCEPTED_MIME_PREFIXES = ["image/", "application/pdf", "text/plain"] as const;

/** 20 MB — the cap the syllabus tool already enforced client-side
 *  (`app/tools/syllabus/page.tsx`: "File must be under 20 MB"). Kept identical
 *  so the redirect does not silently change what a student may upload. */
export const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;

/**
 * `007`'s three-value `type` CHECK, derived from the bytes' declared type.
 *
 * `manual` is the text path: a pasted syllabus or a typed-out question is
 * evidence the student authored rather than photographed. It is still stored as
 * an object, so there is exactly one storage path and one hash rule.
 *
 * Returns `null` for anything unaccepted. The caller refuses; this function
 * never guesses a type on the student's behalf.
 */
export function evidenceTypeFor(contentType: string): EvidenceType | null {
  const mime = contentType.split(";")[0].trim().toLowerCase();
  if (mime.startsWith("image/")) return "photo";
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/plain") return "manual";
  return null;
}

/** `<student_id>/<content_hash>`. Deterministic in both arguments. */
export function storagePathFor(studentId: string, contentHash: string): string {
  return `${studentId}/${contentHash}`;
}

/** `<bucket>/<student_id>/<content_hash>` — what goes in `evidence.storage_ref`.
 *  The bucket is part of the reference so a future second bucket cannot make an
 *  old row ambiguous. */
export function storageRefFor(studentId: string, contentHash: string): string {
  return `${EVIDENCE_BUCKET}/${storagePathFor(studentId, contentHash)}`;
}

export interface StorageError {
  message: string;
}

/**
 * The one storage operation capture needs, as an interface rather than a
 * client. `app/api/capture/route.ts` supplies the Supabase implementation;
 * a test supplies a recording double and proves the shipped path.
 */
export interface EvidenceStorage {
  upload(
    path: string,
    bytes: Uint8Array,
    options: { contentType: string; upsert: boolean },
  ): Promise<{ error: StorageError | null }>;
}

export interface StoreObjectInput {
  studentId: string;
  contentHash: string;
  bytes: Uint8Array;
  contentType: string;
}

export type StoreObjectResult =
  | { ok: true; path: string; storageRef: string }
  | { ok: false; detail: string };

/**
 * Put the bytes where the evidence row will point.
 *
 * `upsert: true` is safe HERE and only here: the key is the hash of the bytes
 * being written, so an overwrite writes byte-identical content. It is what
 * makes a re-upload cost one object instead of two.
 */
export async function storeEvidenceObject(
  storage: EvidenceStorage,
  input: StoreObjectInput,
): Promise<StoreObjectResult> {
  const path = storagePathFor(input.studentId, input.contentHash);

  const { error } = await storage.upload(path, input.bytes, {
    contentType: input.contentType,
    upsert: true,
  });

  if (error) return { ok: false, detail: error.message };

  return { ok: true, path, storageRef: storageRefFor(input.studentId, input.contentHash) };
}
