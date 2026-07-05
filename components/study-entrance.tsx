"use client";

import { useState, useEffect, useRef } from "react";

const PHRASES = [
  "The hours you put in today compound for years.",
  "One focused session changes everything.",
  "Your future self is watching.",
  "Every expert was once where you are.",
  "The work begins now.",
  "Make today the day you look back on.",
  "Focus is a skill. You're practising it.",
];

const EXIT_MS = 720;

export default function StudyEntrance() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [time, setTime]       = useState("");
  const [date, setDate]       = useState("");
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const today = new Date().toDateString();
    if (localStorage.getItem("ledger-entrance-date") === today) return;

    const now = new Date();
    setTime(
      now.toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit",
        hour12: false, timeZone: "Asia/Kolkata",
      })
    );
    setDate(
      now.toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long",
      })
    );
    localStorage.setItem("ledger-entrance-date", today);
    setVisible(true);

    timerRef.current = setTimeout(dismiss, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitRef.current)  clearTimeout(exitRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setExiting(true);
    exitRef.current = setTimeout(() => setVisible(false), EXIT_MS);
  }

  const phrase = PHRASES[new Date().getDay() % PHRASES.length];

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--ink)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", userSelect: "none",
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        transition: `transform ${EXIT_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`,
      }}
    >
      <style>{`
        @keyframes se-fade       { from { opacity: 0 } }
        @keyframes se-rise       { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes se-rise-sm    { from { opacity: 0; transform: translateY(8px) }  to { opacity: 1; transform: translateY(0) } }
        @keyframes se-line       { from { width: 0% } to { width: 100% } }
      `}</style>

      {/* Wordmark */}
      <div
        style={{
          position: "absolute", top: 28, left: 32,
          fontFamily: "var(--serif)", fontStyle: "normal",
          fontWeight: 700, fontSize: 15, letterSpacing: "0.12em",
          color: "var(--paper)", textTransform: "uppercase",
          opacity: 0.35,
          animation: "se-fade 0.5s ease 0.1s backwards",
        }}
      >
        Ledger
      </div>

      {/* Time */}
      <div
        style={{
          fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: "clamp(72px, 14vw, 130px)",
          color: "var(--paper)", fontWeight: 400,
          lineHeight: 1, letterSpacing: "-0.03em",
          marginBottom: 20,
          animation: "se-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        }}
      >
        {time}
      </div>

      {/* Cinnabar progress line */}
      <div style={{
        width: "min(360px, 80vw)", height: 1,
        background: "color-mix(in srgb, var(--paper) 12%, transparent)",
        marginBottom: 20, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", background: "var(--cinnabar-ink)",
          animation: "se-line 2.4s linear 0.3s backwards",
        }} />
      </div>

      {/* Date */}
      <div
        style={{
          fontFamily: "var(--mono)", fontSize: 10,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--paper)", marginBottom: 28,
          opacity: 0.45,
          animation: "se-fade 0.5s ease 0.4s backwards",
        }}
      >
        {date}
      </div>

      {/* Phrase */}
      <div
        style={{
          fontFamily: "var(--sans)", fontSize: 14,
          color: "var(--paper)", letterSpacing: "0.02em",
          maxWidth: 320, textAlign: "center", lineHeight: 1.5,
          opacity: 0.65,
          animation: "se-rise-sm 0.6s ease 0.8s backwards",
        }}
      >
        {phrase}
      </div>

      {/* Tap hint */}
      <div
        style={{
          position: "absolute", bottom: 28,
          fontFamily: "var(--mono)", fontSize: 8,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--paper)",
          opacity: 0.25,
          animation: "se-fade 0.4s ease 1.6s backwards",
        }}
      >
        Tap to begin
      </div>
    </div>
  );
}
