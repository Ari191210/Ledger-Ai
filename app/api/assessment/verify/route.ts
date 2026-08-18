// ═══════════════════════════════════════════════════════════════════════════
// M10-4 — THE TRANSITION ENDPOINT. V.3.5's "REFUSED SERVER-SIDE".
//
// EXECUTION_PLAN M10-4: *"The transition gate — coverage failure **refuses to
// verify**. Done when: V.3.4, V.3.5. T5 mitigation: the guarantee fails
// **closed**."*
//
// V.3.5: *"Attempt to force `ASSESSING → VERIFIED` via a DIRECT API CALL with
// concept 3 unanswered. **Refused server-side**, with a typed error."*
//
// **This route is that direct API call, and it is the one that refuses.** It
// exists so the refusal has an address: an acceptance test that says "force it
// via a direct API call" needs a call to force, and a gate with no endpoint in
// front of it is a gate nobody has tried the handle on.
//
//
// THE CLIENT DOES NOT SEND A STATE, AND CANNOT
//
// The body carries a `session_id` and nothing else. There is no `state` field,
// no `verified: true`, no `close_reason` — E.7.3: *"clients hold no
// authoritative session state."* What a client may say is *"I have finished the
// assessment"*; what that MEANS is decided here, from evidence the client did
// not supply and cannot forge.
//
//
// FOUR REFUSALS STAND BETWEEN A REQUEST AND A VERIFIED SESSION
//
//   1 · RLS            the session and its coverage are read as the STUDENT, so
//                      a session that is not theirs is not visible at all.
//   2 · THE GATE       `evaluateVerificationGate()` — fails closed, and returns
//                      a typed refusal naming the concept that is unproven.
//   3 · THE MACHINE    M9's `applySessionTransition()` still decides the edge.
//                      A terminal session, a stale tab or a session in the
//                      wrong state is a noop, exactly as it was before M10.
//   4 · `024` §9       a trigger on `study_sessions` runs the same predicate in
//                      the database, so the service role, a repair script and
//                      the next endpoint somebody writes are all bound by it.
//
// Layers 2 and 3 are this process and share a bug. Layer 4 does not — 020 §5's
// argument, unchanged. Layer 1 is the only one that is about ownership.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createStudentServerClient, supabaseServer } from "@/lib/supabase-server";
import {
  applyVerificationTransition,
  conceptAssessmentStates,
  COVERAGE_UNFILLABLE,
  type CoverageRow,
} from "@/lib/assessment-verification";
import type { ManifestEntry } from "@/lib/assessment-blueprint";
import { applySessionTransition, CLOSE_REASON_NOTE, nextMoveFor } from "@/lib/study-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const user = userData?.user;
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: { session_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!sessionId) return NextResponse.json({ ok: false, error: "no_session" }, { status: 400 });

  // ── read, as the student ─────────────────────────────────────────────────
  const { data: session } = await supabase
    .from("study_sessions")
    .select("session_id, student_id, state, evidence_event_count")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!session) return NextResponse.json({ ok: false, error: "no_such_session" }, { status: 404 });

  const { data: assessment } = await supabase
    .from("assessments")
    .select("assessment_id, coverage_manifest")
    .eq("session_id", sessionId)
    .maybeSingle();

  const { data: coverageRows } = await supabase
    .from("assessment_verification_coverage")
    .select("assessment_id, session_id, concept_ref, questions_required, questions_bound, questions_answered, covered")
    .eq("session_id", sessionId);

  const manifest = (assessment?.coverage_manifest ?? []) as ManifestEntry[];
  const coverage = ((coverageRows ?? []) as unknown[]).map(r => {
    const row = r as Record<string, unknown>;
    return {
      assessment_id: String(row.assessment_id),
      session_id: String(row.session_id),
      concept_ref: String(row.concept_ref),
      questions_required: Number(row.questions_required),
      questions_bound: Number(row.questions_bound),
      questions_answered: Number(row.questions_answered),
      covered: row.covered === true,
    } satisfies CoverageRow;
  });

  // ── THE GATE ─────────────────────────────────────────────────────────────
  const outcome = applyVerificationTransition(
    {
      state: session.state,
      evidence_event_count: Number(session.evidence_event_count ?? 0),
    },
    {
      assessment_id: (assessment?.assessment_id as string | undefined) ?? null,
      manifest,
      coverage,
    },
  );

  if (!outcome.ok) {
    // V.3.4: *"nothing is presented as verified."* The response says what is
    // still unproven and offers the one honest next move; it never says the
    // student failed, and §4's lexicon is where the words come from.
    return NextResponse.json(
      {
        ok: false,
        error: "verification_refused",
        state: outcome.state,
        refusals: outcome.refusals,
        /** F.2.a's assessment-level reason. `null` when the refusal is not a
         *  coverage hole — a session in the wrong state is not unfillable. */
        assessment_reason: outcome.assessment_reason,
        /** F.2.a: *"the concept is recorded as `studied`, not `assessed`."*
         *  M12-1 owns `coverage_state`; this is M10's own reading of its own
         *  evidence and is deliberately narrower. */
        concepts: conceptAssessmentStates({ manifest, coverage }),
      },
      { status: 409 },
    );
  }

  // ── the write, gated ─────────────────────────────────────────────────────
  const { error } = await supabaseServer
    .from("study_sessions")
    .update({
      state: "VERIFIED",
      close_reason: outcome.transition.outcome.kind === "transition"
        ? outcome.transition.outcome.close_reason
        : null,
      closed_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("state", "ASSESSING");

  if (error) {
    // `024` §9's trigger is the fourth refusal and it fires here, not silently.
    // A write it rejected means this process's gate and the database's gate
    // disagreed, which is a defect in this pipeline and is reported as one.
    Sentry.captureException(new Error(error.message), {
      tags: { route: "api/assessment/verify", phase: "transition" },
    });
    return NextResponse.json({ ok: false, error: "transition_refused", detail: error.message }, { status: 409 });
  }

  await supabaseServer
    .from("assessments")
    .update({ status: "ready" })
    .eq("assessment_id", outcome.transition.assessment_id);

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    state: "VERIFIED",
    assessment_id: outcome.transition.assessment_id,
    entries_covered: outcome.transition.entries_covered,
    /** Figures and a fact, never a congratulation (§7.1 — *"the Return beat is
     *  EVIDENCE, not celebration"*). */
    note: CLOSE_REASON_NOTE.assessment_completed,
    next_move: nextMoveFor("VERIFIED"),
    concepts: conceptAssessmentStates({ manifest, coverage }),
  });
}

/**
 * F.2.a's other ending, as its own verb: close a session whose coverage could
 * not be filled.
 *
 * It is a PATCH rather than a second POST arm because it is a different act —
 * *"verify this"* and *"this cannot be verified, close it"* are not two
 * spellings of one request, and folding them together is how a refusal quietly
 * becomes a closure. A student who is one answer short should be able to answer
 * it, not find their session closed by the check that noticed.
 */
export async function PATCH(req: Request) {
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  if (authError || !userData?.user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: { session_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!sessionId) return NextResponse.json({ ok: false, error: "no_session" }, { status: 400 });

  const { data: session } = await supabase
    .from("study_sessions")
    .select("session_id, state, evidence_event_count")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!session) return NextResponse.json({ ok: false, error: "no_such_session" }, { status: 404 });

  // M9's machine decides the edge and the reason. This route supplies neither.
  const move = applySessionTransition(
    { state: session.state, evidence_event_count: Number(session.evidence_event_count ?? 0) },
    "generation_failed",
  );

  if (move.kind !== "transition") {
    // V.1.8's posture: a second call from a stale tab returns the current state
    // and NOT an error.
    return NextResponse.json({ ok: true, session_id: sessionId, state: move.state, changed: false });
  }

  await supabaseServer
    .from("study_sessions")
    .update({
      state: move.to,
      close_reason: move.close_reason,
      closed_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("state", session.state);

  // The precise F.2.a reason lives on the ASSESSMENT — see
  // `lib/assessment-verification.ts`'s note on `COVERAGE_UNFILLABLE` for why it
  // is not a session `close_reason`.
  await supabaseServer
    .from("assessments")
    .update({ status: "unfillable" })
    .eq("session_id", sessionId);

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    state: move.to,
    changed: true,
    close_reason: move.close_reason,
    assessment_reason: COVERAGE_UNFILLABLE,
    note: move.close_reason ? CLOSE_REASON_NOTE[move.close_reason] : null,
    next_move: nextMoveFor(move.to),
  });
}
