"use client";
import { useState, useEffect, useCallback } from "react";

type Event = { session_id: string; page: string; tool: string | null; created_at: string };
type Stats  = {
  activeNow: number; todayUsers: number; totalUsers: number; totalViews: number;
  topTools: { tool: string; count: number }[];
  recent: Event[];
  timestamp: string;
};

const TOOL_LABELS: Record<string, string> = {
  notes: "Notes", doubt: "Doubt Solver", career: "Career", assignment: "Assignment Rescue",
  tutor: "AI Tutor", crunch: "Crunch Mode", syllabus: "Syllabus Parser", formula: "Formula Sheet",
  admissions: "Admissions", flashcards: "Flashcards", "essay-grader": "Essay Grader",
  "personal-statement": "Personal Statement", interview: "Interview Prep", mindmap: "Mind Map",
  presentation: "Presentation", debate: "Debate Prep", "exam-sim": "Exam Simulator",
  vocab: "Vocab Builder", research: "Research", coach: "AI Study Coach",
  "mark-scheme": "Mark Scheme", "subject-picker": "Subject Picker",
  "essay-blueprint": "Essay Blueprint", "concept-web": "Concept Web",
  "exam-planner": "Exam Planner", "paper-dissector": "Paper Dissector",
  "lang-analyzer": "Language Analyzer", "lab-report": "Lab Report", "uni-match": "Uni Match",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey]     = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy]   = useState(false);

  async function attempt(k: string) {
    setBusy(true); setError("");
    const res = await fetch(`/api/admin/stats?key=${encodeURIComponent(k)}`);
    if (res.ok) { onAuth(k); } else { setError("Wrong key — access denied."); }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)" }}>
      <div style={{ width: 340 }}>
        <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.12em", marginBottom: 6 }}>LEDGER — ADMIN — RESTRICTED ACCESS</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 32, color: "#f0ebe0", fontStyle: "italic", marginBottom: 32, lineHeight: 1.2 }}>Command<br />Centre.</div>

        <div style={{ border: "1px solid #1a1a1a", padding: "28px 24px", background: "#0a0a0a" }}>
          <div style={{ fontSize: 9, color: "#444", marginBottom: 12, letterSpacing: "0.08em" }}>ADMIN KEY</div>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt(key)}
            autoFocus
            style={{ width: "100%", background: "#050505", border: "1px solid #222", color: "#f0ebe0", fontFamily: "var(--mono)", fontSize: 13, padding: "11px 14px", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
          />
          {error && <div style={{ fontSize: 9, color: "#c44b2a", marginBottom: 12, letterSpacing: "0.04em" }}>{error}</div>}
          <button
            onClick={() => attempt(key)}
            disabled={busy || !key}
            style={{ width: "100%", background: busy ? "#1a1a1a" : "#f0ebe0", color: "#050505", border: "none", fontFamily: "var(--mono)", fontSize: 10, padding: "12px", cursor: busy ? "not-allowed" : "pointer", letterSpacing: "0.08em", opacity: !key ? 0.4 : 1 }}
          >
            {busy ? "CHECKING…" : "ENTER →"}
          </button>
        </div>

        <div style={{ marginTop: 20, fontSize: 9, color: "#222" }}>Access is logged. Unauthorised attempts are recorded.</div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, note, accent }: { label: string; value: number | string; note: string; accent: string }) {
  return (
    <div style={{ border: "1px solid #111", background: "#080808", padding: "24px 22px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#3a3a3a", letterSpacing: "0.1em", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: accent }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#2a2a2a", marginTop: 8 }}>{note}</div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ adminKey, onLock }: { adminKey: string; onLock: () => void }) {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [lastMs, setLastMs] = useState(0);
  const [, setTick]         = useState(0);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/admin/stats?key=${encodeURIComponent(adminKey)}`);
    if (res.ok) { setStats(await res.json()); setLastMs(Date.now()); }
  }, [adminKey]);

  useEffect(() => { poll(); }, [poll]);
  useEffect(() => { const t = setInterval(poll, 10000); return () => clearInterval(t); }, [poll]);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(t); }, []);

  const secondsSince = lastMs ? Math.floor((Date.now() - lastMs) / 1000) : null;
  const isLive       = secondsSince !== null && secondsSince < 15;
  const maxTool      = stats?.topTools[0]?.count || 1;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#f0ebe0" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #111", padding: "18px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#333", letterSpacing: "0.1em" }}>LEDGER — ADMIN — COMMAND CENTRE</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", marginTop: 2 }}>Live Analytics</div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: isLive ? "#1e6b2e" : "#1a1a1a",
              boxShadow: isLive ? "0 0 8px #2d7a3c" : "none",
              transition: "all 0.5s"
            }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: isLive ? "#2d7a3c" : "#333" }}>
              {secondsSince === null ? "CONNECTING" : secondsSince < 5 ? "LIVE" : `${secondsSince}s AGO`}
            </span>
          </div>
          <button
            onClick={onLock}
            style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#444", background: "none", border: "1px solid #1a1a1a", padding: "5px 12px", cursor: "pointer", letterSpacing: "0.06em" }}
          >
            LOCK ↗
          </button>
        </div>
      </header>

      <main style={{ padding: "32px 40px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {!stats ? (
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#2a2a2a", paddingTop: 40 }}>Fetching data…</div>
        ) : (
          <>
            {/* Headline metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 1 }}>
              <StatCard label="ACTIVE NOW"    value={stats.activeNow}  note="sessions · last 5 min"  accent={stats.activeNow > 0 ? "#1e7c35" : "#1e1e1e"} />
              <StatCard label="TODAY'S USERS" value={stats.todayUsers} note="unique sessions · 24 hrs" accent="#b87419" />
              <StatCard label="ALL-TIME USERS" value={stats.totalUsers} note="unique sessions · ever"  accent="#f0ebe0" />
              <StatCard label="TOTAL VIEWS"   value={stats.totalViews} note="page events · all time"  accent="#0f4f7a" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 1, marginTop: 1 }}>
              {/* Tool usage bar chart */}
              <div style={{ border: "1px solid #111", background: "#080808", padding: "28px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#3a3a3a", letterSpacing: "0.1em" }}>TOOL USAGE · TODAY</div>
                  {stats.topTools.length > 0 && (
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#2a2a2a" }}>
                      {stats.topTools.reduce((s, t) => s + t.count, 0)} total uses
                    </div>
                  )}
                </div>

                {stats.topTools.length === 0 ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#1a1a1a" }}>No tool activity yet today.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {stats.topTools.map(({ tool, count }, i) => (
                      <div key={tool}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {i === 0 && <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#c55a2b", border: "1px solid #c55a2b", padding: "1px 5px" }}>TOP</span>}
                            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#888" }}>
                              {TOOL_LABELS[tool] || tool}
                            </span>
                          </div>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#f0ebe0" }}>{count}</span>
                        </div>
                        <div style={{ height: 2, background: "#111" }}>
                          <div style={{
                            height: "100%",
                            width: `${(count / maxTool) * 100}%`,
                            background: i === 0 ? "#c55a2b" : "#2a2a2a",
                            transition: "width 600ms ease"
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live feed */}
              <div style={{ border: "1px solid #111", background: "#080808", padding: "28px 24px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#3a3a3a", letterSpacing: "0.1em", marginBottom: 20 }}>LIVE FEED</div>

                {stats.recent.length === 0 ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#1a1a1a" }}>No events recorded yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {stats.recent.map((ev, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #0d0d0d" }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%", marginTop: 3, flexShrink: 0,
                          background: i === 0 ? "#1e7c35" : "#1a1a1a",
                          boxShadow: i === 0 ? "0 0 5px #1e7c35" : "none",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.tool ? (TOOL_LABELS[ev.tool] || ev.tool) : ev.page}
                          </div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", marginTop: 3 }}>
                            {ev.session_id.slice(0, 8)} · {timeAgo(ev.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 20, padding: "10px 0", borderTop: "1px solid #0d0d0d" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#222" }}>
                    Refreshes every 10s · Showing last 25 events
                  </div>
                </div>
              </div>
            </div>

            {/* Footer timestamp */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#1a1a1a" }}>
                Last fetched: {new Date(stats.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("ledger-admin-key");
    if (stored) setAdminKey(stored);
  }, []);

  function handleAuth(key: string) {
    sessionStorage.setItem("ledger-admin-key", key);
    setAdminKey(key);
  }

  function handleLock() {
    sessionStorage.removeItem("ledger-admin-key");
    setAdminKey(null);
  }

  if (!adminKey) return <LoginScreen onAuth={handleAuth} />;
  return <Dashboard adminKey={adminKey} onLock={handleLock} />;
}
