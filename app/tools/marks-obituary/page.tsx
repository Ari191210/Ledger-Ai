"use client";
import { useState } from "react";
import Link from "next/link";
import { callAIOrThrow, AIError } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";

const LS_KEY = "ledger:marks-obituary:v1";

type CoronerReport = {
  causeOfDeath:       string;
  timeOfDeath:        string;
  forensicSummary:    string;
  preventionProtocol: string[];
};

type ObitEntry = {
  id:        number;
  date:      string;
  subject:   string;
  expected:  number;
  actual:    number;
  obituary:  string;
  mistakes:  string[];
  coroner:   CoronerReport;
};

function loadHistory(): ObitEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function saveEntry(entry: ObitEntry) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([entry, ...loadHistory()].slice(0, 50)));
  } catch { /* ignore */ }
}

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

// ── Shared obituary card ───────────────────────────────────────────────────────

function ObitCard({ entry }: { entry: ObitEntry }) {
  const lost    = entry.expected - entry.actual;
  const dateStr = new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ maxWidth: 480, border: "1px solid var(--ink)", padding: "32px 36px", margin: "0 auto" }}>

      {/* Masthead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "3px double var(--ink)", paddingBottom: 14, marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--ink-3)" }}>
          Marks Obituary
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)" }}>{dateStr}</div>
      </div>

      {/* Headline */}
      <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500, lineHeight: 1.15, marginBottom: 6 }}>
        In loving memory of {lost} mark{lost !== 1 ? "s" : ""}.
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 24 }}>
        {entry.subject}
      </div>

      {/* Student's obituary */}
      <div style={{ fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.9, color: "var(--ink-2)", textAlign: "justify" as const, marginBottom: 28 }}>
        {entry.obituary}
      </div>

      <div style={{ borderTop: "1px solid var(--rule)", margin: "0 0 24px" }} />

      {/* Coroner's Report */}
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 18 }}>
        Coroner&apos;s Report
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.75, marginBottom: 6 }}>
        <span style={{ color: "var(--ink-3)" }}>cause of death — </span>{entry.coroner.causeOfDeath}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.75, marginBottom: 20 }}>
        <span style={{ color: "var(--ink-3)" }}>time of death — </span>{entry.coroner.timeOfDeath}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.8, marginBottom: 24, whiteSpace: "pre-line" as const }}>
        {entry.coroner.forensicSummary}
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 10 }}>
        Prevention Protocol
      </div>
      {entry.coroner.preventionProtocol.map((item, i) => (
        <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 4 }}>
          — {item}
        </div>
      ))}
    </div>
  );
}

// ── Header row ─────────────────────────────────────────────────────────────────

function Header({ historyCount, onHistoryClick, onBack }: { historyCount: number; onHistoryClick: () => void; onBack?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
      {onBack ? (
        <button onClick={onBack} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Back</button>
      ) : (
        <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
      )}
      <button onClick={onHistoryClick} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}>
        Archive {historyCount > 0 ? `(${historyCount})` : ""}→
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MarksObituaryPage() {
  const [view,       setView]       = useState<"compose" | "result" | "history">("compose");
  const [subject,    setSubject]    = useState("");
  const [expected,   setExpected]   = useState("");
  const [actual,     setActual]     = useState("");
  const [obituary,   setObituary]   = useState("");
  const [mistakes,   setMistakes]   = useState(["", "", ""]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<AIError | string | null>(null);
  const [result,     setResult]     = useState<ObitEntry | null>(null);
  const [filed,      setFiled]      = useState(false);
  const [history,    setHistory]    = useState<ObitEntry[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const wordCount = countWords(obituary);
  const wordOk    = wordCount >= 50 && wordCount <= 70;
  const lost      = (parseFloat(expected) || 0) - (parseFloat(actual) || 0);
  const canSubmit = subject.trim() && expected && actual && wordOk;

  function openHistory() { setHistory(loadHistory()); setView("history"); }

  async function generate() {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    try {
      const coroner = await callAIOrThrow<CoronerReport>({
        tool: "marks_obituary",
        subject: subject.trim(),
        expected: parseFloat(expected),
        actual:   parseFloat(actual),
        lost,
        obituaryText: obituary.trim(),
        mistakes: mistakes.filter(Boolean),
      });
      const entry: ObitEntry = {
        id: Date.now(), date: new Date().toISOString(),
        subject: subject.trim(),
        expected: parseFloat(expected), actual: parseFloat(actual),
        obituary: obituary.trim(), mistakes: mistakes.filter(Boolean), coroner,
      };
      setResult(entry); setFiled(false); setView("result");
    } catch (err) {
      setError(err as AIError);
    } finally {
      setLoading(false);
    }
  }

  function fileThis() { if (result) { saveEntry(result); setFiled(true); } }

  function burnIt() {
    setResult(null); setFiled(false);
    setSubject(""); setExpected(""); setActual(""); setObituary(""); setMistakes(["", "", ""]);
    setView("compose");
  }

  const historyCount = loadHistory().length;
  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: "100%", padding: "10px 12px", border: "1px solid var(--rule)",
    background: "var(--paper)", color: "var(--ink)", boxSizing: "border-box" as const,
    ...style,
  });

  // ── Result ──────────────────────────────────────────────────────────────────
  if (view === "result" && result) return (
    <div className="mob-p" style={{ minHeight: "100vh", padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
      <Header historyCount={historyCount} onHistoryClick={openHistory} onBack={burnIt} />
      <ObitCard entry={result} />
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
        {filed
          ? <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>Filed. †</span>
          : <button className="btn" onClick={fileThis}>File this.</button>
        }
        <button className="btn ghost" onClick={burnIt}>Burn it.</button>
      </div>
    </div>
  );

  // ── History ─────────────────────────────────────────────────────────────────
  if (view === "history") return (
    <div className="mob-p" style={{ minHeight: "100vh", padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
      <Header historyCount={historyCount} onHistoryClick={() => {}} onBack={() => setView("compose")} />
      {history.length === 0 ? (
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "var(--ink-3)", textAlign: "center" as const, marginTop: 80 }}>
          Nothing on file.
        </div>
      ) : history.map(entry => {
        const l       = entry.expected - entry.actual;
        const dateStr = new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
        const open    = expandedId === entry.id;
        return (
          <div key={entry.id} style={{ borderBottom: "1px solid var(--rule)" }}>
            <button
              onClick={() => setExpandedId(open ? null : entry.id)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" as const }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>†</span>
                <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic" }}>
                  {l} mark{l !== 1 ? "s" : ""} · {entry.subject}
                </span>
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", flexShrink: 0 }}>{dateStr}</span>
            </button>
            {open && <div style={{ paddingBottom: 32 }}><ObitCard entry={entry} /></div>}
          </div>
        );
      })}
    </div>
  );

  // ── Compose ─────────────────────────────────────────────────────────────────
  return (
    <div className="mob-p" style={{ minHeight: "100vh", padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
      <Header historyCount={historyCount} onHistoryClick={openHistory} />

      <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic", color: "var(--ink-3)", marginBottom: 36 }}>
        You only file this when something dies. Don&apos;t open this for a 92.
      </div>

      <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px, 5vw, 52px)", fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 40px" }}>
        Marks Obituary.
      </h1>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 22, maxWidth: 560 }}>

        {/* Subject */}
        <div>
          <div className="mono cin" style={{ marginBottom: 8 }}>Subject</div>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Mathematics — Unit Test 3"
            style={{ ...inp(), fontFamily: "var(--sans)", fontSize: 13 }} />
        </div>

        {/* Scores */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Expected", val: expected, set: setExpected, ph: "82" },
            { label: "Actual",   val: actual,   set: setActual,   ph: "64" },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <div className="mono cin" style={{ marginBottom: 8 }}>{label}</div>
              <input type="number" min={0} max={200} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                style={{ ...inp(), fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700 }} />
            </div>
          ))}
        </div>

        {/* Lost preview */}
        {lost > 0 && (
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink-3)", marginTop: -8 }}>
            In loving memory of {lost} mark{lost !== 1 ? "s" : ""}.
          </div>
        )}

        {/* Obituary */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div className="mono cin">Obituary</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: wordOk ? "var(--ink-2)" : wordCount > 0 ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>
              {wordCount} / 60{wordCount > 0 && !wordOk ? (wordCount < 50 ? " — write more" : " — too long") : ""}
            </div>
          </div>
          <textarea
            value={obituary} onChange={e => setObituary(e.target.value)} rows={8}
            placeholder="Write the obituary for these marks. 60 words. What did they represent? When did they slip away? What went wrong in the room?"
            style={{ ...inp({ fontFamily: "var(--serif)", fontSize: 14, lineHeight: "1.8", resize: "vertical" as const, border: `1px solid ${wordCount > 70 ? "var(--cinnabar-ink)" : "var(--rule)"}` }) }}
          />
        </div>

        {/* Mistakes */}
        <div>
          <div className="mono cin" style={{ marginBottom: 8 }}>The mistakes <span style={{ opacity: 0.5 }}>(optional)</span></div>
          {mistakes.map((m, i) => (
            <input key={i} value={m}
              onChange={e => setMistakes(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder={["e.g. signs error in Q14b", "e.g. forgot constant of integration", "e.g. misread 'at least' as 'exactly'"][i]}
              style={{ ...inp({ fontFamily: "var(--mono)", fontSize: 12, marginBottom: 8 }) }} />
          ))}
        </div>

        {error && <AIErrorDisplay error={error} onRetry={generate} />}
        {loading && <AIThinking />}

        <button className="btn" onClick={generate} disabled={loading || !canSubmit}
          style={{ opacity: loading || !canSubmit ? 0.4 : 1 }}>
          {loading ? "Filing…" : "File the report →"}
        </button>
      </div>
    </div>
  );
}
