"use client";

import { useState } from "react";

const palettes = ["porcelain", "ink", "moss", "dusk"] as const;
type Palette = (typeof palettes)[number];

export default function PaletteToggle() {
  const [active, setActive] = useState<Palette>("porcelain");

  function set(p: Palette) {
    setActive(p);
    document.documentElement.dataset.palette = p === "porcelain" ? "" : p;
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
        background: "var(--paper)",
        border: "1px solid var(--ink)",
        padding: "6px 10px",
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
            background: active === p ? "var(--ink)" : "transparent",
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
