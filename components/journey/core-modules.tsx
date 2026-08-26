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
import { PageHead, Card, Basis, Empty, Pill, Figure } from "./primitives";

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

      <Card title="Standing" meta={scored.length ? `${scored.length} results recorded` : "no results yet"}>
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
          <Figure
            label="Mean result" value={mean ?? undefined} unit="%"
            available={mean !== null} size="lg"             basis={mean !== null
              ? `Across ${scored.length} recorded course result${scored.length === 1 ? "" : "s"}. Courses without a result are not counted as zero.`
              : "Record a result to see this."}
          />
          <Figure
            label="Weak topics named" value={student.academics.weakTopics.length} available
            basis="Each one feeds your recommendation queue."
          />
        </div>
      </Card>

      <Card title="Courses">
        <div className="os-grid-fields">
          <input placeholder="Subject" value={course.subject}
            onChange={e => setCourse({ ...course, subject: e.target.value })} className="os-input" />
          <input placeholder="Level" value={course.level}
            onChange={e => setCourse({ ...course, level: e.target.value })} className="os-input" />
          <input type="number" placeholder="Result %" value={course.score}
            onChange={e => setCourse({ ...course, score: e.target.value })} className="os-input" />
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
          className="os-btn" data-variant="primary"
        >Add course</button>

        {student.academics.courses.length > 0 && (
          <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 8 }}>
            {student.academics.courses.map(c => (
              <li key={c.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13.5, color: "var(--os-ink-3)", flex: 1 }}>
                  {c.subject}{c.level ? ` · ${c.level}` : ""}
                </span>
                <input
                  type="number" placeholder="—" value={c.score ?? ""}
                  aria-label={`${c.subject} result`}
                  onChange={e => update(s => updateCourse(s, c.id, {
                    score: e.target.value === "" ? undefined : Number(e.target.value),
                  }))}
                  className="os-input"
                />
                <button onClick={() => update(s => removeCourse(s, c.id))} className="os-btn" data-variant="ghost" data-size="sm">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Weak topics" meta={`${student.academics.weakTopics.length}`}>
        <Basis>
          Naming a weakness is what lets the system schedule against it. Vague discomfort with a
          subject cannot be planned around; "vectors" can.
        </Basis>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 10 }}>
          <input placeholder="Subject" value={weak.subject}
            onChange={e => setWeak({ ...weak, subject: e.target.value })} className="os-input" />
          <input placeholder="Topic" value={weak.topic}
            onChange={e => setWeak({ ...weak, topic: e.target.value })} className="os-input" />
        </div>
        <button
          disabled={!weak.subject.trim() || !weak.topic.trim()}
          onClick={() => {
            update(s => addWeakTopic(s, { subject: weak.subject.trim(), topic: weak.topic.trim(), source: "self" }));
            setWeak({ subject: "", topic: "" });
          }}
          className="os-btn" data-variant="primary"
        >Name a weak topic</button>

        {student.academics.weakTopics.length > 0 && (
          <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 7 }}>
            {student.academics.weakTopics.map(w => (
              <li key={w.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13.5, color: "var(--os-ink-3)", flex: 1 }}>{w.topic}</span>
                <Pill>{w.subject}</Pill>
                <button onClick={() => update(s => removeWeakTopic(s, w.id))} className="os-btn" data-variant="ghost" data-size="sm">Clear</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {student.academics.courses.length === 0 && (
        <Empty
          title="No courses recorded"
          body="Add your subjects and results. This is the figure admissions readers weight most heavily, and it is the one the rest of your plan has to work around."
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

      <Card title="Add a date" meta="for things with no other home">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="What is it?" value={ev.title}
            onChange={e => setEv({ ...ev, title: e.target.value })} className="os-input" />
          <input type="date" value={ev.date} aria-label="Date"
            onChange={e => setEv({ ...ev, date: e.target.value })} className="os-input" />
          <button
            disabled={!ev.title.trim() || !ev.date}
            onClick={() => {
              update(s => addCustomEvent(s, { title: ev.title.trim(), date: ev.date, kind: "custom" }));
              setEv({ title: "", date: "" });
            }}
            className="os-btn" data-variant="primary"
          >Add</button>
        </div>
        <Basis>
          School exams and personal commitments belong here. A college deadline does not — add the
          college instead, and its date appears automatically.
        </Basis>
      </Card>

      {future.length === 0 && past.length === 0 ? (
        <Empty
          title="No dates"
          body="Add a college, a test or an essay and its deadline appears here without you entering it twice."
          href="/journey/colleges" cta="Add a college"
        />
      ) : (
        <Card title="Ahead" meta={`${future.length}`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
            {future.map(e => {
              const days = daysUntil(e.date, t);
              return (
                <li key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{
                    fontFamily: "var(--os-mono)", fontSize: 11.5, color: "var(--os-ink-4)", minWidth: 92,
                  }}>{e.date}</span>
                  <span style={{ fontSize: 13.5, color: "var(--os-ink-3)", flex: 1 }}>{e.title}</span>
                  <Pill tone={days <= 7 ? "risk" : days <= 30 ? "warn" : "neutral"}>
                    {formatDeadline(e.date)}
                  </Pill>
                  {/* Only events with no owning record can be removed here. */}
                  {!e.source && (
                    <button onClick={() => update(s => removeEvent(s, e.id))} className="os-btn" data-variant="ghost" data-size="sm">Remove</button>
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
        </Card>
      )}

      {past.length > 0 && (
        <Card title="Passed" meta={`${past.length}`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 7 }}>
            {past.slice(-10).reverse().map(e => (
              <li key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{
                  fontFamily: "var(--os-mono)", fontSize: 11.5, color: "var(--os-ink-4)", minWidth: 92,
                }}>{e.date}</span>
                <span style={{ fontSize: 13, color: "var(--os-ink-4)", flex: 1 }}>{e.title}</span>
              </li>
            ))}
          </ul>
        </Card>
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

      <Card title="You">
        <div className="os-grid-fields">
          <label className="os-field">
            <span className="os-field-label">Name</span>
            <input value={p.name ?? ""} placeholder="Your name"
              onChange={e => update(s => updateProfile(s, { name: e.target.value }))} className="os-input" />
          </label>
          <label className="os-field">
            <span className="os-field-label">Grade</span>
            <select
              value={p.grade ?? ""}
              onChange={e => update(s => updateProfile(s, {
                grade: e.target.value ? Number(e.target.value) as Grade : undefined,
              }))}
              className="os-input"
            >
              <option value="">Not set</option>
              {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </label>
          <label className="os-field">
            <span className="os-field-label">Curriculum</span>
            <select
              value={p.curriculum ?? ""}
              onChange={e => update(s => updateProfile(s, {
                curriculum: (e.target.value || undefined) as Curriculum | undefined,
              }))}
              className="os-input"
            >
              <option value="">Not set</option>
              {CURRICULA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="os-field">
            <span className="os-field-label">Intended major</span>
            <input value={p.intendedMajor ?? ""} placeholder="e.g. Computer Science"
              onChange={e => update(s => updateProfile(s, { intendedMajor: e.target.value }))} className="os-input" />
          </label>
          <label className="os-field">
            <span className="os-field-label">Country</span>
            <input value={p.country ?? ""} placeholder="Where you study"
              onChange={e => update(s => updateProfile(s, { country: e.target.value }))} className="os-input" />
          </label>
          <label className="os-field">
            <span className="os-field-label">Graduating</span>
            <input type="number" value={p.graduationYear ?? ""} placeholder="Year"
              onChange={e => update(s => updateProfile(s, {
                graduationYear: e.target.value ? Number(e.target.value) : undefined,
              }))} className="os-input" />
          </label>
        </div>
        <Basis>
          Stored on this device. Nothing here is sent anywhere until you sign in, and no field is
          required — but fit scores and recommendations stay unavailable while the inputs they
          depend on are missing, rather than being guessed.
        </Basis>
      </Card>
    </div>
  );
}





