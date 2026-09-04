import { Urbanist, Poiret_One } from "next/font/google";

// Workhorse — body, UI, labels, tables, forms, and the big tabular stat numbers.
export const urbanist = Urbanist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-urbanist",
});

// Display only — landing hero, large editorial titles. Never below ~28px.
export const poiretOne = Poiret_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poiret",
});

// Brand wordmark — Ragick (paid). Drop Ragick.woff2 into /public/fonts/ and
// uncomment the @font-face block in globals.css; falls back to Urbanist 800.
