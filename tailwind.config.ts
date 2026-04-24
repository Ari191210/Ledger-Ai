import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--serif)"],
        sans:  ["var(--sans)"],
        mono:  ["var(--mono)"],
      },
      colors: {
        paper:      "var(--paper)",
        "paper-2":  "var(--paper-2)",
        ink:        "var(--ink)",
        "ink-2":    "var(--ink-2)",
        "ink-3":    "var(--ink-3)",
        cinnabar:   "var(--cinnabar)",
        "cin-ink":  "var(--cinnabar-ink)",
        highlight:  "var(--highlight)",
      },
    },
  },
  plugins: [],
};
export default config;
