import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — Ledger",
  description: "The terms governing your use of Ledger.",
};

const UPDATED = "19 May 2026";

export default function TermsPage() {
  return (
    <main id="main-content" style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid var(--rule)", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink)", textDecoration: "none" }}>LEDGER</Link>
        <Link href="/legal/privacy" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>← Privacy</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 40px 96px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 12 }}>Legal</div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 800, letterSpacing: "0.04em", lineHeight: 1, marginBottom: 8 }}>Terms of Use</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", marginBottom: 48 }}>Last updated: {UPDATED}</p>

        <Section title="Agreement">
          <P>By accessing or using Ledger at studyledger.in, you agree to be bound by these Terms of Use. If you do not agree, do not use the service. These terms constitute a binding agreement between you and Ledger Study Co. (&ldquo;Ledger&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).</P>
        </Section>

        <Section title="Eligibility">
          <P>You must be at least 13 years old to use Ledger. If you are under 18, you must have your parent or guardian&apos;s consent. By creating an account, you represent that you meet these requirements.</P>
          <P>Ledger is intended for personal, educational use. Use by automated systems, bots, or scrapers is prohibited without our written consent.</P>
        </Section>

        <Section title="Your Account">
          <P>You are responsible for keeping your login credentials secure. You must not share your account with others. Notify us immediately at <A href="mailto:support@studyledger.in">support@studyledger.in</A> if you suspect unauthorised access.</P>
          <P>We may suspend or terminate accounts that violate these terms, engage in abuse, or remain inactive for more than 24 months.</P>
        </Section>

        <Section title="Acceptable Use">
          <P>You may use Ledger to:</P>
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>Study, revise, and prepare for exams</li>
            <li>Generate, edit, and save your own study content</li>
            <li>Use AI tools to understand academic concepts</li>
            <li>Collaborate in study rooms with other students</li>
          </ul>
          <P>You must not use Ledger to:</P>
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>Submit AI-generated content as your own work in assessed conditions (academic dishonesty)</li>
            <li>Harass, bully, or harm other users</li>
            <li>Attempt to reverse-engineer, scrape, or copy the platform</li>
            <li>Upload illegal, harmful, or sexually explicit content</li>
            <li>Probe, scan, or test the security of our systems</li>
            <li>Circumvent any access controls or usage limits</li>
          </ul>
        </Section>

        <Section title="AI Tools — Important Disclaimer">
          <P>Ledger&apos;s AI tools are powered by Claude (Anthropic) and are designed to assist learning. They are not a substitute for qualified teachers, tutors, or official exam guidance. AI responses may contain errors.</P>
          <P>Do not use Ledger&apos;s AI outputs as the sole basis for medical, legal, financial, or any other professional decisions.</P>
          <P>AI responses to questions involving harmful or off-topic content will be blocked. Repeated attempts to bypass this may result in account suspension.</P>
        </Section>

        <Section title="User Content">
          <P>You retain ownership of all content you create on Ledger (notes, plans, essays). By storing content on Ledger, you grant us a limited licence to process and display it solely to provide the service to you.</P>
          <P>We do not claim ownership of your study data. You can export or delete it at any time.</P>
        </Section>

        <Section title="Intellectual Property">
          <P>The Ledger name, logo, interface design, tool prompts, and all original software are owned by Ledger Study Co. and protected under Indian intellectual property law. You may not copy, modify, or redistribute them without written permission.</P>
          <P>The fonts, third-party libraries, and open-source components used in Ledger remain the property of their respective owners and are used under their respective licences.</P>
        </Section>

        <Section title="Pricing & Plans">
          <P>Ledger is currently free. From 8 October 2026, a free tier with 20 AI queries/day and paid plans will be introduced. Paid users will be notified 30 days in advance with pricing details.</P>
          <P>We reserve the right to change pricing at any time with reasonable notice.</P>
        </Section>

        <Section title="Limitation of Liability">
          <P>Ledger is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, Ledger Study Co. is not liable for:</P>
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>Errors or inaccuracies in AI-generated content</li>
            <li>Loss of study data due to technical failure (though we maintain backups)</li>
            <li>Exam outcomes, grades, or academic results</li>
            <li>Service interruptions or downtime</li>
          </ul>
          <P>Our total liability to you for any claim shall not exceed the amount you paid to Ledger in the 12 months preceding the claim.</P>
        </Section>

        <Section title="Governing Law">
          <P>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of India. If you are located outside India, you agree to resolve disputes under Indian law.</P>
        </Section>

        <Section title="Changes to These Terms">
          <P>We may update these terms as the product evolves. Material changes will be communicated via in-app notice at least 14 days before they take effect. Continued use after notice constitutes acceptance.</P>
        </Section>

        <Section title="Contact">
          <P>For questions about these terms: <A href="mailto:legal@studyledger.in">legal@studyledger.in</A></P>
        </Section>

        <div style={{ borderTop: "1px solid var(--rule)", marginTop: 48, paddingTop: 24, display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[["Privacy Policy", "/legal/privacy"], ["Data & Compliance", "/legal/data"], ["IP Policy", "/legal/ip"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cinnabar-ink)", textDecoration: "none" }}>{l} →</Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>{title}</h2>
      {children}
    </section>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.8, color: "var(--ink-2)", marginBottom: 12 }}>{children}</p>;
}
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} style={{ color: "var(--cinnabar-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>{children}</a>;
}
