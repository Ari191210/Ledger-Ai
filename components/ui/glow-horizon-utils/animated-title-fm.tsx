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
        initial={{ opacity: 0, y: 16 }}
        animate={open ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE, delay: 1.4 }}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          marginBottom: 18,
        }}
      >
        Welcome to
      </motion.div>

      {/* Main title — character-by-character reveal */}
      <div style={{ overflow: "hidden", display: "flex", justifyContent: "center" }}>
        {TITLE.split("").map((char, i) => (
          <motion.span
            key={i}
            initial={{ y: "110%" }}
            animate={open ? { y: 0 } : {}}
            transition={{ duration: 0.75, ease: EASE, delay: 1.6 + i * 0.038 }}
            style={{
              display: "inline-block",
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(48px,8vw,100px)",
              color: "#ffffff",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={open ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE, delay: 2.3 }}
        style={{
          fontFamily: "var(--sans)",
          fontSize: "clamp(13px,1.4vw,16px)",
          color: "rgba(255,255,255,0.45)",
          marginTop: 20,
          letterSpacing: "0.02em",
          lineHeight: 1.6,
        }}
      >
        Built for the hours after coaching. The second shift.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={open ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE, delay: 2.6 }}
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
            color: "#050507",
            background: "#ffffff",
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
            color: "rgba(255,255,255,0.65)",
            padding: "12px 24px",
            border: "1px solid rgba(255,255,255,0.18)",
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
        transition={{ duration: 1, ease: EASE, delay: 3.0 }}
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
          fontFamily: "var(--sans)",
          fontSize: 12,
          color: "rgba(255,255,255,0.32)",
          letterSpacing: "0.01em",
        }}
      >
        <span><strong style={{ color: "rgba(255,255,255,0.55)" }}>3,204</strong> on the waitlist</span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>Free to start</span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>No card needed</span>
      </motion.div>
    </div>
  );
}
