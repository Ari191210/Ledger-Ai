import { Nunito_Sans, Urbanist, JetBrains_Mono } from "next/font/google";

// Body text — paragraphs, labels, UI copy.
export const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

// Display/headings. Swap this one out when the heading face is chosen —
// everything reads it through `--font-display`, nothing else needs touching.
export const urbanist = Urbanist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-urbanist",
});

// Instrument readout — every number, every technical label.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-jbmono",
});
