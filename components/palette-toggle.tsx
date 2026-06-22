"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  PALETTE_IDS,
  PALETTE_META,
  applyPalette,
  getActivePalette,
  type PaletteId,
} from "@/lib/palette";
import AnimatedThemeToggler from "@/components/animated-theme-toggler";
import { sounds } from "@/lib/sounds";

gsap.registerPlugin(useGSAP);

export default function PaletteToggle() {
  const [active,    setActive]    = useState<PaletteId>("ledger");
  const [hovered,   setHovered]   = useState<PaletteId | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const panelRef  = useRef<HTMLDivElement>(null);
  const swatchMap = useRef<Partial<Record<PaletteId, HTMLButtonElement>>>({});

  useEffect(() => {
    setActive(getActivePalette());
    document.documentElement.dataset.palette = getActivePalette();
    const handler = (e: Event) =>
      setActive((e as CustomEvent<PaletteId>).detail);
    window.addEventListener("ledger-palette", handler);
    return () => window.removeEventListener("ledger-palette", handler);
  }, []);

  /* Entrance — slide in from bottom-right */
  useGSAP(() => {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current,
      { opacity: 0, x: 28, y: 28 },
      { opacity: 1, x: 0, y: 0, duration: 0.6, ease: "power3.out", delay: 0.2 }
    );
  }, { scope: panelRef });

  const { contextSafe } = useGSAP({ scope: panelRef });

  const onEnter = contextSafe((p: PaletteId) => {
    const el = swatchMap.current[p];
    if (!el) return;
    gsap.to(el, { scale: 1.1, duration: 0.18, ease: "power2.out" });
    setHovered(p);
  });

  const onLeave = contextSafe((p: PaletteId) => {
    const el = swatchMap.current[p];
    if (!el) return;
    gsap.to(el, { scale: 1.0, duration: 0.22, ease: "power3.out" });
    setHovered(null);
  });

  const pickPalette = contextSafe((p: PaletteId) => {
    setActive(p);
    applyPalette(p);
    sounds.select();
    const el = swatchMap.current[p];
    if (!el) return;
    gsap.timeline()
      .to(el,  { scale: 0.88, duration: 0.10, ease: "power2.in" })
      .to(el,  { scale: 1.0,  duration: 0.45, ease: "elastic.out(1.2,0.4)" });
  });

  const displayName = PALETTE_META[hovered ?? active].name.toUpperCase();
  const displayAccent = PALETTE_META[hovered ?? active].accent;

  const rows: [PaletteId[], PaletteId[]] = [
    PALETTE_IDS.slice(0, 4) as PaletteId[],
    PALETTE_IDS.slice(4) as PaletteId[],
  ];

  if (collapsed) return (
    <button
      onClick={() => setCollapsed(false)}
      aria-label="Open theme selector"
      style={{
        position: "fixed", bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 12px)", right: 16,
        zIndex: 2000, width: 36, height: 36,
        background: "color-mix(in srgb, var(--paper) 85%, transparent)",
        border: "1px solid var(--rule)", borderRadius: 6,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 14,
      }}
    >◈</button>
  );

  return (
    <div
      ref={panelRef}
      role="group"
      aria-label="Theme and palette selector"
      className="palette-panel"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 2000,
        width: 188,
        display: "flex",
        flexDirection: "column",
        background: "color-mix(in srgb, var(--paper) 80%, transparent)",
        border: "1px solid var(--rule)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Row 1: mode toggle ─────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: "1px solid var(--rule)",
      }}>
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}>
          Theme
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AnimatedThemeToggler size={26} />
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse theme selector"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 14,
              padding: "0 2px", lineHeight: 1, boxShadow: "none", borderRadius: 0,
            }}
          >—</button>
        </div>
      </div>

      {/* ── Row 2: palette label + live name ──────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 12px 5px",
      }}>
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}>
          Palette
        </span>
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: displayAccent,
          transition: "color 120ms ease",
        }}>
          {displayName}
        </span>
      </div>

      {/* ── Row 3: swatch grid ────────────────────────────────────── */}
      <div
        role="radiogroup"
        aria-label="Color palette"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "4px 10px 12px",
        }}
      >
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 4 }}>
            {row.map((p) => {
              const meta    = PALETTE_META[p];
              const isActive = active === p;
              return (
                <button
                  key={p}
                  ref={el => { swatchMap.current[p] = el ?? undefined; }}
                  role="radio"
                  aria-checked={isActive}
                  aria-label={meta.name}
                  onClick={() => pickPalette(p)}
                  onMouseEnter={() => onEnter(p)}
                  onMouseLeave={() => onLeave(p)}
                  style={{
                    flex: 1,
                    height: 30,
                    borderRadius: 4,
                    border: isActive
                      ? `2px solid ${meta.accent}`
                      : "2px solid transparent",
                    background: `linear-gradient(145deg, ${meta.paper} 20%, ${meta.accent} 130%)`,
                    cursor: "pointer",
                    padding: 0,
                    outline: "none",
                    boxShadow: isActive
                      ? `0 0 12px ${meta.accent}60`
                      : "0 1px 3px rgba(0,0,0,0.3)",
                    transition: "border-color 120ms ease, box-shadow 120ms ease",
                    transformOrigin: "center",
                    willChange: "transform",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Inner accent flash at top edge */}
                  {isActive && (
                    <span style={{
                      position: "absolute",
                      top: 0, left: 0, right: 0,
                      height: 2,
                      background: meta.accent,
                      opacity: 0.9,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
