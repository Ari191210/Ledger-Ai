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
// RECORD SHELL — M13-3.
//
// `PRODUCT_DECISIONS` §3, route 6: *"`/record` — Proof the ledger
// accumulates."* §2.4: *"the longitudinal asset. **One place, forever.**"*
//
// The shell is `/home`'s and `/diagnosis`'s, imported rather than copied — same
// fonts, same `console.css`, same `VitalityShell` token host, same `AuthGuard`.
// M3 chose the Console layer *"because M3 is a structural consolidation — it is
// not licensed to redesign anything"*; M8 and M13-1 reused it for the same
// reason and M13-3 is the fourth such merge. Two tool surfaces carrying two
// visual identities collapse into one, and inventing a third to hold them would
// be a redesign smuggled inside a structural pass.
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
  title: "Record — StudyLedger",
  // An authenticated student surface listing a named student's academic
  // history. Indexing it would advertise a URL that answers nothing to a
  // signed-out reader and something private to a signed-in one.
  robots: { index: false, follow: false },
};

export default function RecordLayout({ children }: { children: React.ReactNode }) {
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
