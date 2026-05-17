"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { PALETTE_IDS, PALETTE_META, applyPalette, getActivePalette, type PaletteId } from "@/lib/palette";
import AnimatedThemeToggler from "@/components/animated-theme-toggler";

export default function PaletteToggle() {
  const path = usePathname();
  const [active, setActive] = useState<PaletteId>("porcelain");

  useEffect(() => {
    setActive(getActivePalette());
    document.documentElement.dataset.palette = getActivePalette();

    const handler = (e: Event) => setActive((e as CustomEvent<PaletteId>).detail);
    window.addEventListener("ledger-palette", handler);
    return () => window.removeEventListener("ledger-palette", handler);
  }, []);

  const showPalette = !path.startsWith("/dashboard") && !path.startsWith("/admin") && !path.startsWith("/tools");

  function set(p: PaletteId) {
    setActive(p);
    applyPalette(p);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        alignItems: "center",
        gap: 4,
        zIndex: 2000,
        background: "color-mix(in srgb, var(--paper) 85%, transparent)",
        border: "1px solid var(--rule)",
        padding: showPalette ? "6px 10px" : "6px 8px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {showPalette && (
        <>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              marginRight: 6,
              whiteSpace: "nowrap",
            }}
          >
            Palette
          </span>
          {PALETTE_IDS.map((p) => (
            <button
              key={p}
              title={PALETTE_META[p].name}
              onClick={() => set(p)}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: active === p ? `2px solid ${PALETTE_META[p].accent}` : "2px solid transparent",
                background: PALETTE_META[p].accent,
                cursor: "pointer",
                padding: 0,
                boxShadow: active === p ? `0 0 6px ${PALETTE_META[p].accent}88` : "none",
                transition: "all 120ms ease",
                outline: "none",
              }}
            />
          ))}
          <div style={{ width: 1, height: 18, background: "var(--rule)", margin: "0 4px" }} />
        </>
      )}
      <AnimatedThemeToggler size={28} />
    </div>
  );
}
