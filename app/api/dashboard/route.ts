import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import {
  computeFatigue,
  computeFit,
  dedupeCandidates,
  dueRetestCandidates,
  openPatternCandidates,
  selectNextBestAction,
  toRecommendation,
  unionCandidates,
  type DueRetestInput,
  type OpenPatternInput,
} from "@/lib/recommendations/engine";

// ═══════════════════════════════════════════════════════════════════════════
// /api/dashboard — the seven figures the landing surface renders.
//
// One request, seven reads, because a dashboard that fires seven requests
// shows seven separate loading states and lands in a different order every
// time.
//
// ── EVERY FIGURE IS READ, NEVER INVENTED (V.7.6) ─────────────────────────
// The founder supplied a mockup with placeholder numbers: 24.5h this week,
// 78% mastery, 8.4 GPA, "4 done 3 in progress 2 not started". Those are
// design filler. Two of them named things this product does not record, and
// both were resolved rather than faked:
//
//   ASSIGNMENTS — there is no assignments table, and there is no homework
//   concept anywhere in StudyLedger. The card becomes MISTAKE PATTERNS by
//   status (resolved / practising / open), which is the same three-part
//   shape reading something the product actually owns.
//
//   GRADE TREND "8.4 GPA" — `score_history` holds the LEDGER SCORE, not a
//   GPA. The card trends the Ledger Score total, which is real, and says so.
//
// ── EVERYTHING IS READ AS THE STUDENT ────────────────────────────────────
// `createStudentServerClient`, the same posture as /api/today. RLS is what
// makes "another student's rows are not visible" true, rather than a filter
// this file remembers to apply.
//
// ── A SOURCE THAT DOES NOT ANSWER RETURNS null, NEVER 0 ──────────────────
// The same rule `lib/record.ts` states for RecordTotals. A zero is a fact
// about the student; a null is a fact about the read. The dashboard renders
// them differently on purpose, because "you have studied 0 hours" and "we
// could not read your hours" are different sentences and only one of them is
// ever true at a time.
// ═══════════════════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";

/**
 * Midnight N days ago, as a UTC date key.
 *
 * `toISOString()` converts to UTC, so building the key from a LOCAL midnight
 * shifted every bucket by the timezone offset: on a machine at UTC+5:30 the
 * seven days came out labelled 25-31 August when the real week was 26 August
 * to 1 September. The dates are derived in UTC throughout so the bucket keys
 * and the `opened_at` values they are matched against agree.
 */
function dayKey(offset: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** The same instant, as a full timestamp, for the range filter. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

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

  // ── 1. THIS WEEK — hours studied per day, last 7 days ──────────────────
  // Closed sessions only: an open session has no duration yet, and counting
  // one would inflate today's figure every time the page is opened.
  const { data: sessions, error: sessionsErr } = await supabase
    .from("study_sessions")
    .select("opened_at, closed_at, state")
    .gte("opened_at", daysAgo(6))
    .not("closed_at", "is", null)
    .returns<{ opened_at: string | null; closed_at: string | null; state: string }[]>();

  let weekMinutes: number | null = null;
  let perDay: { day: string; minutes: number }[] = [];
  if (!sessionsErr) {
    const buckets = new Map<string, number>();
    for (let i = 6; i >= 0; i--) buckets.set(dayKey(i), 0);
    for (const s of sessions ?? []) {
      if (!s.opened_at || !s.closed_at) continue;
      const key = String(s.opened_at).slice(0, 10);
      if (!buckets.has(key)) continue;
      const mins = (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000;
      if (mins > 0) buckets.set(key, (buckets.get(key) ?? 0) + mins);
    }
    perDay = [...buckets].map(([day, minutes]) => ({ day, minutes: Math.round(minutes) }));
    weekMinutes = perDay.reduce((a, b) => a + b.minutes, 0);
  }

  // ── 2. NEXT UP — derived live, never read from the table ───────────────
  // This first queried `recommendations` directly. That was wrong twice over.
  //
  // It was DEAD: nothing in the codebase ever INSERTs into that table.
  // `lib/recommendations/engine.ts` is I/O-free by design, so the row set is
  // always empty and the card would have shown its empty state forever while
  // looking perfectly normal, which is the worst kind of bug: one that
  // renders.
  //
  // It also broke the K.3/V.11 fence (tests/recommendations.test.mjs): only
  // the engine and its own API route may touch that table, so that a
  // recommendation can never be smuggled in as something that gates a
  // student. `/api/today` derives its next best action in memory from open
  // patterns and due retests, and this uses exactly that path, so the two
  // surfaces cannot disagree about what to suggest next.
  const nowMs = Date.now();

  const { data: openPatterns, error: openPatternsErr } = await supabase
    .from("patterns")
    .select("id, subject, concept_id, label, severity")
    .eq("student_id", studentId)
    .eq("tier", "concept")
    .eq("status", "open")
    .limit(50)
    .returns<{ id: string; subject: string; concept_id: string | null; label: string; severity: number | null }[]>();

  const openRows = openPatterns ?? [];
  const occByPattern = new Map<string, string[]>();
  if (openRows.length > 0) {
    const { data: occRows } = await supabase
      .from("occurrences")
      .select("id, pattern_id")
      .in("pattern_id", openRows.map(p => p.id))
      .returns<{ id: string; pattern_id: string }[]>();
    for (const o of occRows ?? []) {
      const list = occByPattern.get(o.pattern_id) ?? [];
      list.push(o.id);
      occByPattern.set(o.pattern_id, list);
    }
  }

  const openPatternInputs: OpenPatternInput[] = openRows.map(p => ({
    patternId: p.id,
    subject: p.subject,
    conceptId: p.concept_id,
    label: p.label,
    // `severity` is stored 0-100 and the engine takes 0-1.
    severity: typeof p.severity === "number" ? p.severity / 100 : 0,
    occurrenceIds: occByPattern.get(p.id) ?? [],
  }));

  // ── 3. SUBJECT MASTERY — answered vs correct, per concept ──────────────
  const { data: accuracy, error: accuracyErr } = await supabase
    .from("concept_accuracy")
    .select("concept_ref, answered, correct")
    .returns<{ concept_ref: string; answered: number | null; correct: number | null }[]>();

  let masteryPct: number | null = null;
  if (!accuracyErr) {
    const answered = (accuracy ?? []).reduce((a, r) => a + (r.answered ?? 0), 0);
    const correct = (accuracy ?? []).reduce((a, r) => a + (r.correct ?? 0), 0);
    // No answers is not 0% mastery, it is no mastery figure at all. A student
    // who has answered nothing has not scored zero.
    masteryPct = answered > 0 ? Math.round((correct / answered) * 100) : null;
  }

  // ── 4. MISTAKE PATTERNS — replaces the mockup's "Assignments" ──────────
  // Three states, from `patterns.status`, which is what this product records
  // in place of homework.
  const { data: patterns, error: patternsErr } = await supabase
    .from("patterns")
    .select("id, status, tier")
    .eq("tier", "concept")
    .returns<{ id: string; status: string | null; tier: string }[]>();

  let patternCounts: { resolved: number; practising: number; open: number } | null = null;
  if (!patternsErr) {
    const rows = patterns ?? [];
    patternCounts = {
      resolved: rows.filter(p => p.status === "resolved").length,
      practising: rows.filter(p => p.status === "practising").length,
      open: rows.filter(p => p.status === "open" || p.status === "acknowledged").length,
    };
  }


  // ── 6. REVISION QUEUE — retests that are due ───────────────────────────
  const { data: retests, error: retestsErr } = await supabase
    .from("mistake_retest_schedule")
    .select("pattern_id, due_at, interval_days, attempt_count")
    .eq("student_id", studentId)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(5)
    .returns<{ pattern_id: string; due_at: string; interval_days: number | null; attempt_count: number | null }[]>();

  // ── 2b. NEXT UP, continued — the engine turns the two evidence sets above
  // into ranked candidates. A candidate with no evidence throws
  // EvidenceRequiredError by construction (K.1), so nothing here can invent a
  // suggestion the student's own record does not support.
  const patternById = new Map(openRows.map(p => [p.id, p]));
  const dueRetestInputs: DueRetestInput[] = (retests ?? [])
    .map(r => {
      const p = patternById.get(r.pattern_id);
      // A retest whose pattern is closed is not something to suggest.
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

  const nextUp = (openPatternsErr
    ? []
    : dedupeCandidates(
        unionCandidates(
          openPatternCandidates(openPatternInputs),
          dueRetestCandidates(dueRetestInputs, nowMs),
        ),
      ).map(c =>
        toRecommendation(c, {
          fit: computeFit({ kind: c.kind, matchesFormatPreference: null, matchesWorkingWindow: null }),
          fatigue: computeFatigue(c.kind, [], nowMs),
          nowMs,
        }),
      )
  )
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);

  // The single highest-priority one, matching what /today calls the next best
  // action, so the dashboard's headline suggestion and /today agree.
  const nextBestAction = selectNextBestAction(nextUp);

  // ── 7. SCORE TREND — replaces the mockup's "GPA trend" ─────────────────
  const { data: trend, error: trendErr } = await supabase
    .from("score_history")
    .select("captured_on, total")
    .eq("active", true)
    .order("captured_on", { ascending: false })
    .limit(12);

  return NextResponse.json({
    ok: true,
    thisWeek: {
      minutes: weekMinutes,
      perDay,
    },
    nextUp,
    nextBestAction,
    mastery: {
      pct: masteryPct,
      conceptsTracked: accuracyErr ? null : (accuracy ?? []).length,
    },
    patterns: patternCounts,
    // No `streak` field, deliberately. M0-6 removed streak PRESENTATION
    // from every surface, and tests/m0-integrity-fences.test.mjs exists to
    // stop it returning. Shipping it in the payload would let any future
    // card render one without anyone noticing the fence had moved.
    //
    // `score_history.streak` is still WRITTEN: lib/ledger-score.ts reads it
    // as the raw input to the Consistency term, and deleting the write
    // would silently move every student's score. Presentation, not storage.
    revisionQueue: retestsErr ? null : (retests ?? []),
    scoreTrend: trendErr ? null : (trend ?? []).slice().reverse(),
  });
}
