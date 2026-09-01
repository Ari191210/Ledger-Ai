import type { Metadata } from "next";

// ═══════════════════════════════════════════════════════════════════════════
// LEGAL LAYOUT — M16-2.
//
// Deliberately NOT the Console shell `/settings`, `/home`, `/capture`,
// `/diagnosis` and `/record` share. Those four are all behind `AuthGuard` and
// `VitalityShell` computes a signed-in student's earned vitality; `/legal` is
// one of the three V1 routes (with `/auth` and `/onboard`) that must answer a
// SIGNED-OUT reader, so it keeps the plain editorial chrome its four source
// pages (`/legal/privacy`, `/legal/terms`, `/legal/data`, `/legal/ip`)
// already used, rather than pulling in a shell built for an authenticated
// workspace.
// ═══════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "Legal — Ledger",
  description: "Privacy Policy, Terms of Use, Data & Compliance, and IP Policy — one page, four sections.",
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
