"use client";
import { usePathname } from "next/navigation";
import { isEditorialRoute } from "@/lib/editorial-routes";
import PageGradient from "@/components/page-gradient";
import ButtonClickEffect from "@/components/ui/button-click-effect";
import RankWhisper from "@/components/rank-whisper";
import { WebGLShader } from "@/components/ui/web-gl-shader";

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY CHROME
//
// The custom dot-and-ring cursor has been removed per Product Constitution §6 —
// the product uses the native cursor everywhere. The remaining decorative
// chrome (WebGL aurora, page-gradient wash, button click shimmer) is still
// mounted on legacy routes here and is removed in the next commit.
//
// Every slot renders null on a migrated route in lib/editorial-routes.ts.
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
  return useLegacy() ? <WebGLShader /> : null;
}

/** Slot 3 — inside <AuthProvider>, immediately after <ErrorLogger />. */
export function LegacyChromeGradient() {
  return useLegacy() ? <PageGradient /> : null;
}

/** Slot 4 — inside <AuthProvider>, immediately after <ErrorBoundary>. */
export function LegacyChromeWhisper() {
  return useLegacy() ? <RankWhisper /> : null;
}
