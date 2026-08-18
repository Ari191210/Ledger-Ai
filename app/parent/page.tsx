"use client";

// /parent — REBUILT for M17. Replaces `/parent/[code]`, which required no
// authentication at all: possession of a code was total access. This route
// requires a real signed-in session and reads only through
// `public.get_parent_projection()` (029_parent_space.sql §7), so what
// renders below is exactly, and only, what that function can return —
// there is no local shaping of a richer payload into a filtered view.
//
// Visual language matches the retired report: light cream, Georgia serif,
// print-style. What changed is the DATA, not the register.

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { ParentProjection } from "@/lib/parent-space";

type StudentConnection = { connection_id: string; student_id: string; state: string; created_at: string };

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function ParentPage() {
  const { user, session, loading } = useAuth();
  const [connections, setConnections] = useState<StudentConnection[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [projection, setProjection] = useState<ParentProjection | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user || !session) return;
    fetch("/api/parent/connections", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(d => {
        const active = (d.asParent ?? []).filter((c: StudentConnection) => c.state === "active");
        setConnections(active);
        if (active.length === 1) setSelected(active[0].student_id);
      })
      .catch(() => {});
  }, [loading, user, session]);

  useEffect(() => {
    if (!selected || !session) return;
    setError("");
    setProjection(null);
    fetch(`/api/parent/report?studentId=${selected}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async r => {
        if (!r.ok) throw new Error("This connection is no longer active.");
        return r.json();
      })
      .then(d => setProjection(d.projection))
      .catch(e => setError(e.message));
  }, [selected, session]);

  if (loading) return <Shell><Mono>Loading…</Mono></Shell>;
  if (!user) return <Shell><p style={{ fontFamily: "Georgia,serif" }}>Sign in to view a student's shared progress.</p><a href="/auth" style={{ fontFamily: "monospace", fontSize: 12, color: "#b83c1a" }}>Sign in →</a></Shell>;
  if (connections.length === 0) return <Shell><Mono>No student has connected you yet.</Mono></Shell>;

  return (
    <Shell>
      {connections.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {connections.map(c => (
            <button
              key={c.connection_id}
              onClick={() => setSelected(c.student_id)}
              style={{
                fontFamily: "monospace", fontSize: 11, padding: "6px 12px",
                border: "1px solid #222", background: selected === c.student_id ? "#222" : "transparent",
                color: selected === c.student_id ? "#faf6ee" : "#222", cursor: "pointer",
              }}
            >
              Student {c.student_id.slice(0, 8)}
            </button>
          ))}
        </div>
      )}

      {error && <Mono>{error}</Mono>}

      {projection && (
        <div>
          {!projection.scoreTrajectory && !projection.dimensionBreakdown && !projection.subjectState &&
           !projection.progressFixing && !projection.consistency && !projection.upcomingExams && !projection.assessmentActivity && (
            <div style={{ border: "1px solid #222", padding: "16px 18px", marginBottom: 24 }}>
              <Mono>Nothing is shared with you yet. Ask the student to turn on categories in Settings → Sharing.</Mono>
            </div>
          )}

          {projection.dimensionBreakdown && (
            <Section title="Ledger Score">
              <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontWeight: 700, fontSize: 48, color: "#222" }}>
                {projection.dimensionBreakdown.total}<span style={{ fontSize: 16, color: "#888", fontWeight: 400 }}> / 1000</span>
              </div>
            </Section>
          )}

          {projection.scoreTrajectory && projection.scoreTrajectory.length > 0 && (
            <Section title="Trajectory">
              <Mono>{projection.scoreTrajectory.length} points over the trailing period · latest {projection.scoreTrajectory[0]?.total}</Mono>
            </Section>
          )}

          {projection.subjectState && (
            <Section title="Subjects">
              {projection.subjectState.map(s => (
                <Row key={s.subject}>
                  <span style={{ fontFamily: "Georgia,serif", fontSize: 14 }}>{s.subject}</span>
                  <Mono>{s.proven_count} proven · {s.studied_count} studied · {s.untouched_count} untouched</Mono>
                </Row>
              ))}
            </Section>
          )}

          {projection.progressFixing && (
            <Section title="Progress on what's being fixed">
              <Mono>{projection.progressFixing.being_worked_count} currently being worked on · {projection.progressFixing.resolved_this_period_count} closed this month</Mono>
            </Section>
          )}

          {projection.consistency && (
            <Section title="Consistency">
              <Mono>{projection.consistency.verified_sessions_count} verified sessions in the last 30 days</Mono>
            </Section>
          )}

          {projection.upcomingExams && projection.upcomingExams.length > 0 && (
            <Section title="Upcoming exams">
              {projection.upcomingExams
                .filter(e => daysUntil(e.date) >= 0)
                .sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
                .map((e, i) => (
                  <Row key={i}>
                    <span style={{ fontFamily: "Georgia,serif", fontSize: 14 }}>{e.name} · {e.subject}</span>
                    <Mono>{daysUntil(e.date)}d</Mono>
                  </Row>
                ))}
            </Section>
          )}

          {projection.assessmentActivity && (
            <Section title="Assessment activity">
              <Mono>{projection.assessmentActivity.assessments_completed_count} completed in the last 30 days</Mono>
            </Section>
          )}

          <div style={{ border: "1px solid #222", marginTop: 8, padding: "14px 18px" }}>
            <Mono>This report shows progress, not failures. Individual wrong answers and mistake history are private to the student, by design — not filtered here, never sent here.</Mono>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f0e8" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ borderBottom: "3px double #222", paddingBottom: 20, marginBottom: 32 }}>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#888", letterSpacing: "0.08em", marginBottom: 12 }}>
            STUDYLEDGER.IN · PARENT VIEW
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700, fontSize: 44, letterSpacing: "-0.02em", color: "#222" }}>
            The Ledger<span style={{ color: "#b83c1a" }}>.</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #222", marginBottom: 20 }}>
      <div style={{ padding: "10px 18px", background: "#f0ebe0", borderBottom: "1px solid #e0d8ce" }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#b83c1a", letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>{children}</div>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "monospace", fontSize: 11, color: "#888", lineHeight: 1.7 }}>{children}</div>;
}
