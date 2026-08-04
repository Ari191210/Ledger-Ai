import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import AuthGuard from "@/components/auth-guard";
import VitalityShell from "@/components/console/vitality-shell";
import "./console.css";

// ═══════════════════════════════════════════════════════════════════════════
// CONSOLE SHELL
//
// Deliberately does NOT reuse app/dashboard/layout.tsx: that layout mounts
// AppNav and StudyEntrance, which are the legacy chrome and a full-screen
// takeover. Console provides its own chrome, and a Phase 0 proof cannot be
// judged through another design system's furniture.
//
// The route is unlinked — nothing in the product navigates here. That is the
// isolation mechanism for Phase 0: zero existing files are modified, and no
// student can reach this surface by accident.
//
// Fonts are scoped here rather than the root layout so the 46 legacy routes
// do not download two extra families they never use.
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

export const metadata: Metadata = {
  title: "Now — StudyLedger",
  robots: { index: false, follow: false },
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* VitalityShell owns the [data-console] token scope and writes
          --vitality. It lives here rather than in any page so every Console
          surface inherits earned colour automatically — a page cannot forget
          to set it, because a page never sets it. */}
      <VitalityShell className={`${sans.variable} ${mono.variable}`}>
        {children}
      </VitalityShell>
    </AuthGuard>
  );
}
