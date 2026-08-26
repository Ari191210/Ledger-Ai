"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Activities & projects — Vision §13, §14, §15.
//
// The field that matters most here is `impact`, and it is the one students
// skip. "Member of robotics club" and "grew the team from 4 to 18 and led
// the build that placed 2nd of 40" describe the same activity; only one of
// them survives contact with a reader.
//
// So impact is prompted for explicitly, its absence is reported as a
// finding, and profile strength counts the share of activities that state a
// measurable outcome rather than counting activities.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useStudent } from "@/lib/student/use-student";
import {
  addActivity, addAward, addProject, removeActivity, removeAward,
  removeProject, updateActivity, updateProject,
} from "@/lib/student/actions";
import type { ActivityCategory, ProjectStatus } from "@/lib/student/types";
import { PageHead, Card, Basis, Empty, Pill } from "./primitives";

const CATEGORIES: ActivityCategory[] = [
  "leadership", "sports", "clubs", "volunteering", "research",
  "entrepreneurship", "competitions", "arts", "technology", "community", "work",
];

const PROJECT_STATUSES: ProjectStatus[] = ["idea", "planning", "building", "shipped", "archived"];

export function ActivitiesModule() {
  const { student, update, hydrated } = useStudent();
  const [draft, setDraft] = useState({
    name: "", category: "clubs" as ActivityCategory, role: "",
    organization: "", impact: "", leadership: false,
  });
  const [award, setAward] = useState({ title: "", issuer: "", level: "school" as const });

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Activities" sub="Reading your record." /></div>;
  }

  const missingImpact = student.activities.filter(a => !a.impact?.trim());

  return (
    <div>
      <PageHead
        title="Activities"
        sub="What you do outside class, and what came of it. The outcome field is the one that matters: an activity without a stated result reads as a claim rather than a record."
      />

      {missingImpact.length > 0 && (
        <Card title="Incomplete" meta={`${missingImpact.length} without an outcome`}>
          <p style={{ fontSize: 13.5, color: "var(--os-warn)", margin: 0, lineHeight: 1.55 }}>
            {missingImpact.length} {missingImpact.length === 1 ? "activity has" : "activities have"} no
            measurable outcome recorded: {missingImpact.slice(0, 3).map(a => a.name).join(", ")}
            {missingImpact.length > 3 ? "…" : ""}.
          </p>
          <Basis>
            Write one sentence with a number in it. What changed because you were there?
          </Basis>
        </Card>
      )}

      <Card title="Add an activity">
        <div className="os-grid-fields">
          <input placeholder="Activity" value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })} className="os-input" />
          <select value={draft.category} aria-label="Category"
            onChange={e => setDraft({ ...draft, category: e.target.value as ActivityCategory })} className="os-input">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="Your role" value={draft.role}
            onChange={e => setDraft({ ...draft, role: e.target.value })} className="os-input" />
          <input placeholder="Organisation" value={draft.organization}
            onChange={e => setDraft({ ...draft, organization: e.target.value })} className="os-input" />
        </div>
        <input
          placeholder="What changed because you were there? Include a number."
          value={draft.impact}
          onChange={e => setDraft({ ...draft, impact: e.target.value })}
          className="os-input"
        />
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 13, color: "var(--os-ink-3)" }}>
          <input type="checkbox" checked={draft.leadership}
            onChange={e => setDraft({ ...draft, leadership: e.target.checked })}
            style={{ accentColor: "var(--os-accent)" }} />
          I held formal responsibility for other people
        </label>
        <button
          disabled={!draft.name.trim()}
          onClick={() => {
            update(s => addActivity(s, {
              name: draft.name.trim(),
              category: draft.category,
              role: draft.role.trim() || undefined,
              organization: draft.organization.trim() || undefined,
              impact: draft.impact.trim() || undefined,
              leadership: draft.leadership,
            }));
            setDraft({ name: "", category: "clubs", role: "", organization: "", impact: "", leadership: false });
          }}
          className="os-btn" data-variant="primary"
        >Add activity</button>
      </Card>

      {student.activities.length === 0 ? (
        <Empty
          title="No activities recorded"
          body="Add everything — clubs, sport, volunteering, work, competitions. It is easier to judge a complete list than to remember a partial one."
        />
      ) : (
        <Card title="Recorded" meta={`${student.activities.length}`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {student.activities.map(a => (
              <li key={a.id} style={{
                border: "1px solid var(--os-line)", borderRadius: "var(--os-r-sm)", padding: "11px 13px",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "var(--os-ink)", fontWeight: 500 }}>{a.name}</span>
                  <Pill>{a.category}</Pill>
                  {a.leadership && <Pill tone="good">Leadership</Pill>}
                  {!a.impact?.trim() && <Pill tone="warn">No outcome</Pill>}
                  <button onClick={() => update(s => removeActivity(s, a.id))} className="os-btn" data-variant="ghost" data-size="sm">
                    Remove
                  </button>
                </div>
                {a.role && <Basis>{a.role}{a.organization ? ` · ${a.organization}` : ""}</Basis>}
                <input
                  placeholder="Outcome — with a number"
                  value={a.impact ?? ""}
                  onChange={e => update(s => updateActivity(s, a.id, { impact: e.target.value }))}
                  className="os-input"
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Awards" meta={`${student.awards.length}`}>
        <div className="os-grid-fields">
          <input placeholder="Award" value={award.title}
            onChange={e => setAward({ ...award, title: e.target.value })} className="os-input" />
          <input placeholder="Issuer" value={award.issuer}
            onChange={e => setAward({ ...award, issuer: e.target.value })} className="os-input" />
          <select value={award.level} aria-label="Level"
            onChange={e => setAward({ ...award, level: e.target.value as typeof award.level })} className="os-input">
            <option value="school">School</option>
            <option value="regional">Regional</option>
            <option value="national">National</option>
            <option value="international">International</option>
          </select>
        </div>
        <button
          disabled={!award.title.trim()}
          onClick={() => {
            update(s => addAward(s, {
              title: award.title.trim(),
              issuer: award.issuer.trim() || undefined,
              level: award.level,
            }));
            setAward({ title: "", issuer: "", level: "school" });
          }}
          className="os-btn" data-variant="primary"
        >Add award</button>
        {student.awards.length > 0 && (
          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 7 }}>
            {student.awards.map(a => (
              <li key={a.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13.5, color: "var(--os-ink-3)", flex: 1 }}>
                  {a.title}{a.issuer ? ` · ${a.issuer}` : ""}
                </span>
                {a.level && <Pill tone={a.level === "international" || a.level === "national" ? "good" : "neutral"}>{a.level}</Pill>}
                <button onClick={() => update(s => removeAward(s, a.id))} className="os-btn" data-variant="ghost" data-size="sm">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function ProjectsModule() {
  const { student, update, hydrated } = useStudent();
  const [draft, setDraft] = useState({ title: "", problem: "", status: "idea" as ProjectStatus });

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Projects" sub="Reading your projects." /></div>;
  }

  return (
    <div>
      <PageHead
        title="Projects"
        sub="Things you are building. A project becomes evidence when it ships and its result is written down — until then it is an intention."
      />

      <Card title="Start a project">
        <div className="os-grid-fields">
          <input placeholder="Project title" value={draft.title}
            onChange={e => setDraft({ ...draft, title: e.target.value })} className="os-input" />
          <select value={draft.status} aria-label="Status"
            onChange={e => setDraft({ ...draft, status: e.target.value as ProjectStatus })} className="os-input">
            {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <input
          placeholder="What problem does it solve?"
          value={draft.problem}
          onChange={e => setDraft({ ...draft, problem: e.target.value })}
          className="os-input"
        />
        <button
          disabled={!draft.title.trim()}
          onClick={() => {
            update(s => addProject(s, {
              title: draft.title.trim(),
              problem: draft.problem.trim() || undefined,
              status: draft.status,
            }));
            setDraft({ title: "", problem: "", status: "idea" });
          }}
          className="os-btn" data-variant="primary"
        >Add project</button>
      </Card>

      {student.projects.length === 0 ? (
        <Empty
          title="No projects"
          body="Record what you are building, including the unfinished ones. A stalled project with a next milestone is recoverable; one nobody is tracking is not."
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {student.projects.map(p => (
            <section key={p.id} style={{
              border: "1px solid var(--os-line)", borderRadius: "var(--os-r)",
              background: "var(--os-surface)", padding: "14px 16px",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <h3 style={{ fontFamily: "var(--os-sans)", fontSize: 16, margin: 0, color: "var(--os-ink)" }}>{p.title}</h3>
                <select
                  value={p.status}
                  onChange={e => update(s => updateProject(s, p.id, { status: e.target.value as ProjectStatus }))}
                  aria-label={`Status of ${p.title}`}
                  className="os-input"
                >
                  {PROJECT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
                {p.status === "shipped" && !p.impact?.trim() && <Pill tone="warn">No result recorded</Pill>}
                <button onClick={() => update(s => removeProject(s, p.id))} className="os-btn" data-variant="ghost" data-size="sm">
                  Remove
                </button>
              </div>
              {p.problem && <Basis>{p.problem}</Basis>}
              <input
                placeholder="Result — a benchmark, a user count, a measured outcome"
                value={p.impact ?? ""}
                onChange={e => update(s => updateProject(s, p.id, { impact: e.target.value }))}
                className="os-input"
              />
              {p.status === "shipped" && !p.impact?.trim() && (
                <Basis>
                  A shipped project with no measured result is a demo. One number — a benchmark, a
                  comparison, a user count — is the difference between a demo and a result.
                </Basis>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}



