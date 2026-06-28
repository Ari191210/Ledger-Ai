"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { motion, AnimatePresence } from "motion/react";
import { useId, useState } from "react";

const FREE_FEATURES = [
  "Study Engine & Doubt Solver",
  "Past Papers — CBSE, JEE, NEET, SAT, IB",
  "AI Flashcards & Focus Dashboard",
  "Planner, Habit Tracker & Deadline Hub",
  "Formula Sheet & Resume Builder",
  "20 AI requests per day",
  "1 syllabus upload",
  "Ledger Score tracking",
];

const PRO_FEATURES = [
  "Everything in Free",
  "All 55+ tools unlocked",
  "Unlimited AI requests",
  "Unlimited syllabus uploads",
  "Score history & analytics",
  "Priority support",
  "Early access to new tools",
];

const SCHOOL_FEATURES = [
  "Everything in Pro",
  "Bulk student licences",
  "Teacher dashboard (Q4 2026)",
  "Per-student usage analytics",
  "Custom onboarding",
  "Dedicated support",
];

function PricingSwitch({ onSwitch }: { onSwitch: (yearly: boolean) => void }) {
  const [yearly, setYearly] = useState(false);
  const id = useId();

  const toggle = (val: boolean) => {
    setYearly(val);
    onSwitch(val);
  };

  return (
    <div style={{
      display: "inline-flex",
      background: "color-mix(in srgb, var(--ink) 5%, var(--paper))",
      border: "1px solid var(--rule)",
      borderRadius: 99, padding: 4, gap: 0,
    }}>
      {(["Monthly", "Yearly"] as const).map((label, i) => {
        const active = (i === 1) === yearly;
        return (
          <button
            key={label}
            onClick={() => toggle(i === 1)}
            style={{
              position: "relative", border: "none", cursor: "pointer",
              background: "transparent", padding: "8px 20px", borderRadius: 99,
              fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
              color: active ? "var(--paper)" : "var(--ink-3)",
              transition: "color 200ms", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {active && (
              <motion.span
                layoutId={id}
                style={{
                  position: "absolute", inset: 0, borderRadius: 99,
                  background: "var(--ink)", zIndex: 0,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
            {i === 1 && (
              <span style={{
                position: "relative", zIndex: 1,
                fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em",
                color: active ? "var(--paper)" : "var(--cinnabar-ink)",
                transition: "color 200ms",
              }}>
                –37%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FeatureRow({ text, dim }: { text: string; dim?: boolean }) {
  return (
    <li style={{
      fontFamily: "var(--sans)", fontSize: 13,
      color: dim ? "var(--ink-3)" : "var(--ink-2)",
      display: "flex", gap: 8, alignItems: "flex-start",
    }}>
      <span style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 1 }}>✓</span>
      {text}
    </li>
  );
}

function TierCard({
  label, badge, price, isNumeric, period, yearNote, desc,
  features, cta, ctaHref, highlighted, externalCta,
}: {
  label: string; badge?: string;
  price: number | string; isNumeric?: boolean;
  period: string; yearNote?: string;
  desc: string; features: string[];
  cta: string; ctaHref: string;
  highlighted: boolean; externalCta?: boolean;
}) {
  return (
    <div style={{
      border: highlighted ? "1px solid var(--cinnabar-ink)" : "1px solid var(--rule)",
      borderRadius: 4, padding: "32px 28px",
      background: highlighted ? "var(--paper-2)" : "transparent",
      position: "relative", display: "flex", flexDirection: "column",
    }}>
      {badge && (
        <div style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: "var(--cinnabar-ink)", color: "var(--paper)",
          fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.14em",
          textTransform: "uppercase", padding: "3px 10px", borderRadius: 2, whiteSpace: "nowrap",
        }}>
          {badge}
        </div>
      )}

      <div style={{
        fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: highlighted ? "var(--cinnabar-ink)" : "var(--ink-3)",
        marginBottom: 16,
      }}>
        {label}
      </div>

      <div style={{
        fontFamily: "var(--serif)", fontWeight: 800,
        letterSpacing: "0.01em", lineHeight: 1, marginBottom: 4,
        display: "flex", alignItems: "baseline", gap: 2,
      }}>
        {isNumeric ? (
          <span style={{ fontSize: 42 }}>
            ₹<NumberFlow value={price as number} />
          </span>
        ) : (
          <span style={{ fontSize: 42 }}>{price}</span>
        )}
      </div>

      <div style={{
        fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)",
        letterSpacing: "0.08em", marginBottom: yearNote ? 4 : 16,
      }}>
        {period}
      </div>

      {yearNote && (
        <AnimatePresence mode="wait">
          <motion.div
            key={yearNote}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            style={{
              fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)",
              letterSpacing: "0.08em", marginBottom: 16,
            }}
          >
            {yearNote}
          </motion.div>
        </AnimatePresence>
      )}

      <p style={{
        fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)",
        lineHeight: 1.6, marginBottom: 24,
      }}>
        {desc}
      </p>

      <ul style={{
        listStyle: "none", padding: 0, margin: "0 0 28px",
        display: "flex", flexDirection: "column", gap: 10, flexGrow: 1,
      }}>
        {features.map((f, i) => (
          <FeatureRow key={i} text={f} dim={i === 0 && f.startsWith("Everything")} />
        ))}
      </ul>

      {externalCta ? (
        <a
          href={ctaHref}
          style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
            textTransform: "uppercase", padding: "12px 20px",
            border: "1px solid var(--rule)", background: "transparent",
            color: "var(--ink)", textDecoration: "none",
            display: "block", textAlign: "center", borderRadius: 3,
          }}
        >
          {cta}
        </a>
      ) : (
        <Link
          href={ctaHref}
          style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
            textTransform: "uppercase", padding: "12px 20px",
            border: `1px solid ${highlighted ? "var(--cinnabar-ink)" : "var(--rule)"}`,
            background: highlighted ? "var(--cinnabar-ink)" : "transparent",
            color: highlighted ? "var(--paper)" : "var(--ink)",
            textDecoration: "none", display: "block", textAlign: "center", borderRadius: 3,
          }}
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

export function PricingCards() {
  const [yearly, setYearly] = useState(false);
  const proMonthly = 199;
  const proYearlyPerMonth = 125; // ₹1,499/yr

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <PricingSwitch onSwitch={setYearly} />
        <AnimatePresence>
          {yearly && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              style={{
                fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--ink-3)",
                marginTop: 10,
              }}
            >
              Billed as ₹1,499/year · 2 months free
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="pricing-grid" style={{ marginBottom: 24 }}>
        <TierCard
          label="Free"
          price="₹0"
          period="forever"
          desc="The essentials. No card required, no expiry."
          features={FREE_FEATURES}
          cta="Start free →"
          ctaHref="/auth"
          highlighted={false}
        />
        <TierCard
          label="Pro"
          badge="Most popular"
          price={yearly ? proYearlyPerMonth : proMonthly}
          isNumeric
          period={yearly ? "/month, billed yearly" : "/month"}
          yearNote={yearly ? "You save ₹889/year" : undefined}
          desc="Every tool, unlimited AI, priority access."
          features={PRO_FEATURES}
          cta="Get Pro →"
          ctaHref="/auth"
          highlighted
        />
        <TierCard
          label="School"
          price="Custom"
          period="per student"
          desc="For schools, tutors, and coaching centres."
          features={SCHOOL_FEATURES}
          cta="Contact us →"
          ctaHref="mailto:hello@studyledger.in"
          highlighted={false}
          externalCta
        />
      </div>
    </>
  );
}
