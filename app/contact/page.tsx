import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/marketing/legal-page";
import { LegalTodo } from "@/components/marketing/legal-todo";

export const metadata: Metadata = {
  title: "Contact — StudyLedger",
  description: "Get in touch with StudyLedger.",
};

export default function ContactPage() {
  return (
    <LegalPage label="get in touch" title="Contact" updated="5 September 2026">
      <LegalSection title="Support and general questions">
        <p>
          Support email: <LegalTodo>support email address</LegalTodo>
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
          India's IT Rules 2021: <LegalTodo>grievance officer name and contact</LegalTodo>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
