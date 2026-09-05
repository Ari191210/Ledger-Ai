// Pure logic for the Coach tool, a weekly briefing built by diffing two
// real 7-day windows against each other. No AI call, no score-history
// table: comparing two windows of the same underlying data works
// retroactively on data that already exists, and never drifts from what
// the rest of the product actually measures.

export type WeekWindow = {
  minutes: number;
  pyqCorrect: number;
  pyqTotal: number;
  mistakesLogged: number;
  mistakesResolved: number;
};

export type Delta = {
  label: string;
  thisWeek: string;
  direction: "up" | "down" | "flat";
  note: string;
};

export type Briefing = {
  headline: string;
  deltas: Delta[];
  focus: string;
};

function pct(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

function pctPointDelta(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return a - b;
}

export function buildWeeklyBriefing(
  thisWeek: WeekWindow,
  lastWeek: WeekWindow,
  streakDays: number,
): Briefing {
  const minutesDelta = thisWeek.minutes - lastWeek.minutes;
  const thisAcc = pct(thisWeek.pyqCorrect, thisWeek.pyqTotal);
  const lastAcc = pct(lastWeek.pyqCorrect, lastWeek.pyqTotal);
  const accDelta = pctPointDelta(thisAcc, lastAcc);
  const mistakeNet = thisWeek.mistakesLogged - thisWeek.mistakesResolved;

  const deltas: Delta[] = [
    {
      label: "study time",
      thisWeek: `${thisWeek.minutes}m`,
      direction: minutesDelta > 0 ? "up" : minutesDelta < 0 ? "down" : "flat",
      note:
        lastWeek.minutes === 0 && thisWeek.minutes === 0
          ? "nothing logged either week"
          : `${minutesDelta >= 0 ? "+" : ""}${minutesDelta}m vs last week (${lastWeek.minutes}m)`,
    },
    {
      label: "pyq accuracy",
      thisWeek: thisAcc !== null ? `${thisAcc}%` : "no attempts",
      direction: accDelta === null ? "flat" : accDelta > 0 ? "up" : accDelta < 0 ? "down" : "flat",
      note:
        thisAcc === null
          ? "no PYQ attempts logged this week"
          : lastAcc === null
            ? "no PYQ attempts last week to compare"
            : `${accDelta! >= 0 ? "+" : ""}${accDelta}pt vs last week (${lastAcc}%)`,
    },
    {
      label: "mistakes",
      thisWeek: `${thisWeek.mistakesLogged} logged, ${thisWeek.mistakesResolved} resolved`,
      direction: mistakeNet > 0 ? "down" : mistakeNet < 0 ? "up" : "flat",
      note:
        mistakeNet > 0
          ? `open backlog grew by ${mistakeNet} this week`
          : mistakeNet < 0
            ? `cleared ${Math.abs(mistakeNet)} more than were logged`
            : "logged and resolved at the same rate",
    },
  ];

  // Headline: the single most useful thing to say this week, in priority
  // order (things that need action beat things that are going fine).
  let headline: string;
  let focus: string;
  if (thisWeek.minutes === 0 && lastWeek.minutes === 0) {
    headline = "No study time logged in the last two weeks.";
    focus = "Log a focus session or a quick entry today, streaks and score both start moving again immediately.";
  } else if (mistakeNet > 2) {
    headline = `Open mistakes grew by ${mistakeNet} this week, faster than you're clearing them.`;
    focus = "Spend one session in Spaced Review or Mistake DNA before adding new material.";
  } else if (accDelta !== null && accDelta <= -10) {
    headline = `PYQ accuracy dropped ${Math.abs(accDelta)} points this week.`;
    focus = "Revisit the topics behind this week's wrong answers before taking more attempts at pace.";
  } else if (minutesDelta < 0 && lastWeek.minutes > 0) {
    const dropPct = Math.round((Math.abs(minutesDelta) / lastWeek.minutes) * 100);
    headline = `Study time is down ${dropPct}% from last week (${thisWeek.minutes}m vs ${lastWeek.minutes}m).`;
    focus = streakDays > 0
      ? `Your streak is still at ${streakDays}d, a short session today keeps it and rebuilds momentum.`
      : "A short session today is enough to get back on track.";
  } else if (accDelta !== null && accDelta >= 10) {
    headline = `PYQ accuracy is up ${accDelta} points this week (${thisAcc}%).`;
    focus = "Whatever changed this week, keep doing it, consider raising difficulty or topic breadth next.";
  } else if (minutesDelta > 0) {
    headline = `Study time is up ${minutesDelta}m from last week.`;
    focus = "Keep the pace. Check Debt Meter to make sure the extra time is going toward what's actually behind.";
  } else {
    headline = "This week held steady with last week.";
    focus = "No red flags, pick one weak topic from Mistake DNA and push on it specifically.";
  }

  return { headline, deltas, focus };
}
