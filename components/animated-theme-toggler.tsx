"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { sounds } from "@/lib/sounds";

type LedgerMode = "dark" | "light";

function getStoredMode(): LedgerMode {
  try { return (localStorage.getItem("ledger-mode") as LedgerMode) || "dark"; } catch { return "dark"; }
}

function applyMode(m: LedgerMode) {
  if (m === "light") {
    document.documentElement.dataset.mode = "light";
  } else {
    delete document.documentElement.dataset.mode;
  }
  try { localStorage.setItem("ledger-mode", m); } catch {}
  window.dispatchEvent(new CustomEvent("ledger-mode", { detail: m }));
}

export default function AnimatedThemeToggler({ size = 30 }: { size?: number }) {
  const btnRef  = useRef<HTMLButtonElement>(null);
  const sunRef  = useRef<SVGGElement>(null);
  const moonRef = useRef<SVGGElement>(null);
  const modeRef = useRef<LedgerMode>("dark");

  useEffect(() => {
    const m = getStoredMode();
    modeRef.current = m;
    if (m === "light") {
      gsap.set(sunRef.current,  { opacity: 0, scale: 0.4, rotation: -45 });
      gsap.set(moonRef.current, { opacity: 1, scale: 1,   rotation: 0   });
    } else {
      gsap.set(sunRef.current,  { opacity: 1, scale: 1,   rotation: 0   });
      gsap.set(moonRef.current, { opacity: 0, scale: 0.4, rotation: 45  });
    }
  }, []);

  function toggle() {
    const next: LedgerMode = modeRef.current === "dark" ? "light" : "dark";
    modeRef.current = next;
    applyMode(next);
    next === "light" ? sounds.toggleOn() : sounds.toggleOff();

    gsap.fromTo(btnRef.current,
      { scale: 0.84 },
      { scale: 1, duration: 0.55, ease: "elastic.out(1,0.4)" }
    );

    if (next === "light") {
      gsap.to(sunRef.current,  { opacity: 0, scale: 0.4, rotation: -60, duration: 0.2, ease: "power2.in",    transformOrigin: "50% 50%" });
      gsap.fromTo(moonRef.current,
        { opacity: 0, scale: 0.4, rotation: 60,  transformOrigin: "50% 50%" },
        { opacity: 1, scale: 1,   rotation: 0,   duration: 0.38, delay: 0.14, ease: "back.out(1.6)" }
      );
    } else {
      gsap.to(moonRef.current, { opacity: 0, scale: 0.4, rotation: 60,  duration: 0.2, ease: "power2.in",    transformOrigin: "50% 50%" });
      gsap.fromTo(sunRef.current,
        { opacity: 0, scale: 0.4, rotation: -60, transformOrigin: "50% 50%" },
        { opacity: 1, scale: 1,   rotation: 0,   duration: 0.38, delay: 0.14, ease: "back.out(1.6)" }
      );
    }
  }

  const iconSize = Math.round(size * 0.53);

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      title="Toggle light / dark mode"
      style={{
        width:  size,
        height: size,
        borderRadius: "50%",
        border: "1px solid color-mix(in srgb, var(--ink) 14%, transparent)",
        background: "color-mix(in srgb, var(--ink) 8%, transparent)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        color: "var(--ink-2)",
        transition: "border-color 160ms ease, background 160ms ease, color 160ms ease",
        flexShrink: 0,
        outline: "none",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        fill="none"
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        {/* Sun — visible in dark mode */}
        <g ref={sunRef} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={12 + Math.cos(r) * 6.8} y1={12 + Math.sin(r) * 6.8}
                x2={12 + Math.cos(r) * 9.2} y2={12 + Math.sin(r) * 9.2}
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              />
            );
          })}
        </g>
        {/* Moon — visible in light mode */}
        <g ref={moonRef} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="currentColor"
          />
        </g>
      </svg>
    </button>
  );
}
