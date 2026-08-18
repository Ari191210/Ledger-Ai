import type { Metadata } from "next";
import {
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_Tamil,
} from "next/font/google";
import AuthGuard from "@/components/auth-guard";
import VitalityShell from "@/components/console/vitality-shell";
import "../console/console.css";

// ═══════════════════════════════════════════════════════════════════════════
// HOME SHELL — the one shell (M3-1).
//
// `/dashboard` and `/console` are merged here (`PRODUCT_DECISIONS` §2.4,
// architecture T10: two shells both computing the score guarantee divergence
// once the event layer lands underneath them).
//
// This shell is the Console's, not the legacy dashboard's, for one reason:
// the Console layer already carries the primitives, the token scope and the
// earned-colour shell, and M3 is a structural consolidation — it is not
// licensed to redesign anything. The stylesheet and the fonts are imported
// from `app/console/` rather than copied, so there is one definition.
//
// NOT M22. Composition — the component registry, the four importance tiers,
// server-persisted `HomeLayout` — is architecture Part M and milestone M22.
// Nothing here is customisable, ordered or persisted, deliberately.
// ═══════════════════════════════════════════════════════════════════════════

const sans = IBM_Plex_Sans({
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

// Indic coverage travels with the shell, not with one route. `preload: false`
// means a student working entirely in English downloads neither face.
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
  title: "Home — StudyLedger",
  // An authenticated student surface. Indexing it would advertise a URL that
  // answers nothing to a signed-out reader.
  robots: { index: false, follow: false },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* VitalityShell owns the [data-console] token scope and writes
          --vitality, so no page has to remember to set it. */}
      <VitalityShell
        className={`${sans.variable} ${mono.variable} ${devanagari.variable} ${tamil.variable}`}
      >
        {children}
      </VitalityShell>
    </AuthGuard>
  );
}
