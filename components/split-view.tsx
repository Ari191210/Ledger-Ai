"use client";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUI } from "./ui-context";
import { TOOLS_REGISTRY } from "@/lib/tools-registry";

// Slug → display name, derived from the registry so it can't drift
const TOOL_NAMES: Record<string, string> = Object.fromEntries(
  TOOLS_REGISTRY.map(t => [t.slug, t.title])
);

// WAAPI equivalents of the gsap eases this file used before the rewrite.
// gsap itself was 44 KB gz shipped to every tool page via this layout component.
const POWER3_OUT = "cubic-bezier(0.215, 0.61, 0.355, 1)";
const POWER2_OUT = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const POWER2_IN  = "cubic-bezier(0.55, 0.085, 0.68, 0.53)";

type Keyframe2 = Record<string, string | number>;

// Animate from `from` to the element's natural style, leaving no inline residue.
function enter(el: HTMLElement, from: Keyframe2, opts: KeyframeAnimationOptions) {
  return el.animate([from, {}], {
    easing: POWER3_OUT,
    fill: "backwards", // first keyframe applies during any delay — no flash
    ...opts,
  });
}

// Hide now (inline), reveal later. Returns the reveal trigger.
function hideThenEnter(el: HTMLElement, from: Keyframe2, opts: KeyframeAnimationOptions) {
  const prev = { opacity: el.style.opacity, transform: el.style.transform, filter: el.style.filter };
  if (from.opacity !== undefined)   el.style.opacity   = String(from.opacity);
  if (from.transform !== undefined) el.style.transform = String(from.transform);
  if (from.filter !== undefined)    el.style.filter    = String(from.filter);
  return () => {
    el.style.opacity   = prev.opacity;
    el.style.transform = prev.transform;
    el.style.filter    = prev.filter;
    return enter(el, from, opts);
  };
}

export default function SplitView({ children }: { children: React.ReactNode }) {
  const { splitSlug, setSplitSlug } = useUI();
  const mainRef  = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Re-runs on every route change so each tool page gets a fresh entrance.
  // useLayoutEffect so hides apply before paint — no flash of unanimated content.
  useLayoutEffect(() => {
    // ── Respect prefers-reduced-motion ─────────────────────────────────────
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = mainRef.current;
    const cleanup: Array<() => void> = [];

    // ── 1. Header slides down + fades in ──────────────────────────────────
    const header = document.querySelector<HTMLElement>("header");
    if (header) enter(header, { opacity: 0, transform: "translateY(-22px)" }, { duration: 440 });

    // ── 2. Cascade the content panels ─────────────────────────────────────
    // Most tool pages: main > div (grid) > [input, output].
    // If main has exactly one child whose children are the real panels, go one
    // level deeper so input and output enter with separate stagger beats.
    // Fallback: animate direct children of main as a single beat.
    const mainEl = root?.querySelector<HTMLElement>("main");
    if (mainEl) {
      const direct = Array.from(mainEl.children) as HTMLElement[];
      const cascadeTargets: HTMLElement[] =
        direct.length === 1 && direct[0].children.length > 1
          ? (Array.from(direct[0].children) as HTMLElement[])
          : direct;

      cascadeTargets.forEach((el, i) => {
        enter(el, { opacity: 0, transform: "translateY(48px) scale(0.983)" }, {
          duration: 680,
          delay: 180 + i * 130, // overlaps the header beat like the old timeline's "-=0.26"
        });
      });
    }

    // ── 3 + 4 + 5. Scroll reveals (.gsap-reveal, headings, .glass-card) ────
    // One IntersectionObserver per group, rooted on the scrolling panel.
    const makeObserver = (
      els: HTMLElement[],
      from: Keyframe2,
      opts: (i: number, batchIndex: number) => KeyframeAnimationOptions,
      preHide: boolean,
    ) => {
      if (els.length === 0) return;
      const reveals = new Map<Element, () => void>();
      els.forEach((el, i) => {
        if (preHide) reveals.set(el, hideThenEnter(el, from, opts(i, 0)));
      });
      let seen = 0;
      const io = new IntersectionObserver(entries => {
        let batchIndex = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          if (preHide) {
            reveals.get(el)?.();
            reveals.delete(el);
          } else {
            enter(el, from, opts(seen, batchIndex));
          }
          seen++; batchIndex++;
        }
      }, { root, rootMargin: "0px 0px -8% 0px" });
      els.forEach(el => io.observe(el));
      cleanup.push(() => {
        io.disconnect();
        // Anything still hidden must be restored, or it stays invisible forever.
        reveals.forEach(reveal => reveal());
        reveals.clear();
      });
    };

    // .gsap-reveal elements: visible in DOM, animate in on first view, batch-staggered
    makeObserver(
      Array.from(root?.querySelectorAll<HTMLElement>(".gsap-reveal") ?? []),
      { opacity: 0, transform: "translateY(20px)" },
      (_i, batchIndex) => ({ duration: 500, delay: batchIndex * 70, easing: POWER2_OUT }),
      false,
    );

    // Section headings: pre-hidden with blur, reveal on scroll
    makeObserver(
      Array.from(root?.querySelectorAll<HTMLElement>("main h2, main h3") ?? []),
      { opacity: 0, transform: "translateY(28px)" },
      () => ({ duration: 700 }),
      true,
    );

    // .glass-card elements below the fold
    makeObserver(
      Array.from(root?.querySelectorAll<HTMLElement>("main .glass-card") ?? []),
      { opacity: 0, transform: "translateY(36px) scale(0.97)" },
      i => ({ duration: 650, delay: (i % 4) * 70 }),
      true,
    );

    // ── 6. .btn hover micro-interactions ──────────────────────────────────
    // CSS transitions interrupt gracefully, matching gsap's overwrite:"auto".
    const btns = Array.from(root?.querySelectorAll<HTMLElement>("main .btn") ?? []);
    btns.forEach(btn => {
      const move = (transform: string, dur: number, ease: string) => {
        btn.style.transition = `transform ${dur}ms ${ease}`;
        btn.style.transform = transform;
      };
      const onEnter = () => move("translateY(-2px) scale(1.03)", 200, POWER2_OUT);
      const onLeave = () => move("translateY(0) scale(1)",       350, POWER3_OUT);
      const onDown  = () => move("scale(0.97)",                  100, POWER2_IN);
      const onUp    = () => move("scale(1.03)",                  150, POWER2_OUT);
      btn.addEventListener("mouseenter", onEnter);
      btn.addEventListener("mouseleave", onLeave);
      btn.addEventListener("mousedown",  onDown);
      btn.addEventListener("mouseup",    onUp);
      cleanup.push(() => {
        btn.removeEventListener("mouseenter", onEnter);
        btn.removeEventListener("mouseleave", onLeave);
        btn.removeEventListener("mousedown",  onDown);
        btn.removeEventListener("mouseup",    onUp);
        btn.style.transition = "";
        btn.style.transform = "";
      });
    });

    // ── 7. Tool header (the mono breadcrumb bar at top of each tool) ────────
    const toolHeader = root?.querySelector<HTMLElement>("main > div > header, main > header");
    if (toolHeader) enter(toolHeader, { opacity: 0, transform: "translateY(-16px)" }, { duration: 450 });

    // ── 8. Progress / result areas fade up when they appear in DOM ─────────
    // These are generated after AI responds — we watch for them with a MutationObserver.
    if (mainEl) {
      const observer = new MutationObserver(mutations => {
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
              enter(node, { opacity: 0, transform: "translateY(24px)" }, { duration: 550 });
            }
          });
        });
      });
      observer.observe(mainEl, { childList: true, subtree: true });
      cleanup.push(() => observer.disconnect());
    }

    return () => { cleanup.forEach(fn => fn()); };
  }, [pathname]);

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
