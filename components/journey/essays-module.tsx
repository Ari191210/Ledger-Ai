"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Essays — Vision §17.
//
// Positioned deliberately: "AI helps you discover and communicate your own
// story", never "AI writes your essay". There is no generate button here,
// and there will not be one — a drafted essay is the one artefact in the
// application that must be the student's.
//
// Saving is append-only, so version history is real. A student who writes a
// braver draft can always retrieve the safer one, which is what makes
// writing the braver one possible.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student/use-student";
import { addEssay, countWords, latestDraft, removeEssay, saveEssayDraft, updateEssay } from "@/lib/student/actions";
import { formatDeadline } from "@/lib/student/derive";
import type { EssayKind, EssayStatus } from "@/lib/student/types";
import { PageHead, Card, Basis, Empty, Pill } from "./primitives";

const KINDS: { id: EssayKind; label: string }[] = [
  { id: "common-app",         label: "Common App" },
  { id: "supplemental",       label: "Supplemental" },
  { id: "uc",                 label: "UC" },
  { id: "scholarship",        label: "Scholarship" },
  { id: "personal-statement", label: "Personal statement" },
  { id: "other",              label: "Other" },
];

const STATUSES: EssayStatus[] = ["not-started", "brainstorming", "drafting", "revising", "final"];

export default function EssaysModule() {
  const { student, update, hydrated } = useStudent();
  const [openId, setOpenId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState({
    title: "", kind: "common-app" as EssayKind, prompt: "", wordLimit: "", deadline: "", collegeId: "",
  });

  const active = student.essays.find(e => e.id === openId);

  // Load the newest draft when opening an essay. Keyed on the essay id so
  // switching essays does not carry the previous text across.
  useEffect(() => {
    if (!active) { setBody(""); return; }
    setBody(latestDraft(active)?.body ?? "");
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Essays" sub="Reading your drafts." /></div>;
  }

  return (
    <div>
      <PageHead
        title="Essays"
        sub="Prompts, drafts and version history. StudyLedger will not write these for you — an essay an admissions reader can tell was not yours is worse than no essay."
      />

      <Card title="Start an essay" meta="a prompt and a deadline">
        <div className="os-grid-fields">
          <input placeholder="Title" value={draft.title}
            onChange={e => setDraft({ ...draft, title: e.target.value })} className="os-input" />
          <select value={draft.kind} aria-label="Essay kind"
            onChange={e => setDraft({ ...draft, kind: e.target.value as EssayKind })} className="os-input">
            {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <select value={draft.collegeId} aria-label="College"
            onChange={e => setDraft({ ...draft, collegeId: e.target.value })} className="os-input">
            <option value="">No specific college</option>
            {student.colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" placeholder="Word limit" value={draft.wordLimit}
            onChange={e => setDraft({ ...draft, wordLimit: e.target.value })} className="os-input" />
          <input type="date" value={draft.deadline} aria-label="Essay deadline"
            onChange={e => setDraft({ ...draft, deadline: e.target.value })} className="os-input" />
        </div>
        <textarea
          placeholder="The prompt, in full"
          value={draft.prompt}
          onChange={e => setDraft({ ...draft, prompt: e.target.value })}
          rows={2}
          className="os-input"
        />
        <button
          disabled={!draft.title.trim()}
          onClick={() => {
            update(s => addEssay(s, {
              title: draft.title.trim(),
              kind: draft.kind,
              prompt: draft.prompt.trim() || undefined,
              collegeId: draft.collegeId || undefined,
              wordLimit: draft.wordLimit ? Number(draft.wordLimit) : undefined,
              deadline: draft.deadline || undefined,
              status: "not-started",
            }));
            setDraft({ title: "", kind: "common-app", prompt: "", wordLimit: "", deadline: "", collegeId: "" });
          }}
          className="os-btn" data-variant="primary"
        >Add essay</button>
      </Card>

      {student.essays.length === 0 ? (
        <Empty
          title="No essays yet"
          body="Add the prompts you have to answer. Deadlines flow into your calendar, and unfinished essays appear in your next-best-action queue as their dates approach."
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {student.essays.map(e => {
            const words = latestDraft(e)?.wordCount ?? 0;
            const over = e.wordLimit ? words > e.wordLimit : false;
            const college = student.colleges.find(c => c.id === e.collegeId);
            const isOpen = openId === e.id;
            return (
              <section key={e.id} style={{
                border: "1px solid var(--os-line)", borderRadius: "var(--os-r)",
                background: "var(--os-surface)", padding: "14px 16px",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <h3 style={{ fontFamily: "var(--os-sans)", fontSize: 16, margin: 0, color: "var(--os-ink)" }}>
                    {e.title}
                  </h3>
                  {college && <Pill>{college.name}</Pill>}
                  <Pill tone={e.status === "final" ? "good" : "neutral"}>{e.status.replace("-", " ")}</Pill>
                  {e.wordLimit && (
                    <Pill tone={over ? "risk" : "neutral"}>{words} / {e.wordLimit} words</Pill>
                  )}
                  {e.deadline && <Pill tone="warn">{formatDeadline(e.deadline)}</Pill>}
                  <button
                    onClick={() => setOpenId(isOpen ? null : e.id)}
                    className="os-btn" data-variant="ghost" data-size="sm"
                  >{isOpen ? "Close" : "Write"}</button>
                </div>

                {e.prompt && <Basis>{e.prompt}</Basis>}

                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      value={body}
                      onChange={ev => setBody(ev.target.value)}
                      rows={16}
                      placeholder="Write here. Saving keeps every version, so nothing you write is ever lost."
                      className="os-input"
                    />
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--os-mono)", fontSize: 11.5, color: over ? "var(--os-accent)" : "var(--os-ink-4)" }}>
                        {countWords(body)} words{e.wordLimit ? ` of ${e.wordLimit}` : ""}
                      </span>
                      <button
                        onClick={() => update(s => saveEssayDraft(s, e.id, body))}
                        disabled={!body.trim() || body === (latestDraft(e)?.body ?? "")}
                        className="os-btn" data-variant="primary"
                      >Save version</button>
                      <select
                        value={e.status}
                        onChange={ev => update(s => updateEssay(s, e.id, { status: ev.target.value as EssayStatus }))}
                        aria-label={`Status of ${e.title}`}
                        className="os-input"
                      >
                        {STATUSES.map(st => <option key={st} value={st}>{st.replace("-", " ")}</option>)}
                      </select>
                      <button onClick={() => update(s => removeEssay(s, e.id))} className="os-btn" data-variant="ghost" data-size="sm">
                        Delete
                      </button>
                    </div>

                    {e.drafts.length > 0 && (
                      <div style={{ marginTop: 14, borderTop: "1px solid var(--os-line-soft)", paddingTop: 12 }}>
                        <div style={{
                          fontFamily: "var(--os-mono)", fontSize: 9.5, letterSpacing: "0.07em",
                          textTransform: "uppercase", color: "var(--os-ink-4)", marginBottom: 8,
                        }}>Versions — {e.drafts.length}</div>
                        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                          {[...e.drafts].reverse().slice(0, 6).map((d, i) => (
                            <li key={d.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ fontFamily: "var(--os-mono)", fontSize: 11.5, color: "var(--os-ink-4)" }}>
                                {new Date(d.savedAt).toLocaleString("en-GB", {
                                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                              <span style={{ fontSize: 12, color: "var(--os-ink-4)" }}>{d.wordCount} words</span>
                              {i === 0 && <Pill tone="good">Current</Pill>}
                              <button onClick={() => setBody(d.body)} className="os-btn" data-variant="ghost" data-size="sm">
                                Load
                              </button>
                            </li>
                          ))}
                        </ul>
                        <Basis>
                          Loading an older version puts it in the editor. It is not saved until you
                          save it, and doing so adds a new version rather than overwriting anything.
                        </Basis>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}



