"use client";

import { useState } from "react";

type FontCategory = "sans" | "serif" | "mono" | "display";

interface FontOption {
  name: string;
  url?: string; // if falsy, use Google Fonts
  fontshare?: boolean;
  variable?: string; // CSS var to set (defaults to --sans)
}

const FONTS: Record<FontCategory, FontOption[]> = {
  sans: [
    { name: "DM Sans" }, { name: "Inter" }, { name: "Outfit" }, { name: "Onest" },
    { name: "Plus Jakarta Sans" }, { name: "Nunito" }, { name: "Poppins" },
    { name: "Raleway" }, { name: "Urbanist" }, { name: "Manrope" },
    { name: "Figtree" }, { name: "Albert Sans" }, { name: "Jost" },
    { name: "Barlow" }, { name: "Lexend" },
  ],
  serif: [
    { name: "Instrument Serif" }, { name: "Lora" }, { name: "Playfair Display" },
    { name: "Cormorant Garamond" }, { name: "Libre Baskerville" },
    { name: "DM Serif Display" }, { name: "Fraunces" }, { name: "Abril Fatface" },
    { name: "EB Garamond" }, { name: "Bodoni Moda" }, { name: "Crimson Pro" },
    { name: "Spectral" }, { name: "Bitter" }, { name: "Merriweather" }, { name: "Cardo" },
  ],
  mono: [
    { name: "Space Mono" }, { name: "JetBrains Mono" }, { name: "Fira Code" },
    { name: "IBM Plex Mono" }, { name: "Source Code Pro" }, { name: "Inconsolata" },
    { name: "Roboto Mono" }, { name: "Courier Prime" }, { name: "Share Tech Mono" },
  ],
  display: [
    { name: "Clash Display", url: "https://api.fontshare.com/v2/css?f[]=clash-display@400,500,700&display=swap", fontshare: true },
    { name: "Cabinet Grotesk", url: "https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700&display=swap", fontshare: true },
    { name: "Satoshi", url: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap", fontshare: true },
    { name: "Bricolage Grotesque" }, { name: "Syne" }, { name: "Space Grotesk" },
    { name: "Exo 2" }, { name: "Josefin Sans" }, { name: "Teko" }, { name: "Bebas Neue" },
  ],
};

const CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: "Sans-Serif", serif: "Serif", mono: "Monospace", display: "Display",
};

function loadFont(font: FontOption) {
  const id = `font-${font.name.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  if (font.url) {
    link.href = font.url;
  } else {
    const family = font.name.replace(/\s+/g, "+");
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;700&display=swap`;
  }
  document.head.appendChild(link);
}

function applyFont(font: FontOption, category: FontCategory) {
  loadFont(font);
  const root = document.documentElement;
  if (category === "serif") {
    root.style.setProperty("--serif", `"${font.name}", Georgia, serif`);
    localStorage.setItem("ledger-font-serif", `"${font.name}"`);
  } else if (category === "mono") {
    root.style.setProperty("--mono", `"${font.name}", monospace`);
    localStorage.setItem("ledger-font-mono", `"${font.name}"`);
  } else {
    root.style.setProperty("--sans", `"${font.name}", system-ui, sans-serif`);
    localStorage.setItem("ledger-font-sans", `"${font.name}"`);
  }
}

function getStoredFontName(category: FontCategory): string {
  if (typeof window === "undefined") return "";
  const key = category === "serif" ? "ledger-font-serif" : category === "mono" ? "ledger-font-mono" : "ledger-font-sans";
  const raw = localStorage.getItem(key) ?? "";
  return raw.replace(/^"|"$/g, ""); // strip surrounding quotes
}

export function FontPicker() {
  const [tab, setTab] = useState<FontCategory>("sans");
  const [activeFont, setActiveFont] = useState<string>(() => getStoredFontName("sans"));

  function changeTab(c: FontCategory) {
    setTab(c);
    setActiveFont(getStoredFontName(c));
  }

  function pick(font: FontOption) {
    applyFont(font, tab);
    setActiveFont(font.name);
  }

  const card = { background: "color-mix(in srgb, var(--ink) 5%, var(--paper))", border: "1px solid var(--rule)", borderRadius: 16, padding: "32px 36px", marginBottom: 32 } as const;

  return (
    <section style={card}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
        <div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 8 }}>02 · Typography</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, margin: 0, letterSpacing: "-0.02em" }}>Choose your typeface.</h2>
        </div>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>live preview · {Object.values(FONTS).flat().length}+ fonts</div>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
        {(Object.keys(FONTS) as FontCategory[]).map(c => (
          <button key={c} onClick={() => changeTab(c)} style={{
            flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
            background: tab === c ? "color-mix(in srgb, var(--cinnabar-ink) 12%, var(--paper))" : "transparent",
            borderBottom: tab === c ? "2px solid var(--cinnabar-ink)" : "2px solid transparent",
            fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
            color: tab === c ? "var(--cinnabar-ink)" : "var(--ink-3)", transition: "all 150ms",
          }}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Font grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {FONTS[tab].map(font => {
          const isActive = activeFont === font.name;
          return (
            <button key={font.name} onClick={() => pick(font)} style={{
              padding: "16px 18px", border: `1px solid ${isActive ? "var(--cinnabar-ink)" : "var(--rule)"}`,
              borderRadius: 10, background: isActive ? "color-mix(in srgb, var(--cinnabar-ink) 10%, var(--paper))" : "transparent",
              cursor: "pointer", textAlign: "left", transition: "all 150ms",
            }}>
              <div style={{ fontSize: 18, fontFamily: `"${font.name}", serif`, color: "var(--ink)", lineHeight: 1.2, marginBottom: 4 }}>
                Aa
              </div>
              <div className="mono" style={{ fontSize: 8, color: isActive ? "var(--cinnabar-ink)" : "var(--ink-3)", letterSpacing: "0.06em" }}>
                {font.name}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
