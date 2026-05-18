import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IP & Copyright Policy — Ledger",
  description: "Ledger's policy on intellectual property, copyright, and infringement reporting.",
};

const UPDATED = "19 May 2026";

export default function IPPage() {
  return (
    <main id="main-content" style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid var(--rule)", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink)", textDecoration: "none" }}>LEDGER</Link>
        <Link href="/legal/terms" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>← Terms</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 40px 96px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 12 }}>Legal</div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 800, letterSpacing: "0.04em", lineHeight: 1, marginBottom: 8 }}>IP & Copyright</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", marginBottom: 48 }}>Last updated: {UPDATED}</p>

        <Section title="Ledger's Intellectual Property">
          <P>All original elements of the Ledger platform are owned by Ledger Study Co. and protected under the Copyright Act, 1957 (India) and applicable international treaties. This includes:</P>
          <ul style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>The Ledger name, logo, and wordmark</li>
            <li>The platform's visual design, layout, and user interface</li>
            <li>Original AI tool prompts, system instructions, and scoring logic</li>
            <li>Original written content, documentation, and marketing materials</li>
            <li>The Ledger Score algorithm and methodology</li>
          </ul>
          <P>You may not reproduce, redistribute, or create derivative works from any of the above without our prior written consent.</P>
        </Section>

        <Section title="Your Content">
          <P>You retain full ownership of all content you create using Ledger — your notes, essays, study plans, flashcards, and other personal study material. Ledger claims no intellectual property rights over your content.</P>
          <P>By storing content on Ledger, you grant us a limited, non-exclusive, royalty-free licence to process and display that content solely to provide the service to you. This licence ends when you delete your account.</P>
        </Section>

        <Section title="Third-Party Content">
          <P>Ledger's AI tools may help you study content from textbooks, past papers, syllabi, and other third-party sources. It is your responsibility to ensure your use of such content complies with the terms of those sources.</P>
          <P>Ledger does not host exam papers or copyrighted textbooks. AI responses are generated, not reproduced from copyrighted sources verbatim.</P>
        </Section>

        <Section title="Open Source Components">
          <P>Ledger is built on open-source software. Key dependencies and their licences:</P>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--sans)", fontSize: 13, marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--rule)" }}>
                <Th>Component</Th><Th>Licence</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Next.js", "MIT"],
                ["React", "MIT"],
                ["GSAP (GreenSock)", "Standard GSAP licence"],
                ["Supabase JS", "MIT"],
                ["Anthropic SDK", "MIT"],
                ["PostHog JS", "MIT"],
                ["Orbitron, Space Grotesk, Space Mono fonts", "SIL Open Font Licence 1.1"],
              ].map(([c, l]) => (
                <tr key={c} style={{ borderBottom: "1px solid var(--rule-2)" }}>
                  <Td bold>{c}</Td><Td>{l}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Reporting Copyright Infringement">
          <P>If you believe that content on Ledger infringes your copyright, send a notice to <A href="mailto:ip@studyledger.in">ip@studyledger.in</A> with the following information:</P>
          <ol style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>Your full name and contact information</li>
            <li>A description of the copyrighted work you claim has been infringed</li>
            <li>The specific URL(s) on Ledger where the infringing content appears</li>
            <li>A statement that you have a good-faith belief that the use is not authorised</li>
            <li>A statement that the information in your notice is accurate and, under penalty of perjury, that you are the copyright owner or authorised to act on their behalf</li>
            <li>Your physical or electronic signature</li>
          </ol>
          <P>We will investigate all notices and respond within 14 business days. If the claim is valid, the content will be removed or access restricted promptly.</P>
        </Section>

        <Section title="Counter-Notice">
          <P>If you believe your content was removed incorrectly, you may send a counter-notice to <A href="mailto:ip@studyledger.in">ip@studyledger.in</A> including:</P>
          <ol style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 }}>
            <li>Your full name and contact information</li>
            <li>Identification of the content that was removed and where it appeared</li>
            <li>A statement under penalty of perjury that the removal was a mistake or misidentification</li>
            <li>Your consent to the jurisdiction of the courts of India</li>
            <li>Your physical or electronic signature</li>
          </ol>
          <P>Upon receipt of a valid counter-notice, we may restore the content within 10–14 business days unless the original complainant initiates legal proceedings.</P>
        </Section>

        <Section title="Repeat Infringers">
          <P>Ledger has a policy of terminating accounts of users who are found to be repeat infringers of intellectual property rights in appropriate circumstances.</P>
        </Section>

        <Section title="Trademark">
          <P>"Ledger", "studyledger.in", "The Student's Operating System", and the Ledger logo are trademarks of Ledger Study Co. You may not use these marks in any way that implies affiliation, endorsement, or sponsorship without our prior written consent.</P>
        </Section>

        <Section title="Contact">
          <P>For all IP and copyright matters: <A href="mailto:ip@studyledger.in">ip@studyledger.in</A></P>
          <P>We aim to respond to all IP queries within 5 business days.</P>
        </Section>

        <div style={{ borderTop: "1px solid var(--rule)", marginTop: 48, paddingTop: 24, display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[["Privacy Policy", "/legal/privacy"], ["Terms of Use", "/legal/terms"], ["Data & Compliance", "/legal/data"]].map(([l, h]) => (
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
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "8px 12px 8px 0", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 400 }}>{children}</th>;
}
function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return <td style={{ padding: "10px 12px 10px 0", color: bold ? "var(--ink)" : "var(--ink-2)", fontWeight: bold ? 600 : 400 }}>{children}</td>;
}
