"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { playClick } from "@/lib/sound";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
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
    playClick("soft");
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
