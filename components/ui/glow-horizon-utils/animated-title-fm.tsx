"use client";

import { motion } from "framer-motion";

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

    </div>
  );
}
