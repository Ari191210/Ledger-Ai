"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The tools dashboard.
//
// Forty-seven tools is a lot to put on one page, and the reason the previous
// product failed was that it presented all of them as an undifferentiated
// menu. Three things make this navigable instead:
//
//   1. Category is colour, borrowed from the OP-1 encoders. You learn "amber
//      is writing" once and then stop reading labels.
//   2. Search is instant and matches the registry's own keywords, so a
//      student who thinks "pomodoro" finds Focus Lab without knowing its name.
//   3. Recently used floats to the top, because the tools a given student
//      actually uses are a handful, not forty-seven.
//
// Every card tilts toward the cursor and lifts on hover. That is not
// decoration here: with a grid this dense, the motion is what tells you which
// card you are about to open.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TOOLS_REGISTRY, type ToolCategory, type ToolEntry } from "@/lib/tools-registry";
import { useTilt } from "@/lib/os/motion";
import { PageHead, Basis } from "@/components/journey/primitives";

/** Category → track colour. The four OP-1 hues, extended to six. */
const CAT_STYLE: Record<ToolCategory, { colour: string; label: string; note: string }> = {
  PLAN:     { colour: "var(--os-track-build)", label: "Plan",     note: "Deciding what to do, and when." },
  LEARN:    { colour: "var(--os-track-apply)", label: "Learn",    note: "Understanding something new." },
  WRITE:    { colour: "var(--os-track-test)",  label: "Write",    note: "Getting it onto the page." },
  PRACTISE: { colour: "var(--os-track-study)", label: "Practise", note: "Working under exam conditions." },
  FUTURE:   { colour: "#5B4B8A",               label: "Future",   note: "Beyond this year." },
  TRACK:    { colour: "#0E7490",               label: "Track",    note: "Watching the record move." },
};

const CATS = Object.keys(CAT_STYLE) as ToolCategory[];

const RECENT_KEY = "sl-recent-tools";

export default function ToolsDashboard() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ToolCategory | "ALL">("ALL");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch { /* first visit */ }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS_REGISTRY.filter(t => {
      if (cat !== "ALL" && t.cat !== cat) return false;
      if (!q) return true;
      // Keywords are what make "pomodoro" find Focus Lab. Searching titles
      // alone forces the student to already know the product's vocabulary.
      return (
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.slug.includes(q) ||
        (t.keywords ?? []).some(k => k.includes(q))
      );
    });
  }, [query, cat]);

  const recentTools = useMemo(
    () => recent
      .map(slug => TOOLS_REGISTRY.find(t => t.slug === slug))
      .filter((t): t is ToolEntry => Boolean(t))
      .slice(0, 4),
    [recent],
  );

  const showRecent = recentTools.length > 0 && !query && cat === "ALL";

  return (
    <div>
      <PageHead
        eyebrow={`${TOOLS_REGISTRY.length} tools`}
        title="Tools"
        sub="Everything that does a piece of work for you. Search by what you want to do rather than by name — “pomodoro”, “past paper”, “citation” all find the right desk."
      />

      {/* ── Search + filter ─────────────────────────────────────────── */}
      <div className="os-card" style={{ marginBottom: 22 }}>
        <input
          className="os-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="What do you need to do?"
          aria-label="Search tools"
          style={{ fontSize: 16 }}
        />
        <div className="os-row" style={{ gap: 6, marginTop: 12 }}>
          <button
            className="os-btn" data-size="sm"
            data-variant={cat === "ALL" ? "primary" : undefined}
            onClick={() => setCat("ALL")}
          >All</button>
          {CATS.map(c => (
            <button
              key={c}
              className="os-btn" data-size="sm"
              data-variant={cat === c ? "primary" : undefined}
              onClick={() => setCat(cat === c ? "ALL" : c)}
              style={cat === c ? undefined : { borderLeftColor: CAT_STYLE[c].colour, borderLeftWidth: 3 }}
            >{CAT_STYLE[c].label}</button>
          ))}
        </div>
        {cat !== "ALL" && <Basis>{CAT_STYLE[cat].note}</Basis>}
      </div>

      {/* ── Recently used ───────────────────────────────────────────── */}
      {showRecent && (
        <>
          <div className="os-section">Recently used</div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(232px,1fr))",
            gap: 14, marginBottom: 30,
          }}>
            {recentTools.map(t => <ToolCard key={`r-${t.slug}`} tool={t} />)}
          </div>
        </>
      )}

      {/* ── The grid ────────────────────────────────────────────────── */}
      <div className="os-section">
        {query || cat !== "ALL"
          ? `${filtered.length} ${filtered.length === 1 ? "tool" : "tools"}`
          : "All tools"}
      </div>

      {filtered.length === 0 ? (
        <div className="os-empty">
          <p className="os-empty-title">Nothing matches “{query}”</p>
          <p className="os-empty-body">
            Try what you want to do rather than a tool name — “revise”, “essay”, “timetable”.
          </p>
        </div>
      ) : (
        // Only the first row reveals on scroll. Forty-six independently
        // observed cards means the ones far down the page sit invisible until
        // they are individually scrolled past, which turns a dense grid into a
        // page that looks half-loaded. The grid is the content here; it should
        // be present, not performed.
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(232px,1fr))", gap: 14,
        }}>
          {filtered.map((t, i) => <ToolCard key={t.slug} tool={t} reveal={i < 8} index={i} />)}
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool, reveal = false, index = 0 }: {
  tool: ToolEntry; reveal?: boolean; index?: number;
}) {
  const { ref, tiltProps } = useTilt(7);
  const style = CAT_STYLE[tool.cat];

  function remember() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [tool.slug, ...list.filter(s => s !== tool.slug)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* private mode — the grid still works */ }
  }

  return (
    <div
      ref={ref}
      {...tiltProps}
      {...(reveal
        ? { "data-reveal": "", style: { "--i": index } as React.CSSProperties }
        : {})}
    >
      <Link
        href={`/tools/${tool.slug}`}
        onClick={remember}
        className="os-tilt-inner os-card"
        data-interactive="true"
        style={{
          display: "block", textDecoration: "none", position: "relative",
          overflow: "hidden", paddingLeft: 20, minHeight: 132,
        }}
      >
        {/* The category stripe — colour as identity, per the OP-1 idea. */}
        <span aria-hidden="true" style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: style.colour,
        }} />

        <div className="os-lift-1">
          <div style={{
            fontFamily: "var(--os-mono)", fontSize: 11, letterSpacing: "0.08em",
            textTransform: "uppercase", color: style.colour, marginBottom: 8,
          }}>{style.label}</div>

          <h3 style={{
            fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em",
            color: "var(--os-ink)", margin: "0 0 6px",
          }}>{tool.title}</h3>

          <p style={{
            fontSize: 13, lineHeight: 1.5, color: "var(--os-ink-3)", margin: 0,
          }}>{tool.subtitle}</p>
        </div>
      </Link>
    </div>
  );
}
