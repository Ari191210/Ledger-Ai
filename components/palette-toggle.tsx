"use client";

import { useState, useEffect } from "react";

const palettes = ["porcelain", "ink", "moss", "dusk"] as const;
type Palette = (typeof palettes)[number];

export default function PaletteToggle() {
  const [active, setActive] = useState<Palette>("porcelain");

  useEffect(() => {
    const saved = localStorage.getItem("palette") as Palette | null;
    const initial = saved && (palettes as readonly string[]).includes(saved) ? saved : "porcelain";
    setActive(initial);
    document.documentElement.dataset.palette = initial;
  }, []);

  function set(p: Palette) {
    setActive(p);
    document.documentElement.dataset.palette = p;
    localStorage.setItem("palette", p);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        gap: 4,
        zIndex: 2000,
        background: "color-mix(in srgb, var(--paper) 85%, transparent)",
        border: "1px solid var(--rule)",
        padding: "6px 10px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          alignSelf: "center",
          marginRight: 6,
        }}
      >
        Palette
      </span>
      {palettes.map((p) => (
        <button
          key={p}
          onClick={() => set(p)}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "4px 8px",
            border: "1px solid var(--rule)",
            cursor: "pointer",
            background: active === p ? "var(--cinnabar)" : "transparent",
            color: active === p ? "var(--paper)" : "var(--ink-2)",
            transition: "all 120ms ease",
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
