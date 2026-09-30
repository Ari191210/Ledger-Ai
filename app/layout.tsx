import type { Metadata, Viewport } from "next";
import { geist, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://studyledger.in"),
  title: {
    default: "StudyLedger · know exactly where you stand",
    template: "%s · StudyLedger",
  },
  description:
    "One score for your prep. 22 tools that turn your study data into a plan. Planner, Mistake DNA, Exam Simulator, Patterns and more, built for Indian students.",
  openGraph: {
    type: "website",
    url: "https://studyledger.in",
    siteName: "StudyLedger",
    title: "StudyLedger · know exactly where you stand",
    description:
      "One score for your prep. 22 tools that turn your study data into a plan, built for Indian students.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyLedger · know exactly where you stand",
    description:
      "One score for your prep. 22 tools that turn your study data into a plan, built for Indian students.",
  },
};

// Browser chrome colour: the dark ground, since dark is the default theme.
export const viewport: Viewport = { themeColor: "#0e0e0d" };

// Runs before paint, sets the theme so there's no flash.
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
      className={`${geist.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* First stop for a keyboard: jumps past the nav to the page itself. Hidden until focused. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
