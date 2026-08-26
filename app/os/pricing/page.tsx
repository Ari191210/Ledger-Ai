import type { Metadata } from "next";
import PricingPage from "@/components/os/pricing";

export const metadata: Metadata = {
  title: "Pricing — StudyLedger",
  description: "Every journey section is free. The paid tiers add AI capacity and the study tools.",
};

export default function Page() {
  return <PricingPage />;
}
