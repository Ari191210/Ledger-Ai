"use client";
import { useState, useEffect, useCallback } from "react";

type PageEvent   = { session_id: string; page: string; tool: string | null; created_at: string };
type Query       = { user_id: string; tool: string; input_text: string | null; created_at: string };
type ErrorLog    = { id: string; type: string; route: string | null; message: string | null; created_at: string; user_id: string | null };
type Announcement = { id: string; message: string; style: string; active: boolean };
type Stats = {
  activeNow: number; todayUsers: number; totalUsers: number; totalViews: number;
  totalAiToday: number; totalAiAllTime: number; todaySignups: number;
  topTools: { tool: string; count: number }[];
  allTimeTools: { tool: string; count: number }[];
  recent: PageEvent[];
  recentQueries: Query[];
  recentErrors: ErrorLog[];
  registeredUsers: number;
  gradeDistribution: { grade: string; count: number }[];
  boardDistribution: { board: string; count: number }[];
  activeAnnouncement: Announcement | null;
  timestamp: string;
};
type UserProfile = {
  id: string; email: string; createdAt: string; lastSignIn: string | null;
  confirmed: boolean; grade: string | null; board: string | null; stream: string | null;
  onboarded: boolean | null; parentCode: string | null; focusStreak: number | null;
  weakTopics: string[] | null; totalAiCalls: number;
  topTools: { tool: string; count: number }[];
  recentQueries: { tool: string; input_text: string | null; created_at: string }[];
  lastAiCall: string | null; firstAiCall: string | null;
  userErrors: { type: string; route: string | null; message: string | null; created_at: string }[];
};

const TOOL_LABELS: Record<string, string> = {
  notes: "Study Engine", doubt: "Doubt Solver", crunch: "48-Hour Crunch",
  syllabus: "Syllabus Parser", formula: "Formula Sheet", admissions: "Admissions Engine",
  flashcards: "AI Flashcards", interview: "Interview Coach", mindmap: "Mind Map Builder",
  presentation: "Presentation Planner", debate: "Debate Coach", vocab: "Vocabulary Vault",
  research: "Research Hub", coach: "AI Study Coach", "mark-scheme": "Question Decoder",
  "essay-blueprint": "Essay Workshop", "exam-planner": "Revision Planner",
  "lang-analyzer": "Language Analyzer", "lab-report": "Lab Report", "uni-match": "Future Finder",
  marks: "Marks Predictor", focus: "Focus Dashboard", habits: "Habit Tracker",
  deadlines: "Deadline Hub", planner: "Study Planner", dna: "Mistake DNA",
  rooms: "Study Rooms", score: "Ledger Score", predict: "Question Predictor",
  "memory-palace": "Memory Palace", analogy: "Analogy Engine", "case-study": "Case Study Pro",
  timeline: "Timeline Builder", grammar: "Writing Polish", "study-guide": "Study Guide",
  "exam-strategy": "Exam Strategy", "concept-connect": "Concept Connect",
  "model-answer": "Model Answer Factory", compare: "Comparison Chart", source: "Text Analyst",
  practice: "Practice Suite", citation: "Citation Generator",
  cremator: "Syllabus Cremator", "formula-recall": "Formula Recall",
  "exam-debrief": "Exam Debrief", "circuit-breaker": "Circuit Breaker",
  "half-life": "Topic Half-Life", "gpa-sim": "GPA Simulator",
};

const ERROR_ICON: Record<string, string> = {
  js_error: "JS", unhandled_rejection: "PRO", blank_screen: "BLK", react_crash: "RCT",
};
const ERROR_COLOR: Record<string, string> = {
  js_error: "#c55a2b", unhandled_rejection: "#6a7ac8", blank_screen: "#c8a02a", react_crash: "#c55a2b",
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
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function attempt(k: string) {
    if (!k.trim()) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/admin/stats?key=${encodeURIComponent(k)}`);
    if (res.ok) { onAuth(k); } else { setError("Wrong key."); }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", position: "relative", zIndex: 10 }}>
      <div style={{ width: 360 }}>
        <div style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 20, marginBottom: 28 }}>
          <div style={{ fontSize: 8, color: "#666", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>studyledger.in · Command Centre · Restricted</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 44, fontStyle: "italic", fontWeight: 700, color: "#f0ebe0", lineHeight: 0.9, letterSpacing: "-0.02em" }}>The Press<br />Room.</div>
        </div>
        <div style={{ border: "1px solid #131313", background: "#080808" }}>
          <div style={{ borderBottom: "1px solid #131313", padding: "12px 20px" }}>
            <span style={{ fontSize: 8, color: "#666", letterSpacing: "0.12em" }}>ADMIN KEY</span>
          </div>
          <div style={{ padding: 20 }}>
            <input type="password" value={key} onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && attempt(key)} autoFocus placeholder="Enter key…"
              style={{ width: "100%", background: "#050505", border: "1px solid #1a1a1a", borderBottom: error ? "1px solid #8a2a1a" : "1px solid #1a1a1a", color: "#f0ebe0", fontFamily: "var(--mono)", fontSize: 13, padding: "12px 14px", boxSizing: "border-box", outline: "none", marginBottom: error ? 8 : 16, letterSpacing: "0.1em" }} />
            {error && <div style={{ fontSize: 8, color: "#c44b2a", letterSpacing: "0.06em", marginBottom: 16 }}>✕ &nbsp;{error}</div>}
            <button onClick={() => attempt(key)} disabled={busy || !key.trim()}
              style={{ width: "100%", background: busy ? "#111" : "#f0ebe0", color: "#050505", border: "none", fontFamily: "var(--mono)", fontSize: 9, padding: 13, cursor: busy ? "not-allowed" : "pointer", letterSpacing: "0.12em", textTransform: "uppercase", opacity: !key.trim() ? 0.3 : 1, transition: "all 150ms" }}>
              {busy ? "Verifying…" : "Enter the press room →"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 8, color: "#555", letterSpacing: "0.06em" }}>All access attempts are logged and timestamped.</div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, accent, dim }: { label: string; value: string | number; sub: string; accent: string; dim?: boolean }) {
  return (
    <div style={{ borderRight: "1px solid #111", padding: "24px 28px", background: dim ? "#050505" : "#080808" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#666", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 700, fontStyle: "italic", lineHeight: 0.9, letterSpacing: "-0.03em", color: accent, transition: "color 400ms" }}>
        {typeof value === "number" ? fmt(value) : value}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#555", marginTop: 8, letterSpacing: "0.06em" }}>{sub}</div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHead({ kicker, title, meta }: { kicker: string; title: string; meta?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, borderBottom: "1px solid #111", paddingBottom: 14 }}>
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#666", letterSpacing: "0.14em", textTransform: "uppercase" }}>{kicker}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "#f0ebe0", marginTop: 2, lineHeight: 1 }}>{title}</div>
      </div>
      {meta && <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555", textAlign: "right" }}>{meta}</div>}
    </div>
  );
}

// ── Bar Row ───────────────────────────────────────────────────────────────────
function BarRow({ label, count, max, accent }: { label: string; count: number; max: number; accent: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: "#c8c3bc" }}>{label}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", fontWeight: 700, color: "#f0ebe0" }}>{count}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 3, background: "#111" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: accent, transition: "width 700ms ease" }} />
      </div>
    </div>
  );
}

// ── User Profile Card ─────────────────────────────────────────────────────────
function UserCard({ user }: { user: UserProfile }) {
  return (
    <div style={{ border: "1px solid #1a1a1a", background: "#060606", marginTop: 16 }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #111", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: "#f0ebe0" }}>{user.email}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", marginTop: 4, letterSpacing: "0.06em" }}>{user.id}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: user.confirmed ? "#2d9c42" : "#c55a2b", letterSpacing: "0.1em" }}>
            {user.confirmed ? "✓ CONFIRMED" : "✕ UNCONFIRMED"}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555", marginTop: 3 }}>
            Joined {fmtDate(user.createdAt)}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderBottom: "1px solid #111" }}>
        {[
          { l: "Grade",        v: user.grade       ?? "—" },
          { l: "Board",        v: user.board       ?? "—" },
          { l: "Stream",       v: user.stream      ?? "—" },
          { l: "Focus Streak", v: user.focusStreak !== null ? `${user.focusStreak}d` : "—" },
          { l: "AI Calls",     v: fmt(user.totalAiCalls) },
        ].map(({ l, v }) => (
          <div key={l} style={{ padding: "12px 16px", borderRight: "1px solid #111" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555", letterSpacing: "0.1em", marginBottom: 4 }}>{l.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 700, color: "#f0ebe0" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Two columns: tools + meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* Top tools */}
        <div style={{ borderRight: "1px solid #111", padding: "16px 20px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", letterSpacing: "0.12em", marginBottom: 10 }}>TOP TOOLS</div>
          {user.topTools.length === 0 ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#444" }}>No AI calls yet.</div>
          ) : (
            user.topTools.slice(0, 5).map(({ tool, count }) => (
              <div key={tool} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #0d0d0d" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: "#888" }}>{TOOL_LABELS[tool] || tool}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c55a2b" }}>{count}×</span>
              </div>
            ))
          )}
        </div>

        {/* Meta */}
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", letterSpacing: "0.12em", marginBottom: 10 }}>META</div>
          {[
            { l: "Last sign-in",  v: user.lastSignIn ? timeAgo(user.lastSignIn) : "Never" },
            { l: "Last AI call",  v: user.lastAiCall  ? timeAgo(user.lastAiCall) : "Never" },
            { l: "First AI call", v: user.firstAiCall ? fmtDate(user.firstAiCall) : "Never" },
            { l: "Onboarded",     v: user.onboarded ? "Yes" : "No" },
            { l: "Parent code",   v: user.parentCode ?? "None" },
          ].map(({ l, v }) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #0d0d0d" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555", letterSpacing: "0.06em" }}>{l}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#888" }}>{v}</span>
            </div>
          ))}
          {(user.weakTopics?.length ?? 0) > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555", marginBottom: 4 }}>WEAK TOPICS</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 12, color: "#666", lineHeight: 1.6 }}>
                {user.weakTopics?.slice(0, 5).join(" · ")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent queries */}
      {user.recentQueries.length > 0 && (
        <div style={{ borderTop: "1px solid #111", padding: "12px 20px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", letterSpacing: "0.12em", marginBottom: 8 }}>RECENT QUERIES</div>
          {user.recentQueries.slice(0, 4).map((q, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px", gap: 12, padding: "6px 0", borderBottom: "1px solid #0d0d0d", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#c55a2b" }}>{TOOL_LABELS[q.tool] || q.tool}</span>
              <span style={{ fontFamily: "var(--serif)", fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.input_text || "—"}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#444" }}>{timeAgo(q.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* User errors */}
      {user.userErrors.length > 0 && (
        <div style={{ borderTop: "1px solid #111", padding: "12px 20px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#c55a2b", letterSpacing: "0.12em", marginBottom: 8 }}>ERRORS TRIGGERED</div>
          {user.userErrors.slice(0, 3).map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 120px 1fr 60px", gap: 10, padding: "5px 0", borderBottom: "1px solid #0d0d0d", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 6, color: ERROR_COLOR[e.type] || "#888", border: `1px solid ${ERROR_COLOR[e.type] || "#888"}`, padding: "1px 4px", letterSpacing: "0.06em" }}>{ERROR_ICON[e.type] || "??"}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.route || "—"}</span>
              <span style={{ fontFamily: "var(--serif)", fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message || "—"}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#444" }}>{timeAgo(e.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ adminKey, onLock }: { adminKey: string; onLock: () => void }) {
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [fetchErr,  setFetchErr]  = useState("");
  const [lastMs,    setLastMs]    = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [, setTick] = useState(0);

  // User lookup
  const [userEmail,   setUserEmail]   = useState("");
  const [userResult,  setUserResult]  = useState<UserProfile | null>(null);
  const [userErr,     setUserErr]     = useState("");
  const [userLoading, setUserLoading] = useState(false);

  // Broadcast
  const [broadcastMsg,   setBroadcastMsg]   = useState("");
  const [broadcastStyle, setBroadcastStyle] = useState<"banner" | "modal">("banner");
  const [broadcastBusy,  setBroadcastBusy]  = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState("");

  const poll = useCallback(async () => {
    setCountdown(10);
    try {
      const res = await fetch(`/api/admin/stats?key=${encodeURIComponent(adminKey)}`);
      if (res.ok) { setStats(await res.json()); setLastMs(Date.now()); setFetchErr(""); }
      else if (res.status === 401) { onLock(); }
      else { setFetchErr("Server error — check Vercel logs."); }
    } catch { setFetchErr("Network error."); }
  }, [adminKey, onLock]);

  useEffect(() => { poll(); }, [poll]);
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(n => { if (n <= 1) { poll(); return 10; } return n - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [poll]);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function lookupUser() {
    if (!userEmail.trim()) return;
    setUserLoading(true); setUserErr(""); setUserResult(null);
    const res = await fetch(`/api/admin/user?key=${encodeURIComponent(adminKey)}&email=${encodeURIComponent(userEmail.trim())}`);
    if (res.ok) { setUserResult(await res.json()); }
    else { const d = await res.json(); setUserErr(d.error || "Lookup failed."); }
    setUserLoading(false);
  }

  async function publishBroadcast() {
    if (!broadcastMsg.trim()) return;
    setBroadcastBusy(true); setBroadcastStatus("");
    const res = await fetch(`/api/admin/broadcast?key=${encodeURIComponent(adminKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: broadcastMsg, style: broadcastStyle, active: true }),
    });
    if (res.ok) { setBroadcastStatus("Published."); setBroadcastMsg(""); poll(); }
    else { setBroadcastStatus("Failed — check announcements table exists."); }
    setBroadcastBusy(false);
  }

  async function clearBroadcast() {
    setBroadcastBusy(true); setBroadcastStatus("");
    await fetch(`/api/admin/broadcast?key=${encodeURIComponent(adminKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    setBroadcastStatus("Cleared.");
    poll();
    setBroadcastBusy(false);
  }

  function exportSnapshot() {
    if (!stats) return;
    const lines = [
      `# Admin Snapshot · ${new Date(stats.timestamp).toLocaleString("en-GB")}`,
      ``,
      `## KPIs`,
      `- Active now: ${stats.activeNow}`,
      `- Today's users: ${stats.todayUsers}`,
      `- Today's sign-ups: ${stats.todaySignups}`,
      `- Registered users: ${stats.registeredUsers}`,
      `- AI calls today: ${stats.totalAiToday}`,
      `- AI calls all-time: ${stats.totalAiAllTime}`,
      ``,
      `## Today's Top Tools`,
      ...stats.topTools.map(({ tool, count }) => `- ${TOOL_LABELS[tool] || tool}: ${count}`),
      ``,
      `## All-time Tool Leaderboard`,
      ...stats.allTimeTools.map(({ tool, count }, i) => `${String(i + 1).padStart(2, "0")}. ${TOOL_LABELS[tool] || tool}: ${count}`),
      ``,
      `## Demographics`,
      `### Grade`, ...stats.gradeDistribution.map(({ grade, count }) => `- ${grade}: ${count}`),
      `### Board`, ...stats.boardDistribution.map(({ board, count }) => `- ${board}: ${count}`),
      ``,
      `*Exported from The Press Room · studyledger.in*`,
    ];
    const md   = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `ledger-snapshot-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  }

  const secondsSince = lastMs ? Math.floor((Date.now() - lastMs) / 1000) : null;
  const isLive       = secondsSince !== null && secondsSince < 15;
  const maxTool      = stats?.topTools[0]?.count || 1;
  const maxAllTime   = stats?.allTimeTools[0]?.count || 1;
  const maxGrade     = stats?.gradeDistribution[0]?.count || 1;
  const maxBoard     = stats?.boardDistribution[0]?.count || 1;

  const BTN: React.CSSProperties = { fontFamily: "var(--mono)", fontSize: 8, color: "#666", background: "none", border: "1px solid #333", padding: "5px 12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#f0ebe0", position: "relative", zIndex: 10 }}>

      {/* ── Masthead ── */}
      <header style={{ borderBottom: "3px double #111", padding: "0 44px" }}>
        <div style={{ borderBottom: "1px solid #111", padding: "10px 0", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#666", letterSpacing: "0.14em" }}>STUDYLEDGER.IN · COMMAND CENTRE · ANALYTICS</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#555", letterSpacing: "0.08em" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).toUpperCase()}
          </span>
        </div>
        <div style={{ padding: "20px 0 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontStyle: "italic", fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.03em", color: "#f0ebe0" }}>The Press Room.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#1e7c35" : "#333", boxShadow: isLive ? "0 0 8px #2d7a3c" : "none", transition: "all 600ms" }} />
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: isLive ? "#2d7a3c" : "#666", letterSpacing: "0.1em" }}>{secondsSince === null ? "CONNECTING" : isLive ? "LIVE" : `${secondsSince}s ago`}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555", letterSpacing: "0.08em", marginTop: 2 }}>Refresh in {countdown}s</div>
              </div>
            </div>
            <button onClick={poll} style={BTN}>↺ Refresh</button>
            <button onClick={exportSnapshot} disabled={!stats} style={{ ...BTN, color: stats ? "#c8a02a" : "#444", borderColor: stats ? "#5a4a1a" : "#222" }}>⌘ Export .md</button>
            <button onClick={onLock} style={BTN}>Lock ↗</button>
          </div>
        </div>
      </header>

      <main style={{ padding: "0 44px 80px", maxWidth: 1400, margin: "0 auto" }}>
        {fetchErr && (
          <div style={{ margin: "20px 0", border: "1px solid #3a1a1a", background: "#0d0505", padding: "14px 18px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c44b2a", letterSpacing: "0.06em" }}>✕ &nbsp;{fetchErr}</span>
          </div>
        )}

        {!stats ? (
          <div style={{ paddingTop: 60, fontFamily: "var(--mono)", fontSize: 9, color: "#555", letterSpacing: "0.08em" }}>Collecting data…</div>
        ) : (
          <>
            {/* ── KPI strip ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid #111", borderTop: "none", marginBottom: 1 }}>
              <KPI label="Active Now"       value={stats.activeNow}      sub="sessions · last 5 min"    accent={stats.activeNow > 0 ? "#2d9c42" : "#555"} />
              <KPI label="Today's Users"    value={stats.todayUsers}     sub="unique sessions · 24 hrs"  accent={stats.todayUsers > 0 ? "#c58a2a" : "#555"} />
              <KPI label="New Sign-ups"     value={stats.todaySignups}   sub="accounts today"            accent={stats.todaySignups > 0 ? "#c55a2b" : "#555"} />
              <KPI label="Registered"       value={stats.registeredUsers} sub="accounts total"           accent="#f0ebe0" />
              <KPI label="AI Calls Today"   value={stats.totalAiToday}   sub="generations · 24 hrs"      accent={stats.totalAiToday > 0 ? "#6a7ac8" : "#555"} />
              <KPI label="AI Calls Total"   value={stats.totalAiAllTime} sub="all-time generations"      accent="#3a6a9a" dim />
              <KPI label="Errors Today"     value={stats.recentErrors.length} sub="last 20 captured"    accent={stats.recentErrors.length > 0 ? "#c55a2b" : "#2d9c42"} dim />
            </div>

            {/* ── Active announcement banner ── */}
            {stats.activeAnnouncement && (
              <div style={{ border: "1px solid #3a2a1a", borderTop: "none", background: "#0d0805", padding: "12px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#c58a2a", border: "1px solid #5a3a1a", padding: "2px 8px", letterSpacing: "0.1em" }}>
                    {stats.activeAnnouncement.style.toUpperCase()} LIVE
                  </span>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: "#c8b080", fontStyle: "italic" }}>{stats.activeAnnouncement.message}</span>
                </div>
                <button onClick={clearBroadcast} style={{ ...BTN, fontSize: 7, color: "#c55a2b", borderColor: "#3a1a1a" }}>Clear →</button>
              </div>
            )}

            {/* ── Row 1: Today's tools + Live feed ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", border: "1px solid #111", borderTop: "none" }}>
              <div style={{ borderRight: "1px solid #111", padding: "28px 32px" }}>
                <SectionHead kicker="Tool Usage" title="Today's most-used tools." meta={`${stats.topTools.reduce((s, t) => s + t.count, 0)} uses today`} />
                {stats.topTools.length === 0 ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#555" }}>No tool activity yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {stats.topTools.map(({ tool, count }, i) => {
                      const pct = Math.round((count / maxTool) * 100);
                      return (
                        <div key={tool}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              {i === 0 && <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#c55a2b", border: "1px solid #c55a2b", padding: "1px 6px", letterSpacing: "0.1em" }}>TOP</span>}
                              <span style={{ fontFamily: "var(--serif)", fontSize: 14, color: i === 0 ? "#f0ebe0" : "#888" }}>{TOOL_LABELS[tool] || tool}</span>
                            </div>
                            <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                              <span style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 700, color: i === 0 ? "#f0ebe0" : "#666" }}>{count}</span>
                              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555" }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ height: 3, background: "#111" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? "#c55a2b" : i < 3 ? "#2a3a2a" : "#222", transition: "width 700ms ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ padding: "28px 24px" }}>
                <SectionHead kicker="Live Dispatch" title="Recent sessions." />
                {stats.recent.length === 0 ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#555", lineHeight: 1.8 }}>No events yet.</div>
                ) : (
                  <div>
                    {stats.recent.map((ev, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #111" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: i === 0 ? "#2d9c42" : "#2a2a2a", boxShadow: i === 0 ? "0 0 6px #2d9c42" : "none" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: i < 3 ? "#c8c3bc" : "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.tool ? (TOOL_LABELS[ev.tool] || ev.tool) : (ev.page === "/" ? "Landing" : ev.page.replace("/tools/", ""))}
                          </div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555", marginTop: 3 }}>{ev.session_id.slice(0, 8)} · {timeAgo(ev.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #111" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#444", letterSpacing: "0.06em", lineHeight: 1.8 }}>Auto-refresh every 10s<br />Showing last 25 events</div>
                </div>
              </div>
            </div>

            {/* ── Row 2: Error log ── */}
            <div style={{ border: "1px solid #111", borderTop: "none" }}>
              <div style={{ padding: "22px 32px", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#c55a2b", letterSpacing: "0.14em", textTransform: "uppercase" }}>Error Log</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "#f0ebe0", marginTop: 2, lineHeight: 1 }}>What broke and where.</div>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555" }}>Last 20 errors · live</div>
              </div>
              {stats.recentErrors.length === 0 ? (
                <div style={{ padding: "24px 32px", fontFamily: "var(--mono)", fontSize: 8, color: "#2d9c42" }}>✓ No errors captured. Site is clean.</div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "50px 80px 180px 1fr 100px", padding: "8px 32px", borderBottom: "1px solid #111", background: "#040404" }}>
                    {["", "Type", "Route", "Message", "When"].map((h, i) => (
                      <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {stats.recentErrors.map((e, i) => (
                    <div key={e.id} style={{ display: "grid", gridTemplateColumns: "50px 80px 180px 1fr 100px", padding: "10px 32px", borderBottom: "1px solid #111", background: i % 2 === 0 ? "#060606" : "#050505", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 6, color: ERROR_COLOR[e.type] || "#888", border: `1px solid ${ERROR_COLOR[e.type] || "#888"}`, padding: "1px 5px", letterSpacing: "0.08em", display: "inline-block" }}>
                        {ERROR_ICON[e.type] || "??"}
                      </span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: ERROR_COLOR[e.type] || "#888" }}>{e.type.replace("_", " ")}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.route || "—"}</span>
                      <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>{e.message || "—"}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555" }}>{timeAgo(e.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Row 3: All-time tools + Demographics ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #111", borderTop: "none" }}>
              <div style={{ borderRight: "1px solid #111", padding: "28px 32px" }}>
                <SectionHead kicker="All-time Tool Usage" title="Most used since launch." meta={`${stats.totalAiAllTime.toLocaleString()} total AI calls`} />
                {stats.allTimeTools.length === 0 ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#555" }}>No AI history yet.</div>
                ) : (
                  <div>
                    {stats.allTimeTools.slice(0, 12).map(({ tool, count }, i) => (
                      <div key={tool} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 12, padding: "10px 0", borderBottom: "1px solid #111", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: i < 3 ? "#c55a2b" : "#444" }}>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: i === 0 ? "#f0ebe0" : "#888" }}>{TOOL_LABELS[tool] || tool}</div>
                          <div style={{ height: 2, background: "#111", marginTop: 5 }}>
                            <div style={{ height: "100%", width: `${Math.round((count / maxAllTime) * 100)}%`, background: i === 0 ? "#c55a2b" : i < 3 ? "#2a3a5a" : "#1a2a1a", transition: "width 700ms ease" }} />
                          </div>
                        </div>
                        <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", fontWeight: 700, color: i === 0 ? "#f0ebe0" : "#555" }}>{fmt(count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: "28px 32px" }}>
                <SectionHead kicker="User Demographics" title="Who's studying." meta={`${stats.registeredUsers} registered`} />
                {stats.gradeDistribution.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", letterSpacing: "0.12em", marginBottom: 14, textTransform: "uppercase" }}>Grade</div>
                    {stats.gradeDistribution.map(({ grade, count }) => (
                      <BarRow key={grade} label={grade} count={count} max={maxGrade} accent="#c55a2b" />
                    ))}
                  </div>
                )}
                {stats.boardDistribution.length > 0 && (
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", letterSpacing: "0.12em", marginBottom: 14, textTransform: "uppercase" }}>Board</div>
                    {stats.boardDistribution.map(({ board, count }) => (
                      <BarRow key={board} label={board} count={count} max={maxBoard} accent="#2a3a5a" />
                    ))}
                  </div>
                )}
                {stats.gradeDistribution.length === 0 && stats.boardDistribution.length === 0 && (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#555" }}>Populates after users complete onboarding.</div>
                )}
              </div>
            </div>

            {/* ── Row 4: Recent Queries ── */}
            <div style={{ border: "1px solid #111", borderTop: "none" }}>
              <div style={{ padding: "22px 32px", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#666", letterSpacing: "0.14em", textTransform: "uppercase" }}>Recent Queries</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "#f0ebe0", marginTop: 2, lineHeight: 1 }}>What users are asking.</div>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555" }}>Last 50 AI calls</div>
              </div>
              {stats.recentQueries.length === 0 ? (
                <div style={{ padding: "24px 32px", fontFamily: "var(--mono)", fontSize: 8, color: "#555" }}>No queries yet.</div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "160px 160px 1fr 90px", padding: "8px 32px", borderBottom: "1px solid #111", background: "#040404" }}>
                    {["User", "Tool", "What they asked", "When"].map((h, i) => (
                      <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {stats.recentQueries.map((q, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 160px 1fr 90px", padding: "11px 32px", borderBottom: "1px solid #111", background: i % 2 === 0 ? "#060606" : "#050505" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.user_id.slice(0, 14)}…</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#c55a2b" }}>{TOOL_LABELS[q.tool] || q.tool}</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: q.input_text ? "#aaa" : "#555", fontStyle: q.input_text ? "normal" : "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>{q.input_text || "—"}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#555" }}>{timeAgo(q.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Row 5: User Lookup + Broadcast ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #111", borderTop: "none" }}>

              {/* User Lookup */}
              <div style={{ borderRight: "1px solid #111", padding: "28px 32px" }}>
                <SectionHead kicker="Intelligence" title="User lookup." />
                <div style={{ display: "flex", gap: 0 }}>
                  <input
                    type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && lookupUser()}
                    placeholder="student@email.com"
                    style={{ flex: 1, background: "#050505", border: "1px solid #1a1a1a", color: "#f0ebe0", fontFamily: "var(--mono)", fontSize: 11, padding: "10px 14px", outline: "none", letterSpacing: "0.04em" }}
                  />
                  <button onClick={lookupUser} disabled={userLoading || !userEmail.trim()}
                    style={{ background: userLoading ? "#111" : "#1a1a1a", color: "#888", border: "1px solid #1a1a1a", borderLeft: "none", fontFamily: "var(--mono)", fontSize: 8, padding: "0 18px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {userLoading ? "…" : "Look up →"}
                  </button>
                </div>
                {userErr && <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#c44b2a", marginTop: 10 }}>✕ {userErr}</div>}
                {userResult && <UserCard user={userResult} />}
              </div>

              {/* Broadcast */}
              <div style={{ padding: "28px 32px" }}>
                <SectionHead kicker="Broadcast" title="Push a message." />

                {stats.activeAnnouncement && (
                  <div style={{ border: "1px solid #3a2a1a", background: "#0a0805", padding: "12px 14px", marginBottom: 20 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#c58a2a", letterSpacing: "0.1em", marginBottom: 4 }}>ACTIVE · {stats.activeAnnouncement.style.toUpperCase()}</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "#c8b080", fontStyle: "italic" }}>{stats.activeAnnouncement.message}</div>
                  </div>
                )}

                <textarea
                  value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="Write a message for all users…"
                  rows={4}
                  style={{ width: "100%", background: "#050505", border: "1px solid #1a1a1a", color: "#f0ebe0", fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic", padding: "12px 14px", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6, marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#666", letterSpacing: "0.1em" }}>STYLE</div>
                  {(["banner", "modal"] as const).map(s => (
                    <button key={s} onClick={() => setBroadcastStyle(s)}
                      style={{ fontFamily: "var(--mono)", fontSize: 7, padding: "4px 12px", background: broadcastStyle === s ? "#1a1a1a" : "none", border: `1px solid ${broadcastStyle === s ? "#444" : "#222"}`, color: broadcastStyle === s ? "#f0ebe0" : "#555", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 150ms" }}>
                      {s === "banner" ? "Banner bar" : "Login modal"}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={publishBroadcast} disabled={broadcastBusy || !broadcastMsg.trim()}
                    style={{ flex: 1, background: broadcastMsg.trim() ? "#f0ebe0" : "#111", color: "#050505", border: "none", fontFamily: "var(--mono)", fontSize: 8, padding: "11px", cursor: broadcastMsg.trim() ? "pointer" : "not-allowed", letterSpacing: "0.1em", textTransform: "uppercase", opacity: !broadcastMsg.trim() ? 0.3 : 1, transition: "all 150ms" }}>
                    {broadcastBusy ? "Publishing…" : "Publish →"}
                  </button>
                  {stats.activeAnnouncement && (
                    <button onClick={clearBroadcast} disabled={broadcastBusy}
                      style={{ background: "none", border: "1px solid #3a1a1a", color: "#c55a2b", fontFamily: "var(--mono)", fontSize: 8, padding: "11px 16px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Clear
                    </button>
                  )}
                </div>
                {broadcastStatus && (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: broadcastStatus.includes("Failed") ? "#c55a2b" : "#2d9c42", marginTop: 10, letterSpacing: "0.06em" }}>
                    {broadcastStatus}
                  </div>
                )}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #111", fontFamily: "var(--mono)", fontSize: 7, color: "#444", lineHeight: 1.9 }}>
                  Banner: dismissible bar at top of dashboard.<br />
                  Modal: popup shown once on sign-in.<br />
                  One active announcement at a time.
                  <br /><br />
                  Requires <span style={{ color: "#666" }}>announcements</span> table in Supabase:<br />
                  <span style={{ color: "#444", wordBreak: "break-all" }}>create table public.announcements (id uuid default gen_random_uuid() primary key, message text not null, style text not null default &apos;banner&apos;, active boolean not null default false, created_at timestamptz default now());</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 0, borderTop: "1px solid #111", padding: "12px 0", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#444", letterSpacing: "0.08em" }}>Last fetched: {new Date(stats.timestamp).toLocaleTimeString()}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "#444", letterSpacing: "0.08em" }}>studyledger.in Command Centre · Authorised use only</span>
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
  function handleAuth(key: string) { sessionStorage.setItem("ledger-admin-key", key); setAdminKey(key); }
  function handleLock()            { sessionStorage.removeItem("ledger-admin-key");    setAdminKey(null); }
  if (!adminKey) return <LoginScreen onAuth={handleAuth} />;
  return <Dashboard adminKey={adminKey} onLock={handleLock} />;
}
