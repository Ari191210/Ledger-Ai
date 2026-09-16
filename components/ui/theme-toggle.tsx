"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { flashTheme } from "@/lib/theme-flash";

type Theme = "dark" | "light";

/** Layout effect on the client, plain effect on the server, so the pre-paint
 *  read below does not trip React's SSR warning. */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  // The real theme lives on documentElement, written by the pre-hydration
  // script, so it cannot be known while rendering on the server: reading it in
  // a lazy useState initialiser would either crash or make the server and the
  // client disagree. Before paint rather than after, because the server always
  // sends the dark icon, and a student in light mode would otherwise watch the
  // sun sit there for a frame and then become a moon. The setState warning here
  // is knowingly kept: the alternative is a visible wrong icon.
  useIsoLayoutEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sl-theme", next);
    } catch {}
    setTheme(next);
    flashTheme();
  }

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
      className="grid size-8 place-items-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text"
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
