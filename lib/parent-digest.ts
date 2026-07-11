// Parent digest + risk alert email content. Pure functions — no I/O — so
// the send route and the cron stay thin and this stays unit-testable.
// Visual language matches the existing parent report (app/parent/[code]):
// light cream, Georgia serif, print-style report.

import type { ScoreBreakdown } from "@/lib/ledger-score";
import { scoreTier } from "@/lib/ledger-score";

export type DigestMode = "digest" | "inactivity" | "exam-risk";

export type ParentDigestData = {
  studentName: string;
  parentCode: string;
  breakdown: ScoreBreakdown;
  streak: number;
  lastStudied: string | null; // ISO date of last focus session, if known
  exams: Array<{ name: string; subject: string; date: string }>;
  marks: Array<{ name: string; score: number; target: number }>;
  weakTopics: Array<{ topic: string; count: number }>;
};

export type RiskFlags = {
  /** Days since the student last studied, when it crosses the threshold. */
  inactiveDays?: number;
  /** An exam within 7 days while the score is still below "Developing". */
  examSoon?: { name: string; days: number; score: number };
};

export const INACTIVITY_THRESHOLD_DAYS = 5;
export const INACTIVITY_COOLDOWN_DAYS = 7;
export const EXAM_RISK_WINDOW_DAYS = 7;
export const EXAM_RISK_SCORE_BELOW = 400;

const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

export function computeRiskFlags(data: {
  breakdown: ScoreBreakdown;
  streak: number;
  lastStudied: string | null;
  exams: Array<{ name: string; date: string }>;
}): RiskFlags {
  const flags: RiskFlags = {};

  if (data.lastStudied && data.streak >= INACTIVITY_THRESHOLD_DAYS) {
    const gap = daysSince(data.lastStudied);
    if (gap >= INACTIVITY_THRESHOLD_DAYS && !Number.isNaN(gap)) flags.inactiveDays = gap;
  }

  const atRisk = data.exams
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.days >= 0 && e.days <= EXAM_RISK_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)[0];
  if (atRisk && data.breakdown.total < EXAM_RISK_SCORE_BELOW) {
    flags.examSoon = { name: atRisk.name, days: atRisk.days, score: data.breakdown.total };
  }

  return flags;
}

export function digestSubject(mode: DigestMode, d: ParentDigestData, flags: RiskFlags): string {
  switch (mode) {
    case "inactivity":
      return `${d.studentName} hasn't studied in ${flags.inactiveDays ?? INACTIVITY_THRESHOLD_DAYS} days`;
    case "exam-risk":
      return `${flags.examSoon?.name ?? "An exam"} is ${flags.examSoon?.days === 0 ? "today" : `in ${flags.examSoon?.days} days`} — ${d.studentName} may need support`;
    default:
      return `${d.studentName}'s weekly study report · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
  }
}

const PILLARS: Array<[keyof ScoreBreakdown, string, number]> = [
  ["pqaScore", "Past-paper accuracy", 400],
  ["syllabusScore", "Syllabus coverage", 250],
  ["mistakeScore", "Mistake recovery", 200],
  ["consistencyScore", "Consistency", 150],
];

export function buildParentEmailHtml(mode: DigestMode, d: ParentDigestData, flags: RiskFlags): string {
  const tier = scoreTier(d.breakdown.total);
  const upcoming = d.exams
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const alertBanner =
    mode === "inactivity"
      ? `<div style="padding:14px 20px;background:#b83c1a;color:#faf6ee;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">
           <strong>${d.studentName} hasn't completed a study session in ${flags.inactiveDays} days</strong> — their ${d.streak}-day streak is at risk. A small nudge from you goes a long way.
         </div>`
      : mode === "exam-risk"
      ? `<div style="padding:14px 20px;background:#b83c1a;color:#faf6ee;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">
           <strong>${flags.examSoon?.name} is ${flags.examSoon?.days === 0 ? "today" : `in ${flags.examSoon?.days} day${flags.examSoon?.days === 1 ? "" : "s"}`}</strong> and ${d.studentName}'s readiness score is ${flags.examSoon?.score}/1000 (${tier.label}). Focused revision this week matters more than long hours.
         </div>`
      : "";

  const pillarRows = PILLARS.map(([key, label, max]) => {
    const val = d.breakdown[key] as number;
    const pct = Math.round((val / max) * 100);
    return `<tr>
      <td style="padding:8px 16px;font-family:monospace;font-size:11px;color:#666;width:170px;">${label}</td>
      <td style="padding:8px 16px;">
        <div style="background:#e0d8ce;height:8px;"><div style="background:#b83c1a;height:8px;width:${pct}%;"></div></div>
      </td>
      <td style="padding:8px 16px;font-family:monospace;font-size:11px;color:#222;width:76px;text-align:right;">${val} / ${max}</td>
    </tr>`;
  }).join("");

  const examRows = upcoming.length
    ? upcoming.map(e => `<tr>
        <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:Georgia,serif;font-size:14px;">${e.name}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:11px;color:#888;">${e.subject}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:12px;font-weight:700;color:${e.days <= 7 ? "#b83c1a" : "#222"};">${e.days === 0 ? "today" : `${e.days}d`}</td>
      </tr>`).join("")
    : `<tr><td style="padding:12px 16px;font-family:monospace;font-size:11px;color:#aaa;">No exams scheduled.</td></tr>`;

  const weakRows = d.weakTopics.slice(0, 5).map(w => `<tr>
      <td style="padding:7px 16px;border-bottom:1px solid #e0d8ce;font-family:Georgia,serif;font-size:13px;">${w.topic}</td>
      <td style="padding:7px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:11px;color:#b83c1a;">${w.count} misses</td>
    </tr>`).join("") ||
    `<tr><td style="padding:12px 16px;font-family:monospace;font-size:11px;color:#aaa;">No practice data yet.</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Ledger · Parent Report</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:640px;margin:0 auto;background:#faf6ee;border:1px solid #222;">
    <div style="padding:8px 24px;border-bottom:1px solid #222;">
      <span style="font-family:monospace;font-size:10px;color:#888;letter-spacing:0.08em;">STUDYLEDGER.IN · PARENT ${mode === "digest" ? "WEEKLY REPORT" : "ALERT"} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</span>
    </div>
    ${alertBanner}
    <div style="padding:28px 24px 20px;border-bottom:3px double #222;">
      <div style="font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:34px;letter-spacing:-0.02em;color:#222;">
        ${d.studentName}'s Ledger<span style="color:#b83c1a;">.</span>
      </div>
      <div style="font-family:monospace;font-size:11px;color:#888;margin-top:8px;letter-spacing:0.05em;">EXAM READINESS · ${d.breakdown.total} / 1000 · ${tier.label.toUpperCase()}</div>
    </div>

    <div style="border-bottom:1px solid #222;">
      <div style="padding:12px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
        <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Ledger Score breakdown</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${pillarRows}</table>
    </div>

    <div style="border-bottom:1px solid #222;">
      <div style="padding:12px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
        <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Upcoming exams</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${examRows}</table>
    </div>

    <div style="border-bottom:1px solid #222;">
      <div style="padding:12px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
        <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Topics needing work</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${weakRows}</table>
    </div>

    <div style="padding:18px 24px;">
      <a href="https://studyledger.in/parent/${d.parentCode}" style="font-family:monospace;font-size:11px;color:#b83c1a;text-decoration:none;">View the full live report →</a>
      <div style="font-family:monospace;font-size:9px;color:#bbb;margin-top:10px;line-height:1.7;">
        Study streak: ${d.streak} day${d.streak === 1 ? "" : "s"} · You're receiving this because ${d.studentName} added your email on their StudyLedger dashboard. Ask them to remove it there to unsubscribe.
      </div>
    </div>
  </div>
</body>
</html>`;
}
