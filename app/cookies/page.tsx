import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Every cookie and browser setting StudyLedger stores, and why there is no cookie banner.",
  alternates: { canonical: "/cookies" },
  openGraph: {
    type: "website",
    url: "/cookies",
    siteName: "StudyLedger",
    title: "Cookie Policy · StudyLedger",
    description: "Every cookie and browser setting StudyLedger stores, and why there is no cookie banner.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy · StudyLedger",
    description: "Every cookie and browser setting StudyLedger stores, and why there is no cookie banner.",
  },
};

export default function CookiesPage() {
  return (
    <LegalPage label="legal" title="Cookie Policy" updated="1 October 2026">
      <LegalSection title="The short version">
        <p>
          StudyLedger sets one kind of cookie, the one that keeps you signed in,
          and stores two settings in your browser. There are no analytics,
          advertising or tracking cookies, and no third party sets cookies
          through studyledger.in.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <ul>
          <li>
            <strong>Sign-in session</strong> (named <code>sb-…-auth-token</code>, set by
            Supabase, our authentication provider). It keeps you signed in between
            pages and visits. Without it you could not use your account. It is
            deleted when you sign out.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Browser storage">
        <p>These stay on your device and are never sent to us:</p>
        <ul>
          <li><code>sl-theme</code>: whether you chose light or dark mode.</li>
          <li><code>sl-sound</code>: whether interface sounds are on.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Why there is no cookie banner">
        <p>
          Consent banners exist for optional cookies such as analytics and
          advertising. StudyLedger has none of those; the only cookie is the one
          the product cannot work without, so there is nothing to opt in or out
          of. If we ever add an optional cookie, we will ask first, before it is
          set, and list it here.
        </p>
      </LegalSection>

      <LegalSection title="Clearing them">
        <p>
          Signing out removes the session cookie. You can clear both settings
          at any time from your browser&apos;s site data controls; the site will
          simply go back to its defaults. The rest of what we store, and how to
          export or delete it, is in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
