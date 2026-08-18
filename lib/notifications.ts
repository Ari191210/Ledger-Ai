// Notification decision engine — pure, no I/O, unit-tested.
//
// Every notification must answer one of: what should I study now / what
// happens if I don't / did I make progress / am I at risk / is an exam
// approaching. Nothing fires "because a timer elapsed": every candidate is
// derived from the same signals the Ledger Score engine already computes,
// deduplicated by semantic key, cooled down, and capped at one high-priority
// send per day (exams T-1/T-0 exempt).
//
// The hourly cron (app/api/cron/notifications) feeds this with server-side
// data (scoreInputsFromBlob → computeScoreFromInputs) and persists the
// returned state to user_data.notifState.

import type { ScoreBreakdown } from "@/lib/ledger-score";
import { scoreTier } from "@/lib/ledger-score";

export type NotificationCandidate = {
  /** Semantic dedup key — one send ever per key. */
  key: string;
  type: "exam" | "milestone" | "risk";
  priority: "high" | "normal";
  title: string;
  body: string;
  url: string;
};

export type NotifState = {
  /** Keys already sent (key → ISO timestamp). Pruned to the last 100. */
  sent?: Record<string, string>;
  /** ISO date (yyyy-mm-dd, user-local) of the last high-priority send. */
  lastHighPriorityDay?: string;
  /** Highest tier boundary (200/400/600/800) already celebrated. */
  lastMilestone?: number;
};

// M0-6: no streak input reaches this engine. A notification may not be
// derived from a streak's fragility (`PRODUCT_PRINCIPLES` §4.2 — "Streaks are
// never shipped. One missed day converts a motivator into shame."), so the
// streak, its last-counted date and its shield are not accepted here at all.
// The field removal is the enforcement: a loss-framed candidate is not
// expressible, not merely unreachable.
export type EngineInput = {
  breakdown: ScoreBreakdown;
  exams: Array<{ name: string; subject?: string; date: string }>;
  /** From user_data.plan.chronotype, when present. */
  chronotype?: string;
  state: NotifState;
  /** The user's current local time (cron converts via stored timezone). */
  now: Date;
};

export type EngineResult = {
  send: NotificationCandidate[];
  nextState: NotifState;
};

const EXAM_MILESTONES = [14, 7, 3, 1, 0] as const;
const TIER_BOUNDARIES = [200, 400, 600, 800] as const;
export const MAX_SENT_KEYS = 100;

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)).padStart(2, "0")}`;
};

function daysUntil(dateStr: string, now: Date): number {
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return NaN;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(target) - startOf(now)) / 86400000);
}

// ── Smart delivery windows ───────────────────────────────────────────────────

/** Quiet hours: nothing between 22:00 and 08:00 local, ever. */
export function inQuietHours(localHour: number): boolean {
  return localHour >= 22 || localHour < 8;
}

/**
 * Preferred delivery window by chronotype (from the student's own planner
 * setting). Morning types get the 8–11 window, everyone else the classic
 * after-school 16–20 window. Exam-morning sends use 8–10 regardless.
 */
export function inDeliveryWindow(chronotype: string | undefined, localHour: number): boolean {
  if (inQuietHours(localHour)) return false;
  const c = (chronotype || "").toLowerCase();
  if (c.includes("morning") || c.includes("lark") || c.includes("early")) {
    return localHour >= 8 && localHour < 11;
  }
  return localHour >= 16 && localHour < 20;
}

// ── The engine ───────────────────────────────────────────────────────────────

export function decideNotifications(input: EngineInput): EngineResult {
  const { breakdown, exams, chronotype, state, now } = input;
  const sent = state.sent ?? {};
  const today = localDay(now);
  const candidates: NotificationCandidate[] = [];

  // 1. Exam countdown — T-14/7/3/1 and the morning of the exam.
  for (const exam of exams) {
    const d = daysUntil(exam.date, now);
    if (!EXAM_MILESTONES.includes(d as (typeof EXAM_MILESTONES)[number])) continue;
    const key = `exam:${exam.name}@${exam.date}:T-${d}`;
    if (sent[key]) continue;
    const urgent = d <= 1;
    // Morning-of and T-1 land in the morning window; others in the normal one.
    const hour = now.getHours();
    const windowOk = urgent ? hour >= 8 && hour < 10 : inDeliveryWindow(chronotype, hour);
    if (!windowOk) continue;
    candidates.push({
      key,
      type: "exam",
      priority: urgent ? "high" : "normal",
      title: d === 0 ? `${exam.name} is today.` : `${exam.name} — ${d} day${d === 1 ? "" : "s"} out`,
      body:
        d === 0
          ? "Open Exam-Day Mode: a 10-question sweep of exactly what you've been missing. Then close the laptop."
          : d === 1
            ? `Tomorrow. Your readiness score is ${breakdown.total}/1000 — one focused sweep today beats six hours of rereading.`
            : `Your Ledger Score is ${breakdown.total}/1000 (${scoreTier(breakdown.total).label}). ${breakdown.actions[0] ?? "A past-paper session today moves it most."}`,
      url: d <= 1 ? "/tools/exam-day" : "/tools/exam-practice",
    });
  }

  // 2. (deleted, M0-6) The streak-at-risk reminder — "Your N-day streak ends
  //    tonight" — is gone and is deliberately not replaced. It was a
  //    loss-framed send whose entire purpose was fear of breaking a chain,
  //    which `PRODUCT_PRINCIPLES` §4.2 bans outright. Nothing takes its slot:
  //    the correct number of shame notifications is zero, not one worded
  //    more gently.

  // 3. Score milestone — celebrate crossing a tier boundary, never +1 noise.
  const crossed = [...TIER_BOUNDARIES].reverse().find(b => breakdown.total >= b);
  if (crossed && crossed > (state.lastMilestone ?? 0)) {
    const key = `milestone:${crossed}`;
    if (!sent[key] && inDeliveryWindow(chronotype, now.getHours())) {
      const tier = scoreTier(breakdown.total);
      candidates.push({
        key,
        type: "milestone",
        priority: "normal",
        title: `${breakdown.total}/1000 — you're now "${tier.label}"`,
        body: `You crossed ${crossed}. Next stop: ${tier.next} at ${tier.nextAt}. ${breakdown.actions[0] ?? ""}`.trim(),
        url: "/tools/grade-tracker",
      });
    }
  }

  // 4. Risk — reuse the engine's own signals, one nudge per ISO week max.
  //    (a) recurring mistakes piling up (same threshold the score engine
  //    uses for its own "Open Mistake DNA" action)
  if (breakdown.recentMistakes > 5) {
    const key = `risk:mistakes@${isoWeek(now)}`;
    if (!sent[key] && inDeliveryWindow(chronotype, now.getHours())) {
      candidates.push({
        key,
        type: "risk",
        priority: "normal",
        // No score figure here. Recording a mistake does not cost score
        // (PRODUCT_DECISIONS §4.11), and resolving one does not yet pay score
        // either: no production action can set a mistake to `resolved`, so the
        // old "worth up to 120 score points" was a promise the system cannot
        // honour (PRODUCT_PRINCIPLES Law 7, architecture J.9.a).
        title: `${breakdown.recentMistakes} repeat mistakes this week`,
        body: `Mistake DNA shows the pattern behind them.`,
        url: "/tools/post-exam?tab=dna",
      });
    }
  }
  //    (b) coverage stalled: syllabus uploaded but most subjects untouched
  if (breakdown.syllabusUploaded && breakdown.subjectsTotal > 0 &&
      breakdown.subjectsCovered * 2 < breakdown.subjectsTotal && breakdown.papersCount > 0) {
    const key = `risk:coverage@${isoWeek(now)}`;
    if (!sent[key] && inDeliveryWindow(chronotype, now.getHours())) {
      candidates.push({
        key,
        type: "risk",
        priority: "normal",
        title: `${breakdown.subjectsTotal - breakdown.subjectsCovered} subjects untouched`,
        body: `Syllabus Coverage is ${breakdown.syllabusScore}/250 — the cheapest points on your board right now.`,
        url: "/tools/learn-lab",
      });
    }
  }

  // ── Anti-spam: priority order, then the daily cap ──
  const order: Record<NotificationCandidate["type"], number> = { exam: 0, risk: 1, milestone: 2 };
  candidates.sort((a, b) => order[a.type] - order[b.type]);

  const send: NotificationCandidate[] = [];
  let highUsedToday = state.lastHighPriorityDay === today;
  for (const c of candidates) {
    const examTomorrowOrToday = c.type === "exam" && c.priority === "high";
    if (send.length >= 1 && !examTomorrowOrToday) break; // one per run, period
    if (c.priority === "high" && highUsedToday && !examTomorrowOrToday) continue;
    send.push(c);
    if (c.priority === "high") highUsedToday = true;
  }

  // ── Next state ──
  const nextSent = { ...sent };
  for (const c of send) nextSent[c.key] = now.toISOString();
  const pruned = Object.entries(nextSent)
    .sort(([, a], [, b]) => (a < b ? 1 : -1))
    .slice(0, MAX_SENT_KEYS);

  return {
    send,
    nextState: {
      sent: Object.fromEntries(pruned),
      lastHighPriorityDay: highUsedToday ? today : state.lastHighPriorityDay,
      lastMilestone: Math.max(state.lastMilestone ?? 0, crossed ?? 0),
    },
  };
}
