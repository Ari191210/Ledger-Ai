import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data & Compliance — Ledger",
  description: "How Ledger complies with DPDP Act 2023, GDPR, and data security standards.",
};

const UPDATED = "19 May 2026";

export default function DataCompliancePage() {
  return (
    <main id="main-content" style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid var(--rule)", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink)", textDecoration: "none" }}>LEDGER</Link>
        <Link href="/legal/privacy" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>← Privacy</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 40px 96px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 12 }}>Legal</div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 800, letterSpacing: "0.04em", lineHeight: 1, marginBottom: 8 }}>Data & Compliance</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", marginBottom: 48 }}>Last updated: {UPDATED}</p>

        <Section title="India — DPDP Act 2023">
          <P>Ledger complies with the Digital Personal Data Protection Act, 2023 (India). As a Data Fiduciary, we:</P>
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>Collect only the personal data necessary to provide the service (data minimisation)</li>
            <li>Obtain explicit consent before processing personal data</li>
            <li>Allow users to access, correct, and erase their data on request</li>
            <li>Appoint a Data Protection Officer reachable at <A href="mailto:hello@studyledger.in">hello@studyledger.in</A></li>
            <li>Notify affected users within 72 hours of any confirmed data breach</li>
            <li>Do not process personal data of children under 13 without verifiable parental consent</li>
          </ul>
        </Section>

        <Section title="GDPR (European Users)">
          <P>If you are located in the European Economic Area (EEA) or UK, the following applies in addition to our standard privacy policy.</P>
          <H3>Legal basis for processing</H3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--sans)", fontSize: 13, marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--rule)" }}>
                <Th>Processing activity</Th><Th>Legal basis</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Account creation and authentication", "Contract performance"],
                ["Syncing study data across devices", "Contract performance"],
                ["AI interaction history", "Legitimate interest (product improvement)"],
                ["Analytics (PostHog)", "Legitimate interest (product analytics)"],
                ["Error reporting (Sentry)", "Legitimate interest (system reliability)"],
                ["Transactional emails (Resend)", "Contract performance"],
              ].map(([a, b]) => (
                <tr key={a} style={{ borderBottom: "1px solid var(--rule-2)" }}>
                  <Td>{a}</Td><Td bold>{b}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <H3 style={{ marginTop: 24 }}>International transfers</H3>
          <P>Some processors (Anthropic, Sentry, Resend) are based in the US. Transfers are covered by Standard Contractual Clauses (SCCs) or adequacy decisions where applicable.</P>
          <H3>EEA user rights</H3>
          <P>You have rights to access, rectification, erasure, restriction, portability, and to object to processing. You may also lodge a complaint with your national data protection authority. Contact <A href="mailto:hello@studyledger.in">hello@studyledger.in</A> to exercise these rights.</P>
        </Section>

        <Section title="What We Store & Where">
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--sans)", fontSize: 13, marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--rule)" }}>
                <Th>Data type</Th><Th>Storage</Th><Th>Retention</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Account profile", "Supabase (PostgreSQL)", "Until account deleted"],
                ["Study data blob", "Supabase (PostgreSQL)", "Until account deleted"],
                ["AI interaction history", "Supabase (PostgreSQL)", "90 days rolling"],
                ["Page events", "Supabase (PostgreSQL)", "12 months"],
                ["Error reports", "Sentry", "90 days"],
                ["Analytics events", "PostHog", "12 months"],
                ["UI preferences", "Browser localStorage", "Until browser cleared"],
              ].map(([d, s, r]) => (
                <tr key={d} style={{ borderBottom: "1px solid var(--rule-2)" }}>
                  <Td bold>{d}</Td><Td>{s}</Td><Td>{r}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Security Measures">
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2.1, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li><strong>Encryption in transit:</strong> TLS 1.3 on all connections</li>
            <li><strong>Encryption at rest:</strong> AES-256 on Supabase storage</li>
            <li><strong>Row Level Security (RLS):</strong> database policies ensure each user only accesses their own data</li>
            <li><strong>Service role isolation:</strong> the public client has anon-key access only; privileged operations use a server-side service role key never exposed to the browser</li>
            <li><strong>Rate limiting:</strong> IP-based limits on AI endpoints prevent abuse</li>
            <li><strong>Content moderation:</strong> AI inputs are scanned for harmful content before reaching the model</li>
            <li><strong>Dependency auditing:</strong> automated vulnerability scanning on every deploy</li>
          </ul>
        </Section>

        <Section title="Cookies & Tracking">
          <P>Ledger uses <strong>no tracking cookies</strong>. We use browser <code style={{ fontFamily: "var(--mono)", fontSize: 12, background: "var(--paper-2)", padding: "1px 5px", borderRadius: 3 }}>localStorage</code> for UI state (palette, density, mode) that never leaves your device.</P>
          <P>PostHog analytics runs with autocapture disabled. We record deliberate user actions (page views, tool opens) without tracking mouse movements, scroll depth, or keystrokes.</P>
        </Section>

        <Section title="Data Breach Response">
          <P>In the event of a confirmed data breach affecting personal data:</P>
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>We will notify affected users within 72 hours of becoming aware</li>
            <li>We will notify relevant supervisory authorities as required by law</li>
            <li>We will publish a post-incident report within 30 days</li>
          </ul>
          <P>To report a security vulnerability: <A href="mailto:hello@studyledger.in">hello@studyledger.in</A></P>
        </Section>

        <Section title="Data Portability & Deletion">
          <P>You can export your full study data as a JSON file from your profile settings at any time. This includes your planner, marks, goals, and preferences.</P>
          <P>To delete your account and all associated data, go to Settings → Account → Delete Account. Deletion is processed within 30 days. AI history and analytics events are purged within 90 days.</P>
        </Section>

        <div style={{ borderTop: "1px solid var(--rule)", marginTop: 48, paddingTop: 24, display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[["Privacy Policy", "/legal/privacy"], ["Terms of Use", "/legal/terms"], ["IP Policy", "/legal/ip"]].map(([l, h]) => (
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
function H3({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h3 style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 8, marginTop: 20, ...style }}>{children}</h3>;
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
