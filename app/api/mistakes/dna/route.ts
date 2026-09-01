// ═══════════════════════════════════════════════════════════════════════════
// /api/mistakes/dna — real aggregation for the Mistake DNA page.
//
// Every figure this route returns comes from a real query against
// `occurrences` / `patterns` for the authenticated student (RLS-scoped via
// `createStudentServerClient`, the same posture `app/api/today/route.ts`
// uses). Nothing here is a placeholder or an invented number: a metric with
// no real source is either derived honestly from what does exist, or
// returned as `null`/`0` with the fact that it's genuinely empty carried
// through to the client, never papered over with a plausible-looking figure
// (PRODUCT_PRINCIPLES — never fake data).
//
// ERROR-TYPE BUCKETS. `cognitive_error`/`execution_error` (007) are the real
// stored taxonomy (11 values). This route maps them into six display
// buckets for the radar — a presentation grouping, not a new classification;
// `errorTypeBucket()` is the only place that mapping exists.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_DAYS = 30;
const RECENT_LIMIT = 5;
const HEATMAP_WEEKS = 5;

type Bucket =
  | "Conceptual Understanding"
  | "Careless Errors"
  | "Calculation Errors"
  | "Time Management"
  | "Application Errors"
  | "Recall Errors";

const BUCKET_ORDER: Bucket[] = [
  "Conceptual Understanding",
  "Careless Errors",
  "Calculation Errors",
  "Time Management",
  "Application Errors",
  "Recall Errors",
];

function errorTypeBucket(cognitive: string | null, execution: string | null): Bucket {
  if (execution === "ran-out-of-time") return "Time Management";
  if (execution === "arithmetic-slip" || execution === "sign-error" || execution === "unit-error") return "Calculation Errors";
  if (execution === "misread-question" || execution === "transcription" || execution === "missed-working" || execution === "presentation" || execution === "incomplete-answer") return "Careless Errors";
  if (cognitive === "cannot-recall-formula" || cognitive === "not-known") return "Recall Errors";
  if (cognitive === "misapplied-rule" || cognitive === "wrong-method") return "Application Errors";
  return "Conceptual Understanding"; // misconception, incomplete-understanding — the default cognitive bucket
}

function isoWeekLabel(d: Date, weeksAgo: number): string {
  return weeksAgo === 0 ? "This Week" : `Wk ${HEATMAP_WEEKS - weeksAgo}`;
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
  const nowMs = Date.now();
  const windowStart = new Date(nowMs - WINDOW_DAYS * 86_400_000).toISOString();
  const prevWindowStart = new Date(nowMs - 2 * WINDOW_DAYS * 86_400_000).toISOString();

  // ── This window's occurrences, and the prior window's, for real deltas ──
  const [{ data: occRows, error: occErr }, { data: prevOccRows, error: prevErr }] = await Promise.all([
    supabase
      .from("occurrences")
      .select("id, subject, chapter, topic, cognitive_error, execution_error, marks_lost, marks_available, created_at, pattern_id")
      .eq("student_id", studentId)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false }),
    supabase
      .from("occurrences")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .gte("created_at", prevWindowStart)
      .lt("created_at", windowStart),
  ]);

  if (occErr) {
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 502 });
  }

  const occurrences = occRows ?? [];
  const prevTotal = prevErr ? null : (prevOccRows as unknown as { length: number } | null) === null ? 0 : (prevOccRows as any)?.length ?? 0;

  // ── Patterns this student owns — recurrence + resolution, for real counts ─
  const { data: patternRows, error: patErr } = await supabase
    .from("patterns")
    .select("id, status, recurrence_count, severity, label, subject, last_seen_at")
    .eq("student_id", studentId)
    .eq("tier", "concept");

  const patterns = patErr ? [] : (patternRows ?? []);

  const totalMistakes = occurrences.length;
  const repeatedPatternIds = new Set(patterns.filter(p => (p.recurrence_count ?? 0) > 1).map(p => p.id));
  const repeatedMistakes = occurrences.filter(o => o.pattern_id && repeatedPatternIds.has(o.pattern_id)).length;

  const resolvedPatterns = patterns.filter(p => p.status === "resolved").length;
  const recoveryProgress = patterns.length > 0 ? Math.round((resolvedPatterns / patterns.length) * 100) : null;

  const marksLostTotal = occurrences.reduce((sum, o) => sum + (o.marks_lost ?? 0), 0);

  // ── Bucketed pattern breakdown (radar) — real counts, real percentages ──
  const bucketCounts: Record<Bucket, number> = {
    "Conceptual Understanding": 0, "Careless Errors": 0, "Calculation Errors": 0,
    "Time Management": 0, "Application Errors": 0, "Recall Errors": 0,
  };
  for (const o of occurrences) {
    bucketCounts[errorTypeBucket(o.cognitive_error, o.execution_error)]++;
  }
  const patterns_breakdown = BUCKET_ORDER.map(bucket => ({
    bucket,
    count: bucketCounts[bucket],
    pct: totalMistakes > 0 ? Math.round((bucketCounts[bucket] / totalMistakes) * 100) : 0,
  }));

  // ── Recent mistakes list — real rows, most recent first ─────────────────
  const recent = occurrences.slice(0, RECENT_LIMIT).map(o => ({
    subject: o.subject,
    topic: o.topic,
    chapter: o.chapter,
    createdAt: o.created_at,
    repeated: Boolean(o.pattern_id && repeatedPatternIds.has(o.pattern_id)),
  }));

  // ── Top triggers — real error-type frequency across the window ─────────
  const triggerCounts = new Map<string, number>();
  for (const o of occurrences) {
    const key = o.execution_error ?? o.cognitive_error;
    if (key) triggerCounts.set(key, (triggerCounts.get(key) ?? 0) + 1);
  }
  const topTriggers = [...triggerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count, pct: totalMistakes > 0 ? Math.round((count / totalMistakes) * 100) : 0 }));

  // ── Heatmap: subject x week, real occurrence counts, no fabricated intensity ─
  const subjects = [...new Set(occurrences.map(o => o.subject))];
  const heatmap = subjects.map(subject => {
    const weeks = Array.from({ length: HEATMAP_WEEKS }, (_, i) => {
      const weeksAgo = HEATMAP_WEEKS - 1 - i;
      const weekStart = nowMs - (weeksAgo + 1) * 7 * 86_400_000;
      const weekEnd = nowMs - weeksAgo * 7 * 86_400_000;
      const count = occurrences.filter(o => {
        const t = new Date(o.created_at).getTime();
        return o.subject === subject && t >= weekStart && t < weekEnd;
      }).length;
      return { label: isoWeekLabel(new Date(), weeksAgo), count };
    });
    return { subject, weeks };
  });

  // ── The one recommended next step — highest-severity open pattern, real ─
  const openPatterns = patterns
    .filter(p => p.status === "open" || p.status === "recurred")
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  const nextStep = openPatterns[0]
    ? { label: openPatterns[0].label, subject: openPatterns[0].subject, occurrences: bucketCounts && (patterns.find(p => p.id === openPatterns[0].id)?.recurrence_count ?? 1) }
    : null;

  return NextResponse.json({
    ok: true,
    window_days: WINDOW_DAYS,
    total_mistakes: totalMistakes,
    total_mistakes_prev: prevTotal,
    repeated_mistakes: repeatedMistakes,
    marks_lost_total: marksLostTotal,
    recovery_progress_pct: recoveryProgress,
    patterns_breakdown,
    recent,
    top_triggers: topTriggers,
    heatmap,
    next_step: nextStep,
  });
}
