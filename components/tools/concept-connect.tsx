"use client";
// Concept Connect — the shared half of a tab that exists in two hosts (M2-5).
//
// `ConceptConnectTab` lives in `app/tools/learn-lab/page.tsx` and
// `app/tools/reference-builder/page.tsx`. PRODUCT_DECISIONS §1.5 lists it as
// duplicate functionality. The result body — concept pair, link cards, deep
// insight, cross-subject value, exam angles, exam tip — is identical in both
// and moves here whole, together with the `Connection` type.
//
// What does NOT move: learn-lab's copy takes two extra inputs (subject context
// and level) and sends them to the model, and the two hosts place the "New
// connection" action differently. That is a genuine feature difference, not
// drift, so each host keeps its own form and frame. M2 is a deduplication, not
// a redesign — neither host's rendered output changes.

import { AIOutput } from "@/components/ai-output";

export type Connection = {
  conceptA: string;
  conceptB: string;
  links: { type: string; description: string; example: string }[];
  deepInsight: string;
  crossSubjectValue: string;
  examAngles: string[];
  examTip: string;
};

export type ConnectionBodyProps = {
  result: Connection;
  /**
   * reference-builder spaces the exam-tip box off the "New connection" button
   * that follows it; learn-lab ends the panel there. Defaults to learn-lab.
   */
  examTipMarginBottom?: number;
};

/** The result panel, identical in both hosts before extraction. */
export function ConnectionBody({ result, examTipMarginBottom }: ConnectionBodyProps) {
  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ flex: 1, border: "none", padding: "14px 18px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{result.conceptA}</div>
        </div>
        <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 20, flexShrink: 0 }}>&#8596;</div>
        <div style={{ flex: 1, border: "none", padding: "14px 18px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{result.conceptB}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {result.links.map((l, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 6 }}>{l.type}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>{l.description}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", fontStyle: "italic" }}>e.g. {l.example}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "none", padding: "16px 20px", marginBottom: 12 }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Deep Insight</div>
        <AIOutput text={result.deepInsight} variant="principle" />
      </div>

      <div style={{ border: "1px solid var(--sage)", padding: "14px 16px", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--sage)", marginBottom: 8 }}>CROSS-SUBJECT VALUE</div>
        <AIOutput text={result.crossSubjectValue} />
      </div>

      <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>EXAM ANGLES THIS UNLOCKS</div>
        {result.examAngles.map((a, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>&middot; {a}</div>)}
      </div>

      <div style={{ border: "1px solid var(--ink-2)", padding: "14px 16px", background: "color-mix(in oklch, var(--ink-2) 4%, transparent)", marginBottom: examTipMarginBottom }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", marginBottom: 6 }}>EXAM TIP</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
      </div>
    </>
  );
}
