"use client";

import { useEffect, useState } from "react";
import { computeLedgerScore } from "@/lib/ledger-score";
import {
  currentInputs,
  projectCoverageImpact,
  projectExamPracticeImpact,
  projectFocusImpact,
} from "@/lib/score-projection";
import NextMoveView, { type NextMoveViewProps } from "./next-move-view";

// ═══════════════════════════════════════════════════════════════════════════
// NEXT MOVE — CONTAINER (Component 3B)
//
// The live-guidance side of the dashboard model. Derives ONE sized next move
// from the student's live inputs and the real scoring engine, then hands clean
// strings to the pure view.
//
// Reuses the exact derivation that shipped in RecommendedAction: the same four
// priority branches, the same engine-backed projections (clone inputs → apply
// the move → recompute → diff), and the same honest cap fallback. No behaviour
// change — only the presentation is rebuilt to the constitutions, and the copy
// derivation moves here so the view stays pure.
//
// Frozen for the session (locked decision): computed once in useEffect([]), it
// never recomputes and never mutates under the cursor. A background sync cannot
// change the move a student is looking at.
//
// This is live guidance (v1 live score), not the official record — it explains
// what will improve the NEXT close and never overwrites Standing.
// ═══════════════════════════════════════════════════════════════════════════

type Rec = { text: string; gain: number | null; cap?: number; href: string; cta: string };

const CORE_ACTION = { cta: "Open Exam Practice", href: "/tools/exam-practice" };

// Unavailable: the rare case where live inputs cannot be read. Honest, no
// fabricated projection, and it still offers the safe-default core action
// (Interaction spec §5).
const UNAVAILABLE: NextMoveViewProps = {
  state: "ready",
  headline: "Your next move appears once your ledger has data.",
  gainDisplay: null,
  gainCaption: null,
  detail: "Log a past-paper session to get a projected, engine-backed recommendation.",
  cta: CORE_ACTION.cta,
  href: CORE_ACTION.href,
};

function deriveRec(): Rec | null {
  const inputs = currentInputs();
  if (!inputs) return null;
  const s = computeLedgerScore();

  const coveredSet = new Set(
    inputs.notesHistory.map((n) => (n.subject || "").toLowerCase().trim()).filter(Boolean),
  );
  const uncovered = inputs.syllabusSubjects.find((x) => !coveredSet.has(x.toLowerCase().trim()));

  if (!s.syllabusUploaded) {
    return { text: "Upload your syllabus", gain: null, cap: 250, href: "/tools/syllabus", cta: "Upload syllabus" };
  }
  if (uncovered) {
    return {
      text: `Cover “${uncovered}” with Notes`,
      gain: projectCoverageImpact(inputs, uncovered).delta,
      href: "/tools/learn-lab",
      cta: "Open Learn Lab",
    };
  }
  if (s.papersCount < 5 || s.pqaAccuracy < 0.7) {
    const weak = s.subjectAccuracy[0]?.subject ?? "your weakest subject";
    return {
      text: `Log a past-paper session in ${weak}`,
      gain: projectExamPracticeImpact(inputs, { subject: weak, questionCount: 10 }).delta,
      href: "/tools/exam-practice",
      cta: "Open Exam Practice",
    };
  }
  return {
    text: "Complete a Focus session today",
    gain: projectFocusImpact(inputs, 1).delta,
    href: "/tools/focus-lab",
    cta: "Open Focus Lab",
  };
}

function toViewProps(rec: Rec): NextMoveViewProps {
  let gainDisplay: string | null;
  let gainCaption: string | null;
  let detail: string;

  if (rec.gain !== null && rec.gain > 0) {
    gainDisplay = `+${rec.gain}`;
    gainCaption = "projected points";
    detail = "Projected by simulating this move through the real scoring engine — not an estimate.";
  } else if (rec.cap) {
    gainDisplay = `up to ${rec.cap}`;
    gainCaption = "points available";
    detail = `${rec.cap} points is the maximum the syllabus sector can contribute.`;
  } else {
    gainDisplay = null;
    gainCaption = null;
    detail = "This keeps your Ledger Score moving.";
  }

  return { state: "ready", headline: rec.text, gainDisplay, gainCaption, detail, cta: rec.cta, href: rec.href };
}

export default function NextMoveContainer() {
  const [props, setProps] = useState<NextMoveViewProps>({ state: "loading" });

  useEffect(() => {
    // Once, frozen for the session. Synchronous local computation, but resolved
    // in an effect so SSR and first client render agree (hydration-safe).
    try {
      const rec = deriveRec();
      setProps(rec ? toViewProps(rec) : UNAVAILABLE);
    } catch {
      setProps(UNAVAILABLE);
    }
  }, []);

  return <NextMoveView {...props} />;
}
