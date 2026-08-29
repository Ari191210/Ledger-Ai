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
// CAPTURE SHELL — M8-1.
//
// `PRODUCT_DECISIONS` §3, route 4: *"`/capture` — Photograph a marked paper.
// **If this doesn't ship, nothing else matters.**"*
//
// The shell is `/home`'s, imported rather than copied — same fonts, same
// `console.css`, same `VitalityShell` token host, same `AuthGuard`. M8 is not
// licensed to redesign anything, and a second shell is the exact duplication
// M3 spent a milestone removing (architecture T10).
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
  title: "Capture — StudyLedger",
  // An authenticated student surface holding photographs of marked papers.
  // Indexing it would advertise a URL that answers nothing to a signed-out
  // reader and something private to a signed-in one.
  robots: { index: false, follow: false },
};

export default function CaptureLayout({ children }: { children: React.ReactNode }) {
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
