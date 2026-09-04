"use client";

import { useEffect, useRef, useState } from "react";

// Defaults mirror :root in globals.css. Editing here overrides live and
// persists to localStorage so the preview keeps your changes across reloads.
const TOKENS: { group: string; items: { var: string; label: string }[] }[] = [
  {
    group: "Neutrals",
    items: [
      { var: "--bg", label: "Background" },
      { var: "--surface", label: "Surface" },
      { var: "--surface-2", label: "Surface 2" },
      { var: "--surface-3", label: "Surface 3" },
      { var: "--text", label: "Text" },
      { var: "--text-2", label: "Text 2" },
      { var: "--text-3", label: "Text 3" },
      { var: "--border", label: "Border" },
      { var: "--border-2", label: "Border 2" },
    ],
  },
  {
    group: "Accent",
    items: [
      { var: "--accent", label: "Accent" },
      { var: "--accent-hover", label: "Accent hover" },
      { var: "--accent-press", label: "Accent press" },
      { var: "--accent-weak", label: "Accent weak" },
      { var: "--accent-on", label: "Accent on" },
      { var: "--ring", label: "Focus ring" },
    ],
  },
  {
    group: "Data & status",
    items: [
      { var: "--indigo", label: "Indigo" },
      { var: "--indigo-weak", label: "Indigo weak" },
      { var: "--positive", label: "Positive" },
      { var: "--positive-weak", label: "Positive weak" },
      { var: "--negative", label: "Negative" },
      { var: "--negative-weak", label: "Negative weak" },
    ],
  },
];

const DEFAULTS: Record<string, string> = {
  "--bg": "#fbf7f1",
  "--surface": "#ffffff",
  "--surface-2": "#f4eee3",
  "--surface-3": "#ece4d6",
  "--text": "#1c1a17",
  "--text-2": "#6b6459",
  "--text-3": "#9a9186",
  "--border": "#e7e0d4",
  "--border-2": "#d8cfbe",
  "--accent": "#0f7a76",
  "--accent-hover": "#0b6461",
  "--accent-press": "#084f4c",
  "--accent-weak": "#e3efee",
  "--accent-on": "#ffffff",
  "--ring": "#0f7a76",
  "--indigo": "#33409a",
  "--indigo-weak": "#e8eaf7",
  "--positive": "#5a7d3c",
  "--positive-weak": "#ecf1e1",
  "--negative": "#bf3b2b",
  "--negative-weak": "#f8e7e4",
};

const STORAGE_KEY = "sl-theme-overrides";

function readStored(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function ThemeLab() {
  const [values, setValues] = useState<Record<string, string>>(DEFAULTS);
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mounted = useRef(false);

  // hydrate from storage once
  useEffect(() => {
    const merged = { ...DEFAULTS, ...readStored() };
    setValues(merged);
    Object.entries(merged).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v),
    );
    mounted.current = true;
  }, []);

  function apply(next: Record<string, string>) {
    setValues(next);
    Object.entries(next).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v),
    );
    const overrides = Object.fromEntries(
      Object.entries(next).filter(([k, v]) => v !== DEFAULTS[k]),
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {}
  }

  function setOne(name: string, hex: string) {
    apply({ ...values, [name]: hex });
  }

  // paint: click a row while a colour is picked up → paste it there
  function onRowClick(name: string) {
    if (!picked || picked === name) return;
    setOne(name, values[picked]);
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    apply({ ...DEFAULTS });
    setPicked(null);
  }

  function copyCss() {
    const lines = Object.keys(DEFAULTS).map((k) => `  ${k}: ${values[k]};`);
    const css = `:root {\n${lines.join("\n")}\n}`;
    navigator.clipboard?.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const dirtyCount = Object.keys(DEFAULTS).filter(
    (k) => values[k] !== DEFAULTS[k],
  ).length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-text px-4 py-2 text-sm font-semibold text-bg shadow-lg"
      >
        Theme Lab{dirtyCount ? ` · ${dirtyCount}` : ""}
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-50 flex max-h-[85vh] w-[320px] flex-col rounded-xl border border-border-2 bg-surface shadow-xl">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-bold text-text">Theme Lab</span>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="text-xs font-semibold text-text-3 hover:text-text"
          >
            Reset
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-text-3 hover:text-text"
          >
            Hide
          </button>
        </div>
      </header>

      <div className="border-b border-border px-4 py-2.5 text-xs text-text-2">
        {picked ? (
          <span>
            Holding <code className="text-text">{picked}</code> — click another
            row to paint it there.{" "}
            <button
              onClick={() => setPicked(null)}
              className="font-semibold text-accent"
            >
              drop
            </button>
          </span>
        ) : (
          <span>
            Click a swatch to edit. Click the dot to pick a colour up, then
            click another row to apply it.
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {TOKENS.map((g) => (
          <div key={g.group} className="mb-3">
            <div className="px-2 py-1 text-2xs font-bold uppercase tracking-wide text-text-3">
              {g.group}
            </div>
            {g.items.map((t) => {
              const val = values[t.var] ?? DEFAULTS[t.var];
              const dirty = val !== DEFAULTS[t.var];
              return (
                <div
                  key={t.var}
                  onClick={() => onRowClick(t.var)}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 ${
                    picked && picked !== t.var
                      ? "cursor-pointer hover:bg-accent-weak"
                      : ""
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPicked(picked === t.var ? null : t.var);
                    }}
                    aria-label={`pick up ${t.label}`}
                    className={`size-4 shrink-0 rounded-full border ${
                      picked === t.var
                        ? "border-accent ring-2 ring-accent"
                        : "border-border-2"
                    }`}
                    style={{ background: val }}
                  />
                  <label className="flex flex-1 items-center justify-between gap-2 text-xs">
                    <span className={dirty ? "font-semibold text-text" : "text-text-2"}>
                      {t.label}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-2xs text-text-3">{val}</span>
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(val) ? val : "#000000"}
                        onChange={(e) => setOne(t.var, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
                      />
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <footer className="border-t border-border p-3">
        <button
          onClick={copyCss}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-on hover:bg-accent-hover"
        >
          {copied ? "Copied :root CSS" : `Copy :root CSS${dirtyCount ? ` · ${dirtyCount} changed` : ""}`}
        </button>
      </footer>
    </aside>
  );
}
