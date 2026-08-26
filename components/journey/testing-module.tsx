"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Testing — Vision §11.
//
// Score history is the point. A single score is a data point; the product's
// value is in what changes across attempts, which is why the section trend
// only appears once there are two dated attempts to compare.
//
// The weakest section of the most recent sitting drives the study
// recommendation on the home page, so entering a real score here changes
// what the whole system tells you to do next.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useStudent } from "@/lib/student/use-student";
import { addTestPlan, addTestScore, removeTestPlan, removeTestScore } from "@/lib/student/actions";
import { bestScore, formatDeadline, scoresByDate, sectionTrends, weakestSection } from "@/lib/student/derive";
import type { TestKind } from "@/lib/student/types";
import { PageHead, Panel, Basis, EmptyState, Pill, Figure } from "./primitives";

const KINDS: TestKind[] = ["SAT", "ACT", "AP", "IELTS", "TOEFL", "Other"];

/** Section names differ per test; these are only defaults the student edits. */
const DEFAULT_SECTIONS: Record<string, { name: string; max: number }[]> = {
  SAT: [{ name: "Math", max: 800 }, { name: "Reading & Writing", max: 800 }],
  ACT: [{ name: "English", max: 36 }, { name: "Math", max: 36 }, { name: "Reading", max: 36 }, { name: "Science", max: 36 }],
};

export default function TestingModule() {
  const { student, update, hydrated } = useStudent();
  const [plan, setPlan] = useState({ kind: "SAT" as TestKind, targetScore: "", testDate: "" });
  const [score, setScore] = useState({
    kind: "SAT" as TestKind, attempt: "practice" as "diagnostic" | "practice" | "official",
    takenOn: "", total: "", max: "1600",
    sections: DEFAULT_SECTIONS.SAT.map(s => ({ ...s, score: "" })),
  });

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Testing" sub="Reading your scores." /></div>;
  }

  return (
    <div>
      <PageHead
        title="Testing"
        sub="Every attempt, dated. What matters is not one score but the movement between them, and which section is holding you back on the most recent sitting."
      />

      <Panel title="Plan a test" meta="target and date">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          <select value={plan.kind} aria-label="Test"
            onChange={e => setPlan({ ...plan, kind: e.target.value as TestKind })} style={inputStyle}>
            {KINDS.map(k => <option key={k}>{k}</option>)}
          </select>
          <input type="number" placeholder="Target score" value={plan.targetScore}
            onChange={e => setPlan({ ...plan, targetScore: e.target.value })} style={inputStyle} />
          <input type="date" value={plan.testDate} aria-label="Test date"
            onChange={e => setPlan({ ...plan, testDate: e.target.value })} style={inputStyle} />
        </div>
        <button
          onClick={() => {
            update(s => addTestPlan(s, {
              kind: plan.kind,
              targetScore: plan.targetScore ? Number(plan.targetScore) : undefined,
              testDate: plan.testDate || undefined,
            }));
            setPlan({ kind: "SAT", targetScore: "", testDate: "" });
          }}
          style={{ ...primaryButton, marginTop: 12 }}
        >Add test plan</button>
        <Basis>The test date goes onto your calendar automatically.</Basis>
      </Panel>

      {student.testing.plans.map(p => {
        const best = bestScore(student.testing.scores, p.kind);
        const weak = weakestSection(student.testing.scores, p.kind);
        const trends = sectionTrends(student.testing.scores, p.kind);
        const history = scoresByDate(student.testing.scores, p.kind);
        return (
          <Panel
            key={p.id} title={p.kind}
            meta={p.testDate ? formatDeadline(p.testDate) : "no date set"}
            action={
              <button onClick={() => update(s => removeTestPlan(s, p.id))} style={linkButton}>Remove</button>
            }
          >
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 14 }}>
              <Figure
                label="Best" value={best?.total} available={Boolean(best?.total)} big
                basis={best ? `From your ${best.attempt} on ${best.takenOn}.` : "No score recorded."}
              />
              <Figure
                label="Target" value={p.targetScore} available={Boolean(p.targetScore)} big
                basis={best?.total && p.targetScore
                  ? p.targetScore > best.total
                    ? `${p.targetScore - best.total} points to go.`
                    : "You are at or above target."
                  : "Set a target to measure against."}
              />
            </div>

            {weak ? (
              <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: "0 0 4px", lineHeight: 1.55 }}>
                Weakest section on your latest sitting: <strong>{weak.name}</strong> at {weak.pct}%.
              </p>
            ) : (
              <Basis>No sections recorded yet, so there is nothing to target.</Basis>
            )}

            {trends.length > 0 ? (
              <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 6 }}>
                {trends.map(t => (
                  <li key={t.name} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, color: "var(--ink-2)", minWidth: 150 }}>{t.name}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-3)" }}>
                      {t.first} → {t.latest}
                    </span>
                    <Pill tone={t.delta > 0 ? "good" : t.delta < 0 ? "critical" : "neutral"}>
                      {t.delta > 0 ? "+" : ""}{t.delta}
                    </Pill>
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                      over {t.attempts} attempts
                    </span>
                  </li>
                ))}
              </ul>
            ) : history.length === 1 ? (
              <Basis>
                One attempt recorded. A trend needs at least two, so nothing is claimed about
                direction yet.
              </Basis>
            ) : null}

            {history.length > 0 && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--rule-2)", paddingTop: 12 }}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                  {history.map(h => (
                    <li key={h.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)", minWidth: 90 }}>
                        {h.takenOn}
                      </span>
                      <Pill>{h.attempt}</Pill>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink)" }}>
                        {h.total ?? "—"}
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--ink-3)", flex: 1 }}>
                        {h.sections.map(s => `${s.name} ${s.score}`).join(" · ")}
                      </span>
                      <button onClick={() => update(s => removeTestScore(s, h.id))} style={linkButton}>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        );
      })}

      <Panel title="Record a score" meta="every attempt counts">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
          <select value={score.kind} aria-label="Test"
            onChange={e => {
              const kind = e.target.value as TestKind;
              setScore({
                ...score, kind,
                sections: (DEFAULT_SECTIONS[kind] ?? []).map(s => ({ ...s, score: "" })),
              });
            }} style={inputStyle}>
            {KINDS.map(k => <option key={k}>{k}</option>)}
          </select>
          <select value={score.attempt} aria-label="Attempt type"
            onChange={e => setScore({ ...score, attempt: e.target.value as typeof score.attempt })} style={inputStyle}>
            <option value="diagnostic">Diagnostic</option>
            <option value="practice">Practice</option>
            <option value="official">Official</option>
          </select>
          <input type="date" value={score.takenOn} aria-label="Date taken"
            onChange={e => setScore({ ...score, takenOn: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Total" value={score.total}
            onChange={e => setScore({ ...score, total: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Out of" value={score.max}
            onChange={e => setScore({ ...score, max: e.target.value })} style={inputStyle} />
        </div>

        {score.sections.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {score.sections.map((sec, i) => (
              <div key={sec.name} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--ink-2)", minWidth: 150 }}>{sec.name}</span>
                <input
                  type="number" placeholder="Score" value={sec.score}
                  aria-label={`${sec.name} score`}
                  onChange={e => {
                    const next = [...score.sections];
                    next[i] = { ...next[i], score: e.target.value };
                    setScore({ ...score, sections: next });
                  }}
                  style={{ ...inputStyle, width: 90 }}
                />
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>of {sec.max}</span>
              </div>
            ))}
          </div>
        )}

        <button
          disabled={!score.takenOn}
          onClick={() => {
            update(s => addTestScore(s, {
              kind: score.kind,
              attempt: score.attempt,
              takenOn: score.takenOn,
              total: score.total ? Number(score.total) : undefined,
              max: score.max ? Number(score.max) : undefined,
              sections: score.sections
                .filter(sec => sec.score !== "")
                .map(sec => ({ name: sec.name, score: Number(sec.score), max: sec.max })),
            }));
            setScore({
              ...score, takenOn: "", total: "",
              sections: (DEFAULT_SECTIONS[score.kind] ?? []).map(s => ({ ...s, score: "" })),
            });
          }}
          style={{ ...primaryButton, marginTop: 12, opacity: score.takenOn ? 1 : 0.5 }}
        >Record score</button>
      </Panel>

      {student.testing.plans.length === 0 && student.testing.scores.length === 0 && (
        <EmptyState
          title="No tests tracked"
          detail="Add the test you are planning and record every attempt, including diagnostics. Section-level history is what turns a score into a study plan."
        />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--rule)",
  borderRadius: "var(--radius-xs)", padding: "8px 10px",
  color: "var(--ink)", fontSize: 13, fontFamily: "inherit",
};

const primaryButton: React.CSSProperties = {
  fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: "0.04em",
  textTransform: "uppercase", background: "transparent",
  color: "var(--cinnabar-ink)", border: "1px solid var(--cinnabar-ink)",
  borderRadius: "var(--radius-xs)", padding: "7px 14px", cursor: "pointer",
};

const linkButton: React.CSSProperties = {
  background: "transparent", border: "none", color: "var(--ink-3)",
  fontFamily: "var(--mono)", fontSize: 11, cursor: "pointer",
};
