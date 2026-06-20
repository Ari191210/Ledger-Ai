"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useUI } from "./ui-context";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TOOL_NAMES: Record<string, string> = {
  planner: "Smart Study Planner",     marks: "Marks Predictor",
  notes: "Notes Simplifier",          doubt: "Doubt Solver",
  focus: "Focus Dashboard",           career: "Career Pathfinder",
  papers: "Past Papers",              assignment: "Assignment Rescue",
  resume: "Resume Builder",           rooms: "Study Rooms",
  tutor: "Topic Tutor",               dna: "Mistake DNA",
  crunch: "48-Hour Crunch",           syllabus: "Syllabus Parser",
  formula: "Formula Sheet",           admissions: "Admissions Engine",
  flashcards: "AI Flashcards",        "essay-grader": "Essay Grader",
  "personal-statement": "Personal Statement", interview: "Interview Coach",
  mindmap: "Mind Map Builder",        citation: "Citation Generator",
  presentation: "Presentation Planner", debate: "Debate Coach",
  habits: "Habit Tracker",            deadlines: "Deadline Hub",
  "exam-sim": "Exam Simulator",       "gpa-sim": "GPA Simulator",
  vocab: "Vocabulary Vault",          research: "Research Assistant",
  score: "Ledger Score™",             coach: "AI Study Coach",
  "mark-scheme": "Mark Scheme Trainer", "subject-picker": "Subject Picker",
  "essay-blueprint": "Essay Blueprint", "concept-web": "Concept Web",
  "exam-planner": "Exam Season Planner", "paper-dissector": "Paper Dissector",
  "lang-analyzer": "Language Analyzer", "lab-report": "Lab Report Builder",
  "uni-match": "University Match",    compare: "Comparison Chart",
  source: "Source Analyzer",          practice: "Practice Problems",
  argument: "Argument Builder",
};

export default function SplitView({ children }: { children: React.ReactNode }) {
  const { splitSlug, setSplitSlug } = useUI();
  const mainRef  = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Re-runs on every route change so each tool page gets a fresh entrance.
  useGSAP(() => {
    // ── Respect prefers-reduced-motion ─────────────────────────────────────
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // ── 1. Header slides down + fades in ──────────────────────────────────
    tl.fromTo(
      "header",
      { autoAlpha: 0, y: -22 },
      { autoAlpha: 1, y: 0, duration: 0.44, clearProps: "opacity,transform,visibility" }
    );

    // ── 2. Cascade the content panels ─────────────────────────────────────
    // Most tool pages: main > div (grid) > [input, output].
    // If main has exactly one child whose children are the real panels, go one
    // level deeper so input and output enter with separate stagger beats.
    // Fallback: animate direct children of main as a single beat.
    const mainEl = mainRef.current?.querySelector<HTMLElement>("main");
    if (mainEl) {
      const direct = Array.from(mainEl.children) as HTMLElement[];
      const cascadeTargets: HTMLElement[] =
        direct.length === 1 && direct[0].children.length > 1
          ? (Array.from(direct[0].children) as HTMLElement[])
          : direct;

      // Pre-hide before animating to prevent flash
      gsap.set(cascadeTargets, { autoAlpha: 0, y: 48, scale: 0.983 });

      tl.to(
        cascadeTargets,
        {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.68,
          stagger: 0.13,
          clearProps: "opacity,transform,visibility,scale",
        },
        "-=0.26"
      );
    }

    // ── 3. Scroll reveals for .gsap-reveal elements (existing) ─────────────
    const scroller = mainRef.current ?? undefined;

    ScrollTrigger.batch(".gsap-reveal", {
      scroller,
      onEnter: els => gsap.from(els, {
        opacity: 0, y: 20, duration: 0.5, stagger: 0.07,
        ease: "power2.out", clearProps: "opacity,transform",
      }),
      start: "top 90%", once: true,
    });

    // ── 4. Scroll reveals for section headings (h2, h3 inside main) ────────
    const headings = mainRef.current?.querySelectorAll<HTMLElement>("main h2, main h3") ?? [];
    headings.forEach(el => {
      gsap.set(el, { autoAlpha: 0, y: 28, filter: "blur(4px)" });
      ScrollTrigger.create({
        trigger: el, scroller,
        start: "top 92%", once: true,
        onEnter: () => gsap.to(el, {
          autoAlpha: 1, y: 0, filter: "blur(0px)",
          duration: 0.7, ease: "power3.out",
          clearProps: "opacity,transform,visibility,filter",
        }),
      });
    });

    // ── 5. Smooth-fade cards on scroll ────────────────────────────────────
    // .glass-card elements that appear below the fold
    const cards = mainRef.current?.querySelectorAll<HTMLElement>("main .glass-card") ?? [];
    cards.forEach((el, i) => {
      gsap.set(el, { autoAlpha: 0, y: 36, scale: 0.97 });
      ScrollTrigger.create({
        trigger: el, scroller,
        start: "top 93%", once: true,
        onEnter: () => gsap.to(el, {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.65, ease: "power3.out", delay: (i % 4) * 0.07,
          clearProps: "opacity,transform,visibility,scale",
        }),
      });
    });

    // ── 6. .btn hover micro-interactions ──────────────────────────────────
    const hoverCleanup: Array<() => void> = [];

    const btns = mainRef.current?.querySelectorAll<HTMLElement>("main .btn") ?? [];
    btns.forEach(btn => {
      const onEnter = () => gsap.to(btn, { y: -2, scale: 1.03, duration: 0.2, ease: "power2.out", overwrite: "auto" });
      const onLeave = () => gsap.to(btn, { y:  0, scale: 1,    duration: 0.35, ease: "power3.out", overwrite: "auto" });
      const onDown  = () => gsap.to(btn, { scale: 0.97, duration: 0.1, ease: "power2.in", overwrite: "auto" });
      const onUp    = () => gsap.to(btn, { scale: 1.03, duration: 0.15, ease: "power2.out", overwrite: "auto" });
      btn.addEventListener("mouseenter", onEnter);
      btn.addEventListener("mouseleave", onLeave);
      btn.addEventListener("mousedown",  onDown);
      btn.addEventListener("mouseup",    onUp);
      hoverCleanup.push(() => {
        btn.removeEventListener("mouseenter", onEnter);
        btn.removeEventListener("mouseleave", onLeave);
        btn.removeEventListener("mousedown",  onDown);
        btn.removeEventListener("mouseup",    onUp);
      });
    });

    // ── 7. Tool header (the mono breadcrumb bar at top of each tool) ────────
    const toolHeader = mainRef.current?.querySelector<HTMLElement>("main > div > header, main > header");
    if (toolHeader) {
      gsap.set(toolHeader, { autoAlpha: 0, y: -16 });
      gsap.to(toolHeader, {
        autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out",
        clearProps: "opacity,transform,visibility",
      });
    }

    // ── 8. Progress / result areas fade up when they appear in DOM ─────────
    // These are generated after AI responds — we watch for them with a MutationObserver.
    const mainEl2 = mainRef.current?.querySelector<HTMLElement>("main");
    let observer: MutationObserver | null = null;
    if (mainEl2) {
      observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (!(node instanceof HTMLElement)) return;
            // Animate new content blocks that appear (AI output, result panels)
            const isResult =
              node.classList.contains("ai-result") ||
              node.classList.contains("glass-card") ||
              node.tagName === "SECTION" ||
              (node.style && parseFloat(node.style.marginTop || "0") > 20);
            if (isResult) {
              gsap.fromTo(node,
                { autoAlpha: 0, y: 24, filter: "blur(4px)" },
                { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power3.out",
                  clearProps: "opacity,transform,visibility,filter" }
              );
            }
          });
        });
      });
      observer.observe(mainEl2, { childList: true, subtree: true });
    }

    ScrollTrigger.refresh();

    return () => {
      hoverCleanup.forEach(fn => fn());
      observer?.disconnect();
    };
  }, { scope: mainRef, dependencies: [pathname], revertOnUpdate: true });

  return (
    <div className="tool-split-wrap">

      {/* Main panel — always mounted, state always preserved */}
      <div ref={mainRef} className="tool-main-panel" style={{
        flex: 1, overflowY: "auto", minWidth: 0,
        borderRight: splitSlug ? "2px solid var(--ink)" : "none",
      }}>
        {children}
      </div>

      {/* Split panel — hidden on mobile (mob-hide), isolated via iframe on desktop */}
      {splitSlug && (
        <div className="mob-hide" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 36, borderBottom: "1px solid var(--ink)", background: "var(--paper-2)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-2)" }}>⊞ SPLIT</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                {TOOL_NAMES[splitSlug] || splitSlug}
              </span>
            </div>
            <button
              onClick={() => setSplitSlug(null)}
              style={{ fontFamily: "var(--mono)", fontSize: 9, background: "none", border: "1px solid var(--rule)", padding: "3px 10px", cursor: "pointer", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
              ✕ Close split
            </button>
          </div>
          <iframe
            key={splitSlug}
            src={`/tools/${splitSlug}`}
            style={{ flex: 1, border: "none", width: "100%", display: "block" }}
            title={TOOL_NAMES[splitSlug] || splitSlug}
          />
        </div>
      )}
    </div>
  );
}
