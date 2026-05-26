"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type TopicEntry = {
  id: string;
  name: string;
  subject: string;
  dateStudied: string; // ISO date string
  mastery: 1 | 2 | 3 | 4 | 5;
};

type TopicWithRetention = TopicEntry & {
  retention: number;      // 0-1
  daysAgo: number;
  reviewInDays: number;   // days until retention hits 0.6
  criticalInDays: number; // days until retention hits 0.35
  status: "fresh" | "review-soon" | "review-now" | "critical";
};

const STORAGE_KEY = "ledger-forgetting-log";

// Ebbinghaus half-life by mastery level (days)
const HALF_LIFE: Record<number, number> = { 1: 7, 2: 14, 3: 21, 4: 35, 5: 42 };

// Stability S from half-life: S = halfLife / ln(2)
function getRetention(mastery: number, daysAgo: number): number {
  const S = HALF_LIFE[mastery] / Math.LN2;
  return Math.exp(-daysAgo / S);
}

// Days from now until retention drops below threshold
function daysUntilThreshold(mastery: number, daysAgo: number, threshold: number): number {
  const S = HALF_LIFE[mastery] / Math.LN2;
  const t = -S * Math.log(threshold);
  return Math.max(0, Math.round(t - daysAgo));
}

function withRetention(entry: TopicEntry): TopicWithRetention {
  const daysAgo = Math.max(0, Math.round((Date.now() - new Date(entry.dateStudied).getTime()) / 86400000));
  const retention = getRetention(entry.mastery, daysAgo);
  const reviewInDays   = daysUntilThreshold(entry.mastery, daysAgo, 0.6);
  const criticalInDays = daysUntilThreshold(entry.mastery, daysAgo, 0.35);
  const status: TopicWithRetention["status"] =
    retention < 0.35 ? "critical" :
    retention < 0.6  ? "review-now" :
    reviewInDays <= 3 ? "review-soon" : "fresh";
  return { ...entry, retention, daysAgo, reviewInDays, criticalInDays, status };
}

const STATUS_COLOR: Record<string, string> = {
  fresh:        "#2d7a3c",
  "review-soon": "#4a8a3c",
  "review-now":  "#c97a1a",
  critical:     "#c44b2a",
};

const STATUS_LABEL: Record<string, string> = {
  fresh:        "Fresh",
  "review-soon": "Review soon",
  "review-now":  "Review now",
  critical:     "Critical",
};

const MASTERY_LABELS = ["", "Barely covered", "Vague memory", "Getting it", "Know it well", "Rock solid"];

export default function ForgettingForecastPage() {
  const [topics,    setTopics]    = useState<TopicEntry[]>([]);
  const [showForm,  setShowForm]  = useState(false);
  const [name,      setName]      = useState("");
  const [subject,   setSubject]   = useState("");
  const [date,      setDate]      = useState(() => new Date().toISOString().slice(0, 10));
  const [mastery,   setMastery]   = useState<1|2|3|4|5>(3);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTopics(JSON.parse(raw));
    } catch {}
  }, []);

  function save(updated: TopicEntry[]) {
    setTopics(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addTopic() {
    if (!name.trim()) return;
    const entry: TopicEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name.trim(), subject: subject.trim(), dateStudied: date, mastery,
    };
    save([...topics, entry]);
    setName(""); setSubject(""); setMastery(3); setDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  }

  function removeTopic(id: string) {
    save(topics.filter(t => t.id !== id));
  }

  const withRet = topics.map(withRetention).sort((a, b) => a.retention - b.retention);

  const critical   = withRet.filter(t => t.status === "critical");
  const reviewNow  = withRet.filter(t => t.status === "review-now");
  const reviewSoon = withRet.filter(t => t.status === "review-soon");
  const fresh      = withRet.filter(t => t.status === "fresh");

  const avgRetention = topics.length > 0
    ? Math.round((withRet.reduce((a, b) => a + b.retention, 0) / withRet.length) * 100)
    : null;

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Forgetting Forecast</div>
        {avgRetention !== null && (
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>
            {topics.length} topics · avg retention {avgRetention}%
          </div>
        )}
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        {topics.length === 0 && !showForm && (
          <>
            <div className="mono cin" style={{ marginBottom: 8 }}>The Ebbinghaus engine</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 8px" }}>
              Know exactly when you&apos;ll forget.
            </h2>
            <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 32px" }}>
              Based on Ebbinghaus forgetting curve science. Log a topic, rate your mastery, and Ledger tells you the exact day you need to review it before it fades. Never re-learn from scratch again.
            </p>
          </>
        )}

        {topics.length > 0 && (
          <>
            {/* Summary cards */}
            {(critical.length > 0 || reviewNow.length > 0) && (
              <div style={{ marginBottom: 32 }}>
                {critical.length > 0 && (
                  <div style={{ padding: "14px 18px", background: "#c44b2a12", border: "1px solid #c44b2a44", marginBottom: 8 }}>
                    <div className="mono" style={{ fontSize: 9, color: "#c44b2a", marginBottom: 6 }}>⚠ CRITICAL — OVER 65% FORGOTTEN</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {critical.map(t => (
                        <span key={t.id} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "#c44b2a", padding: "3px 10px", border: "1px solid #c44b2a44", background: "var(--paper)" }}>
                          {t.name} ({Math.round(t.retention * 100)}% left)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {reviewNow.length > 0 && (
                  <div style={{ padding: "14px 18px", background: "#c97a1a10", border: "1px solid #c97a1a44" }}>
                    <div className="mono" style={{ fontSize: 9, color: "#c97a1a", marginBottom: 6 }}>REVIEW NOW — APPROACHING 40% FORGOTTEN</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {reviewNow.map(t => (
                        <span key={t.id} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "#c97a1a", padding: "3px 10px", border: "1px solid #c97a1a44", background: "var(--paper)" }}>
                          {t.name} ({Math.round(t.retention * 100)}% left)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All topics */}
            {[
              { label: "Critical — study immediately", items: critical, color: "#c44b2a" },
              { label: "Review now", items: reviewNow, color: "#c97a1a" },
              { label: "Review soon (within 3 days)", items: reviewSoon, color: "#4a8a3c" },
              { label: "Fresh — you're good", items: fresh, color: "#2d7a3c" },
            ].filter(g => g.items.length > 0).map(group => (
              <div key={group.label} style={{ marginBottom: 28 }}>
                <div className="mono" style={{ fontSize: 9, color: group.color, marginBottom: 10 }}>{group.label.toUpperCase()}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {group.items.map((t, i) => (
                    <div key={t.id} style={{ border: "none", borderBottom: i < group.items.length - 1 ? "none" : "1px solid var(--ink)", padding: "14px 18px", display: "flex", gap: 16, alignItems: "center" }}>
                      {/* Retention bar */}
                      <div style={{ width: 48, flexShrink: 0, textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color: STATUS_COLOR[t.status] }}>{Math.round(t.retention * 100)}%</div>
                        <div style={{ height: 4, background: "var(--rule)", marginTop: 4, overflow: "hidden" }}>
                          <div style={{ width: `${Math.round(t.retention * 100)}%`, height: "100%", background: STATUS_COLOR[t.status] }} />
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.name}</div>
                        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>
                          {t.subject && `${t.subject} · `}Studied {t.daysAgo === 0 ? "today" : `${t.daysAgo}d ago`} · Mastery: {MASTERY_LABELS[t.mastery]}
                        </div>
                      </div>

                      {/* Next review */}
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        {t.status === "fresh" || t.status === "review-soon" ? (
                          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                            Review in {t.reviewInDays === 0 ? "today" : `${t.reviewInDays}d`}
                          </div>
                        ) : (
                          <div className="mono" style={{ fontSize: 10, color: STATUS_COLOR[t.status] }}>
                            {STATUS_LABEL[t.status]}
                          </div>
                        )}
                        <button onClick={() => removeTopic(t.id)}
                          style={{ fontFamily: "var(--mono)", fontSize: 9, background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: "4px 0", display: "block", marginLeft: "auto", marginTop: 4 }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Add topic form */}
        {showForm ? (
          <div style={{ border: "none", padding: "24px", marginBottom: 24 }}>
            <div className="mono cin" style={{ marginBottom: 16 }}>Log a topic</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="mob-col">
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic name</div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Integration by parts"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject (optional)</div>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Date studied</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ fontFamily: "var(--mono)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)" }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>How well do you know it? ({MASTERY_LABELS[mastery]})</div>
              <div style={{ display: "flex", gap: 6 }}>
                {([1, 2, 3, 4, 5] as const).map(m => (
                  <button key={m} onClick={() => setMastery(m)}
                    style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 11, border: `2px solid ${mastery === m ? "var(--ink)" : "var(--rule)"}`, background: mastery === m ? "var(--ink)" : "var(--paper)", color: mastery === m ? "var(--paper)" : "var(--ink-3)", cursor: "pointer" }}>
                    {m}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Barely covered</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Rock solid</span>
              </div>
              <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 2 }}>FORECAST</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>
                  At mastery {mastery}, you&apos;ll need to review in ~{Math.round(HALF_LIFE[mastery] * 0.514)} days. Critical in ~{Math.round(HALF_LIFE[mastery] * 1.321)} days.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn" onClick={addTopic} disabled={!name.trim()} style={{ flex: 1, opacity: !name.trim() ? 0.5 : 1 }}>
                Add to forecast →
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            style={{ width: "100%", padding: "14px", border: "1px dashed var(--rule)", background: "var(--paper)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em", marginBottom: 24 }}>
            + Log a topic you&apos;ve studied
          </button>
        )}

        {/* Science note */}
        {topics.length === 0 && !showForm && (
          <div style={{ padding: "16px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginTop: 8 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>HOW IT WORKS</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Uses the Ebbinghaus forgetting curve: R = e<sup>-t/S</sup> where stability S depends on how well you knew it. Mastery 1 (half-life: 7 days) → Mastery 5 (half-life: 42 days). We alert you when retention drops below 60%, and mark topics critical below 35%.
            </div>
          </div>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
