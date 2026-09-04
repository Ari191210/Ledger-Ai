import type { Metadata } from "next";
import { urbanist, poiretOne } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyLedger",
  description: "Academic intelligence platform.",
};

// Runs before paint — sets the theme so there's no flash.
const themeScript = `try{var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('sl-theme')||'dark';document.documentElement.dataset.theme=t;if(q)localStorage.setItem('sl-theme',t)}catch(e){document.documentElement.dataset.theme='dark'}`;

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
