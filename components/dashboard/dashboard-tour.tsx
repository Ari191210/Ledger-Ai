"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";
import { SUBJECTS } from "@/lib/subjects";
import type { ScoreInputs } from "@/lib/score/compute";
import { scoreAfterPaperToday } from "@/lib/score/first-result";
import { markTourSeenAction, logPyqAction } from "@/app/(app)/dashboard/actions";

/**
 * The first-run walkthrough of the dashboard.
 *
 * Anchored to the real page rather than to a mock of it, because a tour of a
 * drawing teaches the drawing. Each step names an element by `data-tour` and
 * the runner measures it live.
 *
 * Every section of the dashboard is introduced, but a step is only shown when
 * its anchor is actually on screen for this student: the coach briefing is not
 * rendered at all without two weeks of activity, and the icon rail and the
 * mobile tab bar are the same step in two places, only one of which exists at
 * any width. "3 of 14" counts the steps this student will really see.
 *
 * It ends on a tool, not on a "done" button. The dashboard is empty until a
 * student does something, so a tour that ends by closing leaves them looking at
 * blanks. On a first run the last step cannot be dismissed: skipping jumps
 * straight to it, and the only way out is to open a tool. A replay from the
 * header link can be left normally, because that student has already been
 * through it once.
 */

type Step = {
  /** Matches a `data-tour` attribute. */
  anchor: string;
  title: string;
  body: string;
  /** The first-result step, which asks for a real test instead of explaining. */
  form?: true;
};

/**
 * The first thing a student who has never logged a test is shown.
 *
 * The tour used to open by explaining a dashboard of zeros. Before any of that,
 * this asks for one real result and points at the score while it lands: past
 * papers are 40% of the score, so a first test visibly moves the ring from 0,
 * and the product demonstrates itself before a word of explanation.
 *
 * It is never mandatory and the fields start empty. Quick Log opens on 7 of 10
 * as a convenience, but a first-run student clicking through would record a
 * test they never sat, and a score built on an invented result is the one
 * thing this product cannot show. "Not yet" carries on to the tour.
 */
const FIRST_RESULT: Step = {
  anchor: "score",
  title: "Start with your last test",
  body: "Enter one past paper or test you have actually sat, and watch what a single real result does to your score.",
  form: true,
};

const STEPS: Step[] = [
  {
    anchor: "log",
    title: "Everything starts with a log",
    body:
      "Press log to record a focus session, a mistake, or a past paper you attempted. Every number on this page is built from what you log, so nothing here is guessed.",
  },
  {
    anchor: "chips",
    title: "Score and streak, on every page",
    body:
      "Your Ledger Score and your streak sit in the top bar wherever you are, so you never have to come back here just to check them.",
  },
  {
    anchor: "coach",
    title: "This week against last",
    body:
      "Coach compares the last seven days with the seven before, in one line. Open it for the full briefing.",
  },
  {
    anchor: "score",
    title: "Am I ready? Your Ledger Score",
    body:
      "One number out of 1000, from four parts: past papers 40%, syllabus coverage 25%, mistakes 20%, consistency 15%. Press the keys under it to see what would actually move it.",
  },
  {
    anchor: "deadlines",
    title: "What is coming",
    body: "Your next three deadlines, with the real number of days left on each. Add one and it appears here.",
  },
  {
    anchor: "spaced-review",
    title: "What is due",
    body:
      "Mistakes due for another look today. Reviewing them on schedule is how they stop coming back.",
  },
  {
    anchor: "fix-next",
    title: "What to do next",
    body:
      "The topics costing you the most marks, worst first. When you do not know what to revise, start at the top of this list.",
  },
  {
    anchor: "evidence",
    title: "The evidence behind the number",
    body:
      "Study days, focus history, syllabus coverage, your best hours and the ledger tape live on the Score page, under the number they explain.",
  },
];

/**
 * The last step, and one action rather than a menu.
 *
 * It used to offer three tools, which put a decision in front of a student at
 * the exact moment they should have been carried forward. Doubt Solver is the
 * one tool that is useful on an empty account and also feeds the rest of the
 * product: it answers a real question with no data, and the topic can be saved
 * as a mistake, which is what fills Fix next, Spaced review and Mistake DNA on
 * the next visit. Mistake DNA and Spaced Review open on empty states for a new
 * account, and Focus and Flashcards leave nothing behind on the dashboard.
 *
 * Anchored to the navigation, because that is where every other tool lives.
 */
const FINAL: Step = {
  anchor: "nav",
  title: "Now ask your first doubt",
  body:
    "Paste a question you are stuck on and Doubt Solver will explain it. Save the topic as a mistake and it shows up in Fix next and Spaced review tomorrow. Every other tool is under Tools.",
};

const FIRST_TOOL = { href: "/tools/doubt", label: "open doubt solver" };

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8;
const GAP = 12;
const CALLOUT_W = 320;
/**
 * Travel between steps. 260ms plus the browser's smooth scroll read as slow,
 * 180ms with an instant jump read as too fast; this sits between them.
 */
const TRAVEL_MS = 380;

/** True when the element, or anything it sits inside, does not scroll with the page. */
function isPinned(el: Element): boolean {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const pos = getComputedStyle(n).position;
    if (pos === "fixed" || pos === "sticky") return true;
  }
  return false;
}

/** The element for an anchor that is actually laid out, not display:none. */
function findAnchor(name: string): Element | null {
  for (const el of document.querySelectorAll(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function DashboardTour({
  autoStart = false,
  mandatory = false,
  firstResult = null,
}: {
  autoStart?: boolean;
  /** First run: the tour can only end by opening a tool. */
  mandatory?: boolean;
  /** Present only when this student has never logged a test: opens the tour on one. */
  firstResult?: { inputs: ScoreInputs; before: number; todayStudied: boolean } | null;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [total, setTotal] = useState("");
  const [correct, setCorrect] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** The score before and after the logged test, once it has been saved. */
  const [moved, setMoved] = useState<{ from: number; to: number } | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const calloutRef = useRef<HTMLDivElement>(null);
  const running = steps !== null;

  // Which steps this student can actually be shown, measured on the dashboard
  // as it rendered for them. The final step is always last.
  const start = useCallback(() => {
    const live = STEPS.filter((s) => findAnchor(s.anchor));
    const opening = firstResult && findAnchor(FIRST_RESULT.anchor) ? [FIRST_RESULT] : [];
    setSteps([...opening, ...live, FINAL]);
    setI(0);
  }, [firstResult]);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Once per mount. Logging the first test revalidates the dashboard, which
  // hands this component a new firstResult and so a new start(); re-running
  // on that would throw the student back to step one at the exact moment the
  // score is supposed to be moving in front of them.
  const started = useRef(false);
  useEffect(() => {
    if (!autoStart || started.current) return;
    const id = requestAnimationFrame(() => {
      started.current = true;
      start();
    });
    return () => cancelAnimationFrame(id);
  }, [autoStart, start]);

  useEffect(() => {
    if (!running) return;
    const el = findAnchor(steps[i].anchor);
    if (!el) {
      // Nothing to point at (the navigation is always rendered, so in practice
      // this is a section that vanished mid-tour). Centre the callout instead
      // of pointing into empty space.
      setBox(null);
      return;
    }

    // The page scroll and the spotlight move as one, over the same duration and
    // curve. The browser's own smooth scroll takes as long as it likes (500ms+
    // on a long page), which felt slow; an instant jump felt too abrupt. So the
    // scroll is driven here, and the spotlight is sent straight to where its
    // anchor will be when the scroll lands rather than chasing it frame by frame.
    const r = el.getBoundingClientRect();
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const fromY = window.scrollY;
    // The icon rail, tab bar and top bar are pinned, so scrolling would not move
    // them: leave the page where it is and point at them in place.
    const toY = isPinned(el)
      ? fromY
      : Math.min(Math.max(0, fromY + r.top + r.height / 2 - window.innerHeight / 2), Math.max(0, maxY));
    const delta = toY - fromY;
    setBox({ top: r.top - delta - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });

    let scrolling = !reduced && Math.abs(delta) > 1;
    let raf = 0;
    if (scrolling) {
      const t0 = performance.now();
      const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / TRAVEL_MS);
        window.scrollTo(0, fromY + delta * ease(p));
        if (p < 1) raf = requestAnimationFrame(step);
        else { scrolling = false; raf = 0; measure(); }
      };
      raf = requestAnimationFrame(step);
    } else if (Math.abs(delta) > 1) {
      window.scrollTo(0, toY);
    }

    // After it lands, follow any scrolling or resizing the student does.
    let follow = 0;
    const measure = () => {
      const m = el.getBoundingClientRect();
      setBox({ top: m.top - PAD, left: m.left - PAD, width: m.width + PAD * 2, height: m.height + PAD * 2 });
      follow = 0;
    };
    const onMove = () => {
      if (scrolling || follow) return;
      follow = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (follow) cancelAnimationFrame(follow);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [running, steps, i, reduced]);

  const close = useCallback(() => {
    setSteps(null);
    setBox(null);
    // Caught: a failed write only means the tour is offered again next visit,
    // the harmless direction to fail in.
    void markTourSeenAction().catch(() => {});
  }, []);

  const onFinal = running && i === steps.length - 1;

  /** Skip, Escape, or a click on the dim. */
  const skip = useCallback(() => {
    if (!steps) return;
    if (!mandatory) return close();
    // First run: the explanations can be skipped, trying a tool cannot.
    if (i !== steps.length - 1) {
      playClick("tap");
      setI(steps.length - 1);
    }
  }, [steps, i, mandatory, close]);

  const next = useCallback(() => {
    if (!steps || i >= steps.length - 1) return;
    playClick("tap");
    setI(i + 1);
  }, [steps, i]);

  const back = useCallback(() => {
    playClick("tap");
    setI((n) => Math.max(0, n - 1));
  }, []);

  const openTool = useCallback(
    async (href: string) => {
      if (leaving) return;
      playClick("tap");
      setLeaving(true);
      // Awaited here, unlike close(): navigating away first could cancel the
      // write, and then a student who did try a tool would be sent through the
      // tour again on their next visit.
      await markTourSeenAction().catch(() => {});
      router.push(href);
    },
    [leaving, router],
  );

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      // Arrow keys and Enter belong to a field being typed in, not to the tour.
      const typing = e.target instanceof HTMLElement && e.target.closest("input, select, textarea");
      if (typing && e.key !== "Escape") return;
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight" || (e.key === "Enter" && !onFinal)) next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, onFinal, next, back, skip]);

  useEffect(() => {
    if (running) calloutRef.current?.focus();
  }, [running, i]);

  if (!running) return null;

  const step = steps[i];
  const calloutH = onFinal ? 250 : step.form ? 330 : 200;

  async function logFirstResult(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !firstResult) return;
    const t = Number(total);
    const c = Number(correct);
    setFormError(null);
    setSaving(true);
    playClick("tap");
    try {
      const res = await logPyqAction({ subject, total: t, correct: c, predictedCorrect: null });
      if ("error" in res) {
        setFormError(res.error);
        return;
      }
      // The same formula the server just ran, on the same inputs plus this
      // attempt and the study day it makes, so the sentence names exactly the
      // number the ring lands on.
      const to = scoreAfterPaperToday(firstResult.inputs, { total: t, correct: c }, firstResult.todayStudied);
      setMoved({ from: firstResult.before, to });
    } catch {
      // A thrown action is a failed write, not a saved one: keep the form and
      // what was typed, so nothing the student entered is silently lost.
      setFormError("Could not save that. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top: number;
  let left: number;
  if (!box) {
    top = Math.max(GAP, (vh - calloutH) / 2);
    left = Math.max(GAP, (vw - CALLOUT_W) / 2);
  } else if (box.width < 120 && box.height > vh * 0.5) {
    // A tall narrow anchor (the icon rail): beside it, level with its middle.
    left = box.left + box.width + GAP;
    top = Math.min(Math.max(GAP, vh / 2 - calloutH / 2), vh - calloutH - GAP);
  } else {
    // Below when there is room, above otherwise, never off the side of a phone.
    const below = box.top + box.height + GAP + calloutH < vh;
    top = below ? box.top + box.height + GAP : Math.max(GAP, box.top - GAP - calloutH);
    left = Math.min(Math.max(GAP, box.left), Math.max(GAP, vw - CALLOUT_W - GAP));
  }

  // Same duration and curve as the scripted scroll above, so the ring and the
  // page arrive together.
  const curve = `${TRAVEL_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`;
  const travel = reduced ? "none" : `translate ${curve}, width ${curve}, height ${curve}`;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Dashboard tour">
      {box ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[15px]"
          style={{
            top: 0,
            left: 0,
            width: box.width,
            height: box.height,
            translate: `${box.left}px ${box.top}px`,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            outline: "1px solid var(--border-2)",
            transition: travel,
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/70" />
      )}

      <button
        aria-label={mandatory ? "Skip to the last step" : "Close tour"}
        onClick={skip}
        className="absolute inset-0 h-full w-full cursor-default"
        tabIndex={-1}
      />

      <div
        ref={calloutRef}
        tabIndex={-1}
        aria-live="polite"
        className="u-card absolute w-[320px] max-w-[calc(100vw-24px)] p-4 outline-none"
        style={{
          top: 0,
          left: 0,
          translate: `${left}px ${top}px`,
          transition: travel,
          animation: reduced ? undefined : "reveal-in 0.36s var(--ease-out) both",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="u-label">
            {onFinal ? "last step" : `step ${i + 1} of ${steps.length}`}
          </span>
          {(!onFinal || !mandatory) && (
            <button
              onClick={onFinal ? close : skip}
              className="u-tap u-mono text-2xs text-text-3 hover:text-text"
            >
              {onFinal ? "close" : "skip"}
            </button>
          )}
        </div>

        <h2 className="mt-2 text-sm font-bold text-text">{step.title}</h2>
        <p className="mt-1.5 text-sm text-text-2">{step.body}</p>

        {onFinal ? (
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={back}
              disabled={i === 0}
              className={cn(
                "u-mono text-2xs text-text-3 transition-colors hover:text-text",
                i === 0 && "pointer-events-none opacity-0",
              )}
            >
              back
            </button>
            <button
              onClick={() => openTool(FIRST_TOOL.href)}
              disabled={leaving}
              className={cn(
                "h-8 rounded-md bg-accent px-3 text-xs font-bold text-accent-on",
                "transition-[translate,scale,background-color] duration-[190ms] ease-spring",
                "hover:bg-accent-hover active:translate-y-[2px] active:scale-[0.965] active:duration-[70ms] active:ease-out",
                "motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100",
                "disabled:opacity-60",
              )}
            >
              {leaving ? "opening" : FIRST_TOOL.label}
            </button>
          </div>
        ) : step.form && moved ? (
          <div className="mt-3">
            <p className="u-mono text-2xs text-text-3">your ledger score</p>
            <p className="u-stat-number mt-1 text-2xl">
              {moved.from} <span className="text-text-3">to</span> {moved.to}
            </p>
            <p className="mt-2 text-sm text-text-2">
              That is one real result at work. Every number on this page comes from what you log, the same way.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={next}
                className={cn(
                  "h-8 rounded-md bg-accent px-3 text-xs font-bold text-accent-on",
                  "transition-[translate,scale,background-color] duration-[190ms] ease-spring",
                  "hover:bg-accent-hover active:translate-y-[2px] active:scale-[0.965] active:duration-[70ms] active:ease-out",
                  "motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100",
                )}
              >
                show me around
              </button>
            </div>
          </div>
        ) : step.form ? (
          <form onSubmit={logFirstResult} className="mt-3 space-y-3">
            <label className="block">
              <span className="u-label">subject</span>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={field}>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="u-label">questions</span>
                <input
                  type="number"
                  min={1}
                  required
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block">
                <span className="u-label">correct</span>
                <input
                  type="number"
                  min={0}
                  required
                  value={correct}
                  onChange={(e) => setCorrect(e.target.value)}
                  className={field}
                />
              </label>
            </div>
            {formError && <p className="u-mono text-2xs text-negative">{formError}</p>}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={next}
                className="u-tap u-mono text-2xs text-text-3 transition-colors hover:text-text"
              >
                haven&apos;t sat one yet
              </button>
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "h-8 rounded-md bg-accent px-3 text-xs font-bold text-accent-on",
                  "transition-[translate,scale,background-color] duration-[190ms] ease-spring",
                  "hover:bg-accent-hover active:translate-y-[2px] active:scale-[0.965] active:duration-[70ms] active:ease-out",
                  "motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100",
                  "disabled:opacity-60",
                )}
              >
                {saving ? "saving" : "log it"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={back}
              disabled={i === 0}
              className={cn(
                "u-mono text-2xs text-text-3 transition-colors hover:text-text",
                i === 0 && "pointer-events-none opacity-0",
              )}
            >
              back
            </button>
            <button
              onClick={next}
              className={cn(
                "h-8 rounded-md bg-accent px-3 text-xs font-bold text-accent-on",
                "transition-[translate,scale,background-color] duration-[190ms] ease-spring",
                "hover:bg-accent-hover active:translate-y-[2px] active:scale-[0.965] active:duration-[70ms] active:ease-out",
                "motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100",
              )}
            >
              next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
