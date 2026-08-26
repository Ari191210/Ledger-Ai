import type { Metadata } from "next";
import LandingPage from "@/components/os/landing";

export const metadata: Metadata = {
  title: "StudyLedger — the academic operating system",
  description: "Know where you stand and what to do next. Academics, testing, colleges, applications and essays in one connected record.",
};

// Served at /os while the existing homepage stays in place. Swapping app/page.tsx
// over is a one-line change once the founder has seen this side by side.
export default function Page() {
  return <LandingPage />;
}
