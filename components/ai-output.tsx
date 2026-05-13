"use client";

import React, { useState, useEffect } from "react";

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} style={{ fontWeight: 600, color: "var(--ink)" }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} style={{ fontFamily: "var(--mono)", fontSize: "0.88em", background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: 2 }}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const paras = text.split(/\n\n+/);
  return paras.map((para, pIdx) => {
    if (!para.trim()) return null;
    const lines = para.split("\n").filter(l => l.trim());
    if (!lines.length) return null;
    const first = lines[0].trim();

    if (first.startsWith("## ")) {
      return (
        <div key={pIdx} style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700, lineHeight: 1.35, margin: "20px 0 6px", color: "var(--ink)", letterSpacing: "-0.01em" }}>
          {renderInline(first.slice(3))}
        </div>
      );
    }

    if (first.startsWith("### ")) {
      return (
        <div key={pIdx} style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", margin: "18px 0 4px", color: "var(--cinnabar-ink)" }}>
          {first.slice(4)}
        </div>
      );
    }

    const isBulletList = lines.length > 0 && lines.every(l => /^[-•*] /.test(l.trim()));
    if (isBulletList) {
      return (
        <ul key={pIdx} style={{ paddingLeft: 0, margin: "6px 0 10px", listStyle: "none" }}>
          {lines.map((l, i) => (
            <li key={i} style={{ display: "flex", gap: 10, marginBottom: 5, fontFamily: "var(--sans)", fontSize: "var(--density-prose)", lineHeight: "var(--density-line)", color: "var(--ink-2)" }}>
              <span style={{ color: "var(--cinnabar-ink)", flexShrink: 0, userSelect: "none" }}>—</span>
              <span>{renderInline(l.trim().replace(/^[-•*] /, ""))}</span>
            </li>
          ))}
        </ul>
      );
    }

    const isNumberedList = lines.length > 0 && lines.every(l => /^\d+[.)]\s/.test(l.trim()));
    if (isNumberedList) {
      return (
        <ol key={pIdx} style={{ paddingLeft: 0, margin: "6px 0 10px", listStyle: "none" }}>
          {lines.map((l, i) => {
            const match = l.trim().match(/^\d+[.)]\s+(.*)/);
            return (
              <li key={i} style={{ display: "flex", gap: 12, marginBottom: 6, fontFamily: "var(--sans)", fontSize: "var(--density-prose)", lineHeight: "var(--density-line)", color: "var(--ink-2)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--cinnabar-ink)", flexShrink: 0, width: 20, paddingTop: 4 }}>
                  {String(i + 1).padStart(2, "0")}.
                </span>
                <span>{match ? renderInline(match[1]) : renderInline(l.trim().replace(/^\d+[.)]\s+/, ""))}</span>
              </li>
            );
          })}
        </ol>
      );
    }

    return (
      <p key={pIdx} style={{ margin: "0 0 10px", fontFamily: "var(--sans)", fontSize: "var(--density-prose)", lineHeight: "var(--density-line)", color: "var(--ink-2)" }}>
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {lIdx > 0 && <br />}
            {renderInline(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

interface AIOutputProps {
  text: string;
  variant?: "prose" | "principle";
  noBorder?: boolean;
  onRegenerate?: () => void;
}

export function AIOutput({ text, variant = "prose", noBorder = false, onRegenerate }: AIOutputProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!text) { setDisplayed(""); setDone(false); return; }
    setDisplayed("");
    setDone(false);
    let idx = 0;
    const charsPerTick = Math.max(12, Math.ceil(text.length / 60));
    const id = setInterval(() => {
      idx = Math.min(idx + charsPerTick, text.length);
      setDisplayed(text.slice(0, idx));
      if (idx >= text.length) { setDone(true); clearInterval(id); }
    }, 30);
    return () => clearInterval(id);
  }, [text]);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const cursor = !done ? (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 2,
        height: "0.88em",
        background: "var(--cinnabar-ink)",
        verticalAlign: "text-bottom",
        marginLeft: 1,
        animation: "ai-cursor-blink 0.7s step-end infinite",
      }}
    />
  ) : null;

  const toolbar = done ? (
    <div style={{ display: "flex", gap: 6, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--rule-2)" }}>
      <button
        onClick={handleCopy}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          padding: "5px 12px",
          border: `1px solid ${copied ? "var(--cinnabar-ink)" : "var(--rule)"}`,
          background: "transparent",
          color: copied ? "var(--cinnabar-ink)" : "var(--ink-3)",
          cursor: "pointer",
          transition: "color 160ms ease, border-color 160ms ease",
        }}
        onMouseDown={e => (e.currentTarget.style.transform = "scale(0.96)")}
        onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            padding: "5px 12px",
            border: "1px solid var(--rule)",
            background: "transparent",
            color: "var(--ink-3)",
            cursor: "pointer",
            transition: "color 160ms ease, border-color 160ms ease",
          }}
          onMouseOver={e => { e.currentTarget.style.color = "var(--ink)"; e.currentTarget.style.borderColor = "var(--ink-3)"; }}
          onMouseOut={e => { e.currentTarget.style.color = "var(--ink-3)"; e.currentTarget.style.borderColor = "var(--rule)"; }}
          onMouseDown={e => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          Try again ↺
        </button>
      )}
    </div>
  ) : null;

  const borderStyle: React.CSSProperties = noBorder ? {} : {
    borderLeft: "3px solid var(--cinnabar)",
    paddingLeft: 16,
  };

  if (variant === "principle") {
    return (
      <div style={borderStyle}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.6, fontStyle: "italic", color: "var(--ink-2)" }}>
          {displayed}{cursor}
        </div>
        {toolbar}
      </div>
    );
  }

  return (
    <div style={borderStyle}>
      {renderMarkdown(displayed)}
      {cursor}
      {toolbar}
    </div>
  );
}
