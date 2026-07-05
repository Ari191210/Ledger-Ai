"use client";

import { useEffect } from "react";
import { sounds } from "@/lib/sounds";

// Elastic-out spring sampled from gsap's elastic.out(1.1, 0.38) — keeps the
// exact feel without shipping gsap (~27 KB gz) in the global bundle.
const ELASTIC_SCALE_KEYFRAMES: Keyframe[] = [
  { transform: "scale(0.94)" },
  { transform: "scale(1.022)", offset: 0.28 },
  { transform: "scale(0.993)", offset: 0.52 },
  { transform: "scale(1.003)", offset: 0.74 },
  { transform: "scale(1)" },
];

export default function ButtonClickEffect() {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = (e.target as Element)?.closest(".btn");
      if (!target || (target as HTMLButtonElement).disabled) return;
      sounds.click();
      target
        .getAnimations()
        .filter((a) => a.id === "btn-click-pop")
        .forEach((a) => a.cancel());
      const anim = target.animate(ELASTIC_SCALE_KEYFRAMES, {
        duration: 550,
        easing: "ease-out",
      });
      anim.id = "btn-click-pop";
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return null;
}
