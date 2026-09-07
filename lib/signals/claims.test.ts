import { describe, it, expect } from "vitest";
import { topicContagion } from "./index";
import { costOfBreakingStreak } from "./cost";
import { streakEndingOn } from "@/lib/study/streak";
import { CIRCADIAN_WINDOWS } from "@/lib/circadian";
import type { Mistake } from "@/lib/study/types";
import type { ScoreInputs as Inputs } from "@/lib/score/compute";

/**
 * These test what the sentences say, not what shape they come back in.
 *
 * That distinction is the whole point. The existing contagion test asserted
 * [hit.a, hit.b].sort(), which sorted away the exact property that was broken:
 * the direction of the claim. A test that renders the sentence and asserts what
 * it says would have caught it on the day it shipped.
 */

const mistake = (topic: string, daysAgo: number): Mistake =>
  ({
    id: `${topic}-${daysAgo}`,
    subject: "Physics",
    topic,
    created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    resolved_at: null,
    review_count: 0,
    next_review_at: null,
  }) as unknown as Mistake;

describe("topic contagion, the direction it claims", () => {
  it("names the topic that actually breaks first, not the alphabetically first", () => {
    // Zeta leads, Alpha follows a day later, three times over. Alphabetical
    // order would name Alpha as the leader, which is exactly backwards.
    const rows = [
      mistake("Zeta", 20),
      mistake("Alpha", 19),
      mistake("Zeta", 12),
      mistake("Alpha", 11),
      mistake("Zeta", 6),
      mistake("Alpha", 5),
    ];
    const [hit] = topicContagion(rows);
    expect(hit).toBeDefined();
    expect(hit.a).toBe("Physics · Zeta");
    expect(hit.b).toBe("Physics · Alpha");
    expect(hit.times).toBe(3);
  });

  it("names the leader correctly the other way round too", () => {
    // Alpha leads this time; the answer must follow the data, not the alphabet.
    const rows = [
      mistake("Alpha", 20),
      mistake("Zeta", 19),
      mistake("Alpha", 12),
      mistake("Zeta", 11),
      mistake("Alpha", 6),
      mistake("Zeta", 5),
    ];
    const [hit] = topicContagion(rows);
    expect(hit.a).toBe("Physics · Alpha");
    expect(hit.b).toBe("Physics · Zeta");
  });

  it("still requires a pair to happen twice", () => {
    expect(topicContagion([mistake("Zeta", 5), mistake("Alpha", 4)])).toHaveLength(0);
  });
});

describe("the cost of a missed day", () => {
  const inputs: Inputs = {
    pyqTotal: 40,
    pyqCorrect: 30,
    syllabusTotal: 20,
    syllabusCovered: 10,
    mistakesEverLogged: 5,
    mistakesRecent7d: 1,
    // Necessarily zero once a day has been missed: computeStreak counts back
    // from today and stops at the first gap.
    streakDays: 0,
  };

  it("never claims a streak the student did not have", () => {
    // Sixty days missed, and before the break they were on a three day run.
    const cost = costOfBreakingStreak(inputs, 60, 3);
    expect(cost).not.toBeNull();
    // The old code said 60. They logged nothing for sixty days.
    expect(cost!.wouldHaveBeen).toBe(63);
    expect(cost!.currentStreak).toBe(0);
  });

  it("counts only the run that the break actually interrupted", () => {
    const cost = costOfBreakingStreak(inputs, 3, 0);
    // No prior streak at all: the counterfactual is just the missed days.
    expect(cost!.wouldHaveBeen).toBe(3);
  });

  it("says nothing when no day has been missed", () => {
    expect(costOfBreakingStreak(inputs, 0, 5)).toBeNull();
  });
});

describe("streakEndingOn", () => {
  it("measures the run that ended on a past day, not the one ending today", () => {
    const days = new Set(["2026-08-30", "2026-08-31", "2026-09-01"]);
    expect(streakEndingOn(days, "2026-09-01")).toBe(3);
  });

  it("is zero for a day with nothing logged", () => {
    expect(streakEndingOn(new Set(["2026-09-01"]), "2026-09-02")).toBe(0);
  });

  it("stops at the first gap going backwards", () => {
    const days = new Set(["2026-08-25", "2026-08-31", "2026-09-01"]);
    expect(streakEndingOn(days, "2026-09-01")).toBe(2);
  });
});

describe("house rules in static prose", () => {
  it("uses no en or em dashes in the circadian window labels", () => {
    for (const w of CIRCADIAN_WINDOWS) {
      expect(w.range, w.id).not.toMatch(/[–—―]/);
      expect(w.label, w.id).not.toMatch(/[–—―]/);
    }
  });
});
