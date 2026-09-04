import type { Metadata } from "next";
import { urbanist, poiretOne } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyLedger",
  description: "Academic intelligence platform.",
};

// Runs before paint — sets the theme so there's no flash.
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('sl-theme')||'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${urbanist.variable} ${poiretOne.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
