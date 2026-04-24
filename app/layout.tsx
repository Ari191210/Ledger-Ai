import type { Metadata } from "next";
import { Source_Serif_4, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-source-serif-4",
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif4.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
