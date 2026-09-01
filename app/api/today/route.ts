// ═══════════════════════════════════════════════════════════════════════════
// M21-1 — TODAY, WIRED TO LIVE STATE.
//
// `lib/today/engine.ts` is pure (L.3: deterministic selection and ordering,
// no I/O). This route is the one place that turns live Supabase state into
// its `TodayInputs` shape and calls it — the same split M20 draws between
// `lib/recommendations/engine.ts` (pure) and this file (I/O), and the split
// M19 draws between extraction-as-a-job and aggregation-as-pure-logic.
//
// EVERYTHING IS READ AS THE STUDENT (`createStudentServerClient`), the same
// posture `app/api/assessment/verify/route.ts` uses — RLS is what makes
// "a session that is not theirs is not visible at all" true here, not an
// application-layer filter.
//
// V.7.3 — INSUFFICIENT_DATA. Triggered ONLY by a genuine read failure (a
// Supabase error on a required query), never by routine cadence (the daily
// score close naturally lags "now" by up to a day, and that is not a
// pipeline failure — L.4 reserves `insufficient_data` for "an ingest or
// projection failure", not for the score's normal batch schedule).
//
// M21-3 / L.5 — `students.last_seen_at` is read BEFORE building the response
// (so "what is new" is computed against the OLD value) and advanced via
// `public.mark_today_seen()` AFTER the response is built — never before,
// and never as a whole-row client UPDATE (033's function is the only write
// path, mirroring `set_student_profile()`'s discipline).
//
// K.1/K.2/K.7/K.8 ARE REUSED, NOT REIMPLEMENTED. `lib/recommendations/
// engine.ts`'s candidate generators, `computeFit`/`computeFatigue`/
// `computePriority`/`toRecommendation`/`selectNextBestAction` are called
// directly against a small, honest slice of live state (open patterns, due
// retests) — this route does not persist a `recommendations` row (that
// table's write path is still out of scope per M20's own "not built in this
// pass" note; M21 is its first REAL consumer, and consumes the pure engine
// in-memory rather than reintroducing a second selection algorithm). `fit`
// is neutral (0.6, no personal-model signal read here) and `fatigue` is 0
// (no outcome history read here) — both are documented simplifications,
// never a fabricated favourable/unfavourable value.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import {
  computeFit,
  computeFatigue,
  dedupeCandidates,
  dueRetestCandidates,
  openPatternCandidates,
  selectNextBestAction,
  toRecommendation,
  unionCandidates,
  type DueRetestInput,
  type OpenPatternInput,
} from "@/lib/recommendations/engine";
import { CONFIRMED_SESSION_CONCEPTS_VIEW } from "@/lib/session-concepts";
import { deriveTodayState } from "@/lib/today/engine";
import type {
  AccomplishmentInput,
  NextBestActionInput,
  OpenSessionInput,
  ScoreStateInput,
  TodayInputs,
  UnverifiedSessionInput,
} from "@/lib/today/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACCOMPLISHMENT_LOOKBACK_MS = 30 * 86_400_000; // bounds the query, never the pure engine's own logic

export async function GET(req: Request) {
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const user = userData?.user;
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const studentId = user.id;
  const nowMs = Date.now();

  let anyReadError = false;
  const noteError = (e: { message: string } | null) => {
    if (e) anyReadError = true;
  };

  // ── students.last_seen_at, read BEFORE the response is built ─────────────
  const { data: studentRow, error: studentErr } = await supabase
    .from("students")
    .select("last_seen_at")
    .eq("student_id", studentId)
    .maybeSingle();
  noteError(studentErr);
  const lastSeenAtMs =
    studentRow?.last_seen_at && typeof studentRow.last_seen_at === "string"
      ? Date.parse(studentRow.last_seen_at)
      : null;

  // ── hasAnyAcademicEvidence — V.7.1's discriminator ────────────────────────
  const { data: eventProbe, error: eventErr } = await supabase
    .from("academic_events")
    .select("event_id")
    .eq("student_id", studentId)
    .limit(1);
  noteError(eventErr);
  const hasAnyAcademicEvidence = (eventProbe?.length ?? 0) > 0;

  // ── sessions: open (resume), unverified, recently completed (accomplishments) ─
  const { data: sessionRows, error: sessionErr } = await supabase
    .from("study_sessions")
    .select("session_id, state, closed_at, opened_at")
    .eq("student_id", studentId)
    .order("opened_at", { ascending: false })
    .limit(100);
  noteError(sessionErr);

  const rows = (sessionRows ?? []) as Array<{
    session_id: string;
    state: string;
    closed_at: string | null;
    opened_at: string;
  }>;

  const openRow = rows.find(r => r.state === "ACTIVE" || r.state === "DORMANT") ?? null;
  const openSession: OpenSessionInput | null = openRow
    ? { sessionId: openRow.session_id, subject: null, state: openRow.state as "ACTIVE" | "DORMANT" }
    : null;

  const unverifiedSessions: UnverifiedSessionInput[] = rows
    .filter(r => r.state === "CLOSED_UNVERIFIED")
    .map(r => ({
      sessionId: r.session_id,
      subject: null,
      closedAtMs: r.closed_at ? Date.parse(r.closed_at) : Date.parse(r.opened_at),
    }));

  const sinceMs = Math.max(lastSeenAtMs ?? 0, nowMs - ACCOMPLISHMENT_LOOKBACK_MS);
  const completedRows = rows.filter(
    r => (r.state === "VERIFIED" || r.state === "CLOSED_UNVERIFIED") && r.closed_at && Date.parse(r.closed_at) > sinceMs,
  );

  let recentAccomplishments: AccomplishmentInput[] = [];
  if (completedRows.length > 0) {
    const ids = completedRows.map(r => r.session_id);
    // Read the view, never the raw table — 022's `confirmed_session_concepts`
    // is "the only session-concept surface that may be read as academic
    // fact"; a proposed-but-not-confirmed row is not evidence, and reading
    // the raw table here would be exactly the mistake 022's own comment
    // warns every M10-onward consumer against.
    const { data: conceptRows, error: conceptErr } = await supabase
      .from(CONFIRMED_SESSION_CONCEPTS_VIEW)
      .select("session_id")
      .in("session_id", ids);
    noteError(conceptErr);

    const countBySession = new Map<string, number>();
    for (const row of (conceptRows ?? []) as Array<{ session_id: string }>) {
      countBySession.set(row.session_id, (countBySession.get(row.session_id) ?? 0) + 1);
    }

    recentAccomplishments = completedRows.map(r => {
      return {
        sessionId: r.session_id,
        subject: null,
        closedAtMs: Date.parse(r.closed_at as string),
        conceptsConfirmedCount: countBySession.get(r.session_id) ?? 0,
        // Verified/pattern figures are not derivable from any table this
        // codebase persists today (M11 has not wired per-session pattern
        // output; M10 has no verified-concept table read here) — reported
        // as 0, an honest empty count, never invented (same discipline
        // `lib/session-completion.ts`'s `CompletionInput` documents for the
        // identical fields).
        conceptsVerifiedCount: 0,
        newPatternsCount: 0,
        resolvedPatternsCount: 0,
        scoreDeltaTotal: null,
      } satisfies AccomplishmentInput;
    });
  }

  // ── score: latest score_history row ───────────────────────────────────────
  const { data: scoreRows, error: scoreErr } = await supabase
    .from("score_history")
    .select("id, score_state, total, confidence, as_of")
    .eq("user_id", studentId)
    .order("as_of", { ascending: false })
    .limit(1);
  noteError(scoreErr);

  const scoreRow = scoreRows?.[0] as
    | { id: number | string; score_state: string; total: number | null; confidence: number | null; as_of: string }
    | undefined;
  const score: ScoreStateInput | null = scoreRow
    ? {
        state: scoreRow.score_state === "scored" ? "scored" : "baseline",
        total: scoreRow.total ?? null,
        confidence: scoreRow.confidence ?? null,
        asOfMs: Date.parse(scoreRow.as_of),
        scoreSnapshotId: String(scoreRow.id),
      }
    : null;

  // ── recommendations, reused live (K.1/K.2/K.7/K.8) ────────────────────────
  const { data: patternRows, error: patternErr } = await supabase
    .from("patterns")
    .select("id, subject, concept_id, label, severity")
    .eq("student_id", studentId)
    .eq("tier", "concept")
    .eq("status", "open")
    .limit(50);
  noteError(patternErr);

  const openPatternIds = ((patternRows ?? []) as Array<{ id: string }>).map(p => p.id);
  let occByPattern = new Map<string, string[]>();
  if (openPatternIds.length > 0) {
    const { data: occRows, error: occErr } = await supabase
      .from("occurrences")
      .select("id, pattern_id")
      .in("pattern_id", openPatternIds);
    noteError(occErr);
    for (const o of (occRows ?? []) as Array<{ id: string; pattern_id: string }>) {
      const list = occByPattern.get(o.pattern_id) ?? [];
      list.push(o.id);
      occByPattern.set(o.pattern_id, list);
    }
  }

  const openPatternInputs: OpenPatternInput[] = ((patternRows ?? []) as Array<{
    id: string;
    subject: string;
    concept_id: string | null;
    label: string;
    severity: number | null;
  }>).map(p => ({
    patternId: p.id,
    subject: p.subject,
    conceptId: p.concept_id,
    label: p.label,
    severity: typeof p.severity === "number" ? p.severity / 100 : 0,
    occurrenceIds: occByPattern.get(p.id) ?? [],
  }));

  const { data: retestRows, error: retestErr } = await supabase
    .from("mistake_retest_schedule")
    .select("pattern_id, due_at")
    .eq("student_id", studentId)
    .lte("due_at", new Date(nowMs).toISOString())
    .limit(50);
  noteError(retestErr);

  const patternById = new Map(
    ((patternRows ?? []) as Array<{ id: string; subject: string; concept_id: string | null; label: string }>).map(p => [
      p.id,
      p,
    ]),
  );
  const dueRetestInputs: DueRetestInput[] = ((retestRows ?? []) as Array<{ pattern_id: string; due_at: string }>)
    .map(r => {
      const p = patternById.get(r.pattern_id);
      if (!p) return null;
      return {
        patternId: r.pattern_id,
        subject: p.subject,
        conceptId: p.concept_id,
        label: p.label,
        dueAt: r.due_at,
        scheduleId: r.pattern_id,
      } satisfies DueRetestInput;
    })
    .filter((x): x is DueRetestInput => x !== null);

  const candidates = dedupeCandidates(
    unionCandidates(openPatternCandidates(openPatternInputs), dueRetestCandidates(dueRetestInputs, nowMs)),
  );
  const recommendations = candidates.map(c =>
    toRecommendation(c, {
      fit: computeFit({ kind: c.kind, matchesFormatPreference: null, matchesWorkingWindow: null }),
      fatigue: computeFatigue(c.kind, [], nowMs),
      nowMs,
    }),
  );
  const winner = selectNextBestAction(recommendations);
  const nextBestAction: NextBestActionInput | null = winner
    ? {
        recommendationId: winner.recommendationId,
        kind: winner.kind,
        subject: winner.subject,
        reasonTemplate: winner.reasonTemplate,
        evidenceRefs: winner.evidenceRefs,
      }
    : null;

  const inputs: TodayInputs = {
    nowMs,
    lastSeenAtMs,
    dataFreshness: { ok: !anyReadError },
    hasAnyAcademicEvidence,
    openSession,
    unverifiedSessions,
    recentAccomplishments,
    nextBestAction,
    score,
  };

  const state = deriveTodayState(inputs);

  // ── L.5 — advance last_seen_at AFTER the response is computed, never before ─
  await supabase.rpc("mark_today_seen");

  return NextResponse.json({
    ok: true,
    items: state.items,
    emptyReason: state.emptyReason,
    generatedAtMs: state.generatedAtMs,
  });
}
