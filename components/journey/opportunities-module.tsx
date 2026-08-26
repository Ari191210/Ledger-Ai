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
import { PageHead, Card, Basis, Empty, Pill } from "./primitives";

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

      <Card title="Track an opportunity" meta="source link required to verify later">
        <div className="os-grid-fields">
          <input placeholder="Name" value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })} className="os-input" />
          <select value={draft.kind} aria-label="Kind"
            onChange={e => setDraft({ ...draft, kind: e.target.value as OpportunityKind })} className="os-input">
            {KINDS.map(k => <option key={k} value={k}>{k.replace("-", " ")}</option>)}
          </select>
          <input placeholder="Organisation" value={draft.organization}
            onChange={e => setDraft({ ...draft, organization: e.target.value })} className="os-input" />
          <input type="date" value={draft.deadline} aria-label="Deadline"
            onChange={e => setDraft({ ...draft, deadline: e.target.value })} className="os-input" />
          <input placeholder="Official source URL" value={draft.sourceUrl}
            onChange={e => setDraft({ ...draft, sourceUrl: e.target.value })} className="os-input" />
          <input placeholder="Eligibility" value={draft.eligibility}
            onChange={e => setDraft({ ...draft, eligibility: e.target.value })} className="os-input" />
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
          className="os-btn" data-variant="primary"
        >Track it</button>
        <Basis>
          Record the official source so the deadline can be re-checked. Dates on aggregator sites
          go stale, and a missed deadline from a wrong date is the most avoidable loss there is.
        </Basis>
      </Card>

      {student.opportunities.length === 0 ? (
        <Empty
          title="Nothing tracked"
          body="Add competitions and programmes as you find them. Anything with a deadline appears in your calendar and rises in your next-best-action queue as the date closes."
        />
      ) : (
        <Card title="Tracked" meta={`${live.length} live`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {live.map(o => {
              const days = o.deadline ? daysUntil(o.deadline, today()) : NaN;
              const urgent = !Number.isNaN(days) && days >= 0 && days <= 14;
              const passed = !Number.isNaN(days) && days < 0;
              return (
                <li key={o.id} style={{
                  border: "1px solid var(--os-line)",
                  borderLeft: `3px solid ${urgent ? "var(--os-accent)" : "var(--os-line)"}`,
                  borderRadius: "var(--os-r-sm)", padding: "11px 13px",
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, color: "var(--os-ink)", fontWeight: 500 }}>{o.name}</span>
                    <Pill>{o.kind.replace("-", " ")}</Pill>
                    {o.deadline && (
                      <Pill tone={passed ? "risk" : urgent ? "warn" : "neutral"}>
                        {formatDeadline(o.deadline)}
                      </Pill>
                    )}
                    <select
                      value={o.stage}
                      onChange={e => update(s => updateOpportunity(s, o.id, { stage: e.target.value as OpportunityStage }))}
                      aria-label={`Stage of ${o.name}`}
                      className="os-input"
                    >
                      {STAGES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  {o.organization && <Basis>{o.organization}{o.eligibility ? ` · ${o.eligibility}` : ""}</Basis>}
                  {o.sourceUrl && (
                    <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
                      fontFamily: "var(--os-mono)", fontSize: 11, color: "var(--os-accent)",
                      textDecoration: "none", display: "inline-block", marginTop: 6,
                    }}>Verify the deadline →</a>
                  )}
                  <button onClick={() => update(s => removeOpportunity(s, o.id))} className="os-btn" data-variant="ghost" data-size="sm">
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          {closed.length > 0 && (
            <Basis>{closed.length} closed or declined, kept for the record.</Basis>
          )}
        </Card>
      )}
    </div>
  );
}



