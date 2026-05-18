import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Ledger",
  description: "How Ledger collects, uses, and protects your data.",
};

const UPDATED = "19 May 2026";

export default function PrivacyPage() {
  return (
    <main id="main-content" style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid var(--rule)", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink)", textDecoration: "none" }}>LEDGER</Link>
        <Link href="/legal/terms" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>Terms →</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 40px 96px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 12 }}>Legal</div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 800, letterSpacing: "0.04em", lineHeight: 1, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", marginBottom: 48 }}>Last updated: {UPDATED}</p>

        <Section title="Who We Are">
          <P>Ledger is operated by Ledger Study Co. (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), an independent student-education platform at studyledger.in. We build AI-powered study tools for students aged 14–18 preparing for JEE, NEET, CBSE, IB, and other curricula.</P>
          <P>Questions about this policy: <A href="mailto:privacy@studyledger.in">privacy@studyledger.in</A></P>
        </Section>

        <Section title="Data We Collect">
          <H3>Account data</H3>
          <P>When you sign up: email address, display name, grade level, exam board, and target exam. This is stored in Supabase.</P>
          <H3>Study data</H3>
          <P>Your study preferences, planner entries, marks, streaks, and Ledger Score — stored as a JSON blob in your account row. This never leaves our systems except to render your dashboard.</P>
          <H3>AI interaction history</H3>
          <P>When you use an AI tool while signed in, we store the tool name, a short excerpt of your input (first 300 characters), and the AI response. This powers your history view and lets us improve tool quality.</P>
          <H3>Usage events</H3>
          <P>Page visits, tool opens, and session identifiers — collected via PostHog (analytics) with autocapture disabled. We record what you do, not how you do it.</P>
          <H3>Error reports</H3>
          <P>If something breaks, Sentry captures the error, browser context, and a stack trace. Email addresses are stripped before any error is sent.</P>
          <H3>What we do NOT collect</H3>
          <P>We do not collect payment information, location data, device identifiers, or biometrics. We do not use third-party advertising cookies.</P>
        </Section>

        <Section title="How We Use Your Data">
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>Provide, maintain, and improve the Ledger tools</li>
            <li>Sync your study data across devices</li>
            <li>Calculate your Ledger Score and streaks</li>
            <li>Send transactional emails (weekly study reports, account notices)</li>
            <li>Debug errors and prevent abuse</li>
            <li>Understand which tools are most useful (aggregate analytics only)</li>
          </ul>
          <P>We do not sell, rent, or trade your personal data. We do not use it for advertising.</P>
        </Section>

        <Section title="Data Processors">
          <P>We share data with the following sub-processors, each under a data processing agreement:</P>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--sans)", fontSize: 13, marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--rule)" }}>
                <Th>Processor</Th><Th>Purpose</Th><Th>Location</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Supabase", "Database, authentication, file storage", "US / EU"],
                ["Anthropic", "AI responses (Claude)", "US"],
                ["PostHog", "Product analytics", "EU (EU cloud)"],
                ["Sentry", "Error monitoring", "US"],
                ["Resend", "Transactional email", "US"],
              ].map(([p, pu, l]) => (
                <tr key={p} style={{ borderBottom: "1px solid var(--rule-2)" }}>
                  <Td bold>{p}</Td><Td>{pu}</Td><Td>{l}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Minors (Under 18)">
          <P>Ledger is designed for students aged 14–18. If you are under 18, your parent or guardian must consent to your use of this service. By creating an account, you confirm that either (a) you are 18 or older, or (b) your parent or guardian has reviewed and agreed to this policy on your behalf.</P>
          <P>We do not knowingly collect data from children under 13. If you believe a child under 13 has created an account, contact us at <A href="mailto:privacy@studyledger.in">privacy@studyledger.in</A> and we will delete the account immediately.</P>
        </Section>

        <Section title="Your Rights">
          <P>Under the Digital Personal Data Protection Act 2023 (India) and, where applicable, the GDPR, you have the right to:</P>
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li><strong>Access</strong> — request a copy of all data we hold about you</li>
            <li><strong>Correction</strong> — ask us to fix inaccurate data</li>
            <li><strong>Deletion</strong> — delete your account and all associated data from your profile settings</li>
            <li><strong>Portability</strong> — export your study data as JSON from the dashboard</li>
            <li><strong>Withdraw consent</strong> — stop using the service at any time; your data is deleted on request</li>
          </ul>
          <P>To exercise any right, email <A href="mailto:privacy@studyledger.in">privacy@studyledger.in</A>. We will respond within 30 days.</P>
        </Section>

        <Section title="Data Retention">
          <P>Account and study data is kept for as long as your account is active. If you delete your account, all personal data is removed within 30 days. AI interaction history is automatically purged after 90 days.</P>
          <P>Anonymised, aggregated analytics (no personal identifiers) may be retained indefinitely for product research.</P>
        </Section>

        <Section title="Security">
          <P>All data is encrypted in transit (TLS 1.3) and at rest. Row-Level Security (RLS) on our database ensures your data is only accessible to your authenticated session. We perform regular security reviews.</P>
          <P>Despite our efforts, no system is perfectly secure. If you discover a vulnerability, report it to <A href="mailto:security@studyledger.in">security@studyledger.in</A>.</P>
        </Section>

        <Section title="Cookies & Local Storage">
          <P>We do not use tracking cookies. We use browser <code style={{ fontFamily: "var(--mono)", fontSize: 12, background: "var(--paper-2)", padding: "1px 5px", borderRadius: 3 }}>localStorage</code> to save your palette preference, density setting, and mode — these never leave your device.</P>
        </Section>

        <Section title="Changes to This Policy">
          <P>We may update this policy as the product grows. Material changes will be announced via in-app notice at least 14 days before they take effect. Continued use after notice constitutes acceptance.</P>
        </Section>

        <div style={{ borderTop: "1px solid var(--rule)", marginTop: 48, paddingTop: 24, display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[["Terms of Use", "/legal/terms"], ["Data & Compliance", "/legal/data"], ["IP Policy", "/legal/ip"]].map(([l, h]) => (
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
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 6, marginTop: 20 }}>{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.8, color: "var(--ink-2)", marginBottom: 12 }}>{children}</p>;
}
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} style={{ color: "var(--cinnabar-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>{children}</a>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "8px 12px 8px 0", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 400 }}>{children}</th>;
}
function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return <td style={{ padding: "10px 12px 10px 0", color: bold ? "var(--ink)" : "var(--ink-2)", fontWeight: bold ? 600 : 400 }}>{children}</td>;
}
