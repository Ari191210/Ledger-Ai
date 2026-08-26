import type { Metadata } from "next";
import AboutPage from "@/components/os/about";

export const metadata: Metadata = {
  title: "About — StudyLedger",
  description: "An academic operating system, built by a student in Delhi.",
};

export default function Page() {
  return <AboutPage />;
}
