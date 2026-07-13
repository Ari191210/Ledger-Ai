import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import Tracker from "@/components/tracker";
import SyncManager from "@/components/sync-manager";
import ErrorBoundary from "@/components/error-boundary";
import ErrorLogger from "@/components/error-logger";
import PostHogProvider from "@/components/posthog-provider";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
// The editorial layer loads AFTER globals.css and deliberately overrides it:
// palette, type, rules, grid, and the suppression of the glass/glow/gradient
// vocabulary that globals.css still defines. See the header of that file.
import "./editorial.css";

// ═══════════════════════════════════════════════════════════════════════════
// The publication's three voices. A newspaper does not use eight typefaces.
//
// NOTE ON THE OLD VARIABLE NAMES: this file previously loaded Instrument Serif
// into a variable called --font-orbitron and DM Sans into --font-inter. The
// names were lies and every consumer inherited the confusion. The variables
// below say what they actually are. The legacy aliases are kept mapped in
// app/editorial.css so nothing that still reads them breaks mid-migration.
// ═══════════════════════════════════════════════════════════════════════════

// DISPLAY — mastheads, front-page headlines, index figures.
// A Didone with severe thick/thin contrast: the register of a masthead engraved
// rather than typed. This is the single most identity-defining choice here.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// BODY — every word of running copy, every report, every standfirst.
// Source Serif 4 over Libre Baskerville deliberately: it was drawn for screens
// and holds up at the small sizes that high information density demands.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

// DATA — index values, deltas, tickers, tables, datelines, kickers.
// Everything numeric or metadata is monospaced so figures align in columns
// exactly as they do on a financial page, and so a rising number cannot make
// the row beside it reflow.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudyLedger | The Student's Operating System",
  description:
    "Know exactly how ready you are for your exams. One live Ledger Score out of 1000, moved by every study session — past papers, planner, doubt solver, flashcards, exam simulator — calibrated to your board, grade, and exam date.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://studyledger.in"),
  alternates: {
    canonical: "/",
  },
  keywords: [
    "student study app", "AI study tools", "CBSE study", "JEE preparation", "NEET preparation",
    "IGCSE study", "IB study tools", "study planner", "past papers", "exam preparation",
    "flashcards", "marks predictor", "doubt solver", "study OS", "ledger study",
  ],
  openGraph: {
    title: "StudyLedger | The Student's Operating System",
    description:
      "One live exam-readiness score, moved by every study session. Past papers, planner, doubt solver, flashcards - calibrated to your board, grade, and exam date.",
    url: "https://studyledger.in",
    siteName: "StudyLedger",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StudyLedger | The Student's Operating System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyLedger | The Student's Operating System",
    description:
      "One live exam-readiness score, moved by every study session. Calibrated to your board, grade, and exam date.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSerif.variable} ${plexMono.variable}`}
      // The edition script below stamps data-edition on <html> before paint, so
      // the server's HTML (no attribute) and the client's (attribute present)
      // necessarily differ. That is the whole point — it is how the flash of the
      // wrong edition is avoided. Suppressing the warning on this one element is
      // the sanctioned fix; it does not suppress it for any child.
      suppressHydrationWarning
    >
      <head>
        {/* ═══════════════════════════════════════════════════════════════════
            EDITION SELECTOR (anti-flash, runs before first paint)

            This replaced a 15-palette x 15-accent theme engine that also
            injected arbitrary user fonts, radii, content widths and animation
            speeds from localStorage.

            A newspaper has ONE voice. That is what makes it authoritative: you
            cannot buy the Financial Times in teal. The configurability was
            actively working against the identity, so it is gone.

            What survives is the only distinction a real publication makes —
            the print edition and the evening edition:

              PRINT   (default) — cream stock, black ink. Read in daylight.
              EVENING           — dark stock, warm ink. Read at night.

            Legacy keys (theme-base, theme-accent, ledger-font-*, ledger-radius,
            ledger-width, ledger-anim-speed) are deliberately IGNORED, not
            migrated. Anyone carrying an old obsidian/violet palette gets the
            paper instead. app/editorial.css defines both editions.
            ═══════════════════════════════════════════════════════════════════ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;var e=localStorage.getItem('ledger-edition');if(e!=='evening'&&e!=='print'){e=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'evening':'print';}r.dataset.edition=e;}catch(x){document.documentElement.dataset.edition='print';}})();`,
          }}
        />
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "StudyLedger",
              "url": "https://studyledger.in",
              "logo": "https://studyledger.in/icon-512.png",
              "description": "AI-powered student OS with a live Ledger Score for Indian board exam preparation",
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "hello@studyledger.in",
                "contactType": "customer support",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "What is StudyLedger?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "StudyLedger is an AI-powered student operating system built around the Ledger Score - a live exam-readiness score out of 1000 - with a study planner, past paper analyser, flashcards, and doubt solver, board-aware for CBSE, ICSE, IB, IGCSE and more.",
                  },
                },
                {
                  "@type": "Question",
                  "name": "Is StudyLedger free?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. The Free plan includes 20 AI requests/day and core tools. Pro (₹199/month) unlocks every tool and unlimited AI.",
                  },
                },
                {
                  "@type": "Question",
                  "name": "Which boards are supported?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "CBSE, ICSE, IB, IGCSE, State Board, and Home School. Calibrated for JEE, NEET, CUET, IPMAT, CA Foundation, and SAT/ACT.",
                  },
                },
                {
                  "@type": "Question",
                  "name": "What is the Ledger Score?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "A 0-1000 real-time exam readiness score based on past paper accuracy, syllabus coverage, mistake correction speed, and daily consistency.",
                  },
                },
              ],
            }),
          }}
        />
        {/* Cream stock. The evening edition overrides this from editorial.css. */}
        <meta name="theme-color" content="#F7F3EA" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#14120E" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        {/* The three Google fonts are self-hosted by next/font — no external font
            CDN, no render-blocking stylesheet, no preconnect needed. The Fontshare
            (Orsiri) link that used to live here is gone with the theme engine. */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}` }} />
      </head>
      <body>
        {/* ═══════════════════════════════════════════════════════════════════
            REMOVED, deliberately — the SaaS layer.

              <Cursor />            custom dot+ring crosshair
              <WebGLShader />       full-viewport animated aurora
              <PageGradient />      ambient glow wash
              <ButtonClickEffect /> flow-state shimmer on every press
              #global-liquid-glass  SVG displacement filter behind .btn glass

            Newspapers do not glow. Every one of these was working against the
            authority the product is trying to buy, and three of them
            (shader, gradient, cursor) were also painting on every frame on
            every route. Print is still, and stillness is what reads as
            expensive.

            The components still exist on disk; they are simply not mounted.
            Deleting them is a separate cleanup once the redesign has landed.
            ═══════════════════════════════════════════════════════════════════ */}
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AuthProvider>
          <PostHogProvider />
          <ErrorLogger />
          <Tracker />
          <SyncManager />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <WhatsAppWidget />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
