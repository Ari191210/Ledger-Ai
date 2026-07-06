"use client";

import { use, useEffect, useState } from "react";

type Exam = { name: string; subject: string; date: string; board: string };
type ParentData = {
  exams?: Exam[];
  marks?: { subjects: Array<{ name: string; score: number; weight: number }>; target: number };
  focus?: { streak: number; lastDate: string };
  weakTopics?: Record<string, number>;
  papersCount?: number;
  parentName?: string;
  score?: { total: number; tier: string; pqa: number; syllabus: number; mistakes: number; consistency: number };
};

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function ParentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [data, setData] = useState<ParentData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/parent/${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError("This link is invalid or has expired.");
        else setData(d);
      })
      .catch(() => setError("Could not load data. Try again."));
  }, [code]);

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#f5f0e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "monospace", color: "#888" }}>{error}</div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: "100vh", background: "#f5f0e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "monospace", color: "#888" }}>Loading…</div>
    </div>
  );

  const studentName = data.parentName || "Your student";
  const streak = data.focus?.streak || 0;
  const papersCount = data.papersCount || 0;
  const exams = (data.exams || []).filter(e => daysUntil(e.date) >= 0).sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  const nextExam = exams[0];
  const marks = data.marks?.subjects?.map(s => ({ name: s.name, score: s.score, target: data.marks!.target })) || [];
  const weakTopics = Object.entries(data.weakTopics || {}).sort(([, a], [, b]) => b - a).slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0e8", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ borderBottom: "3px double #222", paddingBottom: 20, marginBottom: 32 }}>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#888", letterSpacing: "0.08em", marginBottom: 12 }}>
            STUDYLEDGER.IN · PARENT VIEW · {today}
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700, fontSize: 48, letterSpacing: "-0.02em", lineHeight: 0.9, color: "#222" }}>
            The Ledger<span style={{ color: "#b83c1a" }}>.</span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#888", marginTop: 10, letterSpacing: "0.05em" }}>
            PROGRESS REPORT · {studentName.toUpperCase()}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: "1px solid #222", marginBottom: 32 }}>
          {[
            { label: "Study Streak", value: `${streak}d`, note: streak >= 7 ? "Excellent consistency" : streak >= 3 ? "Building momentum" : "Just getting started" },
            { label: "Papers Done", value: String(papersCount), note: papersCount >= 10 ? "Strong practice" : "Needs more practice" },
            { label: "Next Exam", value: nextExam ? `${daysUntil(nextExam.date)}d` : "—", note: nextExam ? nextExam.name : "No exams added" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "20px 16px", borderRight: i < 2 ? "1px solid #e0d8ce" : "none", textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 40, fontStyle: "italic", fontWeight: 700, color: i === 2 && nextExam && daysUntil(nextExam.date) <= 7 ? "#b83c1a" : "#222", lineHeight: 1, marginTop: 6 }}>{s.value}</div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: "#888", marginTop: 6 }}>{s.note}</div>
            </div>
          ))}
        </div>

        {/* Ledger Score */}
        {data.score && (
          <div style={{ border: "1px solid #222", marginBottom: 24 }}>
            <div style={{ padding: "12px 18px", background: "#f0ebe0", borderBottom: "1px solid #e0d8ce", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#b83c1a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Ledger Score</span>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>{data.score.tier}</span>
            </div>
            <div style={{ padding: "20px 18px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700, fontSize: 56, lineHeight: 1, color: "#222" }}>
                {data.score.total}
                <span style={{ fontSize: 18, color: "#888", fontWeight: 400 }}> / 1000</span>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                {[
                  { label: "Past-paper accuracy", value: data.score.pqa,         max: 400 },
                  { label: "Syllabus coverage",   value: data.score.syllabus,    max: 250 },
                  { label: "Mistake control",     value: data.score.mistakes,    max: 200 },
                  { label: "Consistency",         value: data.score.consistency, max: 150 },
                ].map(part => (
                  <div key={part.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 9, color: "#888", width: 130, letterSpacing: "0.04em", textTransform: "uppercase" }}>{part.label}</div>
                    <div style={{ flex: 1, height: 5, background: "#e0d8ce" }}>
                      <div style={{ width: `${(part.value / part.max) * 100}%`, height: "100%", background: "#222" }} />
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 9, color: "#222", width: 56, textAlign: "right" }}>{part.value}/{part.max}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "10px 18px", borderTop: "1px solid #e0d8ce", fontFamily: "monospace", fontSize: 9, color: "#888", letterSpacing: "0.04em" }}>
              A single 0–1000 measure of exam readiness: past-paper accuracy, syllabus coverage, mistake control, and daily consistency.
            </div>
          </div>
        )}

        {/* Exam countdown */}
        {exams.length > 0 && (
          <div style={{ border: "1px solid #222", marginBottom: 24 }}>
            <div style={{ padding: "12px 18px", background: "#f0ebe0", borderBottom: "1px solid #e0d8ce" }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#b83c1a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Upcoming Exams</span>
            </div>
            {exams.map((e, i) => {
              const d = daysUntil(e.date);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: i < exams.length - 1 ? "1px solid #e0d8ce" : "none" }}>
                  <div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#888", marginTop: 2 }}>{e.subject} · {e.board}</div>
                  </div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontStyle: "italic", fontWeight: 700, color: d <= 7 ? "#b83c1a" : "#222" }}>{d}d</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Marks */}
        {marks.length > 0 && (
          <div style={{ border: "1px solid #222", marginBottom: 24 }}>
            <div style={{ padding: "12px 18px", background: "#f0ebe0", borderBottom: "1px solid #e0d8ce" }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#b83c1a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Current Marks</span>
            </div>
            {marks.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: i < marks.length - 1 ? "1px solid #e0d8ce" : "none" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 14 }}>{m.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#888" }}>Target: {m.target}%</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontStyle: "italic", fontWeight: 700, color: m.score >= m.target ? "#1a7a3c" : "#b83c1a" }}>{m.score}%</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weak topics */}
        {weakTopics.length > 0 && (
          <div style={{ border: "1px solid #222", marginBottom: 32 }}>
            <div style={{ padding: "12px 18px", background: "#f0ebe0", borderBottom: "1px solid #e0d8ce" }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#b83c1a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Topics Needing Attention</span>
            </div>
            {weakTopics.map(([topic, count], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", borderBottom: i < weakTopics.length - 1 ? "1px solid #e0d8ce" : "none" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 14 }}>{topic}</div>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#b83c1a" }}>{count} wrong answer{count > 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#bbb", textAlign: "center", lineHeight: 1.8 }}>
          This report is automatically updated as {studentName} uses Ledger.<br />
          studyledger.in · © MMXXVI Ledger Study Co.
        </div>
      </div>
    </div>
  );
}
