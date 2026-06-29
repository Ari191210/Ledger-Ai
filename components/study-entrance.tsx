"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const PHRASES = [
  "The hours you put in today compound for years.",
  "One focused session changes everything.",
  "Your future self is watching.",
  "Every expert was once where you are.",
  "The work begins now.",
  "Make today the day you look back on.",
  "Focus is a skill. You're practising it.",
];

export default function StudyEntrance() {
  const [visible, setVisible] = useState(false);
  const [time, setTime]       = useState("");
  const [date, setDate]       = useState("");
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    timerRef.current = setTimeout(() => setVisible(false), 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const phrase = PHRASES[new Date().getDay() % PHRASES.length];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="entrance"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.72, ease: [0.76, 0, 0.24, 1] }}
          onClick={() => setVisible(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "var(--ink)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", userSelect: "none",
          }}
        >
          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              position: "absolute", top: 28, left: 32,
              fontFamily: "var(--serif)", fontStyle: "normal",
              fontWeight: 700, fontSize: 15, letterSpacing: "0.12em",
              color: "var(--paper)", textTransform: "uppercase",
            }}
          >
            Ledger
          </motion.div>

          {/* Time */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: "var(--serif)", fontStyle: "italic",
              fontSize: "clamp(72px, 14vw, 130px)",
              color: "var(--paper)", fontWeight: 400,
              lineHeight: 1, letterSpacing: "-0.03em",
              marginBottom: 20,
            }}
          >
            {time}
          </motion.div>

          {/* Cinnabar progress line */}
          <div style={{
            width: "min(360px, 80vw)", height: 1,
            background: "color-mix(in srgb, var(--paper) 12%, transparent)",
            marginBottom: 20, overflow: "hidden",
          }}>
            <motion.div
              style={{ height: "100%", background: "var(--cinnabar-ink)" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.4, delay: 0.3, ease: "linear" }}
            />
          </div>

          {/* Date */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{
              fontFamily: "var(--mono)", fontSize: 10,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "var(--paper)", marginBottom: 28,
            }}
          >
            {date}
          </motion.div>

          {/* Phrase */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.65, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            style={{
              fontFamily: "var(--sans)", fontSize: 14,
              color: "var(--paper)", letterSpacing: "0.02em",
              maxWidth: 320, textAlign: "center", lineHeight: 1.5,
            }}
          >
            {phrase}
          </motion.div>

          {/* Tap hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            transition={{ duration: 0.4, delay: 1.6 }}
            style={{
              position: "absolute", bottom: 28,
              fontFamily: "var(--mono)", fontSize: 8,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--paper)",
            }}
          >
            Tap to begin
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
