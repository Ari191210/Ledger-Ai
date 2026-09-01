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
// SETTINGS SHELL — M16-1.
//
// `PRODUCT_DECISIONS` §3, route 8: *"`/settings` — Table stakes."* §2.4:
// *"**Settings** ← `/dashboard/profile`, `personalise`. Two profile
// editors."*
//
// The shell is `/home`'s, `/capture`'s, `/diagnosis`'s and `/record`'s,
// imported rather than copied — same fonts, same `console.css`, same
// `VitalityShell` token host, same `AuthGuard`. M16 is a structural
// consolidation like M3, M8 and M13's shell merges — not licensed to redesign
// anything — and a sixth shell for the fifth merge would be exactly the
// duplication M3 spent a milestone removing (architecture T10).
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
  title: "Settings — StudyLedger",
  // An authenticated profile editor. Nothing here answers a signed-out
  // reader, and everything here is private to a signed-in one.
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
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
