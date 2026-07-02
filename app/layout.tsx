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
            __html: `(function(){try{var p=localStorage.getItem('palette')||'ledger';var T={ledger:{p:'#08090c',p2:'#0f1016',i:'#f1ffc4',i2:'#dab894',i3:'#a7bed3',a:'#ffcaaf',am:'#e89a80',r:'rgba(167,190,211,0.20)',r2:'rgba(167,190,211,0.08)',ga:'rgba(255,202,175,0.20)',gb:'rgba(167,190,211,0.12)',h:'rgba(255,202,175,0.16)'},paper:{p:'#fafaf9',p2:'#f5f5f4',i:'#1c1917',i2:'#57534e',i3:'#a8a29e',a:'#7c3aed',am:'#6d28d9',r:'rgba(28,25,23,0.09)',r2:'rgba(28,25,23,0.05)',ga:'rgba(124,58,237,0.12)',gb:'rgba(109,40,217,0.06)',h:'rgba(124,58,237,0.09)',L:1},'paper-rose':{p:'#fff9fb',p2:'#fef2f5',i:'#1c0810',i2:'#7a4858',i3:'#b08898',a:'#e11d48',am:'#be123c',r:'rgba(28,8,16,0.08)',r2:'rgba(28,8,16,0.04)',ga:'rgba(225,29,72,0.12)',gb:'rgba(190,18,60,0.06)',h:'rgba(225,29,72,0.09)',L:1},'paper-frost':{p:'#f8fbff',p2:'#eef5ff',i:'#0a1624',i2:'#3a5878',i3:'#6888a8',a:'#0284c7',am:'#0369a1',r:'rgba(10,22,36,0.08)',r2:'rgba(10,22,36,0.04)',ga:'rgba(2,132,199,0.12)',gb:'rgba(3,105,161,0.06)',h:'rgba(2,132,199,0.09)',L:1},'paper-forest':{p:'#f8fdf9',p2:'#eefaf2',i:'#0a1c10',i2:'#3a6448',i3:'#68a080',a:'#15803d',am:'#166534',r:'rgba(10,28,16,0.08)',r2:'rgba(10,28,16,0.04)',ga:'rgba(21,128,61,0.12)',gb:'rgba(22,101,52,0.06)',h:'rgba(21,128,61,0.09)',L:1},'paper-amber':{p:'#fffdf5',p2:'#fef9e7',i:'#1c1502',i2:'#6a5010',i3:'#a88848',a:'#d97706',am:'#b45309',r:'rgba(28,21,2,0.08)',r2:'rgba(28,21,2,0.04)',ga:'rgba(217,119,6,0.12)',gb:'rgba(180,83,9,0.06)',h:'rgba(217,119,6,0.09)',L:1},'paper-ember':{p:'#fff8f5',p2:'#fff0e8',i:'#1c0a02',i2:'#7a3018',i3:'#b07058',a:'#ea580c',am:'#c2410c',r:'rgba(28,10,2,0.08)',r2:'rgba(28,10,2,0.04)',ga:'rgba(234,88,12,0.12)',gb:'rgba(194,65,12,0.06)',h:'rgba(234,88,12,0.09)',L:1},'paper-plum':{p:'#fdf8ff',p2:'#f8eeff',i:'#180820',i2:'#683488',i3:'#a870c0',a:'#a21caf',am:'#86198f',r:'rgba(24,8,32,0.08)',r2:'rgba(24,8,32,0.04)',ga:'rgba(162,28,175,0.12)',gb:'rgba(134,25,143,0.06)',h:'rgba(162,28,175,0.09)',L:1},'paper-slate':{p:'#f8fafc',p2:'#f1f5f9',i:'#0f172a',i2:'#475569',i3:'#94a3b8',a:'#334155',am:'#1e293b',r:'rgba(15,23,42,0.08)',r2:'rgba(15,23,42,0.04)',ga:'rgba(51,65,85,0.12)',gb:'rgba(30,41,59,0.06)',h:'rgba(51,65,85,0.09)',L:1},void:{p:'#000000',p2:'#0a0a0a',i:'#f0f0f8',i2:'#9090b0',i3:'#505070',a:'#a78bfa',am:'#7c3aed',r:'rgba(167,150,255,0.18)',r2:'rgba(167,150,255,0.07)',ga:'rgba(167,139,250,0.22)',gb:'rgba(124,58,237,0.10)',h:'rgba(167,139,250,0.18)'},dusk:{p:'#06070f',p2:'#090b18',i:'#e8ecf8',i2:'#8890b8',i3:'#606888',a:'#818cf8',am:'#6366f1',r:'rgba(130,140,248,0.20)',r2:'rgba(130,140,248,0.08)',ga:'rgba(129,140,248,0.20)',gb:'rgba(99,102,241,0.10)',h:'rgba(129,140,248,0.18)'},amber:{p:'#0e0a02',p2:'#120d03',i:'#fff8e6',i2:'#c8a060',i3:'#886840',a:'#fbbf24',am:'#d97706',r:'rgba(251,191,36,0.20)',r2:'rgba(251,191,36,0.08)',ga:'rgba(251,191,36,0.20)',gb:'rgba(217,119,6,0.10)',h:'rgba(251,191,36,0.16)'},rose:{p:'#100608',p2:'#18090c',i:'#f8eef2',i2:'#c08898',i3:'#806070',a:'#fb7185',am:'#e11d48',r:'rgba(251,113,133,0.20)',r2:'rgba(251,113,133,0.08)',ga:'rgba(251,113,133,0.20)',gb:'rgba(225,29,72,0.10)',h:'rgba(251,113,133,0.18)'},frost:{p:'#040a14',p2:'#070e1e',i:'#eef5ff',i2:'#90b8d8',i3:'#6090b0',a:'#38bdf8',am:'#0284c7',r:'rgba(56,189,248,0.20)',r2:'rgba(56,189,248,0.08)',ga:'rgba(56,189,248,0.20)',gb:'rgba(2,132,199,0.10)',h:'rgba(56,189,248,0.18)'},forest:{p:'#040e06',p2:'#071208',i:'#e8f5ea',i2:'#80c888',i3:'#507058',a:'#4ade80',am:'#16a34a',r:'rgba(74,222,128,0.18)',r2:'rgba(74,222,128,0.07)',ga:'rgba(74,222,128,0.18)',gb:'rgba(22,163,74,0.10)',h:'rgba(74,222,128,0.15)'},ember:{p:'#120400',p2:'#1a0600',i:'#fff0e8',i2:'#d08060',i3:'#906040',a:'#f97316',am:'#c2410c',r:'rgba(249,115,22,0.20)',r2:'rgba(249,115,22,0.08)',ga:'rgba(249,115,22,0.20)',gb:'rgba(194,65,12,0.10)',h:'rgba(249,115,22,0.16)'},midnight:{p:'#040408',p2:'#0c0c14',i:'#e8e0ff',i2:'#b8b0d8',i3:'#787098',a:'#8b5cf6',am:'#7c3aed',r:'rgba(232,224,255,0.18)',r2:'rgba(232,224,255,0.07)',ga:'rgba(139,92,246,0.22)',gb:'rgba(124,58,237,0.10)',h:'rgba(139,92,246,0.16)'},ocean:{p:'#020d18',p2:'#061422',i:'#bae6fd',i2:'#7cbad0',i3:'#4a88a0',a:'#0ea5e9',am:'#0284c7',r:'rgba(186,230,253,0.18)',r2:'rgba(186,230,253,0.07)',ga:'rgba(14,165,233,0.22)',gb:'rgba(2,132,199,0.10)',h:'rgba(14,165,233,0.16)'},sage:{p:'#040a06',p2:'#081410',i:'#d1fae5',i2:'#90d4b0',i3:'#508870',a:'#10b981',am:'#059669',r:'rgba(209,250,229,0.18)',r2:'rgba(209,250,229,0.07)',ga:'rgba(16,185,129,0.20)',gb:'rgba(5,150,105,0.10)',h:'rgba(16,185,129,0.15)'},crimson:{p:'#0f0406',p2:'#180609',i:'#ffe4e6',i2:'#d0b0b8',i3:'#907080',a:'#e11d48',am:'#be123c',r:'rgba(255,228,230,0.18)',r2:'rgba(255,228,230,0.07)',ga:'rgba(225,29,72,0.22)',gb:'rgba(190,18,60,0.10)',h:'rgba(225,29,72,0.16)'},gold:{p:'#0a0800',p2:'#140e00',i:'#fef3c7',i2:'#d4c090',i3:'#948050',a:'#f59e0b',am:'#d97706',r:'rgba(254,243,199,0.18)',r2:'rgba(254,243,199,0.07)',ga:'rgba(245,158,11,0.22)',gb:'rgba(217,119,6,0.10)',h:'rgba(245,158,11,0.16)'},slate:{p:'#020408',p2:'#080c14',i:'#e2e8f0',i2:'#a0b0c0',i3:'#607080',a:'#64748b',am:'#475569',r:'rgba(226,232,240,0.18)',r2:'rgba(226,232,240,0.07)',ga:'rgba(100,116,139,0.22)',gb:'rgba(71,85,105,0.10)',h:'rgba(100,116,139,0.16)'},copper:{p:'#0c0600',p2:'#160a00',i:'#fed7aa',i2:'#d0a070',i3:'#906040',a:'#ea580c',am:'#c2410c',r:'rgba(254,215,170,0.18)',r2:'rgba(254,215,170,0.07)',ga:'rgba(234,88,12,0.22)',gb:'rgba(194,65,12,0.10)',h:'rgba(234,88,12,0.16)'},plum:{p:'#0a0208',p2:'#12040f',i:'#f0abfc',i2:'#c080d8',i3:'#805098',a:'#d946ef',am:'#a21caf',r:'rgba(240,171,252,0.18)',r2:'rgba(240,171,252,0.07)',ga:'rgba(217,70,239,0.22)',gb:'rgba(162,28,175,0.10)',h:'rgba(217,70,239,0.16)'}};var t=T[p]||T.ledger;var r=document.documentElement;r.style.setProperty('--paper',t.p);r.style.setProperty('--paper-2',t.p2);r.style.setProperty('--ink',t.i);r.style.setProperty('--ink-2',t.i2);r.style.setProperty('--ink-3',t.i3);r.style.setProperty('--cinnabar-ink',t.a);r.style.setProperty('--cinnabar',t.am);r.style.setProperty('--rule',t.r);r.style.setProperty('--rule-2',t.r2);r.style.setProperty('--page-glow-a',t.ga);r.style.setProperty('--page-glow-b',t.gb);r.style.setProperty('--highlight',t.h);r.dataset.palette=p;if(t.L)r.dataset.mode='light';else delete r.dataset.mode;var d=localStorage.getItem('ledger-density');if(d&&d!=='default')r.dataset.density=d;var fs=localStorage.getItem('ledger-font-sans');if(fs)r.style.setProperty('--sans',fs+',system-ui,sans-serif');var fr=localStorage.getItem('ledger-font-serif');if(fr)r.style.setProperty('--serif',fr+',Georgia,serif');var fm=localStorage.getItem('ledger-font-mono');if(fm)r.style.setProperty('--mono',fm+',monospace');var rv=localStorage.getItem('ledger-radius');if(rv)r.style.setProperty('--radius',rv+'px');var rw=localStorage.getItem('ledger-width');if(rw){var wm={narrow:'860px',medium:'1100px',wide:'1400px'};if(wm[rw])r.style.setProperty('--content-max',wm[rw]);}var ra=localStorage.getItem('ledger-anim-speed');if(ra){var asp={reduced:'0.4',normal:'1',fast:'1.8'};if(asp[ra])r.style.setProperty('--anim-speed',asp[ra]);}var fsh={'Clash Display':'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,700&display=swap','Cabinet Grotesk':'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700&display=swap','Satoshi':'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'};function lnk(n,u){var id='font-'+n.toLowerCase().split(' ').join('-');if(!document.getElementById(id)){var l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=u||('https://fonts.googleapis.com/css2?family='+n.split(' ').join('+')+':wght@400;500;700&display=swap');document.head.appendChild(l);}}if(fs){var fsn=fs.charAt(0)==='"'?fs.slice(1,-1):fs;lnk(fsn,fsh[fsn]);}if(fr){var frn=fr.charAt(0)==='"'?fr.slice(1,-1):fr;lnk(frn);}if(fm){var fmn=fm.charAt(0)==='"'?fm.slice(1,-1):fm;lnk(fmn);}}catch(e){}})();`,
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
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=orsiri@400,500,700&display=swap" />
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
