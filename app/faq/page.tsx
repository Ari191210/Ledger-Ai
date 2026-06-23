"use client";

import { useState } from "react";
import Link from "next/link";

type FAQ = { q: string; a: string };
type Section = { label: string; items: FAQ[] };

const SECTIONS: Section[] = [
  {
    label: "Getting Started",
    items: [
      {
        q: "What is StudyLedger?",
        a: "An AI-powered study platform for students preparing for board exams and entrance tests. Upload your syllabus, use 55+ AI study tools, and track your exam readiness with a live score that updates every session.",
      },
      {
        q: "Which boards and exams are supported?",
        a: "CBSE, ICSE, IB, IGCSE, A-Level, JEE (Mains + Advanced), NEET, SAT, and CUET. More boards are being added. Email hello@studyledger.in if yours is not listed.",
      },
      {
        q: "Is it really free?",
        a: "Yes. The Free tier is free forever — no credit card needed. You get 10 core tools and 20 AI requests per day. Pro (₹199/month) unlocks all 55+ tools and removes daily AI limits.",
      },
      {
        q: "Do I need to upload a syllabus to start?",
        a: "No. Most tools work immediately without one. Uploading a syllabus unlocks your full Ledger Score and enables personalised planning across all tools.",
      },
    ],
  },
  {
    label: "Tools & Features",
    items: [
      {
        q: "What is the Ledger Score?",
        a: "A 0–1000 exam readiness score built from four signals: past paper accuracy (40%), syllabus coverage (25%), how quickly you correct errors (20%), and daily consistency (15%). It updates every time you use any tool.",
      },
      {
        q: "Does this work for JEE Mains and Advanced?",
        a: "Yes. The Past Papers tool includes JEE papers, the Practice Suite generates JEE-calibrated questions, and the Admissions Engine covers IIT cutoffs. The Question Predictor works for JEE topics and chapters.",
      },
      {
        q: "Does it work on mobile?",
        a: "Yes. The web app is fully mobile-optimised. There is no native app yet — use it in your phone browser. Add it to your home screen for an app-like experience.",
      },
      {
        q: "Can I track multiple subjects at once?",
        a: "Yes. Your score, streak, and history work across all subjects simultaneously. The Syllabus Parser handles multi-subject PDFs in one upload.",
      },
    ],
  },
  {
    label: "Privacy & Account",
    items: [
      {
        q: "Is my study data safe?",
        a: "Yes. We do not sell your data to anyone. Study data is stored in Supabase (encrypted at rest). We never share it with third parties. See the Privacy Policy for full details.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Email hello@studyledger.in and we will delete your account and all associated data within 7 days.",
      },
      {
        q: "I am a teacher or school. Can my students use this?",
        a: "Yes. Email hello@studyledger.in for school pricing and bulk licences. A teacher admin dashboard is on the roadmap for Q4 2026.",
      },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FAQ; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: "1px solid var(--rule)" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: 16,
        }}
      >
        <span style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4 }}>
          {item.q}
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 16,
            color: "var(--ink-3)",
            flexShrink: 0,
            display: "inline-block",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▾
        </span>
      </button>
      {isOpen && (
        <div style={{ paddingBottom: 20 }}>
          <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.75, color: "var(--ink-2)", margin: 0 }}>
            {item.a}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => setOpenKey(prev => (prev === key ? null : key));

  return (
    <main id="main-content" style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid var(--rule)", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink)", textDecoration: "none" }}>
          LEDGER
        </Link>
        <Link href="/pricing" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>
          Pricing →
        </Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 40px 96px" }}>
        <Link
          href="/"
          style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none", display: "inline-block", marginBottom: 40 }}
        >
          ← Back to Ledger
        </Link>

        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 12 }}>
          Help
        </div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 800, letterSpacing: "0.03em", lineHeight: 1, marginBottom: 16 }}>FAQ</h1>
        <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 64, maxWidth: 480 }}>
          Answers to the most common questions. Can&apos;t find what you need? Email us.
        </p>

        {SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4, paddingBottom: 12, borderBottom: "1px solid var(--rule)" }}>
              {section.label}
            </div>
            {section.items.map((item, i) => {
              const key = `${section.label}-${i}`;
              return (
                <AccordionItem
                  key={key}
                  item={item}
                  isOpen={openKey === key}
                  onToggle={() => toggle(key)}
                />
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 64, padding: "32px 0", borderTop: "1px solid var(--rule)" }}>
          <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginBottom: 16 }}>
            Still have a question?{" "}
            <a href="mailto:hello@studyledger.in" style={{ color: "var(--cinnabar-ink)", textDecoration: "none" }}>
              Email us at hello@studyledger.in
            </a>{" "}
            · We reply within 24 hours.
          </p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Link href="/" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>
              Home
            </Link>
            <Link href="/pricing" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>
              Pricing
            </Link>
            <Link href="/legal/privacy" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
