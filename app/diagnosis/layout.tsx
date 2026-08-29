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
// DIAGNOSIS SHELL — M13-1.
//
// `PRODUCT_DECISIONS` §3, route 5: *"`/diagnosis` — The answer. The merge of
// six."* §2.4: *"**THE MERGE THAT IS THE COMPANY.** What you lost, why, and
// what recurs."*
//
// The shell is `/home`'s, imported rather than copied — same fonts, same
// `console.css`, same `VitalityShell` token host, same `AuthGuard`. M3 chose
// the Console layer *"because M3 is a structural consolidation — it is not
// licensed to redesign anything"*, and M8 reused it for the same reason. M13 is
// the third such merge and the reasoning has not changed: seven tool pages
// carrying seven visual identities collapse into ONE, and inventing an eighth
// identity to hold them would be a redesign smuggled inside a structural pass.
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
  title: "Diagnosis — StudyLedger",
  // An authenticated student surface listing what a named student got wrong.
  // Indexing it would advertise a URL that answers nothing to a signed-out
  // reader and something private to a signed-in one.
  robots: { index: false, follow: false },
};

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
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
