import { createAdminClient } from "@/lib/supabase/admin";
import { computeScore, type ScoreBreakdown } from "@/lib/score/compute";
import { isoDateIST, isoDaysAgoIST } from "@/lib/date";
import { computeStreak } from "@/lib/study/streak";

/**
 * The public demo account. Its rows are read with the service role and shown
 * on /sample so the worked example is the product's real output rather than
 * numbers written into a marketing page.
 */
const DEMO_USER_ID = "f6aa66ea-cf46-421e-8ead-81cb5cd14906";

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

    const pyqTotal = pyqRows.reduce((s, a) => s + a.total, 0);
    const pyqCorrect = pyqRows.reduce((s, a) => s + a.correct, 0);
    const syllabusTotal = syllabus.length;
    const syllabusCovered = syllabus.filter((t) => t.covered).length;

    const weekAgo = isoDaysAgoIST(6);
    const mistakesRecent7d = mistakes.filter((m) => m.created_at.slice(0, 10) >= weekAgo).length;
    const mistakesOpen = mistakes.filter((m) => !m.resolved_at).length;

    const streakDays = computeStreak(new Set(activity.map((d) => d.day)));

    const score = computeScore({
      pyqTotal,
      pyqCorrect,
      syllabusTotal,
      syllabusCovered,
      mistakesEverLogged: mistakes.length,
      mistakesRecent7d,
      streakDays,
    });

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
        takenAt: a.taken_at.slice(0, 10),
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
