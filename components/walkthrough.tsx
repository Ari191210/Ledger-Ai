"use client";
import { useEffect, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// THE FIRST RUN — one pass over the product, then never again.
//
// `PRODUCT_DECISIONS` §2.6 as rewritten 2026-08-30 (reversal at §7.7):
// *"Then the dashboard, with a walkthrough. Not a marketing tour of features:
// a first-run pass over the surfaces the student will actually use, which ends
// and does not return."*
//
// ── WHY THIS IS NOT THE THING §2.6 USED TO BAN ───────────────────────────
// The previous §2.6 banned tours by name, and the reasoning was right: the
// edtech pattern where a product explains itself instead of being obvious.
// §7.7 narrows that ban rather than deleting it, so this component is built
// against a specific line: it may say WHERE things are and WHAT the student
// does next, and it may not sell, congratulate, or list features.
//
// The rules it holds itself to, each one checkable:
//   · Four steps. Not "a tour of everything" - the loop, and nothing else.
//   · It ENDS. Dismissed or completed, the flag is set and it never returns.
//   · Escapable at any point, by button, by Escape, by clicking away.
//   · No reward language. §4.3 bans milestone-gated unlocking and nothing
//     here may read as unlocking, earning or achieving.
//   · It never claims the student has DONE anything. It is a map, not a
//     scoreboard, and the product has no evidence about them yet.
//
// ── WHY LOCAL, AND NOT A COLUMN ──────────────────────────────────────────
// "Has this student seen the walkthrough" is a device preference, not academic
// truth, and the record is for academic truth. A student on a second device
// seeing it once more is a smaller cost than a column that implies the
// walkthrough is part of their record.
// ═══════════════════════════════════════════════════════════════════════════

const SEEN_KEY = "ledger-walkthrough-seen";

type Step = {
  /** The surface this step is about, in the student's words. */
  title: string;
  /** What it is FOR. One sentence, factual, no adjectives about quality. */
  body: string;
  /** The literal next action, phrased as a verb. */
  action?: string;
};

const STEPS: readonly Step[] = [
  {
    title: "This is Capture",
    body:
      "Photograph a marked paper, or paste what the marker wrote. It is stored " +
      "exactly as you upload it, and it is never shown to anyone else.",
    action: "Everything in your record starts here.",
  },
  {
    title: "Nothing is assumed",
    body:
      "What gets read off a paper is a proposal until you confirm it. If it " +
      "cannot be read confidently, nothing is written and you type it in yourself.",
    action: "You confirm what counts.",
  },
  {
    title: "Diagnosis is where it adds up",
    body:
      "Once there are a few papers, the same mistake appearing three times " +
      "stops being invisible. Every figure there is a sum of rows it can name.",
    action: "It fills as you capture.",
  },
  {
    title: "The record keeps itself",
    body:
      "Nothing in it is ever deleted, and a mistake closes only when you prove " +
      "it, not when you decide you understand it.",
    action: "Start with one paper.",
  },
];

export default function Walkthrough({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {
      return; // no storage means no way to remember it ended; do not start it
    }
    setOpen(true);
  }, [active]);

  const end = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
  }, []);

  // Escape closes it. A first-run pass a student cannot dismiss is a modal
  // they resent, and §7.7 permits a walkthrough, not a captor.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      if (e.key === "ArrowRight") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, end]);

  if (!open) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      className="wt-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wt-title"
      onClick={(e) => { if (e.target === e.currentTarget) end(); }}
    >
      <div className="wt-card">
        <div className="wt-head">
          <span className="wt-count">
            {step + 1} of {STEPS.length}
          </span>
          <button className="wt-skip" onClick={end}>Skip</button>
        </div>

        <h2 id="wt-title" className="wt-title">{s.title}</h2>
        <p className="wt-body">{s.body}</p>
        {s.action && <p className="wt-action">{s.action}</p>}

        <div className="wt-foot">
          <div className="wt-dots" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={`wt-dot ${i === step ? "wt-dot--on" : ""}`} />
            ))}
          </div>
          <div className="wt-controls">
            {step > 0 && (
              <button className="wt-back" onClick={() => setStep((v) => v - 1)}>Back</button>
            )}
            <button
              className="wt-next"
              onClick={() => (last ? end() : setStep((v) => v + 1))}
            >
              {last ? "Start" : "Next"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .wt-scrim {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: var(--s-4);
          background: color-mix(in oklab, var(--g-7) 28%, transparent);
        }
        @media (min-width: 720px) {
          .wt-scrim { align-items: center; }
        }
        .wt-card {
          width: 100%;
          max-width: 460px;
          background: var(--g-2);
          border: 1px solid var(--g-4);
          border-radius: var(--r-panel);
          padding: var(--s-4);
          /* Slide, not fade (§6.5). It arrives from below like a drawer. */
          animation: wt-in var(--m-base) var(--ease-settle) both;
        }
        @keyframes wt-in {
          from { transform: translateY(12px); }
          to   { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wt-card { animation: none; }
        }
        .wt-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--s-3);
        }
        .wt-count {
          font-family: var(--type-instrument);
          font-size: var(--t-micro);
          letter-spacing: 0.1em;
          color: var(--g-6);
          font-variant-numeric: tabular-nums;
        }
        .wt-skip {
          background: transparent !important;
          border: 0 !important;
          padding: 4px 0 !important;
          font-family: var(--type-instrument) !important;
          font-size: var(--t-micro) !important;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--g-6) !important;
          cursor: pointer;
        }
        .wt-title {
          font-family: var(--type-interface);
          font-weight: 500;
          font-size: var(--t-title);
          line-height: 1.2;
          color: var(--g-7);
          margin: 0 0 var(--s-2);
        }
        .wt-body {
          font-family: var(--type-interface);
          font-size: var(--t-body);
          line-height: 1.55;
          color: var(--g-6);
          margin: 0 0 var(--s-2);
        }
        .wt-action {
          font-family: var(--type-interface);
          font-size: var(--t-body);
          font-weight: 500;
          color: var(--g-7);
          margin: 0;
        }
        .wt-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--s-3);
          margin-top: var(--s-4);
        }
        .wt-dots { display: flex; gap: 6px; }
        .wt-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--g-4);
          transition: background var(--m-fast) var(--ease-out);
        }
        .wt-dot--on { background: var(--g-7); }
        .wt-controls { display: flex; gap: var(--s-2); }
        .wt-back, .wt-next {
          min-height: 40px;
          padding: 10px var(--s-4) !important;
          border-radius: var(--r-control);
          font-family: var(--type-instrument) !important;
          font-size: var(--t-label) !important;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .wt-back {
          border: 1px solid var(--g-4) !important;
          background: transparent !important;
          color: var(--g-6) !important;
        }
        .wt-next {
          border: 1px solid var(--g-7) !important;
          background: var(--g-7) !important;
          color: var(--g-0) !important;
        }
      `}</style>
    </div>
  );
}
