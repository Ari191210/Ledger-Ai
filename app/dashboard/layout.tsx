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
// DASHBOARD SHELL — the Console shell, not the legacy one.
//
// This layout previously mounted `AppNav` and `StudyEntrance` against
// `var(--paper)` and `var(--ink)`, which are the PRE-CONSOLE tokens. That was
// correct while `/dashboard` was a 301 stub with nothing under it. It is not
// correct now that a real surface renders here: a page built from Console
// primitives inside a legacy shell gets no `data-console`, so every token it
// asks for resolves to nothing — no gaps, no 44px controls, no swan ground.
//
// That exact failure is documented in `app/today/layout.tsx`: `/today` had no
// shell at all and its masthead collapsed to "LIGHTCaptureSettings" because
// `--s-3` was empty. Mounting the wrong shell produces the same result.
//
// So this is `/record`'s shell, imported rather than reinvented: same fonts,
// same `console.css`, same token host, same `AuthGuard`.
//
// `/dashboard/profile` and `/dashboard/saved` still live under this segment.
// They are legacy surfaces and are unaffected: `profile` 301s to `/settings`
// at the edge, and `saved` renders its own markup rather than Console
// primitives, so neither depends on the shell this layout provides.
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
  title: "Your ledger — StudyLedger",
  // A named student's own record. Indexing it would advertise a URL that
  // answers nothing to a signed-out reader and something private to a
  // signed-in one.
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
