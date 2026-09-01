// Parent digest + risk alert email content. Pure functions — no I/O — so the
// send route and the cron stay thin and this stays unit-testable.
//
// REBUILT for M17 (architecture N.6). The email is now generated from
// exactly the same `ParentProjection` shape `/api/parent/report` returns —
// there is no second, richer data source for the email than the one the live
// report reads. `policy_version` is stamped onto every send so a report
// already delivered keeps describing exactly what was shared when it went
// out, even if the student changes their sharing settings afterward (V.8.5).
//
// REMOVED from the pre-M17 version: the `weakTopics` block and the "Current
// Marks" table. Neither is one of architecture N.4's seven Shared
// categories — `marks` is not in that table at all, and per-topic detail is
// `Private` at every setting (PRODUCT_DECISIONS §9.2). Kept: the pure
// structure, `computeRiskFlags`' exam-based shape, and the score/dimension
// rendering — N.6 names all three as reusable.

import type { ParentProjection } from "@/lib/parent-space";

export type DigestMode = "digest" | "exam-risk";

export type ParentDigestData = {
  studentName: string;
  projection: ParentProjection;
};

export type RiskFlags = {
  /** An exam within 7 days while the score is still below "Developing". */
  examSoon?: { name: string; days: number; score: number };
};

export const EXAM_RISK_WINDOW_DAYS = 7;
export const EXAM_RISK_SCORE_BELOW = 400;

const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

// Risk flags require BOTH an exam soon AND the score, so both categories
// (`upcomingExams`, `dimensionBreakdown`) must be shared for an alert to ever
// fire — an absent category yields no flag rather than a flag computed from
// data the parent was never shown.
export function computeRiskFlags(d: ParentDigestData): RiskFlags {
  const flags: RiskFlags = {};
  const exams = d.projection.upcomingExams;
  const total = d.projection.dimensionBreakdown?.total;
  if (!exams || total === undefined) return flags;

  const atRisk = exams
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.days >= 0 && e.days <= EXAM_RISK_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)[0];
  if (atRisk && total < EXAM_RISK_SCORE_BELOW) {
    flags.examSoon = { name: atRisk.name, days: atRisk.days, score: total };
  }
  return flags;
}

export function digestSubject(mode: DigestMode, d: ParentDigestData, flags: RiskFlags): string {
  switch (mode) {
    case "exam-risk":
      return `${flags.examSoon?.name ?? "An exam"} is ${flags.examSoon?.days === 0 ? "today" : `in ${flags.examSoon?.days} days`} — ${d.studentName} may need support`;
    default:
      return `${d.studentName}'s weekly study report · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
  }
}

const PILLARS: Array<[keyof NonNullable<ParentProjection["dimensionBreakdown"]>, string, number]> = [
  ["pqa", "Past-paper accuracy", 400],
  ["syllabus", "Syllabus coverage", 250],
  ["mistakes", "Mistake recovery", 200],
  ["consistency", "Consistency", 150],
];

export function buildParentEmailHtml(mode: DigestMode, d: ParentDigestData, flags: RiskFlags): string {
  const bd = d.projection.dimensionBreakdown;
  const exams = (d.projection.upcomingExams ?? [])
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const alertBanner =
    mode === "exam-risk"
      ? `<div style="padding:14px 20px;background:#b83c1a;color:#faf6ee;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">
           <strong>${flags.examSoon?.name} is ${flags.examSoon?.days === 0 ? "today" : `in ${flags.examSoon?.days} day${flags.examSoon?.days === 1 ? "" : "s"}`}</strong> and ${d.studentName}'s readiness score is ${flags.examSoon?.score}/1000. Focused revision this week matters more than long hours.
         </div>`
      : "";

  const scoreBlock = bd
    ? `<div style="border-bottom:1px solid #222;">
        <div style="padding:12px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
          <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Ledger Score breakdown</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${PILLARS.map(([key, label, max]) => {
          const val = bd[key] as number;
          const pct = Math.round((val / max) * 100);
          return `<tr>
            <td style="padding:8px 16px;font-family:monospace;font-size:11px;color:#666;width:170px;">${label}</td>
            <td style="padding:8px 16px;"><div style="background:#e0d8ce;height:8px;"><div style="background:#b83c1a;height:8px;width:${pct}%;"></div></div></td>
            <td style="padding:8px 16px;font-family:monospace;font-size:11px;color:#222;width:76px;text-align:right;">${val} / ${max}</td>
          </tr>`;
        }).join("")}</table>
      </div>`
    : "";

  const examsBlock = d.projection.upcomingExams
    ? `<div style="border-bottom:1px solid #222;">
        <div style="padding:12px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
          <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Upcoming exams</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${
          exams.length
            ? exams.map(e => `<tr>
                <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:Georgia,serif;font-size:14px;">${e.name}</td>
                <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:11px;color:#888;">${e.subject}</td>
                <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:12px;font-weight:700;color:${e.days <= 7 ? "#b83c1a" : "#222"};">${e.days === 0 ? "today" : `${e.days}d`}</td>
              </tr>`).join("")
            : `<tr><td style="padding:12px 16px;font-family:monospace;font-size:11px;color:#aaa;">No exams scheduled.</td></tr>`
        }</table>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Ledger · Parent Report</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:640px;margin:0 auto;background:#faf6ee;border:1px solid #222;">
    <div style="padding:8px 24px;border-bottom:1px solid #222;">
      <span style="font-family:monospace;font-size:10px;color:#888;letter-spacing:0.08em;">STUDYLEDGER.IN · PARENT ${mode === "digest" ? "WEEKLY REPORT" : "ALERT"} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()} · POLICY v${d.projection.system.policyVersion}</span>
    </div>
    ${alertBanner}
    <div style="padding:28px 24px 20px;border-bottom:3px double #222;">
      <div style="font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:34px;letter-spacing:-0.02em;color:#222;">
        ${d.studentName}'s Ledger<span style="color:#b83c1a;">.</span>
      </div>
      ${bd ? `<div style="font-family:monospace;font-size:11px;color:#888;margin-top:8px;letter-spacing:0.05em;">EXAM READINESS · ${bd.total} / 1000</div>` : ""}
    </div>
    ${scoreBlock}
    ${examsBlock}
    <div style="border-bottom:1px solid #222;padding:14px 20px;">
      <span style="font-family:monospace;font-size:10px;color:#888;letter-spacing:0.05em;line-height:1.8;">
        This report shows progress, not failures. ${d.studentName}'s individual wrong answers and mistake history are private to them, by design — not filtered out of this email, never collected into it.
      </span>
    </div>
    <div style="padding:18px 24px;">
      <a href="https://studyledger.in/parent" style="font-family:monospace;font-size:11px;color:#b83c1a;text-decoration:none;">Sign in to the full parent view →</a>
      <div style="font-family:monospace;font-size:9px;color:#bbb;margin-top:10px;line-height:1.7;">
        You're receiving this because ${d.studentName} connected you and turned on the weekly digest in their sharing settings. Ask them to turn it off there to unsubscribe.
      </div>
    </div>
  </div>
</body>
</html>`;
}
