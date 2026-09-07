import { createAdminClient } from "@/lib/supabase/admin";
import { computeScore, type ScoreBreakdown } from "@/lib/score/compute";
import { buildScoreInputs } from "@/lib/score/build-inputs";
import { dayKeyIST, isoDateIST } from "@/lib/date";
import { computeStreak } from "@/lib/study/streak";

/**
 * The public demo account. Its rows are read with the service role and shown
 * on /sample so the worked example is the product's real output rather than
 * numbers written into a marketing page.
 */
// Overridable so a fork or a preview deployment does not read the real demo
// account. Falls back to it rather than failing closed, because an unset
// variable should not take the public worked example off the marketing page.
const DEMO_USER_ID =
  process.env.SAMPLE_LEDGER_USER_ID ?? "f6aa66ea-cf46-421e-8ead-81cb5cd14906";

export type SampleLedger = {
  score: ScoreBreakdown;
  pyq: { subject: string; correct: number; total: number; takenAt: string }[];
  pyqTotal: number;
  pyqCorrect: number;
  topMistakes: { subject: string; topic: string; count: number }[];
  mistakesTotal: number;
  mistakesOpen: number;
  mistakesRecent7d: number;
  syllabusTotal: number;
  syllabusCovered: number;
  streakDays: number;
  minutesLogged: number;
  activeDays: number;
  lastLoggedDay: string | null;
};

export async function getSampleLedger(): Promise<SampleLedger | null> {
  try {
    const db = createAdminClient();
    const uid = DEMO_USER_ID;

    const [pyqRes, mistakeRes, syllabusRes, activityRes] = await Promise.all([
      db
        .from("pyq_attempts")
        .select("subject, total, correct, taken_at")
        .eq("user_id", uid)
        .order("taken_at", { ascending: false }),
      db.from("mistakes").select("subject, topic, created_at, resolved_at").eq("user_id", uid),
      db.from("syllabus_topics").select("covered").eq("user_id", uid),
      db.from("activity_days").select("day, minutes").eq("user_id", uid).gt("minutes", 0),
    ]);

    if (pyqRes.error || mistakeRes.error || syllabusRes.error || activityRes.error) return null;

    const pyqRows = pyqRes.data ?? [];
    const mistakes = mistakeRes.data ?? [];
    const syllabus = syllabusRes.data ?? [];
    const activity = activityRes.data ?? [];

    const streakDays = computeStreak(new Set(activity.map((d) => d.day)));

    // Through the same assembler the product uses, not a second copy of the
    // arithmetic. This page's whole claim is that the number is the product's
    // real output, and it was computing all-time past-paper accuracy where the
    // engine windows to 30 IST days, plus a seven day mistake window sliced off
    // UTC. On a demo account with older rows the two disagreed by over a
    // hundred points, on identical data, with the marketing page showing the
    // flattering one. build-inputs exists to make exactly this impossible.
    const inputs = buildScoreInputs({
      attempts: pyqRows as Parameters<typeof buildScoreInputs>[0]["attempts"],
      syllabus: syllabus as Parameters<typeof buildScoreInputs>[0]["syllabus"],
      mistakes: mistakes as Parameters<typeof buildScoreInputs>[0]["mistakes"],
      streakDays,
    });

    const { pyqTotal, pyqCorrect, syllabusTotal, syllabusCovered } = inputs;
    const mistakesRecent7d = inputs.mistakesRecent7d;
    const mistakesOpen = mistakes.filter((m) => !m.resolved_at).length;

    const score = computeScore(inputs);

    // recurring topics, the same grouping Fix Next and Mistake DNA use
    const byTopic = new Map<string, { subject: string; topic: string; count: number }>();
    for (const m of mistakes) {
      const key = `${m.subject}::${m.topic}`;
      const cur = byTopic.get(key) ?? { subject: m.subject, topic: m.topic, count: 0 };
      cur.count++;
      byTopic.set(key, cur);
    }
    const topMistakes = [...byTopic.values()].sort((a, b) => b.count - a.count).slice(0, 4);

    const days = [...activity].sort((a, b) => (a.day < b.day ? 1 : -1));

    return {
      score,
      pyq: pyqRows.slice(0, 5).map((a) => ({
        subject: a.subject,
        correct: a.correct,
        total: a.total,
        takenAt: dayKeyIST(a.taken_at),
      })),
      pyqTotal,
      pyqCorrect,
      topMistakes,
      mistakesTotal: mistakes.length,
      mistakesOpen,
      mistakesRecent7d,
      syllabusTotal,
      syllabusCovered,
      streakDays,
      minutesLogged: activity.reduce((s, d) => s + d.minutes, 0),
      activeDays: activity.length,
      lastLoggedDay: days[0]?.day ?? null,
    };
  } catch {
    return null;
  }
}

export { isoDateIST };
