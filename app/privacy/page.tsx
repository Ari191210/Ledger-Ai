import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What StudyLedger collects, why, and how to export or delete it.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
    siteName: "StudyLedger",
    title: "Privacy Policy · StudyLedger",
    description: "What StudyLedger collects, why, and how to export or delete it.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy · StudyLedger",
    description: "What StudyLedger collects, why, and how to export or delete it.",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage label="legal" title="Privacy Policy" updated="6 September 2026">
      <LegalSection title="What this covers">
        <p>
          This describes what StudyLedger (studyledger.in) collects when you
          use it, why, and what you can do about it. It applies to the
          product as it exists today, not to any future feature.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>Account and profile:</p>
        <ul>
          <li>Your email address and password (password is handled entirely by our authentication provider, Supabase; we never see or store it in plain text).</li>
          <li>Your display name, grade, board, stream, and target exam, if you provide them.</li>
          <li>Your date of birth. We ask for this because India&apos;s data protection law sets different obligations for users under 18, so we need to know which accounts those are. It is not shown on your profile and is not used for anything else.</li>
        </ul>
        <p>Study data you create by using the product:</p>
        <ul>
          <li>Study sessions and streaks, mistakes you log, PYQ attempts and scores, syllabus topics and coverage, habits and habit logs, deadlines.</li>
        </ul>
        <p>Content you submit to an AI tool (Doubt Solver, Notes, Essay Grader, and the other AI-backed tools):</p>
        <ul>
          <li>The text you type into that tool, sent to Anthropic (the maker of Claude, the model we use) to generate a response. Anthropic processes this to return the result to you; see their own privacy documentation for how they handle it on their end.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What we don't collect">
        <p>
          No analytics or advertising trackers run on studyledger.in. We
          don't sell, rent, or share your data with advertisers. The only
          third party your data reaches is Anthropic, and only the specific
          text you submit to an AI tool, only to generate that tool's
          response.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          A session cookie set by Supabase keeps you signed in; it's
          required for the product to work and isn't used for tracking.
          Your browser's local storage holds your theme (light/dark) and
          sound preference, on your device only, never sent to us.
        </p>
      </LegalSection>

      <LegalSection title="Where your data lives">
        <p>
          Account data and study data are stored in Supabase (hosted
          Postgres and authentication). The application itself runs on
          Vercel. AI tool inputs are additionally processed by Anthropic as
          described above.
        </p>
      </LegalSection>

      <LegalSection title="Your data, your control">
        <p>
          From <Link href="/settings">Settings</Link> you can, at any time and without contacting
          anyone: download a full export of everything StudyLedger stores
          about you as JSON, or permanently delete your account, which
          deletes your profile and every table of study data tied to it. We
          don't retain a copy after deletion.
        </p>
      </LegalSection>

      <LegalSection title="Students under 18">
        <p>
          StudyLedger is built for school and exam-prep students, so most of
          the people using it are under 18. India&apos;s Digital Personal Data
          Protection Act, 2023 treats anyone under 18 as a child and sets
          stricter rules for their data. We ask for your date of birth at
          signup so we know which accounts those are.
        </p>
        <p>
          Three things we do not do, to any user, and will not start doing to
          students: we run no advertising of any kind, we run no third-party
          analytics or tracking scripts, and we do not build behavioural
          profiles for advertising or sell data to anyone. What StudyLedger
          records is the study activity you enter yourself, used to produce the
          score and suggestions that are the product you asked for, and shown
          only back to you.
        </p>
        <p>
          We want to be straight about where we are rather than claim more than
          is true. The Act requires verifiable parental consent before
          processing a child&apos;s data, and the 2025 Rules point to
          government-backed identity verification as the way to obtain it. That
          mechanism is not built yet. The compliance date set by the Rules is 14
          May 2027, and we intend to have it in place before then. Until it is,
          collecting your date of birth is groundwork, and nothing about how
          your account works changes because of your age.
        </p>
        <p>
          A parent or guardian can request an export or deletion on a
          student&apos;s behalf at any time using the contact below, and any
          student can do both themselves from{" "}
          <Link href="/settings">Settings</Link> without asking anyone.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If this changes, we'll update the date at the top of this page.
          Material changes will be called out here.
        </p>
      </LegalSection>

      <LegalSection title="Contact and grievance officer">
        <p>
          Questions about this policy, or a data request you'd rather send
          directly: <Link href="/contact">contact us</Link>.
        </p>
        <p>
          Operator: Aryamman Ojha
          <br />
          Based in: New Delhi, India
          <br />
          Grievance officer (per India's IT Rules 2021): Aryamman Ojha, <a href="mailto:hello@studyledger.in">hello@studyledger.in</a>
          <br />
          Governing jurisdiction: India, courts of Delhi
        </p>
      </LegalSection>
    </LegalPage>
  );
}
