"use client";

// ═══════════════════════════════════════════════════════════════════════════
// /tools/mistake-dna — every figure on this page is real.
//
// Fetches `/api/mistakes/dna`, which queries `occurrences`/`patterns` for the
// signed-in student (RLS-scoped) and returns counts, percentages and lists
// computed from what's actually stored — nothing here is a placeholder
// number. An empty account sees honest zeros and empty states, not a demo
// dataset dressed up as theirs.
//
// Visual layout matches the reference mockup closely (metric-card row, radar
// breakdown, recent list, heatmap, top triggers, recovery pipeline) — the
// content underneath every element is real or explicitly absent, never
// invented to fill the shape.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

type DnaResponse = {
  ok: boolean;
  window_days: number;
  total_mistakes: number;
  total_mistakes_prev: number | null;
  repeated_mistakes: number;
  marks_lost_total: number;
  recovery_progress_pct: number | null;
  patterns_breakdown: Array<{ bucket: string; count: number; pct: number }>;
  recent: Array<{ subject: string; topic: string; chapter: string; createdAt: string; repeated: boolean }>;
  top_triggers: Array<{ label: string; count: number; pct: number }>;
  heatmap: Array<{ subject: string; weeks: Array<{ label: string; count: number }> }>;
  next_step: { label: string; subject: string; occurrences: number } | null;
};

type Tab = "overview" | "subject" | "topic" | "type" | "log";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "subject", label: "By Subject" },
  { id: "topic", label: "By Topic" },
  { id: "type", label: "By Type" },
  { id: "log", label: "Mistake Log" },
];

const TRIGGER_LABEL: Record<string, string> = {
  "misread-question": "Misreading the question",
  "arithmetic-slip": "Arithmetic slips",
  "sign-error": "Sign errors",
  "unit-error": "Unit errors",
  "ran-out-of-time": "Running out of time",
  "incomplete-answer": "Incomplete answers",
  "missed-working": "Missing working",
  "transcription": "Transcription errors",
  "presentation": "Presentation errors",
  "not-known": "Not knowing the material",
  "misconception": "Misconceptions",
  "wrong-method": "Wrong method chosen",
  "incomplete-understanding": "Incomplete understanding",
  "misapplied-rule": "Misapplied rules",
  "cannot-recall-formula": "Forgetting formulas",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StatCard({ label, value, sub, delta }: { label: string; value: string; sub: string; delta?: string }) {
  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "var(--ink)" }}>{value}</div>
      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>{sub}</div>
      {delta && <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>{delta}</div>}
    </div>
  );
}

export default function MistakeDnaPage() {
  const { session } = useAuth();
  const [data, setData] = useState<DnaResponse | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!session) return;
    let alive = true;
    fetch("/api/mistakes/dna", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setError("Could not load your mistake data."); });
    return () => { alive = false; };
  }, [session]);

  function exportReport() {
    if (!data) return;
    const lines = [
      "Mistake DNA report",
      `Window: last ${data.window_days} days`,
      `Total mistakes: ${data.total_mistakes}`,
      `Repeated mistakes: ${data.repeated_mistakes}`,
      `Marks lost: ${data.marks_lost_total}`,
      `Recovery progress: ${data.recovery_progress_pct ?? "n/a"}%`,
      "",
      "By type:",
      ...data.patterns_breakdown.map(b => `  ${b.bucket}: ${b.count} (${b.pct}%)`),
      "",
      "Recent mistakes:",
      ...data.recent.map(r => `  ${r.subject} · ${r.topic} · ${timeAgo(r.createdAt)}${r.repeated ? " · repeated" : ""}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mistake-dna-report.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <main className="mob-p" style={{ padding: "60px 44px", maxWidth: 600 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>{error}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mob-p" style={{ padding: "60px 44px" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Loading your mistake data…</div>
      </main>
    );
  }

  const empty = data.total_mistakes === 0;
  const prevDeltaPct = data.total_mistakes_prev && data.total_mistakes_prev > 0
    ? Math.round(((data.total_mistakes - data.total_mistakes_prev) / data.total_mistakes_prev) * 100)
    : null;

  return (
    <>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24, letterSpacing: "-0.015em" }}>Mistake DNA</div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 2 }}>Understand your mistakes. Break patterns. Build mastery.</div>
        </div>
        <button className="btn ghost" onClick={exportReport} disabled={empty}>Export Report</button>
      </header>

      <div style={{ padding: "0 44px", borderBottom: "1px solid var(--rule)", display: "flex", gap: 24 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="mono"
            style={{
              background: "none", border: "none", padding: "14px 0", cursor: "pointer",
              color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
              borderBottom: tab === t.id ? "2px solid var(--ink)" : "2px solid transparent",
              fontSize: 12,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="mob-p" style={{ padding: "32px 44px 80px", maxWidth: 1200, margin: "0 auto" }}>
        {empty ? (
          <div style={{ maxWidth: 560, padding: "40px 0" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", marginBottom: 12 }}>No mistakes logged yet.</div>
            <div className="mono" style={{ color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 24 }}>
              This page reads your real mistake record — nothing shows until you have confirmed mistakes from a session or assessment.
            </div>
            <Link href="/tools/exam-practice" className="btn">Go to Past Papers →</Link>
          </div>
        ) : tab === "overview" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard
                label="Total Mistakes"
                value={String(data.total_mistakes)}
                sub={`in last ${data.window_days} days`}
                delta={prevDeltaPct !== null ? `${prevDeltaPct >= 0 ? "↑" : "↓"} ${Math.abs(prevDeltaPct)}% vs previous ${data.window_days} days` : "no prior-window data"}
              />
              <StatCard
                label="Repeated Mistakes"
                value={String(data.repeated_mistakes)}
                sub={data.total_mistakes > 0 ? `${Math.round((data.repeated_mistakes / data.total_mistakes) * 100)}% of total mistakes` : "—"}
              />
              <StatCard
                label="Marks Lost"
                value={String(data.marks_lost_total)}
                sub="across logged mistakes"
              />
              <StatCard
                label="Recovery Progress"
                value={data.recovery_progress_pct !== null ? `${data.recovery_progress_pct}%` : "—"}
                sub={data.recovery_progress_pct !== null ? "of tracked patterns resolved" : "no patterns tracked yet"}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginBottom: 32 }}>
              <div style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Mistake Patterns</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12, marginBottom: 16 }}>Where and why mistakes are happening</div>
                <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ width: 280, height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={data.patterns_breakdown.map(b => ({ subject: b.bucket, value: b.pct }))}>
                        <PolarGrid stroke="var(--rule)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--ink-3)" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke="var(--ink)" fill="var(--ink)" fillOpacity={0.12} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.patterns_breakdown.map(b => (
                      <div key={b.bucket} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--ink)" }}>{b.bucket}</span>
                        <span className="mono" style={{ color: "var(--ink-3)" }}>{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Recent Mistakes</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12, marginBottom: 16 }}>Your latest mistakes across subjects</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.recent.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < data.recent.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{r.topic}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.subject} · {r.chapter}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {r.repeated && <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", border: "1px solid var(--cinnabar-ink)", borderRadius: 4, padding: "2px 6px" }}>Repeated</span>}
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{timeAgo(r.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
              <div style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Mistake Heatmap</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12, marginBottom: 16 }}>Subjects by week, real occurrence counts</div>
                {data.heatmap.length === 0 ? (
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>Not enough spread yet to show a heatmap.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: `100px repeat(${data.heatmap[0].weeks.length}, 1fr)`, gap: 4, alignItems: "center" }}>
                    <div />
                    {data.heatmap[0].weeks.map(w => <div key={w.label} className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "center" }}>{w.label}</div>)}
                    {data.heatmap.map(row => {
                      const max = Math.max(1, ...row.weeks.map(w => w.count));
                      return (
                        <>
                          <div key={row.subject} className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{row.subject}</div>
                          {row.weeks.map((w, i) => (
                            <div
                              key={i}
                              title={`${w.count} mistake${w.count === 1 ? "" : "s"}`}
                              style={{
                                height: 28, borderRadius: 4,
                                background: w.count === 0 ? "var(--paper-2)" : `color-mix(in srgb, var(--cinnabar-ink) ${Math.round((w.count / max) * 80) + 15}%, var(--paper-2))`,
                              }}
                            />
                          ))}
                        </>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Top Mistake Triggers</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12, marginBottom: 16 }}>What leads to your mistakes</div>
                {data.top_triggers.length === 0 ? (
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>No triggers logged yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {data.top_triggers.map((t, i) => (
                      <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 14 }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 13 }}>{TRIGGER_LABEL[t.label] ?? t.label}</span>
                        <div style={{ width: 80, height: 6, background: "var(--paper-2)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${t.pct}%`, height: "100%", background: "var(--ink)" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 32, textAlign: "right" }}>{t.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {data.next_step && (
              <div style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11, marginBottom: 6 }}>Your Next Step</div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{data.next_step.label}</div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>{data.next_step.subject} · seen {data.next_step.occurrences}×</div>
                </div>
                <Link href="/tools/exam-practice" className="btn">Start Revision →</Link>
              </div>
            )}
          </>
        ) : tab === "subject" ? (
          <SubjectView data={data} />
        ) : tab === "topic" ? (
          <TopicView data={data} />
        ) : tab === "type" ? (
          <TypeView data={data} />
        ) : (
          <LogView data={data} />
        )}
      </main>
    </>
  );
}

function SubjectView({ data }: { data: DnaResponse }) {
  const bySubject = new Map<string, number>();
  for (const r of data.recent) bySubject.set(r.subject, (bySubject.get(r.subject) ?? 0) + 1);
  const rows = [...bySubject.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.length === 0 && <div className="mono" style={{ color: "var(--ink-3)" }}>No subject data in this window.</div>}
      {rows.map(([subject, count], i) => (
        <div key={subject} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--rule)" : "none" }}>
          <span>{subject}</span>
          <span className="mono" style={{ color: "var(--ink-3)" }}>{count} mistake{count === 1 ? "" : "s"}</span>
        </div>
      ))}
    </div>
  );
}

function TopicView({ data }: { data: DnaResponse }) {
  const byTopic = new Map<string, { subject: string; count: number }>();
  for (const r of data.recent) {
    const existing = byTopic.get(r.topic);
    byTopic.set(r.topic, { subject: r.subject, count: (existing?.count ?? 0) + 1 });
  }
  const rows = [...byTopic.entries()].sort((a, b) => b[1].count - a[1].count);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.length === 0 && <div className="mono" style={{ color: "var(--ink-3)" }}>No topic data in this window.</div>}
      {rows.map(([topic, v], i) => (
        <div key={topic} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--rule)" : "none" }}>
          <div><div>{topic}</div><div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{v.subject}</div></div>
          <span className="mono" style={{ color: "var(--ink-3)" }}>{v.count}</span>
        </div>
      ))}
    </div>
  );
}

function TypeView({ data }: { data: DnaResponse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {data.patterns_breakdown.map((b, i) => (
        <div key={b.bucket} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: i < data.patterns_breakdown.length - 1 ? "1px solid var(--rule)" : "none" }}>
          <span>{b.bucket}</span>
          <span className="mono" style={{ color: "var(--ink-3)" }}>{b.count} · {b.pct}%</span>
        </div>
      ))}
    </div>
  );
}

function LogView({ data }: { data: DnaResponse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {data.recent.length === 0 && <div className="mono" style={{ color: "var(--ink-3)" }}>No mistakes logged in this window.</div>}
      {data.recent.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < data.recent.length - 1 ? "1px solid var(--rule)" : "none" }}>
          <div>
            <div>{r.topic}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.subject} · {r.chapter}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {r.repeated && <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", border: "1px solid var(--cinnabar-ink)", borderRadius: 4, padding: "2px 6px" }}>Repeated</span>}
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{timeAgo(r.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
