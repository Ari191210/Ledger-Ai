import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, Space_Mono, Lora } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import Tracker from "@/components/tracker";
import SyncManager from "@/components/sync-manager";
import PageGradient from "@/components/page-gradient";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import Cursor from "@/components/cursor";
import ErrorBoundary from "@/components/error-boundary";
import ErrorLogger from "@/components/error-logger";
import ButtonClickEffect from "@/components/ui/button-click-effect";
import PostHogProvider from "@/components/posthog-provider";
import { GLASS_DISPLACEMENT_MAP } from "@/lib/glass-displacement-map";
import RankWhisper from "@/components/rank-whisper";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-orbitron",
  display: "swap",
  preload: false,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
  preload: false,
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "StudyLedger | The Student's Operating System",
  description:
    "48 AI-powered tools for students. Study planner, past papers, marks predictor, doubt solver, flashcards, exam simulator, and more - calibrated to your board, grade, and exam date.",
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
      "48 AI-powered tools for students. Study planner, past papers, marks predictor, doubt solver, flashcards, and more - calibrated to your board, grade, and exam date.",
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
      "48 AI-powered tools for students. Calibrated to your board, grade, and exam date.",
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
      className={`${instrumentSerif.variable} ${dmSans.variable} ${spaceMono.variable} ${lora.variable}`}
    >
      <head>
        {/* Anti-flash: inject palette CSS vars before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var B={"obsidian":{"p":"#0a0a0d","p2":"#101014","i":"#f2f1ed","i2":"#a6a49e","i3":"#68665f"},"void":{"p":"#000000","p2":"#0a0a0a","i":"#f0f0f0","i2":"#999999","i3":"#5c5c5c"},"graphite":{"p":"#0d0e11","p2":"#15171b","i":"#edeef0","i2":"#9ba0a8","i3":"#61666e"},"ink-navy":{"p":"#06080f","p2":"#0c1019","i":"#e7ecf6","i2":"#8d94ab","i3":"#545b72"},"deep-forest":{"p":"#070b09","p2":"#0d130f","i":"#e6f0ea","i2":"#8ba796","i3":"#52685a"},"espresso":{"p":"#0d0906","p2":"#150f0a","i":"#f2ebe3","i2":"#ab9a89","i3":"#6c5f51"},"wine":{"p":"#0c0709","p2":"#140b0e","i":"#f2e8ea","i2":"#a68d92","i3":"#6a555a"},"violet-night":{"p":"#0a0810","p2":"#120e1c","i":"#ece8f5","i2":"#a29aba","i3":"#675f80"},"slate-storm":{"p":"#090b0f","p2":"#0f131a","i":"#e9ecf1","i2":"#9aa1ad","i3":"#5f6672"},"charcoal-warm":{"p":"#0b0a08","p2":"#14120e","i":"#f0ede6","i2":"#a29c8d","i3":"#666256"},"paper":{"p":"#faf9f7","p2":"#f3f1ee","i":"#1a1917","i2":"#5c5952","i3":"#9a968c","L":1},"linen":{"p":"#faf7ef","p2":"#f4efe2","i":"#201a0f","i2":"#61543d","i3":"#a2937a","L":1},"fog":{"p":"#f7f8fa","p2":"#eef0f3","i":"#14171c","i2":"#4d545e","i3":"#8b93a0","L":1},"porcelain":{"p":"#f5f8fb","p2":"#eaf1f7","i":"#0f1a24","i2":"#445868","i3":"#7d95a6","L":1},"bone":{"p":"#f8f7f4","p2":"#f0ede7","i":"#1c1a16","i2":"#58544a","i3":"#948e80","L":1}};var A={"cinnabar":{"a":"#ff7c5c","am":"#e8623f"},"amber":{"a":"#f59e0b","am":"#d97706"},"saffron":{"a":"#eab308","am":"#ca8a04"},"sage":{"a":"#a3e635","am":"#84cc16"},"emerald":{"a":"#10b981","am":"#059669"},"teal":{"a":"#14b8a6","am":"#0d9488"},"sky":{"a":"#0ea5e9","am":"#0284c7"},"indigo":{"a":"#6366f1","am":"#4f46e5"},"violet":{"a":"#8b5cf6","am":"#7c3aed"},"plum":{"a":"#d946ef","am":"#a21caf"},"rose":{"a":"#f43f5e","am":"#e11d48"},"crimson":{"a":"#dc2626","am":"#b91c1c"},"copper":{"a":"#ea580c","am":"#c2410c"},"slate":{"a":"#64748b","am":"#475569"},"bronze":{"a":"#b45309","am":"#92400e"}};var b=localStorage.getItem('theme-base')||'obsidian';var ac=localStorage.getItem('theme-accent')||'cinnabar';var bd=B[b]||B.obsidian;var ad=A[ac]||A.cinnabar;function hx(h){var m=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(h);return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[0,0,0];}function rg(c,o){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+o+')';}var i3=hx(bd.i3),ac1=hx(ad.a),ac2=hx(ad.am);var r=document.documentElement;r.style.setProperty('--paper',bd.p);r.style.setProperty('--paper-2',bd.p2);r.style.setProperty('--ink',bd.i);r.style.setProperty('--ink-2',bd.i2);r.style.setProperty('--ink-3',bd.i3);r.style.setProperty('--cinnabar-ink',ad.a);r.style.setProperty('--cinnabar',ad.am);r.style.setProperty('--rule',rg(i3,0.20));r.style.setProperty('--rule-2',rg(i3,0.08));r.style.setProperty('--page-glow-a',rg(ac1,0.20));r.style.setProperty('--page-glow-b',rg(ac2,0.10));r.style.setProperty('--highlight',rg(ac1,0.16));r.dataset.base=b;r.dataset.accent=ac;r.dataset.palette=b;if(bd.L)r.dataset.mode='light';else delete r.dataset.mode;var d=localStorage.getItem('ledger-density');if(d&&d!=='default')r.dataset.density=d;var fs=localStorage.getItem('ledger-font-sans');if(fs)r.style.setProperty('--sans',fs+',system-ui,sans-serif');var fr=localStorage.getItem('ledger-font-serif');if(fr)r.style.setProperty('--serif',fr+',Georgia,serif');var fm=localStorage.getItem('ledger-font-mono');if(fm)r.style.setProperty('--mono',fm+',monospace');var rv=localStorage.getItem('ledger-radius');if(rv)r.style.setProperty('--radius',rv+'px');var rw=localStorage.getItem('ledger-width');if(rw){var wm={narrow:'860px',medium:'1100px',wide:'1400px'};if(wm[rw])r.style.setProperty('--content-max',wm[rw]);}var ra=localStorage.getItem('ledger-anim-speed');if(ra){var asp={reduced:'0.4',normal:'1',fast:'1.8'};if(asp[ra])r.style.setProperty('--anim-speed',asp[ra]);}var fsh={'Clash Display':'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,700&display=swap','Cabinet Grotesk':'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700&display=swap','Satoshi':'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'};function lnk(n,u){var id='font-'+n.toLowerCase().split(' ').join('-');if(!document.getElementById(id)){var l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=u||('https://fonts.googleapis.com/css2?family='+n.split(' ').join('+')+':wght@400;500;700&display=swap');document.head.appendChild(l);}}if(fs){var fsn=fs.charAt(0)==='"'?fs.slice(1,-1):fs;lnk(fsn,fsh[fsn]);}if(fr){var frn=fr.charAt(0)==='"'?fr.slice(1,-1):fr;lnk(frn);}if(fm){var fmn=fm.charAt(0)==='"'?fm.slice(1,-1):fm;lnk(fmn);}}catch(e){}})();`,
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
              "description": "AI-powered student OS with 48 tools for Indian board exam preparation",
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
                    "text": "StudyLedger is an AI-powered student operating system with 48 tools including a study planner, past paper analyser, Ledger Score readiness tracker, flashcards, and doubt solver - board-aware for CBSE, ICSE, IB, IGCSE and more.",
                  },
                },
                {
                  "@type": "Question",
                  "name": "Is StudyLedger free?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. The Free plan includes 20 AI requests/day and core tools. Pro (₹199/month) unlocks all 48 tools and unlimited AI.",
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
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        {/* Orsiri (primary font) loads async so the stylesheet never blocks first paint;
            display=swap in the URL means text renders in fallbacks until it arrives. */}
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
        {/* Global liquid-glass displacement filter - referenced by backdrop-filter: url(#global-liquid-glass) in .btn */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
        >
          <defs>
            <filter id="global-liquid-glass" primitiveUnits="objectBoundingBox">
              <feImage
                result="map"
                width="1"
                height="1"
                x="0"
                y="0"
                href={GLASS_DISPLACEMENT_MAP}
                preserveAspectRatio="none"
              />
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blurred" />
              <feDisplacementMap
                in="blurred"
                in2="map"
                scale="0.5"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
        <ButtonClickEffect />
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Cursor />
        <WebGLShader />
        <AuthProvider>
          <PostHogProvider />
          <ErrorLogger />
          <PageGradient />
          <Tracker />
          <SyncManager />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <RankWhisper />
          <WhatsAppWidget />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
