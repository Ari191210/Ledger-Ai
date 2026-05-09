import type { Metadata } from "next";
import { Newsreader, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import Tracker from "@/components/tracker";
import SyncManager from "@/components/sync-manager";
import PaletteToggle from "@/components/palette-toggle";
import PageGradient from "@/components/page-gradient";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import Cursor from "@/components/cursor";
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
            __html: `(function(){var p=localStorage.getItem('palette');if(p)document.documentElement.dataset.palette=p;})();`,
          }}
        />
        <meta name="theme-color" content="#18241b" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Cursor />
        <WebGLShader />
        <AuthProvider>
          <PageGradient />
          <Tracker />
          <SyncManager />
          {children}
          <PaletteToggle />
        </AuthProvider>
      </body>
    </html>
  );
}
