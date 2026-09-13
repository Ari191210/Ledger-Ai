"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";
import { markTourSeenAction } from "@/app/(app)/dashboard/actions";

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
    title: "Your Ledger Score",
    body:
      "One number out of 1000, from four parts: past papers 40%, syllabus coverage 25%, mistakes 20%, consistency 15%. Turn the dial to see what would actually move it.",
  },
  {
    anchor: "activity",
    title: "The last seven days",
    body:
      "Minutes studied, past paper accuracy, and mistakes logged. The small charts show which way each one is going, which matters more than today's figure.",
  },
  {
    anchor: "calendar",
    title: "Study days",
    body: "Every day you studied this month. Turn the dial or tap a day to see exactly what you did on it.",
  },
  {
    anchor: "habits",
    title: "Habits today",
    body:
      "The habits you are tracking and which are done today. Tick them off right here without opening the tool.",
  },
  {
    anchor: "deadlines",
    title: "Deadlines",
    body: "Your next three deadlines, with the real number of days left on each. Add one and it appears here.",
  },
  {
    anchor: "focus",
    title: "Focus history",
    body:
      "Every focus session from the last 30 days. A flat day is an honest record of a day off, not a broken chart.",
  },
  {
    anchor: "coverage",
    title: "Syllabus coverage",
    body:
      "How much of your syllabus you have covered, subject by subject. List your topics in Syllabus Tracker and this fills in.",
  },
  {
    anchor: "fix-next",
    title: "Fix next",
    body:
      "The topics costing you the most marks, worst first. When you do not know what to revise, start at the top of this list.",
  },
  {
    anchor: "best-hours",
    title: "Best hours",
    body:
      "The hours of the day you answer past paper questions most accurately. Save your hardest topics for then.",
  },
  {
    anchor: "spaced-review",
    title: "Spaced review",
    body:
      "Mistakes due for another look today. Reviewing them on schedule is how they stop coming back.",
  },
  {
    anchor: "mistake-dna",
    title: "Mistake DNA",
    body: "The mistake you make most often, so you see the pattern rather than one wrong answer.",
  },
  {
    anchor: "tape",
    title: "Ledger tape",
    body: "A receipt of everything you logged in the last two weeks, and what each entry did to your score.",
  },
];

/** The last step. Anchored to the navigation, because that is where tools live. */
const FINAL: Step = {
  anchor: "nav",
  title: "Now try one tool",
  body: "This dashboard fills up from what you do. Pick one to start. Every other tool is under Tools.",
};

const STARTERS = [
  { href: "/tools/doubt", name: "Doubt Solver", line: "Paste a question you are stuck on" },
  { href: "/tools/focus", name: "Focus", line: "Start a timed study session" },
  { href: "/tools/flashcards", name: "Flashcards", line: "Turn a topic into a card set" },
];

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
}: {
  autoStart?: boolean;
  /** First run: the tour can only end by opening a tool. */
  mandatory?: boolean;
}) {
  const router = useRouter();
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
    setSteps([...live, FINAL]);
    setI(0);
  }, []);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    const id = requestAnimationFrame(() => start());
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
  const calloutH = onFinal ? 300 : 200;
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
          <div className="mt-3 space-y-1.5">
            {STARTERS.map((t) => (
              <button
                key={t.href}
                onClick={() => openTool(t.href)}
                disabled={leaving}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-left",
                  "transition-[translate,scale,border-color] duration-[190ms] ease-spring",
                  "hover:border-text-3 active:translate-y-[2px] active:scale-[0.985] active:duration-[70ms] active:ease-out",
                  "motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100",
                  "disabled:opacity-60",
                )}
              >
                <span>
                  <span className="block text-sm font-semibold text-text">{t.name}</span>
                  <span className="u-mono block text-2xs text-text-3">{t.line}</span>
                </span>
                <span aria-hidden className="u-mono text-2xs text-text-3">open</span>
              </button>
            ))}
            {i > 0 && (
              <button onClick={back} className="u-mono pt-1 text-2xs text-text-3 hover:text-text">
                back
              </button>
            )}
          </div>
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
