"use client";

// ═══════════════════════════════════════════════════════════════════════════
// RECOMMENDED ACTION  (Phase 3B)
//
// One high-confidence next move. The "+N points" is REAL: lib/score-projection
// delta-simulates the action through the actual scoring engine (clone inputs →
// apply the event → recompute → diff), so it can never be a fabricated number.
// The one case without a projected delta (no syllabus yet) states the real
// structural cap instead of inventing a figure.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { computeLedgerScore } from "@/lib/ledger-score";
import {
  currentInputs,
  projectCoverageImpact,
  projectExamPracticeImpact,
  projectFocusImpact,
} from "@/lib/score-projection";

type Rec = { text: string; gain: number | null; cap?: number; href: string; cta: string };

const panel = { border: "1px solid var(--rule)", padding: "clamp(20px, 4vw, 30px)", marginBottom: 32 } as const;

export default function RecommendedAction() {
  const [rec, setRec] = useState<Rec | null>(null);

  useEffect(() => {
    try {
      const inputs = currentInputs();
      if (!inputs) return;
      const s = computeLedgerScore();

      const coveredSet = new Set(
        inputs.notesHistory.map((n) => (n.subject || "").toLowerCase().trim()).filter(Boolean),
      );
      const uncovered = inputs.syllabusSubjects.find((x) => !coveredSet.has(x.toLowerCase().trim()));

      let r: Rec;
      if (!s.syllabusUploaded) {
        r = { text: "Upload your syllabus", gain: null, cap: 250, href: "/tools/syllabus", cta: "Upload syllabus" };
      } else if (uncovered) {
        r = {
          text: `Cover “${uncovered}” with Notes`,
          gain: projectCoverageImpact(inputs, uncovered).delta,
          href: "/tools/learn-lab",
          cta: "Open Learn Lab",
        };
      } else if (s.papersCount < 5 || s.pqaAccuracy < 0.7) {
        const weak = s.subjectAccuracy[0]?.subject ?? "your weakest subject";
        r = {
          text: `Log a past-paper session in ${weak}`,
          gain: projectExamPracticeImpact(inputs, { subject: weak, questionCount: 10 }).delta,
          href: "/tools/exam-practice",
          cta: "Open Exam Practice",
        };
      } else {
        r = {
          text: "Complete a Focus session today",
          gain: projectFocusImpact(inputs, 1).delta,
          href: "/tools/focus-lab",
          cta: "Open Focus Lab",
        };
      }
      setRec(r);
    } catch {
      /* no inputs — render nothing rather than a fabricated recommendation */
    }
  }, []);

  if (!rec) return null;

  const impact =
    rec.gain !== null && rec.gain > 0
      ? `would add +${rec.gain} points to your Ledger Score`
      : rec.cap
        ? `unlocks up to ${rec.cap} points of your Ledger Score`
        : "keeps your Ledger Score moving";
  const note =
    rec.gain !== null && rec.gain > 0
      ? "Projected by simulating this action through the real scoring engine — not an estimate."
      : rec.cap
        ? `${rec.cap} points is the maximum the syllabus sector can contribute.`
        : "";

  return (
    <section style={panel} aria-labelledby="rec-head">
      <div id="rec-head" className="ed-kicker" style={{ marginBottom: 14 }}>Recommended Action</div>
      <div style={{ borderTop: "2px solid var(--ink)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <h3 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(20px, 3vw, 28px)", lineHeight: 1.1, letterSpacing: "-0.015em", margin: "0 0 8px", color: "var(--ink)" }}>
            {rec.text}
          </h3>
          <p className="ed-byline" style={{ margin: 0, fontStyle: "normal", fontSize: 14 }}>
            This {impact}.{note ? ` ${note}` : ""}
          </p>
        </div>
        <Link href={rec.href} className="btn" style={{ flexShrink: 0, textDecoration: "none" }}>
          {rec.cta} →
        </Link>
      </div>
    </section>
  );
}
