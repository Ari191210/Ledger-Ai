"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Opportunities — Vision §8 and §9.
//
// The vision describes a discovery engine that finds opportunities. That
// requires a real, maintained dataset with verified deadlines, which
// StudyLedger does not have — and a competition list with a wrong deadline
// is worse than no list, because a student plans against it.
//
// So this is the tracker half, built honestly: the student records what
// they found, with the source link, and the system manages the deadlines
// and chases the ones going stale. When a real data source exists, it
// populates this same structure.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useStudent } from "@/lib/student/use-student";
import { addOpportunity, removeOpportunity, updateOpportunity } from "@/lib/student/actions";
import { daysUntil, formatDeadline, today } from "@/lib/student/derive";
import type { OpportunityKind, OpportunityStage } from "@/lib/student/types";
import { PageHead, Panel, Basis, EmptyState, Pill } from "./primitives";

const KINDS: OpportunityKind[] = [
  "competition", "olympiad", "hackathon", "research-program", "summer-program",
  "scholarship", "internship", "fellowship", "conference", "entrepreneurship",
  "volunteer", "award", "academic",
];

const STAGES: OpportunityStage[] = [
  "saved", "interested", "applying", "applied", "accepted", "rejected", "declined",
];

export default function OpportunitiesModule() {
  const { student, update, hydrated } = useStudent();
  const [draft, setDraft] = useState({
    name: "", kind: "competition" as OpportunityKind, organization: "",
    deadline: "", sourceUrl: "", eligibility: "",
  });

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Opportunities" sub="Reading your list." /></div>;
  }

  const live = student.opportunities.filter(o => !["rejected", "declined"].includes(o.stage));
  const closed = student.opportunities.filter(o => ["rejected", "declined"].includes(o.stage));

  return (
    <div>
      <PageHead
        title="Opportunities"
        sub="Competitions, programmes, scholarships and research. StudyLedger does not ship a directory of these — a listing with a stale deadline is worse than none — so you record what you find, with its source, and the deadlines are managed from there."
      />

      <Panel title="Track an opportunity" meta="source link required to verify later">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          <input placeholder="Name" value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })} style={inputStyle} />
          <select value={draft.kind} aria-label="Kind"
            onChange={e => setDraft({ ...draft, kind: e.target.value as OpportunityKind })} style={inputStyle}>
            {KINDS.map(k => <option key={k} value={k}>{k.replace("-", " ")}</option>)}
          </select>
          <input placeholder="Organisation" value={draft.organization}
            onChange={e => setDraft({ ...draft, organization: e.target.value })} style={inputStyle} />
          <input type="date" value={draft.deadline} aria-label="Deadline"
            onChange={e => setDraft({ ...draft, deadline: e.target.value })} style={inputStyle} />
          <input placeholder="Official source URL" value={draft.sourceUrl}
            onChange={e => setDraft({ ...draft, sourceUrl: e.target.value })} style={inputStyle} />
          <input placeholder="Eligibility" value={draft.eligibility}
            onChange={e => setDraft({ ...draft, eligibility: e.target.value })} style={inputStyle} />
        </div>
        <button
          disabled={!draft.name.trim()}
          onClick={() => {
            update(s => addOpportunity(s, {
              name: draft.name.trim(),
              kind: draft.kind,
              organization: draft.organization.trim() || undefined,
              deadline: draft.deadline || undefined,
              sourceUrl: draft.sourceUrl.trim() || undefined,
              eligibility: draft.eligibility.trim() || undefined,
              stage: "saved",
            }));
            setDraft({ name: "", kind: "competition", organization: "", deadline: "", sourceUrl: "", eligibility: "" });
          }}
          style={{ ...primaryButton, marginTop: 12, opacity: draft.name.trim() ? 1 : 0.5 }}
        >Track it</button>
        <Basis>
          Record the official source so the deadline can be re-checked. Dates on aggregator sites
          go stale, and a missed deadline from a wrong date is the most avoidable loss there is.
        </Basis>
      </Panel>

      {student.opportunities.length === 0 ? (
        <EmptyState
          title="Nothing tracked"
          detail="Add competitions and programmes as you find them. Anything with a deadline appears in your calendar and rises in your next-best-action queue as the date closes."
        />
      ) : (
        <Panel title="Tracked" meta={`${live.length} live`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {live.map(o => {
              const days = o.deadline ? daysUntil(o.deadline, today()) : NaN;
              const urgent = !Number.isNaN(days) && days >= 0 && days <= 14;
              const passed = !Number.isNaN(days) && days < 0;
              return (
                <li key={o.id} style={{
                  border: "1px solid var(--rule)",
                  borderLeft: `3px solid ${urgent ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                  borderRadius: "var(--radius-xs)", padding: "11px 13px",
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{o.name}</span>
                    <Pill>{o.kind.replace("-", " ")}</Pill>
                    {o.deadline && (
                      <Pill tone={passed ? "critical" : urgent ? "warn" : "neutral"}>
                        {formatDeadline(o.deadline)}
                      </Pill>
                    )}
                    <select
                      value={o.stage}
                      onChange={e => update(s => updateOpportunity(s, o.id, { stage: e.target.value as OpportunityStage }))}
                      aria-label={`Stage of ${o.name}`}
                      style={{ ...inputStyle, marginLeft: "auto", padding: "4px 8px", fontSize: 12 }}
                    >
                      {STAGES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  {o.organization && <Basis>{o.organization}{o.eligibility ? ` · ${o.eligibility}` : ""}</Basis>}
                  {o.sourceUrl && (
                    <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
                      fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)",
                      textDecoration: "none", display: "inline-block", marginTop: 6,
                    }}>Verify the deadline →</a>
                  )}
                  <button onClick={() => update(s => removeOpportunity(s, o.id))} style={{ ...linkButton, marginLeft: 12 }}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          {closed.length > 0 && (
            <Basis>{closed.length} closed or declined, kept for the record.</Basis>
          )}
        </Panel>
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
