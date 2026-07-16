"use client";

// ═══════════════════════════════════════════════════════════════════════════
// COVERAGE REPORT  (Phase 3B)
//
// Static coverage only — real data that exists today: syllabus completion and
// the list of pending (uncovered) SUBJECTS. No trend line: coverage-over-time
// needs score_history depth and is deliberately deferred, not faked. The word is
// "subjects", never "chapters" — the scored syllabus is subject-level.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { computeLedgerScore, readScoreInputs } from "@/lib/ledger-score";

type CoverageData = {
  covered: number;
  total: number;
  pending: string[];
  uploaded: boolean;
};

const panel = {
  border: "1px solid var(--rule)",
  padding: "clamp(20px, 4vw, 30px)",
  marginBottom: 32,
} as const;

export default function Coverage() {
  const [data, setData] = useState<CoverageData | null>(null);

  useEffect(() => {
    try {
      const s = computeLedgerScore();
      const inputs = readScoreInputs();
      const coveredSet = new Set(
        (inputs?.notesHistory ?? [])
          .map((n) => (n.subject || "").toLowerCase().trim())
          .filter(Boolean),
      );
      const subjects = inputs?.syllabusSubjects ?? [];
      const pending = subjects.filter((x) => !coveredSet.has(x.toLowerCase().trim()));
      setData({ covered: s.subjectsCovered, total: s.subjectsTotal, pending, uploaded: s.syllabusUploaded });
    } catch {
      /* localStorage unavailable — render nothing rather than a fake report */
    }
  }, []);

  if (!data) return null;

  const pctDone = data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0;

  return (
    <section style={panel} aria-labelledby="cov-head">
      <div id="cov-head" className="ed-kicker" style={{ marginBottom: 16 }}>Coverage Report</div>

      {!data.uploaded ? (
        <p className="ed-byline" style={{ margin: 0 }}>
          No syllabus on record — upload yours in Syllabus to open the coverage report. It is worth
          up to 250 points of your Ledger Score.
        </p>
      ) : data.total === 0 ? (
        <p className="ed-byline" style={{ margin: 0 }}>
          Syllabus uploaded, but no subjects were parsed yet. Re-upload a structured syllabus to break
          it into subjects.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(18px, 4vw, 40px)", flexWrap: "wrap", borderTop: "2px solid var(--ink)", paddingTop: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(30px, 5vw, 48px)", lineHeight: 0.9, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                {data.covered}<span style={{ color: "var(--ink-3)" }}>/{data.total}</span>
              </div>
              <div className="ed-kicker" style={{ marginTop: 6 }}>subjects covered · {pctDone}%</div>
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0, paddingBottom: 8 }}>
              <div style={{ height: 4, background: "var(--rule-2)" }}>
                <div style={{ height: "100%", width: `${pctDone}%`, background: "var(--salmon-ink)" }} />
              </div>
            </div>
          </div>

          {data.pending.length > 0 && (
            <div style={{ marginTop: 22, borderTop: "1px solid var(--rule-2)", paddingTop: 14 }}>
              <div className="ed-kicker" style={{ marginBottom: 10 }}>Pending Subjects</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.pending.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontFamily: "var(--body)",
                      fontSize: 13.5,
                      color: "var(--ink-2)",
                      border: "1px solid var(--rule)",
                      padding: "4px 10px",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
