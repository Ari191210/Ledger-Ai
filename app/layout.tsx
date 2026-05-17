import type { Metadata } from "next";
import { Newsreader, Inter_Tight, JetBrains_Mono } from "next/font/google";
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
import { GLASS_DISPLACEMENT_MAP } from "@/lib/glass-displacement-map";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ledger — The Student's Operating System",
  description:
    "Ten tools. One ledger. Study planner, marks predictor, notes simplifier, doubt solver, focus dashboard, and more — built for the student who would rather be studying than picking software.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
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
          <ErrorLogger />
          <PageGradient />
          <Tracker />
          <SyncManager />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <PaletteToggle />
        </AuthProvider>
      </body>
    </html>
  );
}
