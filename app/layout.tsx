import type { Metadata } from "next";
import { nunitoSans, urbanist, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.studyledger.in"),
  title: {
    default: "StudyLedger — know exactly where you stand",
    template: "%s — StudyLedger",
  },
  description:
    "One score for your prep. 25 tools that turn your study data into a plan — Planner, Mistake DNA, Exam Simulator, Peer Heatmap and more, built for Indian students.",
  openGraph: {
    type: "website",
    url: "https://www.studyledger.in",
    siteName: "StudyLedger",
    title: "StudyLedger — know exactly where you stand",
    description:
      "One score for your prep. 25 tools that turn your study data into a plan — built for Indian students.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyLedger — know exactly where you stand",
    description:
      "One score for your prep. 25 tools that turn your study data into a plan — built for Indian students.",
  },
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
      className={`${nunitoSans.variable} ${urbanist.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
