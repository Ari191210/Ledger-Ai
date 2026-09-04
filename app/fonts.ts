import { Urbanist, JetBrains_Mono } from "next/font/google";

// UI text — labels, body, headings.
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
