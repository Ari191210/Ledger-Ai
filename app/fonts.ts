import { Geist, JetBrains_Mono } from "next/font/google";

// The interface face, body AND headings. Geist is drawn tight and rational
// (engineered for clarity, minimal personality), which is the "controlled and
// calculated" register this product wants. One typeface, weight does the
// hierarchy work.
export const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

// Instrument readout, every number, every technical label. Deliberately a
// different register from the UI face, the way a device's LCD differs from
// the labels printed on its case.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-jbmono",
});
