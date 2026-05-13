"use client"

import { usePathname } from "next/navigation";

export default function PageGradient() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
        background: [
          "radial-gradient(ellipse 90% 55% at 50% -5%, var(--page-glow-a), transparent)",
          "radial-gradient(ellipse 70% 45% at 85% 105%, var(--page-glow-b), transparent)",
          "radial-gradient(ellipse 50% 35% at 10% 95%, var(--page-glow-b), transparent)",
        ].join(", "),
      }}
    />
  )
}
