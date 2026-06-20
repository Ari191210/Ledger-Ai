import type { Metadata } from "next";
import { Orbitron, DM_Sans, Space_Mono, Lora } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import Tracker from "@/components/tracker";
import SyncManager from "@/components/sync-manager";
import PaletteToggle from "@/components/palette-toggle";
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

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",   // reuse existing var — no other files need changing
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ledger — The Student's Operating System",
  description:
    "55 AI-powered tools for students. Study planner, past papers, marks predictor, doubt solver, flashcards, exam simulator, and more — calibrated to your board, grade, and exam date.",
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
    title: "Ledger — The Student's Operating System",
    description:
      "55 AI-powered tools for students. Study planner, past papers, marks predictor, doubt solver, flashcards, and more — calibrated to your board, grade, and exam date.",
    url: "https://studyledger.in",
    siteName: "Ledger",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ledger — The Student's Operating System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ledger — The Student's Operating System",
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
      className={`${orbitron.variable} ${dmSans.variable} ${spaceMono.variable} ${lora.variable}`}
    >
      <head>
        {/* Anti-flash: apply saved palette before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=localStorage.getItem('palette');if(p)document.documentElement.dataset.palette=p;var d=localStorage.getItem('ledger-density');if(d&&d!=='default')document.documentElement.dataset.density=d;var m=localStorage.getItem('ledger-mode');if(m==='light')document.documentElement.dataset.mode='light';})();`,
          }}
        />
        <meta name="theme-color" content="#18241b" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        {/* Global liquid-glass displacement filter — referenced by backdrop-filter: url(#global-liquid-glass) in .btn */}
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
          <PaletteToggle />
          <RankWhisper />
        </AuthProvider>
      </body>
    </html>
  );
}
