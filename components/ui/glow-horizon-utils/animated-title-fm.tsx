"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

const TITLE = "StudyLedger";

export function AnimatedTitleFM({ open }: { open: boolean }) {
  return (
    <div style={{ textAlign: "center", position: "relative", zIndex: 10, padding: "0 24px" }}>

      {/* "Welcome to" eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={open ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 18,
        }}
      >
        Welcome to
      </motion.div>

      {/* Main title — character-by-character pop-down reveal */}
      <div style={{ overflow: "hidden", display: "flex", justifyContent: "center" }}>
        {TITLE.split("").map((char, i) => (
          <motion.span
            key={i}
            initial={{ y: "-110%" }}
            animate={open ? { y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 + i * 0.032 }}
            style={{
              display: "inline-block",
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(64px,10vw,130px)",
              color: "var(--ink)",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Benefit subheadline */}
      <motion.p
        initial={{ opacity: 0, y: -12 }}
        animate={open ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE, delay: 0.65 }}
        style={{
          fontFamily: "var(--serif)",
          fontStyle: "italic",
          fontSize: "clamp(18px,2.2vw,28px)",
          color: "var(--ink-2)",
          marginTop: 18,
          letterSpacing: "-0.01em",
          lineHeight: 1.35,
          maxWidth: 620,
          margin: "18px auto 0",
        }}
      >
        Upload your syllabus. See exactly what to study next. Watch your exam readiness score update in real time.
      </motion.p>

      {/* Supporting tagline */}
      <motion.p
        initial={{ opacity: 0, y: -12 }}
        animate={open ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
        style={{
          fontFamily: "var(--mono)",
          fontSize: "clamp(10px,1.1vw,12px)",
          color: "var(--ink-3)",
          marginTop: 14,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          lineHeight: 1.6,
        }}
      >
        CBSE · ICSE · IB · JEE · NEET · A-Level · SAT
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={open ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE, delay: 1.0 }}
        style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            fontFamily: "var(--sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textDecoration: "none",
            color: "var(--paper)",
            background: "var(--ink)",
            padding: "12px 28px",
            borderRadius: 8,
            transition: "opacity 180ms",
          }}
        >
          Explore tools
        </Link>
        <Link
          href="/auth"
          style={{
            display: "inline-block",
            fontFamily: "var(--sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textDecoration: "none",
            color: "var(--ink-2)",
            padding: "12px 24px",
            border: "1px solid var(--rule)",
            borderRadius: 8,
            transition: "border-color 180ms, color 180ms",
          }}
        >
          Sign in
        </Link>
      </motion.div>

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={open ? { opacity: 1 } : {}}
        transition={{ duration: 1, ease: EASE, delay: 1.3 }}
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
          fontFamily: "var(--sans)",
          fontSize: 12,
          color: "var(--ink-3)",
          letterSpacing: "0.01em",
        }}
      >
        <span><strong style={{ color: "var(--ink-2)" }}>3,204</strong> on the waitlist</span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>Free to start</span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>No card needed</span>
      </motion.div>
    </div>
  );
}
