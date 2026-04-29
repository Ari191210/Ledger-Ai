"use client";
import { useState, useEffect, useCallback } from "react";

type Event = { session_id: string; page: string; tool: string | null; created_at: string };
type Stats = {
  activeNow: number; todayUsers: number; totalUsers: number; totalViews: number;
  totalAiToday: number;
  topTools: { tool: string; count: number }[];
  recent: Event[];
  timestamp: string;
  dataError?: string;
};

const TOOL_LABELS: Record<string, string> = {
  notes: "Notes Simplifier", doubt: "Doubt Solver", career: "Career Pathfinder",
  assignment: "Assignment Rescue", tutor: "Topic Tutor", crunch: "48-Hour Crunch",
  syllabus: "Syllabus Parser", formula: "Formula Sheet", admissions: "Admissions Engine",
  flashcards: "AI Flashcards", "essay-grader": "Essay Grader", "personal-statement": "Personal Statement",
  interview: "Interview Coach", mindmap: "Mind Map Builder", presentation: "Presentation Planner",
  debate: "Debate Coach", "exam-sim": "Exam Simulator", vocab: "Vocabulary Vault",
  research: "Research Assistant", coach: "AI Study Coach", "mark-scheme": "Mark Scheme",
  "subject-picker": "Subject Picker", "essay-blueprint": "Essay Blueprint", "concept-web": "Concept Web",
  "exam-planner": "Exam Planner", "paper-dissector": "Paper Dissector", "lang-analyzer": "Language Analyzer",
  "lab-report": "Lab Report", "uni-match": "University Match", marks: "Marks Predictor",
  focus: "Focus Dashboard", habits: "Habit Tracker", deadlines: "Deadline Hub",
  planner: "Study Planner", dna: "Mistake DNA", rooms: "Study Rooms", score: "Ledger Score",
  predict: "Question Predictor", "memory-palace": "Memory Palace", analogy: "Analogy Engine",
  "case-study": "Case Study Pro", timeline: "Timeline Builder", reading: "Reading Companion",
  grammar: "Grammar Coach", "study-guide": "Study Guide", "exam-strategy": "Exam Strategy",
  "concept-connect": "Concept Connect", "model-answer": "Model Answer Factory",
  argument: "Argument Builder", compare: "Topic Comparer", source: "Source Analyst",
  practice: "Practice Engine", citation: "Citation Generator",
};

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5)    return "just now";
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Login ───────────────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey]     = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy]   = useState(false);

  async function attempt(k: string) {
    if (!k.trim()) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/admin/stats?key=${encodeURIComponent(k)}`);
    if (res.ok) { onAuth(k); }
    else { setError("Wrong key."); }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)" }}>
      <div style={{ width: 360 }}>
        {/* Masthead */}
        <div style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 20, marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
            The Ledger · Command Centre · Restricted
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 44, fontStyle: "italic", fontWeight: 700, color: "#f0ebe0", lineHeight: 0.9, letterSpacing: "-0.02em" }}>
            The Press<br />Room.
          </div>
        </div>

        <div style={{ border: "1px solid #131313", background: "#080808" }}>
          <div style={{ borderBottom: "1px solid #131313", padding: "12px 20px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.12em" }}>ADMIN KEY</span>
          </div>
          <div style={{ padding: "20px" }}>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && attempt(key)}
              autoFocus
              placeholder="Enter key…"
              style={{ width: "100%", background: "#050505", border: "1px solid #1a1a1a", borderBottom: error ? "1px solid #8a2a1a" : "1px solid #1a1a1a", color: "#f0ebe0", fontFamily: "var(--mono)", fontSize: 13, padding: "12px 14px", boxSizing: "border-box", outline: "none", marginBottom: error ? 8 : 16, letterSpacing: "0.1em" }}
            />
            {error && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#c44b2a", letterSpacing: "0.06em", marginBottom: 16 }}>
                ✕ &nbsp;{error}
              </div>
            )}
            <button
              onClick={() => attempt(key)}
              disabled={busy || !key.trim()}
              style={{ width: "100%", background: busy ? "#111" : "#f0ebe0", color: "#050505", border: "none", fontFamily: "var(--mono)", fontSize: 9, padding: "13px", cursor: busy ? "not-allowed" : "pointer", letterSpacing: "0.12em", textTransform: "uppercase", opacity: !key.trim() ? 0.3 : 1, transition: "all 150ms" }}
            >
              {busy ? "Verifying…" : "Enter the press room →"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, fontFamily: "var(--mono)", fontSize: 8, color: "#1a1a1a", letterSpacing: "0.06em" }}>
          All access attempts are logged and timestamped.
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, accent, dim }: { label: string; value: string | number; sub: string; accent: string; dim?: boolean }) {
  return (
    <div style={{ borderRight: "1px solid #111", padding: "24px 28px", background: dim ? "#050505" : "#080808" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 700, fontStyle: "italic", lineHeight: 0.9, letterSpacing: "-0.03em", color: accent, transition: "color 400ms" }}>
        {typeof value === "number" ? fmt(value) : value}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#1e1e1e", marginTop: 8, letterSpacing: "0.06em" }}>{sub}</div>
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────────
function Dashboard({ adminKey, onLock }: { adminKey: string; onLock: () => void }) {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [fetchErr, setFetchErr] = useState("");
  const [lastMs,   setLastMs]   = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [, setTick] = useState(0);

  const poll = useCallback(async () => {
    setCountdown(10);
    try {
      const res = await fetch(`/api/admin/stats?key=${encodeURIComponent(adminKey)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastMs(Date.now());
        setFetchErr("");
      } else if (res.status === 401) {
        onLock();
      } else {
        setFetchErr("Server error — check Vercel logs.");
      }
    } catch {
      setFetchErr("Network error.");
    }
  }, [adminKey, onLock]);

  useEffect(() => { poll(); }, [poll]);

  // Countdown to next poll
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { poll(); return 10; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [poll]);

  // Re-render for timeAgo
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsSince = lastMs ? Math.floor((Date.now() - lastMs) / 1000) : null;
  const isLive = secondsSince !== null && secondsSince < 15;
  const maxTool = stats?.topTools[0]?.count || 1;
  const totalToolUses = stats?.topTools.reduce((s, t) => s + t.count, 0) || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#f0ebe0" }}>

      {/* ── Masthead ── */}
      <header style={{ borderBottom: "3px double #111", padding: "0 44px" }}>
        <div style={{ borderBottom: "1px solid #0d0d0d", padding: "10px 0", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.14em" }}>
            THE LEDGER · COMMAND CENTRE · ANALYTICS
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#1a1a1a", letterSpacing: "0.08em" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).toUpperCase()}
          </span>
        </div>

        <div style={{ padding: "20px 0 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontStyle: "italic", fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.03em", color: "#f0ebe0" }}>
              The Press Room.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20, paddingBottom: 4 }}>
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#1e7c35" : "#1a1a1a", boxShadow: isLive ? "0 0 8px #2d7a3c" : "none", transition: "all 600ms" }} />
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: isLive ? "#2d7a3c" : "#2a2a2a", letterSpacing: "0.1em" }}>
                  {secondsSince === null ? "CONNECTING" : isLive ? "LIVE" : `${secondsSince}s ago`}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#1a1a1a", letterSpacing: "0.08em", marginTop: 2 }}>
                  Next refresh in {countdown}s
                </div>
              </div>
            </div>

            <button onClick={poll} style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", background: "none", border: "1px solid #131313", padding: "5px 12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ↺ Refresh
            </button>

            <button onClick={onLock} style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", background: "none", border: "1px solid #1a1a1a", padding: "5px 12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Lock ↗
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: "0 44px 80px", maxWidth: 1400, margin: "0 auto" }}>
        {fetchErr && (
          <div style={{ margin: "20px 0", border: "1px solid #3a1a1a", background: "#0d0505", padding: "14px 18px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c44b2a", letterSpacing: "0.06em" }}>
              ✕ &nbsp;{fetchErr}
            </span>
          </div>
        )}

        {!stats ? (
          <div style={{ paddingTop: 60, fontFamily: "var(--mono)", fontSize: 9, color: "#1e1e1e", letterSpacing: "0.08em" }}>
            Collecting data…
          </div>
        ) : (
          <>
            {/* ── KPI strip ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", border: "1px solid #111", borderTop: "none", marginBottom: 1 }}>
              <KPI label="Active Now"     value={stats.activeNow}      sub="sessions · last 5 min"   accent={stats.activeNow > 0 ? "#2d9c42" : "#222"} />
              <KPI label="Today's Users"  value={stats.todayUsers}     sub="unique sessions · 24 hrs" accent={stats.todayUsers > 0 ? "#c58a2a" : "#222"} />
              <KPI label="All-time Users" value={stats.totalUsers}     sub="unique sessions · ever"   accent="#f0ebe0" />
              <KPI label="AI Calls Today" value={stats.totalAiToday ?? 0} sub="generations · 24 hrs"  accent={stats.totalAiToday > 0 ? "#6a7ac8" : "#222"} />
              <KPI label="Total Views"    value={stats.totalViews}     sub="page events recorded"     accent="#3a6a9a" dim />
            </div>

            {/* ── Body ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", border: "1px solid #111", borderTop: "none" }}>

              {/* Tool chart */}
              <div style={{ borderRight: "1px solid #111", padding: "28px 32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, borderBottom: "1px solid #0d0d0d", paddingBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.14em", textTransform: "uppercase" }}>Tool Usage</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "#f0ebe0", marginTop: 2, lineHeight: 1 }}>Today&apos;s most-used tools.</div>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#1e1e1e", textAlign: "right" }}>
                    <div>{totalToolUses.toLocaleString()} uses today</div>
                  </div>
                </div>

                {stats.topTools.length === 0 ? (
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#2a2a2a", marginBottom: 12 }}>No tool activity recorded yet.</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#1a1a1a", lineHeight: 1.7 }}>
                      This updates as students use tools. If you&apos;ve just launched, check back once users start sessions.<br />
                      If you have users but see no data, verify the page_events table has public read access in Supabase RLS settings.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {stats.topTools.map(({ tool, count }, i) => {
                      const pct = Math.round((count / maxTool) * 100);
                      return (
                        <div key={tool}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              {i === 0 && (
                                <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#c55a2b", border: "1px solid #c55a2b", padding: "1px 6px", letterSpacing: "0.1em" }}>TOP</span>
                              )}
                              <span style={{ fontFamily: "var(--serif)", fontSize: 14, color: i === 0 ? "#f0ebe0" : "#888" }}>
                                {TOOL_LABELS[tool] || tool}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                              <span style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 700, color: i === 0 ? "#f0ebe0" : "#3a3a3a" }}>{count}</span>
                              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#2a2a2a" }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ height: 3, background: "#0d0d0d" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? "#c55a2b" : i < 3 ? "#2a3a2a" : "#141414", transition: "width 700ms ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Live feed */}
              <div style={{ padding: "28px 24px" }}>
                <div style={{ borderBottom: "1px solid #0d0d0d", paddingBottom: 14, marginBottom: 18 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.14em", textTransform: "uppercase" }}>Live Dispatch</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "#f0ebe0", marginTop: 2, lineHeight: 1 }}>Recent sessions.</div>
                </div>

                {stats.recent.length === 0 ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#1a1a1a", lineHeight: 1.8 }}>
                    No events recorded yet.<br />Events appear here as pages are visited.
                  </div>
                ) : (
                  <div>
                    {stats.recent.map((ev, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #0a0a0a" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: i === 0 ? "#2d9c42" : "#1a1a1a", boxShadow: i === 0 ? "0 0 6px #2d9c42" : "none" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: i < 3 ? "#c8c3bc" : "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.tool ? (TOOL_LABELS[ev.tool] || ev.tool) : (ev.page === "/" ? "Landing" : ev.page.replace("/tools/", "").replace("/", ""))}
                          </div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#222", marginTop: 3, letterSpacing: "0.04em" }}>
                            {ev.session_id.slice(0, 8)} · {timeAgo(ev.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #0d0d0d" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#161616", letterSpacing: "0.06em", lineHeight: 1.8 }}>
                    Auto-refresh every 10s<br />
                    Showing last 25 events
                  </div>
                </div>
              </div>
            </div>

            {/* ── Second row: session trend placeholder + notes ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #111", borderTop: "none" }}>
              <div style={{ borderRight: "1px solid #111", padding: "22px 32px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.12em", marginBottom: 8 }}>RETENTION</div>
                <div style={{ display: "flex", gap: 32, alignItems: "flex-end" }}>
                  {stats.totalUsers > 0 && (
                    <>
                      <div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 700, color: "#f0ebe0", lineHeight: 1 }}>
                          {stats.totalUsers > 0 ? Math.round((stats.todayUsers / Math.max(stats.totalUsers, 1)) * 100) : 0}<span style={{ fontSize: 18 }}>%</span>
                        </div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#2a2a2a", marginTop: 6, letterSpacing: "0.08em" }}>Of all users seen today</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 700, color: stats.activeNow > 0 ? "#2d9c42" : "#222", lineHeight: 1 }}>
                          {stats.activeNow}
                        </div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#2a2a2a", marginTop: 6, letterSpacing: "0.08em" }}>In session right now</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 700, color: "#3a6a9a", lineHeight: 1 }}>
                          {stats.totalViews > 0 && stats.totalUsers > 0 ? (stats.totalViews / stats.totalUsers).toFixed(1) : "—"}
                        </div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#2a2a2a", marginTop: 6, letterSpacing: "0.08em" }}>Views per user (avg)</div>
                      </div>
                    </>
                  )}
                  {stats.totalUsers === 0 && (
                    <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#1a1a1a" }}>No user data yet.</div>
                  )}
                </div>
              </div>

              <div style={{ padding: "22px 32px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.12em", marginBottom: 8 }}>NOTES</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#1e1e1e", lineHeight: 1.9, letterSpacing: "0.04em" }}>
                  Active sessions = unique session IDs in last 5 min<br />
                  Today&apos;s users = unique sessions in last 24 hrs<br />
                  All-time users = unique sessions ever recorded<br />
                  Tool usage resets at midnight UTC
                </div>
              </div>
            </div>

            {/* Footer rule */}
            <div style={{ marginTop: 0, borderTop: "1px solid #0d0d0d", padding: "12px 0", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#161616", letterSpacing: "0.08em" }}>
                Last fetched: {new Date(stats.timestamp).toLocaleTimeString()} UTC
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#161616", letterSpacing: "0.08em" }}>
                Ledger Command Centre · For authorised use only
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────────
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
