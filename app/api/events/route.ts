// ═══════════════════════════════════════════════════════════════════════════
// M7-2 — THE INGEST ENDPOINT.
//
// D.3: *"A single server endpoint, and nothing else, may write events."* This
// is that endpoint. It is deliberately thin: authenticate, hand the body to
// `ingestEvents()`, shape the answer. Every decision it appears to make is made
// in a pure module that a test can reach without a database —
// `lib/event-contract.ts`, `lib/event-ingest.ts`, `lib/events.ts`.
//
//
// D.3 STEP 1 — AUTHENTICATE, AND TAKE THE IDENTITY FROM THE TOKEN
//
// *"Bearer token → `student_id`."* `createStudentServerClient()` (M4-1) reads
// the caller's session out of the request cookies and `auth.getUser()`
// validates it against the auth server rather than decoding it locally. The
// body's opinion of who is asking is never consulted — it cannot be, because
// `student_id` is in `SERVER_ASSIGNED_FIELDS` and a body containing one is
// quarantined before it reaches the table (D.1.a).
//
// A bearer header is accepted as well as the cookie, because a background sync
// or a service worker flush has a token and may not have cookies. Same
// validation either way.
//
//
// WHY THE RESPONSE IS PER-EVENT AND WHY A QUARANTINE IS A 200
//
// The outbox flushes a batch. One malformed event in fifty must not fail the
// other forty-nine, and the client must be able to mark each record
// individually — sent, or refused and never worth retrying. So the status code
// describes the REQUEST and the per-event `outcome` describes each EVENT.
//
// A quarantined event returns `outcome: "quarantined"` inside a 200 because the
// request succeeded: the server received the claim, refused it, and recorded
// the refusal where the student can see it. Answering 400 would tell the outbox
// to retry forever an event that will never become valid.
//
// The one exception is `outcome: "unavailable"` — the quarantine table itself
// could not be written — which is reported honestly so the client keeps the
// record pending rather than believing a refusal that was never stored.
//
// NOT WIRED TO ANYTHING YET, on purpose. No tool emits, and every capability
// manifest still declares `emits_events: []`, so a tool-sourced event is
// refused by the registry gate (D.3.4). M7 builds the pipe.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import { ingestEvents } from "@/lib/events";
import { MAX_BATCH_SIZE, MAX_EVENT_BYTES } from "@/lib/event-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A whole batch cannot exceed one event's cap times the batch cap, plus slack
 *  for the wrapper. Checked before parsing so an oversized body is refused
 *  without being materialised. */
const MAX_REQUEST_BYTES = MAX_BATCH_SIZE * MAX_EVENT_BYTES;

export async function POST(req: Request) {
  // ── D.3.1 · authenticate ─────────────────────────────────────────────────
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const studentId = userData?.user?.id;
  if (authError || !studentId) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { ok: false, error: "payload_too_large", detail: `cap is ${MAX_REQUEST_BYTES} bytes` },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // ── D.3.2–9 · everything else, in the pure modules and the data layer ────
  const result = await ingestEvents(studentId, body);

  if (!result.ok) {
    // The batch itself was refused — too large, or over the per-minute cap
    // (D.3.7). Nothing was accepted and nothing was quarantined, so the client
    // retries the identical request with the identical ids.
    const status = result.refused?.code === "RATE_LIMIT" ? 429 : 400;
    return NextResponse.json(
      { ok: false, error: result.refused?.code ?? "bad_request", detail: result.refused?.detail },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    appended: result.appended,
    duplicates: result.duplicates,
    quarantined: result.quarantined,
    results: result.results,
  });
}
