import type { Metadata } from "next";
import JourneyShell from "@/components/journey/journey-shell";

export const metadata: Metadata = {
  title: "Your journey — StudyLedger",
  description: "Where you stand, what to do next, and what is coming.",
};

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return <JourneyShell>{children}</JourneyShell>;
}
