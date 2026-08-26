"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Applications — Vision §18 and §19.
//
// Each college gets a checklist and a progress figure computed from it. The
// checklist is editable because requirements differ per school, and a fixed
// list would quietly become wrong.
//
// Recommenders live here rather than in their own section: a letter is only
// ever needed *for* an application, and separating them is what lets a
// recommender be forgotten until the week of the deadline.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useStudent } from "@/lib/student/use-student";
import {
  addChecklistItem, addRecommender, removeRecommender, setApplicationSubmitted,
  toggleChecklistItem, updateRecommender,
} from "@/lib/student/actions";
import { applicationProgress, formatDeadline } from "@/lib/student/derive";
import type { RecommenderStatus } from "@/lib/student/types";
import { PageHead, Panel, Basis, EmptyState, Pill, Meter } from "./primitives";

const STATUSES: { id: RecommenderStatus; label: string }[] = [
  { id: "not-requested", label: "Not asked" },
  { id: "requested",     label: "Asked" },
  { id: "accepted",      label: "Accepted" },
  { id: "in-progress",   label: "Writing" },
  { id: "submitted",     label: "Submitted" },
];

export default function ApplicationsModule() {
  const { student, update, hydrated } = useStudent();
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [rec, setRec] = useState({ name: "", subject: "", email: "", deadline: "" });

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Applications" sub="Reading your applications." /></div>;
  }

  const open = student.applications.filter(a => !a.submitted);
  const submitted = student.applications.filter(a => a.submitted);

  return (
    <div>
      <PageHead
        title="Applications"
        sub="One workspace per college, created automatically when you add the school. Progress is the share of checklist items you have actually ticked — nothing here is estimated."
      />

      {student.applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          detail="An application workspace opens automatically for every college you add, with a standard checklist you can extend per school."
          href="/journey/colleges" cta="Add a college"
        />
      ) : (
        <>
          {open.map(app => {
            const college = student.colleges.find(c => c.id === app.collegeId);
            if (!college) return null;
            const pct = applicationProgress(app);
            const pending = app.checklist.filter(i => !i.done);
            return (
              <Panel
                key={app.id}
                title={college.name}
                meta={college.deadline ? formatDeadline(college.deadline) : "no deadline recorded"}
              >
                <Meter percent={pct} available />
                <Basis>
                  {app.checklist.filter(i => i.done).length} of {app.checklist.length} complete.
                  {pending.length === 0
                    ? " Everything is ticked — this is ready to submit."
                    : ` Next: ${pending[0].label}.`}
                </Basis>

                <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 7 }}>
                  {app.checklist.map(item => (
                    <li key={item.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="checkbox" checked={item.done}
                        onChange={() => update(s => toggleChecklistItem(s, app.id, item.id))}
                        aria-label={`${item.label} for ${college.name}`}
                        style={{ accentColor: "var(--cinnabar-ink)", width: 15, height: 15 }}
                      />
                      <span style={{
                        fontSize: 13.5,
                        color: item.done ? "var(--ink-3)" : "var(--ink-2)",
                        textDecoration: item.done ? "line-through" : "none",
                      }}>{item.label}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <input
                    placeholder="Add a requirement for this school"
                    value={newItem[app.id] ?? ""}
                    onChange={e => setNewItem({ ...newItem, [app.id]: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === "Enter" && (newItem[app.id] ?? "").trim()) {
                        update(s => addChecklistItem(s, app.id, newItem[app.id].trim()));
                        setNewItem({ ...newItem, [app.id]: "" });
                      }
                    }}
                    style={{ ...inputStyle, flex: "1 1 240px" }}
                  />
                  {pending.length === 0 && (
                    <button
                      onClick={() => update(s => setApplicationSubmitted(s, app.id, true))}
                      style={primaryButton}
                    >Mark submitted</button>
                  )}
                </div>
              </Panel>
            );
          })}

          {submitted.length > 0 && (
            <Panel title="Submitted" meta={`${submitted.length}`}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {submitted.map(app => {
                  const college = student.colleges.find(c => c.id === app.collegeId);
                  return (
                    <li key={app.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 13.5, color: "var(--ink-2)", flex: 1 }}>
                        {college?.name ?? "Unknown college"}
                      </span>
                      <Pill tone="good">Submitted</Pill>
                      <button
                        onClick={() => update(s => setApplicationSubmitted(s, app.id, false))}
                        style={linkButton}
                      >Undo</button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </>
      )}

      <Panel title="Recommenders" meta={`${student.recommenders.length} tracked`}>
        <Basis>
          A letter from someone who watched you work beats one written from a mark sheet, and
          that takes months of visibility. Ask early.
        </Basis>

        {student.recommenders.length > 0 && (
          <ul style={{ listStyle: "none", margin: "12px 0", padding: 0, display: "grid", gap: 10 }}>
            {student.recommenders.map(r => (
              <li key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, color: "var(--ink-2)", flex: "1 1 160px" }}>
                  {r.name}{r.subject ? ` · ${r.subject}` : ""}
                </span>
                <select
                  value={r.status}
                  onChange={e => update(s => updateRecommender(s, r.id, { status: e.target.value as RecommenderStatus }))}
                  aria-label={`Status for ${r.name}`}
                  style={inputStyle}
                >
                  {STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                </select>
                {r.deadline && <Pill tone="warn">{formatDeadline(r.deadline)}</Pill>}
                <button onClick={() => update(s => removeRecommender(s, r.id))} style={linkButton}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          <input placeholder="Name" value={rec.name}
            onChange={e => setRec({ ...rec, name: e.target.value })} style={inputStyle} />
          <input placeholder="Subject" value={rec.subject}
            onChange={e => setRec({ ...rec, subject: e.target.value })} style={inputStyle} />
          <input placeholder="Email" value={rec.email}
            onChange={e => setRec({ ...rec, email: e.target.value })} style={inputStyle} />
          <input type="date" value={rec.deadline} aria-label="Letter deadline"
            onChange={e => setRec({ ...rec, deadline: e.target.value })} style={inputStyle} />
        </div>
        <button
          disabled={!rec.name.trim()}
          onClick={() => {
            update(s => addRecommender(s, {
              name: rec.name.trim(),
              subject: rec.subject.trim() || undefined,
              email: rec.email.trim() || undefined,
              deadline: rec.deadline || undefined,
              status: "not-requested",
            }));
            setRec({ name: "", subject: "", email: "", deadline: "" });
          }}
          style={{ ...primaryButton, marginTop: 12, opacity: rec.name.trim() ? 1 : 0.5 }}
        >Add recommender</button>
      </Panel>
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
