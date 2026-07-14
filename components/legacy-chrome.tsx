"use client";
import { usePathname } from "next/navigation";
import { isEditorialRoute } from "@/lib/editorial-routes";
import Cursor from "@/components/cursor";
import PageGradient from "@/components/page-gradient";
import ButtonClickEffect from "@/components/ui/button-click-effect";
import RankWhisper from "@/components/rank-whisper";
import { WebGLShader } from "@/components/ui/web-gl-shader";

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY CHROME
//
// The decorative layer belonging to the OLD design system: the dot-and-ring
// cursor, the WebGL aurora, the page-gradient wash, the button click shimmer,
// and the rank whisper.
//
// These were unmounted globally in an earlier commit while stripping the SaaS
// aesthetic. That was wrong — 46 routes had not been migrated and globals.css
// still assumes this chrome exists. Most sharply, globals.css:346 sets
// `cursor: none !important` under (pointer: fine), which is only survivable
// because <Cursor /> paints a replacement. Removing it left those pages with NO
// CURSOR AT ALL.
//
// So the chrome returns, but ONLY where the old design system is still in force.
// On a migrated route every one of these renders null.
//
// ── WHY FOUR SEPARATE SLOTS, NOT ONE COMPONENT ─────────────────────────────
//
// The first attempt mounted all five in a single <LegacyChrome /> before
// <AuthProvider>. The screenshot gate rejected it: /tools/timeline and
// /tools/research-suite differed from master by a deterministic 135 and 114
// pixels, in a 50x48 box exactly 25px from the bottom-right corner — the
// WhatsApp widget.
//
// The widget carries `backdrop-filter: blur(20px)`, so it samples whatever is
// painted BEHIND it. On master, <PageGradient /> sits inside <AuthProvider>,
// after <ErrorLogger />; hoisting it out changed the paint order of the layers
// under the widget, and therefore the pixels the blur resolved to.
//
// A 135px difference is cosmetically nothing. But Phase 0.5 promised legacy
// routes would be PIXEL-IDENTICAL, and "nearly identical" is how bleed gets
// waved through. So the DOM order below reproduces master's exactly:
//
//     <svg glass filter />
//     <ButtonClickEffect />        <- LegacyChromeEffects
//     <a class="skip-link" />
//     <Cursor />                   <- LegacyChromeCanvas
//     <WebGLShader />              <-
//     <AuthProvider>
//       <PostHogProvider />
//       <ErrorLogger />
//       <PageGradient />           <- LegacyChromeGradient
//       <Tracker /> <SyncManager />
//       <ErrorBoundary>{children}</ErrorBoundary>
//       <RankWhisper />            <- LegacyChromeWhisper
//       <WhatsAppWidget /> <Toaster />
//     </AuthProvider>
//
// ── WHY usePathname AND NOT headers() ──────────────────────────────────────
// The root layout is a server component and must stay one: reading headers()
// there to learn the pathname would opt all 71 routes out of static generation
// — a real cost paid for a styling concern. A client pathname check is a poor
// way to gate STYLES (it flashes pre-hydration) but a fine way to gate THESE,
// which are canvas/DOM effects that never server-render anyway.
//
// ── WHY STATIC IMPORTS, NOT next/dynamic ───────────────────────────────────
// Lazy-loading the shader is a legitimate optimisation, but it changes WHEN it
// paints, which the widget's backdrop-filter can see. That is a behaviour
// change; it belongs in its own phase with its own measurement, not smuggled
// into an architecture commit.
// ═══════════════════════════════════════════════════════════════════════════

/** True on a route that still runs the legacy design system. */
function useLegacy(): boolean {
  return !isEditorialRoute(usePathname());
}

/** Slot 1 — before the skip link. */
export function LegacyChromeEffects() {
  return useLegacy() ? <ButtonClickEffect /> : null;
}

/** Slot 2 — after the skip link, before <AuthProvider>. */
export function LegacyChromeCanvas() {
  if (!useLegacy()) return null;
  return (
    <>
      <Cursor />
      <WebGLShader />
    </>
  );
}

/** Slot 3 — inside <AuthProvider>, immediately after <ErrorLogger />. */
export function LegacyChromeGradient() {
  return useLegacy() ? <PageGradient /> : null;
}

/** Slot 4 — inside <AuthProvider>, immediately after <ErrorBoundary>. */
export function LegacyChromeWhisper() {
  return useLegacy() ? <RankWhisper /> : null;
}
