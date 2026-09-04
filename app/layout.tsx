import type { Metadata } from "next";
import { urbanist, poiretOne } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyLedger",
  description: "Academic intelligence platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${urbanist.variable} ${poiretOne.variable}`}>
      <body>{children}</body>
    </html>
  );
}
