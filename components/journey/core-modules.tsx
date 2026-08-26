"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Academics, calendar and profile.
//
// The calendar is entirely derived. Nothing here creates a date except the
// custom-event form: every college deadline, test date, essay due date and
// project milestone arrives from the record that owns it. That is why a
// derived event cannot be deleted from this screen — deleting the
// projection while its source keeps the date would silently desynchronise
// the calendar from the thing it reports on.
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { useStudent } from "@/lib/student/use-student";
import {
  addCourse, addCustomEvent, addWeakTopic, removeCourse, removeEvent,
  removeWeakTopic, updateCourse, updateProfile,
} from "@/lib/student/actions";
import { daysUntil, formatDeadline, today } from "@/lib/student/derive";
import type { Curriculum, Grade } from "@/lib/student/types";
import { PageHead, Panel, Basis, EmptyState, Pill, Figure } from "./primitives";

const CURRICULA: Curriculum[] = ["CBSE", "ICSE", "IB", "A-Levels", "AP", "US-HS", "Other"];
const GRADES: Grade[] = [9, 10, 11, 12];

export function AcademicsModule() {
  const { student, update, hydrated } = useStudent();
  const [course, setCourse] = useState({ subject: "", level: "", score: "" });
  const [weak, setWeak] = useState({ subject: "", topic: "" });

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Academics" sub="Reading your record." /></div>;
  }

  const scored = student.academics.courses.filter(c => typeof c.score === "number");
  const mean = scored.length
    ? Math.round((scored.reduce((a, c) => a + (c.score ?? 0), 0) / scored.length) * 10) / 10
    : null;

  return (
    <div>
      <PageHead
        title="Academics"
        sub="Subjects, results and the topics you know are weak. Recording a weak topic puts it into your next-best-action queue, so naming it is the first step to clearing it."
      />

      <Panel title="Standing" meta={scored.length ? `${scored.length} results recorded` : "no results yet"}>
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
          <Figure
            label="Mean result" value={mean ?? undefined} suffix="%"
            available={mean !== null} big
            basis={mean !== null
              ? `Across ${scored.length} recorded course result${scored.length === 1 ? "" : "s"}. Courses without a result are not counted as zero.`
              : "Record a result to see this."}
          />
          <Figure
            label="Weak topics named" value={student.academics.weakTopics.length} available
            basis="Each one feeds your recommendation queue."
          />
        </div>
      </Panel>

      <Panel title="Courses">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
          <input placeholder="Subject" value={course.subject}
            onChange={e => setCourse({ ...course, subject: e.target.value })} style={inputStyle} />
          <input placeholder="Level" value={course.level}
            onChange={e => setCourse({ ...course, level: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Result %" value={course.score}
            onChange={e => setCourse({ ...course, score: e.target.value })} style={inputStyle} />
        </div>
        <button
          disabled={!course.subject.trim()}
          onClick={() => {
            update(s => addCourse(s, {
              subject: course.subject.trim(),
              level: course.level.trim() || undefined,
              score: course.score ? Number(course.score) : undefined,
            }));
            setCourse({ subject: "", level: "", score: "" });
          }}
          style={{ ...primaryButton, marginTop: 12, opacity: course.subject.trim() ? 1 : 0.5 }}
        >Add course</button>

        {student.academics.courses.length > 0 && (
          <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 8 }}>
            {student.academics.courses.map(c => (
              <li key={c.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13.5, color: "var(--ink-2)", flex: 1 }}>
                  {c.subject}{c.level ? ` · ${c.level}` : ""}
                </span>
                <input
                  type="number" placeholder="—" value={c.score ?? ""}
                  aria-label={`${c.subject} result`}
                  onChange={e => update(s => updateCourse(s, c.id, {
                    score: e.target.value === "" ? undefined : Number(e.target.value),
                  }))}
                  style={{ ...inputStyle, width: 80, textAlign: "center" }}
                />
                <button onClick={() => update(s => removeCourse(s, c.id))} style={linkButton}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Weak topics" meta={`${student.academics.weakTopics.length}`}>
        <Basis>
          Naming a weakness is what lets the system schedule against it. Vague discomfort with a
          subject cannot be planned around; "vectors" can.
        </Basis>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 10 }}>
          <input placeholder="Subject" value={weak.subject}
            onChange={e => setWeak({ ...weak, subject: e.target.value })} style={inputStyle} />
          <input placeholder="Topic" value={weak.topic}
            onChange={e => setWeak({ ...weak, topic: e.target.value })} style={inputStyle} />
        </div>
        <button
          disabled={!weak.subject.trim() || !weak.topic.trim()}
          onClick={() => {
            update(s => addWeakTopic(s, { subject: weak.subject.trim(), topic: weak.topic.trim(), source: "self" }));
            setWeak({ subject: "", topic: "" });
          }}
          style={{ ...primaryButton, marginTop: 12, opacity: weak.subject.trim() && weak.topic.trim() ? 1 : 0.5 }}
        >Name a weak topic</button>

        {student.academics.weakTopics.length > 0 && (
          <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 7 }}>
            {student.academics.weakTopics.map(w => (
              <li key={w.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13.5, color: "var(--ink-2)", flex: 1 }}>{w.topic}</span>
                <Pill>{w.subject}</Pill>
                <button onClick={() => update(s => removeWeakTopic(s, w.id))} style={linkButton}>Clear</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {student.academics.courses.length === 0 && (
        <EmptyState
          title="No courses recorded"
          detail="Add your subjects and results. This is the figure admissions readers weight most heavily, and it is the one the rest of your plan has to work around."
        />
      )}
    </div>
  );
}

export function CalendarModule() {
  const { student, update, hydrated } = useStudent();
  const [ev, setEv] = useState({ title: "", date: "" });

  const sorted = useMemo(
    () => [...student.events].sort((a, b) => a.date.localeCompare(b.date)),
    [student.events],
  );

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Calendar" sub="Reading your dates." /></div>;
  }

  const t = today();
  const future = sorted.filter(e => e.date >= t);
  const past = sorted.filter(e => e.date < t);

  return (
    <div>
      <PageHead
        title="Calendar"
        sub="Every date in one place. Almost nothing here is entered directly — deadlines arrive from the colleges, tests, essays and opportunities that own them, so a date is never kept in two places."
      />

      <Panel title="Add a date" meta="for things with no other home">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="What is it?" value={ev.title}
            onChange={e => setEv({ ...ev, title: e.target.value })} style={{ ...inputStyle, flex: "1 1 220px" }} />
          <input type="date" value={ev.date} aria-label="Date"
            onChange={e => setEv({ ...ev, date: e.target.value })} style={inputStyle} />
          <button
            disabled={!ev.title.trim() || !ev.date}
            onClick={() => {
              update(s => addCustomEvent(s, { title: ev.title.trim(), date: ev.date, kind: "custom" }));
              setEv({ title: "", date: "" });
            }}
            style={{ ...primaryButton, opacity: ev.title.trim() && ev.date ? 1 : 0.5 }}
          >Add</button>
        </div>
        <Basis>
          School exams and personal commitments belong here. A college deadline does not — add the
          college instead, and its date appears automatically.
        </Basis>
      </Panel>

      {future.length === 0 && past.length === 0 ? (
        <EmptyState
          title="No dates"
          detail="Add a college, a test or an essay and its deadline appears here without you entering it twice."
          href="/journey/colleges" cta="Add a college"
        />
      ) : (
        <Panel title="Ahead" meta={`${future.length}`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
            {future.map(e => {
              const days = daysUntil(e.date, t);
              return (
                <li key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)", minWidth: 92,
                  }}>{e.date}</span>
                  <span style={{ fontSize: 13.5, color: "var(--ink-2)", flex: 1 }}>{e.title}</span>
                  <Pill tone={days <= 7 ? "critical" : days <= 30 ? "warn" : "neutral"}>
                    {formatDeadline(e.date)}
                  </Pill>
                  {/* Only events with no owning record can be removed here. */}
                  {!e.source && (
                    <button onClick={() => update(s => removeEvent(s, e.id))} style={linkButton}>Remove</button>
                  )}
                </li>
              );
            })}
          </ul>
          {future.some(e => e.source) && (
            <Basis>
              Dates without a remove button belong to a college, test, essay or opportunity. Change
              the date on that record and it moves here too.
            </Basis>
          )}
        </Panel>
      )}

      {past.length > 0 && (
        <Panel title="Passed" meta={`${past.length}`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 7 }}>
            {past.slice(-10).reverse().map(e => (
              <li key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)", minWidth: 92,
                }}>{e.date}</span>
                <span style={{ fontSize: 13, color: "var(--ink-3)", flex: 1 }}>{e.title}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

export function ProfileModule() {
  const { student, update, hydrated } = useStudent();

  if (!hydrated) {
    return <div style={{ minHeight: "50vh" }}><PageHead title="Profile" sub="Reading your profile." /></div>;
  }

  const p = student.profile;

  return (
    <div>
      <PageHead
        title="Profile"
        sub="The facts everything else is reasoned from. Your grade and curriculum decide what can be recommended; your intended major drives college fit and opportunity matching."
      />

      <Panel title="You">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
          <label style={labelStyle}>
            <span style={labelText}>Name</span>
            <input value={p.name ?? ""} placeholder="Your name"
              onChange={e => update(s => updateProfile(s, { name: e.target.value }))} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Grade</span>
            <select
              value={p.grade ?? ""}
              onChange={e => update(s => updateProfile(s, {
                grade: e.target.value ? Number(e.target.value) as Grade : undefined,
              }))}
              style={inputStyle}
            >
              <option value="">Not set</option>
              {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Curriculum</span>
            <select
              value={p.curriculum ?? ""}
              onChange={e => update(s => updateProfile(s, {
                curriculum: (e.target.value || undefined) as Curriculum | undefined,
              }))}
              style={inputStyle}
            >
              <option value="">Not set</option>
              {CURRICULA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Intended major</span>
            <input value={p.intendedMajor ?? ""} placeholder="e.g. Computer Science"
              onChange={e => update(s => updateProfile(s, { intendedMajor: e.target.value }))} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Country</span>
            <input value={p.country ?? ""} placeholder="Where you study"
              onChange={e => update(s => updateProfile(s, { country: e.target.value }))} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelText}>Graduating</span>
            <input type="number" value={p.graduationYear ?? ""} placeholder="Year"
              onChange={e => update(s => updateProfile(s, {
                graduationYear: e.target.value ? Number(e.target.value) : undefined,
              }))} style={inputStyle} />
          </label>
        </div>
        <Basis>
          Stored on this device. Nothing here is sent anywhere until you sign in, and no field is
          required — but fit scores and recommendations stay unavailable while the inputs they
          depend on are missing, rather than being guessed.
        </Basis>
      </Panel>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--rule)",
  borderRadius: "var(--radius-xs)", padding: "8px 10px",
  color: "var(--ink)", fontSize: 13, fontFamily: "inherit", width: "100%",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };

const labelText: React.CSSProperties = {
  fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.07em",
  textTransform: "uppercase", color: "var(--ink-3)",
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
