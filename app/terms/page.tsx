import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service · StudyLedger",
  description:
    "The terms you agree to when you use StudyLedger, including how AI output should be treated.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
    siteName: "StudyLedger",
    title: "Terms of Service · StudyLedger",
    description: "The terms you agree to when you use StudyLedger, including how AI output should be treated.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service · StudyLedger",
    description: "The terms you agree to when you use StudyLedger, including how AI output should be treated.",
  },
};

export default function TermsPage() {
  return (
    <LegalPage label="legal" title="Terms of Service" updated="5 September 2026">
      <LegalSection title="Agreement">
        <p>
          By creating an account on StudyLedger (studyledger.in) you agree
          to these terms. If you're under 18, a parent or guardian should
          be aware you're using the product.
        </p>
      </LegalSection>

      <LegalSection title="What StudyLedger is">
        <p>
          A study-tracking and exam-prep product: a score computed from
          your real activity (PYQ accuracy, syllabus coverage, mistake
          patterns, consistency), 25 tools for planning, learning,
          practising, and tracking your prep, some of them backed by an AI
          model (Anthropic's Claude).
        </p>
      </LegalSection>

      <LegalSection title="AI-generated content">
        <p>
          Tools like Doubt Solver, Notes, Essay Grader, Flashcards, and
          others generate content using an AI model. AI output can be
          wrong, incomplete, or miscalibrated to your syllabus, especially
          for niche topics or recent syllabus changes. Treat it as a study
          aid, verify anything before an exam depends on it, and don't
          treat it as a substitute for your teacher or textbook.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <ul>
          <li>You're responsible for the accuracy of the information you provide and for keeping your password secure.</li>
          <li>One account per person. Don't share login credentials.</li>
          <li>You can delete your account at any time from Settings, no need to ask us.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>Don't:</p>
        <ul>
          <li>Automate or script requests to the AI tools beyond normal interactive use, or otherwise try to abuse rate limits.</li>
          <li>Use the product to generate content that's illegal, harassing, or intended to cheat during a live, proctored exam.</li>
          <li>Attempt to access another user's account or data.</li>
          <li>Scrape, reverse engineer, or resell the product.</li>
        </ul>
        <p>
          We can suspend or terminate accounts that violate this, with
          notice where practical.
        </p>
      </LegalSection>

      <LegalSection title="Your data">
        <p>
          The study data you log (mistakes, PYQ attempts, syllabus,
          habits, deadlines) is yours. See the <Link href="/privacy">Privacy Policy</Link> for what we
          collect and how to export or delete it.
        </p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          StudyLedger is provided as-is. We don't guarantee a particular
          exam outcome, score improvement, or that the product is
          error-free or available without interruption.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the extent permitted by law, StudyLedger isn't liable for
          indirect, incidental, or consequential damages arising from your
          use of the product, including exam results.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these terms as the product changes. The date at
          the top of this page reflects the last update; continued use
          after a change means you accept the update.
        </p>
      </LegalSection>

      <LegalSection title="Contact and governing law">
        <p>
          Questions about these terms: <Link href="/contact">contact us</Link>.
        </p>
        <p>
          Operator: Aryamman Ojha, based in New Delhi, India
          <br />
          Governing law: India
          <br />
          Dispute resolution / jurisdiction: courts of Delhi, India
        </p>
      </LegalSection>
    </LegalPage>
  );
}
