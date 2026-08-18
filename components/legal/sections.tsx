// ═══════════════════════════════════════════════════════════════════════════
// LEGAL SECTIONS — the four policies' prose, extracted verbatim from the
// retired `/legal/privacy`, `/legal/terms`, `/legal/data` and `/legal/ip`
// (M16-2). `PRODUCT_DECISIONS` §2.4: *"**Legal** ← `terms`, `privacy`, `data`,
// `ip`. Four routes, one page."* §3, route 9: *"`/legal` — Legally
// required."*
//
// No word of any policy changes here — a merge is a routing decision, not an
// editorial one, and a legal document is the last place a "structural
// consolidation, not a redesign" milestone should touch copy. Only the shared
// heading/paragraph/table chrome is deduplicated (each of the four source
// files declared identical `Section`/`P`/`A`/`H3`/`Th`/`Td` helpers).
// ═══════════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>{title}</h2>
      {children}
    </section>
  );
}
export function H3({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <h3 style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 8, marginTop: 20, ...style }}>{children}</h3>;
}
export function P({ children }: { children: ReactNode }) {
  return <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.8, color: "var(--ink-2)", marginBottom: 12 }}>{children}</p>;
}
export function A({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} style={{ color: "var(--cinnabar-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>{children}</a>;
}
export function Th({ children }: { children: ReactNode }) {
  return <th style={{ textAlign: "left", padding: "8px 12px 8px 0", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 400 }}>{children}</th>;
}
export function Td({ children, bold }: { children: ReactNode; bold?: boolean }) {
  return <td style={{ padding: "10px 12px 10px 0", color: bold ? "var(--ink)" : "var(--ink-2)", fontWeight: bold ? 600 : 400 }}>{children}</td>;
}
const UL: React.CSSProperties = { fontFamily: "var(--sans)", fontSize: 14, lineHeight: 2, color: "var(--ink-2)", paddingLeft: 20 };
const TABLE: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontFamily: "var(--sans)", fontSize: 13, marginTop: 12 };
const CODE: React.CSSProperties = { fontFamily: "var(--mono)", fontSize: 12, background: "var(--paper-2)", padding: "1px 5px", borderRadius: 3 };

export const PRIVACY_UPDATED = "6 June 2026";
export const TERMS_UPDATED   = "6 June 2026";
export const DATA_UPDATED    = "19 May 2026";
export const IP_UPDATED      = "19 May 2026";

export function PrivacySection() {
  return (
    <>
      <Section title="Who We Are">
        <P>Ledger is operated by Aryamman Ojha (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), an independent student-education platform at studyledger.in. We build an academic intelligence platform — study and exam-readiness tools — for students aged 14–18 preparing for JEE, NEET, CBSE, IB, and other curricula.</P>
        <P>Questions about this policy: <A href="mailto:hello@studyledger.in">hello@studyledger.in</A></P>
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
        <H3>Session recordings</H3>
        <P>We use PostHog Session Replay to record anonymised screen activity (mouse movement, clicks, scrolls) to understand how students use the tools and fix usability problems. All form inputs and text fields are masked — we never record what you type. You can opt out by emailing <A href="mailto:hello@studyledger.in">hello@studyledger.in</A>.</P>
        <H3>Error reports</H3>
        <P>If something breaks, Sentry captures the error, browser context, and a stack trace. Email addresses are stripped before any error is sent.</P>
        <H3>What we do NOT collect</H3>
        <P>We do not collect payment information, location data, device identifiers, or biometrics. We do not use third-party advertising cookies.</P>
      </Section>

      <Section title="How We Use Your Data">
        <ul style={UL}>
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
        <table style={TABLE}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--rule)" }}>
              <Th>Processor</Th><Th>Purpose</Th><Th>Location</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Supabase", "Database, authentication, file storage", "US / EU"],
              ["Anthropic", "AI responses (Claude)", "US"],
              ["PostHog", "Product analytics + session replay", "US"],
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
        <P>We do not knowingly collect data from children under 13. If you believe a child under 13 has created an account, contact us at <A href="mailto:hello@studyledger.in">hello@studyledger.in</A> and we will delete the account immediately.</P>
      </Section>

      <Section title="Your Rights">
        <P>Under the Digital Personal Data Protection Act 2023 (India) and, where applicable, the GDPR, you have the right to:</P>
        <ul style={UL}>
          <li><strong>Access</strong> — request a copy of all data we hold about you</li>
          <li><strong>Correction</strong> — ask us to fix inaccurate data</li>
          <li><strong>Deletion</strong> — delete your account and all associated data from your profile settings</li>
          <li><strong>Portability</strong> — export your study data as JSON from the dashboard</li>
          <li><strong>Withdraw consent</strong> — stop using the service at any time; your data is deleted on request</li>
        </ul>
        <P>To exercise any right, email <A href="mailto:hello@studyledger.in">hello@studyledger.in</A>. We will respond within 30 days.</P>
      </Section>

      <Section title="Data Retention">
        <P>Account and study data is kept for as long as your account is active. If you delete your account, all personal data is removed within 30 days. AI interaction history is automatically purged after 90 days.</P>
        <P>Anonymised, aggregated analytics (no personal identifiers) may be retained indefinitely for product research.</P>
      </Section>

      <Section title="Security">
        <P>All data is encrypted in transit (TLS 1.3) and at rest. Row-Level Security (RLS) on our database ensures your data is only accessible to your authenticated session. We perform regular security reviews.</P>
        <P>Despite our efforts, no system is perfectly secure. If you discover a vulnerability, report it to <A href="mailto:hello@studyledger.in">hello@studyledger.in</A>.</P>
      </Section>

      <Section title="Cookies & Local Storage">
        <P>We do not use tracking cookies. We set one first-party cookie, and only when you are signed in: it holds your login session so the server can tell it is you before a page loads. It is not used for advertising, profiling, or tracking you across sites, and it is never shared with a third party. Signing out deletes it.</P>
        <P>We use browser <code style={CODE}>localStorage</code> to save your palette preference, density setting, and mode — these never leave your device.</P>
      </Section>

      <Section title="Changes to This Policy">
        <P>We may update this policy as the product grows. Material changes will be announced via in-app notice at least 14 days before they take effect. Continued use after notice constitutes acceptance.</P>
      </Section>
    </>
  );
}

export function TermsSection() {
  return (
    <>
      <Section title="Agreement">
        <P>By accessing or using Ledger at studyledger.in, you agree to be bound by these Terms of Use. If you do not agree, do not use the service. These terms constitute a binding agreement between you and Aryamman Ojha (&ldquo;Ledger&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).</P>
      </Section>

      <Section title="Eligibility">
        <P>You must be at least 13 years old to use Ledger. If you are under 18, you must have your parent or guardian&apos;s consent. By creating an account, you represent that you meet these requirements.</P>
        <P>Ledger is intended for personal, educational use. Use by automated systems, bots, or scrapers is prohibited without our written consent.</P>
      </Section>

      <Section title="Your Account">
        <P>You are responsible for keeping your login credentials secure. You must not share your account with others. Notify us immediately at <A href="mailto:hello@studyledger.in">hello@studyledger.in</A> if you suspect unauthorised access.</P>
        <P>We may suspend or terminate accounts that violate these terms, engage in abuse, or remain inactive for more than 24 months.</P>
      </Section>

      <Section title="Acceptable Use">
        <P>You may use Ledger to:</P>
        <ul style={UL}>
          <li>Study, revise, and prepare for exams</li>
          <li>Generate, edit, and save your own study content</li>
          <li>Use AI tools to understand academic concepts</li>
          <li>Collaborate in study rooms with other students</li>
        </ul>
        <P>You must not use Ledger to:</P>
        <ul style={UL}>
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
        <P>The Ledger name, logo, interface design, tool prompts, and all original software are owned by Aryamman Ojha and protected under Indian intellectual property law. You may not copy, modify, or redistribute them without written permission.</P>
        <P>The fonts, third-party libraries, and open-source components used in Ledger remain the property of their respective owners and are used under their respective licences.</P>
      </Section>

      <Section title="Pricing & Plans">
        <P>Ledger is currently free. From 8 October 2026, a free tier with 20 AI queries/day and paid plans will be introduced. Paid users will be notified 30 days in advance with pricing details.</P>
        <P>We reserve the right to change pricing at any time with reasonable notice.</P>
      </Section>

      <Section title="Limitation of Liability">
        <P>Ledger is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, Aryamman Ojha is not liable for:</P>
        <ul style={UL}>
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
        <P>For questions about these terms: <A href="mailto:hello@studyledger.in">hello@studyledger.in</A></P>
      </Section>
    </>
  );
}

export function DataSection() {
  return (
    <>
      <Section title="India — DPDP Act 2023">
        <P>Ledger complies with the Digital Personal Data Protection Act, 2023 (India). As a Data Fiduciary, we:</P>
        <ul style={UL}>
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
        <table style={TABLE}>
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
        <table style={TABLE}>
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
        <ul style={{ ...UL, lineHeight: 2.1 }}>
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
        <P>Ledger uses <strong>no tracking cookies</strong>. It sets one <strong>strictly necessary first-party cookie</strong>, named <code style={CODE}>sb-&lt;project&gt;-auth-token</code>, present only while you are signed in. It carries your Supabase authentication session so the server can verify who you are before a page renders; large sessions are split across numbered cookies of the same name. It is first-party, <code style={CODE}>SameSite=Lax</code>, scoped to this site, and it is deleted when you sign out. Because it is essential to a service you asked for, it does not require consent under the ePrivacy Directive or the DPDP Act; it is not used for analytics, advertising, or cross-site tracking.</P>
        <P>We use browser <code style={CODE}>localStorage</code> for UI state (palette, density, mode) that never leaves your device.</P>
        <P>PostHog analytics runs with autocapture disabled. We record deliberate user actions (page views, tool opens) without tracking mouse movements, scroll depth, or keystrokes.</P>
      </Section>

      <Section title="Data Breach Response">
        <P>In the event of a confirmed data breach affecting personal data:</P>
        <ul style={UL}>
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
    </>
  );
}

export function IPSection() {
  return (
    <>
      <Section title="Ledger's Intellectual Property">
        <P>All original elements of the Ledger platform are owned by Ledger Study Co. and protected under the Copyright Act, 1957 (India) and applicable international treaties. This includes:</P>
        <ul style={UL}>
          <li>The Ledger name, logo, and wordmark</li>
          <li>The platform&apos;s visual design, layout, and user interface</li>
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
        <P>Ledger&apos;s AI tools may help you study content from textbooks, past papers, syllabi, and other third-party sources. It is your responsibility to ensure your use of such content complies with the terms of those sources.</P>
        <P>Ledger does not host exam papers or copyrighted textbooks. AI responses are generated, not reproduced from copyrighted sources verbatim.</P>
      </Section>

      <Section title="Open Source Components">
        <P>Ledger is built on open-source software. Key dependencies and their licences:</P>
        <table style={TABLE}>
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
        <P>If you believe that content on Ledger infringes your copyright, send a notice to <A href="mailto:hello@studyledger.in">hello@studyledger.in</A> with the following information:</P>
        <ol style={UL}>
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
        <P>If you believe your content was removed incorrectly, you may send a counter-notice to <A href="mailto:hello@studyledger.in">hello@studyledger.in</A> including:</P>
        <ol style={UL}>
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
        <P>&ldquo;Ledger&rdquo;, &ldquo;studyledger.in&rdquo;, &ldquo;The Student&apos;s Operating System&rdquo;, and the Ledger logo are trademarks of Ledger Study Co. You may not use these marks in any way that implies affiliation, endorsement, or sponsorship without our prior written consent.</P>
      </Section>

      <Section title="Contact">
        <P>For all IP and copyright matters: <A href="mailto:hello@studyledger.in">hello@studyledger.in</A></P>
        <P>We aim to respond to all IP queries within 5 business days.</P>
      </Section>
    </>
  );
}
