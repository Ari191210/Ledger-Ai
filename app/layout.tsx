import type { Metadata } from "next";
import {
  Instrument_Serif, DM_Sans, Space_Mono, Lora,     // legacy design system
  Playfair_Display, Source_Serif_4, IBM_Plex_Mono, // editorial design system
} from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import Tracker from "@/components/tracker";
import SyncManager from "@/components/sync-manager";
import ErrorBoundary from "@/components/error-boundary";
import ErrorLogger from "@/components/error-logger";
import PostHogProvider from "@/components/posthog-provider";
import { LegacyChromeWhisper } from "@/components/legacy-chrome";
import { GLASS_DISPLACEMENT_MAP } from "@/lib/glass-displacement-map";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
// Loaded globally, but INERT: every selector in editorial.css is scoped beneath
// [data-ui="editorial"], which only <EditorialShell> emits. A route that does
// not opt in is not touched by a single rule in that file.
import "./editorial.css";

// ═══════════════════════════════════════════════════════════════════════════
// TWO DESIGN SYSTEMS, SIDE BY SIDE
//
// The app is mid-migration. Both systems load; each owns the routes that opted
// into it, and neither can reach the other's.
//
//   LEGACY    (46 routes) — globals.css, the palette script, Orsiri + the four
//                           Google faces below, and the chrome in <LegacyChrome>.
//   EDITORIAL ( 1 route)  — editorial.css, scoped to [data-ui="editorial"],
//                           the three faces below, and no chrome at all.
//
// The seven font families are a deliberate, temporary cost of migrating safely.
// All seven carry preload: false, so a route only downloads the faces it renders
// — a legacy page never fetches Playfair, an editorial page never fetches DM
// Sans. The legacy four get deleted along with globals.css when the last route
// has migrated. The allowlist is lib/editorial-routes.ts.
// ═══════════════════════════════════════════════════════════════════════════

// ── Legacy faces. globals.css:178-181 composes --sans/--serif/--mono/--prose
//    from these plus Orsiri (loaded from Fontshare below). Removing any of them
//    silently changes the type on all 46 un-migrated routes.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"], weight: ["400"], style: ["normal", "italic"],
  variable: "--font-orbitron", display: "swap", preload: false,
});
const dmSans = DM_Sans({
  subsets: ["latin"], weight: ["400", "500", "600", "700"],
  variable: "--font-inter", display: "swap", preload: false,
});
const spaceMono = Space_Mono({
  subsets: ["latin"], weight: ["400", "700"],
  variable: "--font-space-mono", display: "swap", preload: false,
});
const lora = Lora({
  subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"],
  variable: "--font-lora", display: "swap", preload: false,
});

// ── Editorial faces. Consumed only under [data-ui="editorial"].
const playfair = Playfair_Display({
  subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display", display: "swap", preload: false,
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"],
  variable: "--font-body", display: "swap", preload: false,
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500", "600", "700"],
  variable: "--font-data", display: "swap", preload: false,
});

export const metadata: Metadata = {
  title: "StudyLedger | The Student's Operating System",
  description:
    "Know exactly how ready you are for your exams. One live Ledger Score out of 1000, moved by every study session — past papers, planner, doubt solver, flashcards, exam simulator — calibrated to your board, grade, and exam date.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://studyledger.in"),
  alternates: { canonical: "/" },
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
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "StudyLedger | The Student's Operating System" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyLedger | The Student's Operating System",
    description:
      "One live exam-readiness score, moved by every study session. Calibrated to your board, grade, and exam date.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable} ${spaceMono.variable} ${lora.variable} ${playfair.variable} ${sourceSerif.variable} ${plexMono.variable}`}
      // Both pre-paint scripts below stamp attributes on <html>, so the server's
      // markup and the client's necessarily differ. That is the point — it is how
      // the flash of a wrong-palette page is avoided. Scoped to this one element;
      // it suppresses nothing for any child.
      suppressHydrationWarning
    >
      <head>
        {/* ── LEGACY: palette injection, before first paint ──────────────────
            The 15-base x 15-accent theme engine, restored. The 46 routes still on
            globals.css depend on it: it sets --paper / --ink / --rule / --cinnabar
            on :root, and without it they fall back to raw globals defaults.

            An editorial route is unaffected. <EditorialShell> re-declares those
            same custom properties on ITSELF, and a custom property resolves from
            the nearest ancestor that declares it — so inside the shell the
            editorial values win, and outside it these do. The two systems cannot
            see each other.

            This script dies with globals.css when the last route migrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var B={"obsidian":{"p":"#0a0a0d","p2":"#101014","i":"#f2f1ed","i2":"#a6a49e","i3":"#68665f"},"void":{"p":"#000000","p2":"#0a0a0a","i":"#f0f0f0","i2":"#999999","i3":"#5c5c5c"},"graphite":{"p":"#0d0e11","p2":"#15171b","i":"#edeef0","i2":"#9ba0a8","i3":"#61666e"},"ink-navy":{"p":"#06080f","p2":"#0c1019","i":"#e7ecf6","i2":"#8d94ab","i3":"#545b72"},"deep-forest":{"p":"#070b09","p2":"#0d130f","i":"#e6f0ea","i2":"#8ba796","i3":"#52685a"},"espresso":{"p":"#0d0906","p2":"#150f0a","i":"#f2ebe3","i2":"#ab9a89","i3":"#6c5f51"},"wine":{"p":"#0c0709","p2":"#140b0e","i":"#f2e8ea","i2":"#a68d92","i3":"#6a555a"},"violet-night":{"p":"#0a0810","p2":"#120e1c","i":"#ece8f5","i2":"#a29aba","i3":"#675f80"},"slate-storm":{"p":"#090b0f","p2":"#0f131a","i":"#e9ecf1","i2":"#9aa1ad","i3":"#5f6672"},"charcoal-warm":{"p":"#0b0a08","p2":"#14120e","i":"#f0ede6","i2":"#a29c8d","i3":"#666256"},"paper":{"p":"#faf9f7","p2":"#f3f1ee","i":"#1a1917","i2":"#5c5952","i3":"#9a968c","L":1},"linen":{"p":"#faf7ef","p2":"#f4efe2","i":"#201a0f","i2":"#61543d","i3":"#a2937a","L":1},"fog":{"p":"#f7f8fa","p2":"#eef0f3","i":"#14171c","i2":"#4d545e","i3":"#8b93a0","L":1},"porcelain":{"p":"#f5f8fb","p2":"#eaf1f7","i":"#0f1a24","i2":"#445868","i3":"#7d95a6","L":1},"bone":{"p":"#f8f7f4","p2":"#f0ede7","i":"#1c1a16","i2":"#58544a","i3":"#948e80","L":1}};var A={"cinnabar":{"a":"#ff7c5c","am":"#e8623f"},"amber":{"a":"#f59e0b","am":"#d97706"},"saffron":{"a":"#eab308","am":"#ca8a04"},"sage":{"a":"#a3e635","am":"#84cc16"},"emerald":{"a":"#10b981","am":"#059669"},"teal":{"a":"#14b8a6","am":"#0d9488"},"sky":{"a":"#0ea5e9","am":"#0284c7"},"indigo":{"a":"#6366f1","am":"#4f46e5"},"violet":{"a":"#8b5cf6","am":"#7c3aed"},"plum":{"a":"#d946ef","am":"#a21caf"},"rose":{"a":"#f43f5e","am":"#e11d48"},"crimson":{"a":"#dc2626","am":"#b91c1c"},"copper":{"a":"#ea580c","am":"#c2410c"},"slate":{"a":"#64748b","am":"#475569"},"bronze":{"a":"#b45309","am":"#92400e"}};var b=localStorage.getItem('theme-base')||'obsidian';var ac=localStorage.getItem('theme-accent')||'cinnabar';var bd=B[b]||B.obsidian;var ad=A[ac]||A.cinnabar;function hx(h){var m=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(h);return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[0,0,0];}function rg(c,o){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+o+')';}var i3=hx(bd.i3),ac1=hx(ad.a),ac2=hx(ad.am);var r=document.documentElement;r.style.setProperty('--paper',bd.p);r.style.setProperty('--paper-2',bd.p2);r.style.setProperty('--ink',bd.i);r.style.setProperty('--ink-2',bd.i2);r.style.setProperty('--ink-3',bd.i3);r.style.setProperty('--cinnabar-ink',ad.a);r.style.setProperty('--cinnabar',ad.am);r.style.setProperty('--rule',rg(i3,0.20));r.style.setProperty('--rule-2',rg(i3,0.08));r.style.setProperty('--page-glow-a',rg(ac1,0.20));r.style.setProperty('--page-glow-b',rg(ac2,0.10));r.style.setProperty('--highlight',rg(ac1,0.16));r.dataset.base=b;r.dataset.accent=ac;r.dataset.palette=b;if(bd.L)r.dataset.mode='light';else delete r.dataset.mode;var d=localStorage.getItem('ledger-density');if(d&&d!=='default')r.dataset.density=d;var fs=localStorage.getItem('ledger-font-sans');if(fs)r.style.setProperty('--sans',fs+',system-ui,sans-serif');var fr=localStorage.getItem('ledger-font-serif');if(fr)r.style.setProperty('--serif',fr+',Georgia,serif');var fm=localStorage.getItem('ledger-font-mono');if(fm)r.style.setProperty('--mono',fm+',monospace');var rv=localStorage.getItem('ledger-radius');if(rv)r.style.setProperty('--radius',rv+'px');var rw=localStorage.getItem('ledger-width');if(rw){var wm={narrow:'860px',medium:'1100px',wide:'1400px'};if(wm[rw])r.style.setProperty('--content-max',wm[rw]);}var ra=localStorage.getItem('ledger-anim-speed');if(ra){var asp={reduced:'0.4',normal:'1',fast:'1.8'};if(asp[ra])r.style.setProperty('--anim-speed',asp[ra]);}var fsh={'Clash Display':'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,700&display=swap','Cabinet Grotesk':'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700&display=swap','Satoshi':'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'};function lnk(n,u){var id='font-'+n.toLowerCase().split(' ').join('-');if(!document.getElementById(id)){var l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=u||('https://fonts.googleapis.com/css2?family='+n.split(' ').join('+')+':wght@400;500;700&display=swap');document.head.appendChild(l);}}if(fs){var fsn=fs.charAt(0)==='"'?fs.slice(1,-1):fs;lnk(fsn,fsh[fsn]);}if(fr){var frn=fr.charAt(0)==='"'?fr.slice(1,-1):fr;lnk(frn);}if(fm){var fmn=fm.charAt(0)==='"'?fm.slice(1,-1):fm;lnk(fmn);}}catch(e){}})();`,
          }}
        />

        {/* ── EDITORIAL: edition selector, before first paint ────────────────
            Stamps data-edition on <html>. Read only by rules already scoped
            beneath [data-ui="editorial"], so on a legacy route the attribute is
            simply present and unused. */}
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
              "description": "An academic intelligence platform built around a live Ledger Score — a 0–1000 exam-readiness score — for Indian board exam preparation",
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
                    "text": "StudyLedger is an academic intelligence platform built around the Ledger Score - a live exam-readiness score out of 1000 - with a study planner, past paper analyser, flashcards, and doubt solver, board-aware for CBSE, ICSE, IB, IGCSE and more.",
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
        <meta name="theme-color" content="#18241b" />
        <link rel="apple-touch-icon" href="/icon.svg" />

        {/* LEGACY: Orsiri. globals.css:178-181 names it FIRST in --sans / --serif
            / --prose, so all 46 un-migrated routes actually render in it. Loaded
            async so it never blocks first paint. Dies with globals.css. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link rel="preload" as="style" href="https://api.fontshare.com/v2/css?f[]=orsiri@400,500,700&display=swap" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://api.fontshare.com/v2/css?f[]=orsiri@400,500,700&display=swap';document.head.appendChild(l);})();`,
          }}
        />
        <noscript>
          <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=orsiri@400,500,700&display=swap" />
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}` }} />
      </head>
      <body>
        {/* LEGACY: liquid-glass displacement filter, referenced by
            backdrop-filter: url(#global-liquid-glass) in globals.css .btn.
            An inert <defs>; it costs nothing on an editorial route, which never
            references it. */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
        >
          <defs>
            <filter id="global-liquid-glass" primitiveUnits="objectBoundingBox">
              <feImage result="map" width="1" height="1" x="0" y="0" href={GLASS_DISPLACEMENT_MAP} preserveAspectRatio="none" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blurred" />
              <feDisplacementMap in="blurred" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        {/* Legacy decorative chrome (custom cursor, WebGL aurora, page gradient,
            click shimmer) removed per Product Constitution §1/§6. Only the rank
            whisper remains, on legacy routes — see components/legacy-chrome.tsx. */}
        <a href="#main-content" className="skip-link">Skip to main content</a>

        <AuthProvider>
          <PostHogProvider />
          <ErrorLogger />
          <Tracker />
          <SyncManager />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <LegacyChromeWhisper />
          <WhatsAppWidget />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
