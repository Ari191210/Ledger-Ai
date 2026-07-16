"use client";
import { usePathname } from "next/navigation";
import { isEditorialRoute } from "@/lib/editorial-routes";
import RankWhisper from "@/components/rank-whisper";

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY CHROME
//
// The decorative layer of the OLD design system has been removed per the
// Product Constitution (§1/§6): the dot-and-ring cursor, the WebGL aurora, the
// page-gradient wash, and the button click shimmer are gone. The product now
// uses the native cursor, a flat background, and zero decorative motion.
//
// Only the rank whisper remains, and only on routes that still run the legacy
// design system. It renders null on a migrated route in lib/editorial-routes.ts.
// ═══════════════════════════════════════════════════════════════════════════

/** True on a route that still runs the legacy design system. */
function useLegacy(): boolean {
  return !isEditorialRoute(usePathname());
}

/** Inside <AuthProvider>, immediately after <ErrorBoundary>. */
export function LegacyChromeWhisper() {
  return useLegacy() ? <RankWhisper /> : null;
}
