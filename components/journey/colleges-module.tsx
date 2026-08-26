"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Colleges — Vision §6 and §7.
//
// Two things this deliberately does not do:
//
//   1. It ships no college dataset. StudyLedger holds no verified data on
//      acceptance rates, rankings or requirements, and inventing them would
//      be exactly the fabrication Vision §34 forbids. The student records
//      what they researched, and the system reasons over that.
//
//   2. It never assigns a tier. Reach/target/likely is the student's own
//      judgement; the system comments on the *shape* of the resulting list
//      once it is large enough for the shape to mean anything.
//
// Adding a college here opens its application workspace and puts its
// deadline on the calendar, in one action — that linkage is the product.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStudent } from "@/lib/student/use-student";
import { addCollege, removeCollege, updateCollege } from "@/lib/student/actions";
import { applicationProgress, fitScore, formatDeadline, listBalance } from "@/lib/student/derive";
import type { ApplicationRound, College, CollegeTier } from "@/lib/student/types";
import { PageHead, Panel, Basis, EmptyState, Pill, Meter } from "./primitives";

const TIERS: { id: CollegeTier; label: string; note: string }[] = [
  { id: "reach",    label: "Reach",    note: "Admission would be unlikely even with a strong file." },
  { id: "target",   label: "Target",   note: "Your record is in the range this school usually admits." },
  { id: "likely",   label: "Likely",   note: "You would be disappointed not to be admitted." },
  { id: "unsorted", label: "Unsorted", note: "Not yet categorised." },
];

const ROUNDS: ApplicationRound[] = ["ED", "ED2", "EA", "REA", "RD", "rolling", "unknown"];

export default function CollegesModule() {
  const { student, update, hydrated } = useStudent();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "", location: "", country: "", intendedMajor: "",
    round: "RD" as ApplicationRound, deadline: "",
  });

  const balance = useMemo(() => listBalance(student.colleges), [student.colleges]);

  const add = () => {
    if (!draft.name.trim()) return;
    update(s => addCollege(s, {
      name: draft.name.trim(),
      location: draft.location.trim() || undefined,
      country: draft.country.trim() || undefined,
      intendedMajor: draft.intendedMajor.trim() || undefined,
      round: draft.round,
      deadline: draft.deadline || undefined,
      tier: "unsorted",
      testPolicy: "unknown",
    }));
    setDraft({ name: "", location: "", country: "", intendedMajor: "", round: "RD", deadline: "" });
  };

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Colleges" sub="Reading your list." /></div>;
  }

  return (
    <div>
      <PageHead
        title="Colleges"
        sub="The schools you are considering, and how balanced that list actually is. StudyLedger holds no ranking or acceptance-rate data, so everything here is what you recorded — and the fit score says plainly what it does and does not know."
      />

      {student.colleges.length > 0 && (
        <Panel title="Your list" meta={`${balance.total} saved`}>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 12 }}>
            {TIERS.filter(t => t.id !== "unsorted").map(t => (
              <div key={t.id}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--ink)" }}>
                  {balance[t.id as "reach" | "target" | "likely"]}
                </div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: "var(--ink-3)",
                }}>{t.label}</div>
              </div>
            ))}
            {balance.unsorted > 0 && (
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--ochre)" }}>{balance.unsorted}</div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: "var(--ink-3)",
                }}>Unsorted</div>
              </div>
            )}
          </div>
          {balance.warning ? (
            <p style={{ fontSize: 13, color: "var(--ochre)", margin: 0, lineHeight: 1.55 }}>
              {balance.warning}
            </p>
          ) : (
            <Basis>
              {balance.reach + balance.target + balance.likely < 4
                ? "Too few categorised schools to comment on the shape of the list. Below four, the distribution says nothing."
                : "The spread across reach, target and likely looks reasonable."}
            </Basis>
          )}
        </Panel>
      )}

      <Panel title="Add a college" meta="opens an application and a deadline">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          <input placeholder="College name" value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })} style={inputStyle} />
          <input placeholder="Location" value={draft.location}
            onChange={e => setDraft({ ...draft, location: e.target.value })} style={inputStyle} />
          <input placeholder="Country" value={draft.country}
            onChange={e => setDraft({ ...draft, country: e.target.value })} style={inputStyle} />
          <input placeholder="Course you'd apply to" value={draft.intendedMajor}
            onChange={e => setDraft({ ...draft, intendedMajor: e.target.value })} style={inputStyle} />
          <select value={draft.round} aria-label="Application round"
            onChange={e => setDraft({ ...draft, round: e.target.value as ApplicationRound })} style={inputStyle}>
            {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input type="date" value={draft.deadline} aria-label="Application deadline"
            onChange={e => setDraft({ ...draft, deadline: e.target.value })} style={inputStyle} />
        </div>
        <button onClick={add} disabled={!draft.name.trim()} style={{
          marginTop: 12, fontFamily: "var(--mono)", fontSize: 11.5,
          letterSpacing: "0.04em", textTransform: "uppercase",
          background: "transparent", color: draft.name.trim() ? "var(--cinnabar-ink)" : "var(--ink-3)",
          border: `1px solid ${draft.name.trim() ? "var(--cinnabar-ink)" : "var(--rule)"}`,
          borderRadius: "var(--radius-xs)", padding: "7px 14px",
          cursor: draft.name.trim() ? "pointer" : "not-allowed",
        }}>Add college</button>
        <Basis>
          Adding a college creates its application checklist and puts its deadline on your
          calendar. You never enter a date twice.
        </Basis>
      </Panel>

      {student.colleges.length === 0 ? (
        <EmptyState
          title="No colleges saved"
          detail="Add the schools you are seriously considering. Each one opens an application workspace with a checklist, and its deadline flows into your calendar and your next-best-action queue automatically."
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {student.colleges.map(c => (
            <CollegeCard
              key={c.id} college={c}
              expanded={open === c.id}
              onToggle={() => setOpen(open === c.id ? null : c.id)}
              onTier={(tier) => update(s => updateCollege(s, c.id, { tier }))}
              onRemove={() => update(s => removeCollege(s, c.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CollegeCard({
  college, expanded, onToggle, onTier, onRemove,
}: {
  college: College;
  expanded: boolean;
  onToggle: () => void;
  onTier: (t: CollegeTier) => void;
  onRemove: () => void;
}) {
  const { student } = useStudent();
  const fit = useMemo(() => fitScore(student, college), [student, college]);
  const app = student.applications.find(a => a.collegeId === college.id);
  const progress = app ? applicationProgress(app) : 0;

  return (
    <section style={{
      border: "1px solid var(--rule)", borderRadius: "var(--radius-sm)",
      background: "var(--paper-2)", padding: "14px 16px",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "var(--serif)", fontSize: 17, margin: 0, color: "var(--ink)" }}>
          {college.name}
        </h3>
        {college.location && (
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{college.location}</span>
        )}
        <Pill tone={college.tier === "unsorted" ? "warn" : "neutral"}>
          {TIERS.find(t => t.id === college.tier)?.label ?? college.tier}
        </Pill>
        <Pill>{college.round}</Pill>
        {college.deadline && (
          <Pill tone="warn">{formatDeadline(college.deadline)}</Pill>
        )}
        <button onClick={onToggle} style={{
          marginLeft: "auto", background: "transparent", border: "none",
          color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 11,
          cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em",
        }}>{expanded ? "Close" : "Detail"}</button>
      </div>

      {app && (
        <div style={{ marginTop: 10 }}>
          <Meter percent={progress} available />
          <Basis>
            Application {progress}% complete — {app.checklist.filter(i => i.done).length} of{" "}
            {app.checklist.length} items.
          </Basis>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--rule-2)", paddingTop: 14 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.07em",
              textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6,
            }}>Your category</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TIERS.map(t => (
                <button key={t.id} onClick={() => onTier(t.id)} title={t.note} style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, textTransform: "uppercase",
                  letterSpacing: "0.05em", padding: "5px 10px",
                  border: `1px solid ${college.tier === t.id ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                  color: college.tier === t.id ? "var(--cinnabar-ink)" : "var(--ink-3)",
                  background: "transparent", borderRadius: "var(--radius-xs)", cursor: "pointer",
                }}>{t.label}</button>
              ))}
            </div>
            <Basis>{TIERS.find(t => t.id === college.tier)?.note}</Basis>
          </div>

          <div style={{
            fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.07em",
            textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6,
          }}>Fit</div>
          {fit.available ? (
            <>
              <div style={{ fontFamily: "var(--mono)", fontSize: 26, color: "var(--ink)" }}>
                {fit.percent}<span style={{ fontSize: 14, color: "var(--ink-3)" }}>%</span>
              </div>
              <Basis>
                This measures how well this school matches what you recorded about yourself.
                It is not a chance of admission, and StudyLedger holds no admissions data.
              </Basis>
            </>
          ) : (
            <Basis>
              Not enough recorded to compute a fit score.
              {fit.missing.length > 0 && ` Add ${fit.missing.join(", ")}.`}
            </Basis>
          )}

          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 7 }}>
            {fit.factors.map(f => (
              <li key={f.label} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)", minWidth: 130 }}>{f.label}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 12,
                  color: f.available ? "var(--ink)" : "var(--ink-3)", minWidth: 38,
                }}>{f.available ? `${f.score}%` : "—"}</span>
                <span style={{ fontSize: 12, color: "var(--ink-3)", flex: 1, lineHeight: 1.5 }}>{f.reason}</span>
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: 14, marginTop: 16, alignItems: "center" }}>
            {app && (
              <Link href="/journey/applications" style={{
                fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--cinnabar-ink)",
                textDecoration: "none",
              }}>Open application →</Link>
            )}
            <button onClick={onRemove} style={{
              marginLeft: "auto", background: "transparent", border: "none",
              color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 11, cursor: "pointer",
            }}>Remove</button>
          </div>
          <Basis>
            Removing a college also removes its application and calendar entries. Essays keep
            their text but lose the link.
          </Basis>
        </div>
      )}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--rule)",
  borderRadius: "var(--radius-xs)", padding: "8px 10px",
  color: "var(--ink)", fontSize: 13, fontFamily: "inherit",
};
