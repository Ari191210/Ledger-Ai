import type { Metadata } from "next";
import ToolsDashboard from "@/components/os/tools-dashboard";

export const metadata: Metadata = {
  title: "Tools — StudyLedger",
  description: "Every tool, searchable by what you need to do.",
};

export default function Page() {
  return <ToolsDashboard />;
}
