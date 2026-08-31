import type { Metadata } from "next";
import {
  Mulish,
  IBM_Plex_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_Tamil,
} from "next/font/google";
import AuthGuard from "@/components/auth-guard";
import VitalityShell from "@/components/console/vitality-shell";
import "../console/console.css";

// ═══════════════════════════════════════════════════════════════════════════
// TODAY SHELL — the one Console surface that never had one.
//
// ── WHAT WAS WRONG ───────────────────────────────────────────────────────
// `/today` renders entirely in Console primitives — Measure, Row, Stack,
// Control, Readout — but it was the only such route with no `layout.tsx`, so
// it never mounted `VitalityShell` and never carried `data-console`.
//
// `console.css` scopes all 37 of its rules to `[data-console]`, deliberately:
// the previous design system declared tokens on `:root` and silently
// restyled 46 un-migrated routes, and scoping is what keeps Console and the
// legacy app invisible to each other. A custom property resolves from the
// nearest DECLARING ancestor, so with no such ancestor every token on
// `/today` resolved to nothing:
//
//   --s-3            (empty)  -> every `gap` collapsed to zero, which is why
//                               the masthead read "LIGHTCaptureSettings"
//   --control-pad-y  (empty)  -> controls measured 25-32px against the 44px
//                               touch floor the engine promises
//   --g-0            (empty)  -> the swan ground never applied
//
// None of that was visible to the test suite, because every Console test
// asserts the TOKENS and the ENGINE, both of which were correct. It took a
// real 375px render to see that nothing was consuming them.
//
// This shell is `/record`'s, imported rather than reinvented: same fonts,
// same `console.css`, same token host, same `AuthGuard`. `/today` reads a
// named student's plan, so it is guarded and unindexed for the same reason
// `/record` is.
// ═══════════════════════════════════════════════════════════════════════════

const sans = Mulish({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--console-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--console-mono",
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--console-deva",
  display: "swap",
  preload: false,
});

const tamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600"],
  variable: "--console-tamil",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Today — StudyLedger",
  // An authenticated surface naming what one student should do next.
  // Indexing it would advertise a URL that answers nothing to a signed-out
  // reader and something private to a signed-in one.
  robots: { index: false, follow: false },
};

export default function TodayLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <VitalityShell
        className={`${sans.variable} ${mono.variable} ${devanagari.variable} ${tamil.variable}`}
      >
        {children}
      </VitalityShell>
    </AuthGuard>
  );
}
