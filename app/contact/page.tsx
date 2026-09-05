import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Contact · StudyLedger",
  description:
    "How to reach StudyLedger for support, a privacy request, or a grievance.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    url: "/contact",
    siteName: "StudyLedger",
    title: "Contact · StudyLedger",
    description: "How to reach StudyLedger for support, a privacy request, or a grievance.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact · StudyLedger",
    description: "How to reach StudyLedger for support, a privacy request, or a grievance.",
  },
};

export default function ContactPage() {
  return (
    <LegalPage label="get in touch" title="Contact" updated="5 September 2026">
      <LegalSection title="Support and general questions">
        <p>
          Support email: <a href="mailto:hello@studyledger.in">hello@studyledger.in</a>
        </p>
        <p>
          For a data export or account deletion, you don't need to contact
          anyone: both are available directly in Settings once you're
          signed in.
        </p>
      </LegalSection>

      <LegalSection title="Privacy or legal requests">
        <p>
          For anything covered in the <Link href="/privacy">Privacy Policy</Link> or{" "}
          <Link href="/terms">Terms of Service</Link>, including a grievance under
          India's IT Rules 2021: Aryamman Ojha,{" "}
          <a href="mailto:hello@studyledger.in">hello@studyledger.in</a>, New Delhi, India.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
