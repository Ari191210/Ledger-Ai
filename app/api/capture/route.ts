// ═══════════════════════════════════════════════════════════════════════════
// M8-2 / M8-3 — THE CAPTURE ENDPOINT.
//
// One POST. It authenticates, hashes the bytes, puts them in a private bucket,
// writes one `evidence` row, and enters the paper into `008_ingestion.sql`'s
// append-only stage ledger. Nothing reads the paper — extraction is M8-4.
//
// It is deliberately thin, exactly as `app/api/events/route.ts` (M7-2) is thin:
// every decision it appears to make is made in a module a test can reach with
// no database in the room —
//
//   `lib/evidence.ts`             hash, dedup interpretation, the row
//   `lib/storage.ts`              the bucket, the key, the type gate
//   `lib/capture-intake.ts`       the stage and the run
//   `lib/ingest/supabase-store.ts` `IngestionStore` over `008`
//
// This file supplies the two things those modules refuse to contain: a Supabase
// client and a clock.
//
//
// WHY IT LIVES UNDER `/api` AND NOT UNDER `/capture`
//
// `lib/auth-routes.ts` states the rule: *"`/api/*` is never protected here. API
// routes authenticate their own bearer tokens … answering an API call with an
// HTML redirect to a sign-in page would turn a clean 401 into a 200 full of
// markup."* When `/capture` joins `PROTECTED_PREFIXES`, an upload endpoint
// nested inside that segment would be answered by the edge redirect instead of
// by this handler. So it sits beside `app/api/events/`, and authenticates
// itself.
//
//
// WHICH CLIENT, AND WHY BOTH
//
//   · `createStudentServerClient()` — the ANON key, reading the caller's
//     session cookie. Used for ONE thing: `auth.getUser()`, which validates the
//     token against the auth server. The identity comes from here and from
//     nowhere else (D.1.a).
//   · `supabaseServer` — the service role. Used for the writes, because `008`
//     grants `ingestion_stages` no INSERT policy to anyone: *"the history is
//     written by the service role and is append-only by construction."*
//
// The service role never learns who is asking from the request body. Every
// function below takes `studentId` as an argument, and it is always the one
// `auth.getUser()` returned.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient, supabaseServer } from "@/lib/supabase-server";
import { captureEvidence, type DbResult, type EvidenceDb, type Row } from "@/lib/evidence";
import {
  EVIDENCE_BUCKET,
  MAX_EVIDENCE_BYTES,
  type CaptureKind,
  type EvidenceStorage,
} from "@/lib/storage";
import { beginCaptureIngestion } from "@/lib/capture-intake";
import {
  createSupabaseIngestionStore,
  findRunIdForEvidence,
  type IngestionDb,
  type OrderBy,
} from "@/lib/ingest/supabase-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Slack over the byte cap for multipart framing and the text fields. */
const MAX_REQUEST_BYTES = MAX_EVIDENCE_BYTES + 64 * 1024;

// ── The adapters. Twenty lines of Supabase, and the only Supabase in the
//    capture path. Everything they call is typed against an interface the
//    tests implement, so a wrong column name fails a test rather than a
//    student's upload. ──────────────────────────────────────────────────────

const evidenceDb: EvidenceDb = {
  async insertEvidence(row: Row): Promise<DbResult<Row>> {
    const { data, error } = await supabaseServer
      .from("evidence")
      .insert(row)
      .select()
      .single();
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
      // A Blob rather than the raw view: `supabase-js` sets the request body
      // from it directly and the content type travels with the object, which is
      // what a later signed read needs in order to render.
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

const isKind = (v: unknown): v is CaptureKind => v === "paper" || v === "syllabus";

export async function POST(req: Request) {
  // ── 1 · authenticate. The identity is the token's, never the body's ──────
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const studentId = userData?.user?.id;
  if (authError || !studentId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { ok: false, error: "payload_too_large", detail: `cap is ${MAX_EVIDENCE_BYTES} bytes` },
      { status: 413 },
    );
  }

  // ── 2 · read the capture ─────────────────────────────────────────────────
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const kindField = form.get("kind");
  const kind: CaptureKind = isKind(kindField) ? kindField : "paper";
  const noteField = form.get("note");
  const note = typeof noteField === "string" ? noteField.slice(0, 500) : "";

  const file = form.get("file");
  const textField = form.get("text");

  let bytes: Uint8Array;
  let contentType: string;
  let filename: string | null = null;

  if (file && typeof file === "object" && "arrayBuffer" in file) {
    const blob = file as File;
    bytes = new Uint8Array(await blob.arrayBuffer());
    contentType = blob.type || "application/octet-stream";
    filename = typeof blob.name === "string" ? blob.name.slice(0, 200) : null;
  } else if (typeof textField === "string" && textField.trim().length > 0) {
    // The typed / pasted path. Stored as an object like everything else, so
    // there is one storage rule and one hash rule (`lib/storage.ts`).
    bytes = new TextEncoder().encode(textField);
    contentType = "text/plain";
  } else {
    return NextResponse.json(
      { ok: false, error: "nothing_to_capture", detail: "send a file or some text" },
      { status: 400 },
    );
  }

  // ── 3 · the clock. Read ONCE, here, and injected everywhere below ────────
  const capturedAt = new Date().toISOString();
  const now = () => new Date().toISOString();

  // ── 4 · M8-2 — storage + the evidence row, deduped by the constraint ─────
  const captured = await captureEvidence(
    { db: evidenceDb, storage: evidenceStorage },
    { studentId, bytes, contentType, kind, capturedAt, sourceDescription: note },
  );

  if (!captured.ok) {
    const status =
      captured.code === "too_large" ? 413
      : captured.code === "unsupported_type" || captured.code === "empty" ? 400
      : 503;
    return NextResponse.json({ ok: false, error: captured.code, detail: captured.detail }, { status });
  }

  // ── 5 · M8-3 — the paper enters the stage ledger ─────────────────────────
  const store = createSupabaseIngestionStore(ingestionDb);

  let ingestion;
  try {
    const existingRunId = await findRunIdForEvidence(ingestionDb, studentId, captured.evidence.id);

    ingestion = await beginCaptureIngestion({
      store,
      studentId,
      facts: {
        evidenceId: captured.evidence.id,
        contentHash: captured.contentHash,
        storageRef: captured.evidence.storage_ref,
        byteSize: bytes.length,
        contentType,
        kind,
        evidenceType: captured.evidence.type,
      },
      meta: { filename, channel: "web", kind, note_present: note.length > 0 },
      now,
      existingRunId,
    });
  } catch (err) {
    // The evidence is already safe. A ledger failure must not be reported as a
    // failed capture — the bytes and the row are exactly where they should be,
    // and the run can be started again against the same evidence.
    return NextResponse.json(
      {
        ok: true,
        evidence_id: captured.evidence.id,
        deduped: captured.deduped,
        ingestion: null,
        detail: err instanceof Error ? err.message : "ingestion ledger unavailable",
      },
      { status: 202 },
    );
  }

  return NextResponse.json({
    ok: true,
    evidence_id: captured.evidence.id,
    content_hash: captured.contentHash,
    /** THE M8-2 DONE-WHEN, visible to the caller: the same paper twice is one
     *  row, and the second upload says so rather than pretending it was new. */
    deduped: captured.deduped,
    ingestion: {
      run_id: ingestion.runId,
      status: ingestion.status,
      created: ingestion.created,
      executed: ingestion.executed,
      reused: ingestion.reused,
    },
  });
}
