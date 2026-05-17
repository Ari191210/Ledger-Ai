"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { sounds } from "@/lib/sounds";

export default function ButtonClickEffect() {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = (e.target as Element)?.closest(".btn");
      if (!target || (target as HTMLButtonElement).disabled) return;
      sounds.click();
      gsap.fromTo(
        target,
        { scale: 0.94 },
        {
          scale: 1,
          duration: 0.55,
          ease: "elastic.out(1.1, 0.38)",
          overwrite: "auto",
        }
      );
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return null;
}
