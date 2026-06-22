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
  variable: "--font-inter",   // reuse existing var â€” no other files need changing
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
  title: "Ledger â€” The Student's Operating System",
  description:
    "55 AI-powered tools for students. Study planner, past papers, marks predictor, doubt solver, flashcards, exam simulator, and more â€” calibrated to your board, grade, and exam date.",
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
    title: "Ledger â€” The Student's Operating System",
    description:
      "55 AI-powered tools for students. Study planner, past papers, marks predictor, doubt solver, flashcards, and more â€” calibrated to your board, grade, and exam date.",
    url: "https://studyledger.in",
    siteName: "Ledger",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ledger â€” The Student's Operating System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ledger â€” The Student's Operating System",
    description:
      "55 AI-powered tools for students. Calibrated to your board, grade, and exam date.",
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
            __html: `(function(){try{var p=localStorage.getItem('palette')||'ledger';var T={ledger:{p:'#08090c',p2:'#0f1016',i:'#f1ffc4',i2:'#dab894',i3:'#a7bed3',a:'#ffcaaf',am:'#e89a80',r:'rgba(167,190,211,0.20)',r2:'rgba(167,190,211,0.08)',ga:'rgba(255,202,175,0.20)',gb:'rgba(167,190,211,0.12)',h:'rgba(255,202,175,0.16)'},paper:{p:'#f7f3ec',p2:'#ede8e0',i:'#1a1410',i2:'#4a3f35',i3:'#7a6f65',a:'#c2410c',am:'#9a3412',r:'rgba(26,20,16,0.14)',r2:'rgba(26,20,16,0.07)',ga:'rgba(194,65,12,0.14)',gb:'rgba(154,52,18,0.07)',h:'rgba(194,65,12,0.10)'},void:{p:'#000000',p2:'#0a0a0a',i:'#f0f0f8',i2:'#9090b0',i3:'#505070',a:'#a78bfa',am:'#7c3aed',r:'rgba(167,150,255,0.18)',r2:'rgba(167,150,255,0.07)',ga:'rgba(167,139,250,0.22)',gb:'rgba(124,58,237,0.10)',h:'rgba(167,139,250,0.18)'},dusk:{p:'#06070f',p2:'#090b18',i:'#e8ecf8',i2:'#8890b8',i3:'#606888',a:'#818cf8',am:'#6366f1',r:'rgba(130,140,248,0.20)',r2:'rgba(130,140,248,0.08)',ga:'rgba(129,140,248,0.20)',gb:'rgba(99,102,241,0.10)',h:'rgba(129,140,248,0.18)'},amber:{p:'#0e0a02',p2:'#120d03',i:'#fff8e6',i2:'#c8a060',i3:'#886840',a:'#fbbf24',am:'#d97706',r:'rgba(251,191,36,0.20)',r2:'rgba(251,191,36,0.08)',ga:'rgba(251,191,36,0.20)',gb:'rgba(217,119,6,0.10)',h:'rgba(251,191,36,0.16)'},rose:{p:'#100608',p2:'#18090c',i:'#f8eef2',i2:'#c08898',i3:'#806070',a:'#fb7185',am:'#e11d48',r:'rgba(251,113,133,0.20)',r2:'rgba(251,113,133,0.08)',ga:'rgba(251,113,133,0.20)',gb:'rgba(225,29,72,0.10)',h:'rgba(251,113,133,0.18)'},frost:{p:'#040a14',p2:'#070e1e',i:'#eef5ff',i2:'#90b8d8',i3:'#6090b0',a:'#38bdf8',am:'#0284c7',r:'rgba(56,189,248,0.20)',r2:'rgba(56,189,248,0.08)',ga:'rgba(56,189,248,0.20)',gb:'rgba(2,132,199,0.10)',h:'rgba(56,189,248,0.18)'},forest:{p:'#040e06',p2:'#071208',i:'#e8f5ea',i2:'#80c888',i3:'#507058',a:'#4ade80',am:'#16a34a',r:'rgba(74,222,128,0.18)',r2:'rgba(74,222,128,0.07)',ga:'rgba(74,222,128,0.18)',gb:'rgba(22,163,74,0.10)',h:'rgba(74,222,128,0.15)'},ember:{p:'#120400',p2:'#1a0600',i:'#fff0e8',i2:'#d08060',i3:'#906040',a:'#f97316',am:'#c2410c',r:'rgba(249,115,22,0.20)',r2:'rgba(249,115,22,0.08)',ga:'rgba(249,115,22,0.20)',gb:'rgba(194,65,12,0.10)',h:'rgba(249,115,22,0.16)'},midnight:{p:'#040408',p2:'#0c0c14',i:'#e8e0ff',i2:'#b8b0d8',i3:'#787098',a:'#8b5cf6',am:'#7c3aed',r:'rgba(232,224,255,0.18)',r2:'rgba(232,224,255,0.07)',ga:'rgba(139,92,246,0.22)',gb:'rgba(124,58,237,0.10)',h:'rgba(139,92,246,0.16)'},ocean:{p:'#020d18',p2:'#061422',i:'#bae6fd',i2:'#7cbad0',i3:'#4a88a0',a:'#0ea5e9',am:'#0284c7',r:'rgba(186,230,253,0.18)',r2:'rgba(186,230,253,0.07)',ga:'rgba(14,165,233,0.22)',gb:'rgba(2,132,199,0.10)',h:'rgba(14,165,233,0.16)'},sage:{p:'#040a06',p2:'#081410',i:'#d1fae5',i2:'#90d4b0',i3:'#508870',a:'#10b981',am:'#059669',r:'rgba(209,250,229,0.18)',r2:'rgba(209,250,229,0.07)',ga:'rgba(16,185,129,0.20)',gb:'rgba(5,150,105,0.10)',h:'rgba(16,185,129,0.15)'},crimson:{p:'#0f0406',p2:'#180609',i:'#ffe4e6',i2:'#d0b0b8',i3:'#907080',a:'#e11d48',am:'#be123c',r:'rgba(255,228,230,0.18)',r2:'rgba(255,228,230,0.07)',ga:'rgba(225,29,72,0.22)',gb:'rgba(190,18,60,0.10)',h:'rgba(225,29,72,0.16)'},gold:{p:'#0a0800',p2:'#140e00',i:'#fef3c7',i2:'#d4c090',i3:'#948050',a:'#f59e0b',am:'#d97706',r:'rgba(254,243,199,0.18)',r2:'rgba(254,243,199,0.07)',ga:'rgba(245,158,11,0.22)',gb:'rgba(217,119,6,0.10)',h:'rgba(245,158,11,0.16)'},slate:{p:'#020408',p2:'#080c14',i:'#e2e8f0',i2:'#a0b0c0',i3:'#607080',a:'#64748b',am:'#475569',r:'rgba(226,232,240,0.18)',r2:'rgba(226,232,240,0.07)',ga:'rgba(100,116,139,0.22)',gb:'rgba(71,85,105,0.10)',h:'rgba(100,116,139,0.16)'},copper:{p:'#0c0600',p2:'#160a00',i:'#fed7aa',i2:'#d0a070',i3:'#906040',a:'#ea580c',am:'#c2410c',r:'rgba(254,215,170,0.18)',r2:'rgba(254,215,170,0.07)',ga:'rgba(234,88,12,0.22)',gb:'rgba(194,65,12,0.10)',h:'rgba(234,88,12,0.16)'},plum:{p:'#0a0208',p2:'#12040f',i:'#f0abfc',i2:'#c080d8',i3:'#805098',a:'#d946ef',am:'#a21caf',r:'rgba(240,171,252,0.18)',r2:'rgba(240,171,252,0.07)',ga:'rgba(217,70,239,0.22)',gb:'rgba(162,28,175,0.10)',h:'rgba(217,70,239,0.16)'}};var t=T[p]||T.ledger;var r=document.documentElement;r.style.setProperty('--paper',t.p);r.style.setProperty('--paper-2',t.p2);r.style.setProperty('--ink',t.i);r.style.setProperty('--ink-2',t.i2);r.style.setProperty('--ink-3',t.i3);r.style.setProperty('--cinnabar-ink',t.a);r.style.setProperty('--cinnabar',t.am);r.style.setProperty('--rule',t.r);r.style.setProperty('--rule-2',t.r2);r.style.setProperty('--page-glow-a',t.ga);r.style.setProperty('--page-glow-b',t.gb);r.style.setProperty('--highlight',t.h);var d=localStorage.getItem('ledger-density');if(d&&d!=='default')r.dataset.density=d;var fs=localStorage.getItem('ledger-font-sans');if(fs)r.style.setProperty('--sans',fs+',system-ui,sans-serif');var fr=localStorage.getItem('ledger-font-serif');if(fr)r.style.setProperty('--serif',fr+',Georgia,serif');}catch(e){}})();`,
          }}
        />
        <meta name="theme-color" content="#18241b" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=orsiri@400,500,700&display=swap" />
      </head>
      <body>
        {/* Global liquid-glass displacement filter â€” referenced by backdrop-filter: url(#global-liquid-glass) in .btn */}
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
        </AuthProvider>
      </body>
    </html>
  );
}
