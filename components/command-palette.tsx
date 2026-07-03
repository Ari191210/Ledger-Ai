"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TOOLS_REGISTRY, CAT_COLOR } from "@/lib/tools-registry";
import { getRecentTools } from "@/lib/recent-tools";

const QUICK_ACTIONS = [
  { name: "Dashboard",           path: "/dashboard",         category: "NAV", subtitle: "Your study overview" },
  { name: "Profile & Settings",  path: "/dashboard/profile", category: "NAV", subtitle: "Account and preferences" },
  { name: "Ledger Score",        path: "/tools/grade-tracker",       category: "NAV", subtitle: "Your real-time readiness" },
  { name: "Themes",              path: "/tools/personalise", category: "NAV", subtitle: "Palette, mode, density" },
];

type Item =
  | { kind: "tool";   title: string; subtitle: string; slug: string; category: string }
  | { kind: "action"; name: string;  subtitle: string; path: string;  category: string };

function fuzzyScore(query: string, tool: { title?: string; name?: string; slug?: string; subtitle?: string; keywords?: string[] }): number {
  const q = query.toLowerCase();
  const title = (tool.title ?? tool.name ?? "").toLowerCase();
  const sub   = (tool.subtitle ?? "").toLowerCase();
  const slug  = (tool.slug ?? "").toLowerCase();
  if (title.startsWith(q))     return 5;
  if (title.includes(q))       return 4;
  if (slug.includes(q))        return 3;
  if (sub.includes(q))         return 2;
  if (tool.keywords?.some(k => k.includes(q))) return 1;
  return 0;
}

function matchesQuery(query: string, item: Item): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.kind === "action") {
    return item.name.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
  }
  return (
    item.title.toLowerCase().includes(q)    ||
    item.subtitle.toLowerCase().includes(q) ||
    item.slug.toLowerCase().includes(q)     ||
    (item as { keywords?: string[] }).keywords?.some((k: string) => k.includes(q)) === true
  );
}

export default function CommandPalette() {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [cursor,  setCursor]  = useState(0);
  const [mounted, setMounted] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const itemRefs  = useRef<(HTMLButtonElement | null)[]>([]);

  // Build a merged+sorted item list
  const allTools: Item[] = TOOLS_REGISTRY.map(t => ({
    kind:     "tool" as const,
    title:    t.title,
    subtitle: t.subtitle,
    slug:     t.slug,
    category: t.cat,
    keywords: t.keywords,
  }));
  const allActions: Item[] = QUICK_ACTIONS.map(a => ({ kind: "action" as const, ...a }));

  const filtered: Item[] = (() => {
    const q = query.trim();
    if (q) {
      // Scored search across tools + actions
      const toolHits = allTools
        .map(t => ({ item: t, score: fuzzyScore(q, t.kind === "tool" ? { title: t.title, subtitle: t.subtitle, slug: t.slug, keywords: (t as { keywords?: string[] }).keywords } : { name: (t as Item & { name?: string }).name }) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
      const actionHits = allActions.filter(a => matchesQuery(q, a));
      return [...actionHits, ...toolHits].slice(0, 24);
    }
    // No query — show quick actions + recents first, then rest
    const recentItems = allTools
      .filter(t => recents.includes(t.kind === "tool" ? t.slug : ""))
      .sort((a, b) => recents.indexOf((a as { slug: string }).slug) - recents.indexOf((b as { slug: string }).slug));
    const restItems = allTools.filter(t => !recents.includes(t.kind === "tool" ? t.slug : ""));
    return [...allActions, ...recentItems, ...restItems].slice(0, 28);
  })();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const go = useCallback((item: Item) => {
    const path = item.kind === "tool" ? `/tools/${item.slug}` : item.path;
    router.push(path);
    close();
  }, [router, close]);

  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => {
          if (!o) setRecents(getRecentTools());
          return !o;
        });
        setQuery("");
        setCursor(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setRecents(getRecentTools());
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const el = itemRefs.current[cursor];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  useEffect(() => { setCursor(0); }, [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape")    { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); return; }
    if (e.key === "Enter" && filtered[cursor]) { go(filtered[cursor]); }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes cp-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cp-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes cp-panel-in  { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cp-panel-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.96) translateY(-8px); } }

        .cp-backdrop {
          position: fixed; inset: 0; z-index: 9990;
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 80px;
          background: rgba(8, 8, 8, 0.60);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .cp-backdrop[data-open="true"]  { animation: cp-backdrop-in  180ms ease-out forwards; }
        .cp-backdrop[data-open="false"] { animation: cp-backdrop-out 140ms ease-in  forwards; }

        .cp-panel {
          position: relative; z-index: 1;
          width: 100%; max-width: 560px;
          background: var(--paper-2);
          border: 1px solid var(--rule);
          border-radius: 16px;
          display: flex; flex-direction: column;
          max-height: calc(100vh - 120px);
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3);
        }
        .cp-panel[data-open="true"]  { animation: cp-panel-in  180ms ease-out forwards; }
        .cp-panel[data-open="false"] { animation: cp-panel-out 140ms ease-in  forwards; }

        .cp-search-wrap {
          display: flex; align-items: center; gap: 10;
          padding: 0 20px;
          border-bottom: 1px solid var(--rule);
        }
        .cp-search-icon {
          font-size: 14px; color: var(--ink-3); flex-shrink: 0; opacity: 0.6;
        }
        .cp-search-input {
          flex: 1;
          font-family: var(--sans);
          font-size: 18px;
          font-weight: 400;
          color: var(--ink);
          background: transparent;
          border: none;
          outline: none;
          padding: 20px 0;
          letter-spacing: -0.01em;
        }
        .cp-search-input::placeholder { color: var(--ink-3); }
        .cp-esc-btn {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.06em;
          padding: 3px 7px;
          border: 1px solid var(--rule);
          border-radius: 4px;
          background: transparent;
          color: var(--ink-3);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 120ms ease, border-color 120ms ease;
        }
        .cp-esc-btn:hover { color: var(--ink); border-color: var(--ink-2); }

        .cp-results { overflow-y: auto; flex: 1; padding: 8px 8px; }

        .cp-item {
          display: flex; align-items: center; gap: 12;
          width: 100%; padding: 10px 12px;
          background: transparent;
          border: none; border-radius: 10px;
          cursor: pointer; text-align: left;
          transition: background 80ms ease;
        }
        .cp-item[data-active="true"] {
          background: color-mix(in srgb, var(--ink) 8%, transparent);
        }
        .cp-item-name {
          display: block;
          font-family: var(--serif);
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.3;
        }
        .cp-item-badge {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-3);
          flex-shrink: 0;
          padding: 2px 6px;
          border: 1px solid var(--rule);
          border-radius: 4px;
        }
        .cp-item[data-active="true"] .cp-item-badge {
          border-color: color-mix(in srgb, var(--ink) 20%, transparent);
        }
        .cp-item-icon {
          font-size: 11px; color: var(--ink-3); flex-shrink: 0; opacity: 0.5;
        }

        .cp-empty {
          padding: 40px 20px; text-align: center;
          font-family: var(--sans); font-size: 14px; color: var(--ink-3);
        }

        .cp-footer {
          border-top: 1px solid var(--rule);
          padding: 10px 20px;
          display: flex; align-items: center; gap: 16;
          flex-shrink: 0;
        }
        .cp-hint {
          display: flex; align-items: center; gap: 5;
        }
        .cp-hint-key {
          font-family: var(--mono); font-size: 9px; letter-spacing: 0.04em;
          padding: 2px 5px; border: 1px solid var(--rule); border-radius: 4px;
          color: var(--ink-3);
        }
        .cp-hint-label {
          font-family: var(--mono); font-size: 9px; color: var(--ink-3);
        }
        .cp-count {
          margin-left: auto;
          font-family: var(--mono); font-size: 9px; color: var(--ink-3); opacity: 0.5;
        }
      `}</style>

      {open && (
        <div
          className="cp-backdrop"
          data-open="true"
          onClick={close}
          role="presentation"
        >
          <div
            className="cp-panel"
            data-open="true"
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            {/* Search header */}
            <div className="cp-search-wrap">
              <span className="cp-search-icon" aria-hidden="true">⌘</span>
              <input
                ref={inputRef}
                className="cp-search-input"
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search tools and pages…"
                aria-label="Search tools and actions"
                autoComplete="off"
                spellCheck={false}
              />
              <button className="cp-esc-btn" onClick={close} tabIndex={-1}>ESC</button>
            </div>

            {/* Results */}
            <div className="cp-results" ref={listRef} role="listbox" aria-label="Results">
              {!query.trim() && recents.length > 0 && (
                <div style={{
                  padding: "8px 12px 2px",
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  opacity: 0.5,
                }}>
                  Recent
                </div>
              )}
              {filtered.length === 0 ? (
                <div className="cp-empty">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((item, i) => {
                  const isRecent = item.kind === "tool" && recents.includes(item.slug);
                  const label    = item.kind === "tool" ? item.title : item.name;
                  const sub      = item.subtitle;
                  const catColor = item.category !== "NAV"
                    ? CAT_COLOR[item.category as keyof typeof CAT_COLOR]
                    : "var(--ink-3)";
                  return (
                    <button
                      key={item.kind === "tool" ? item.slug : item.path}
                      ref={el => { itemRefs.current[i] = el; }}
                      className="cp-item"
                      data-active={i === cursor ? "true" : "false"}
                      role="option"
                      aria-selected={i === cursor}
                      onClick={() => go(item)}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <span className="cp-item-icon" aria-hidden="true">
                        {item.category === "NAV" ? "↗" : "→"}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="cp-item-name">{label}</span>
                        {sub && (
                          <span style={{
                            display: "block",
                            fontFamily: "var(--mono)",
                            fontSize: 10,
                            color: "var(--ink-3)",
                            opacity: 0.55,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginTop: 1,
                            lineHeight: 1.3,
                          }}>
                            {sub}
                          </span>
                        )}
                      </span>
                      <span className="cp-item-badge" style={{ color: catColor, borderColor: "color-mix(in srgb, " + catColor + " 30%, transparent)" }}>
                        {item.category}
                      </span>
                      {isRecent && !query && (
                        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", opacity: 0.35, flexShrink: 0 }}>↩</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="cp-footer">
              <div className="cp-hint">
                <span className="cp-hint-key">↑↓</span>
                <span className="cp-hint-label">navigate</span>
              </div>
              <div className="cp-hint">
                <span className="cp-hint-key">↵</span>
                <span className="cp-hint-label">open</span>
              </div>
              <div className="cp-hint">
                <span className="cp-hint-key">esc</span>
                <span className="cp-hint-label">close</span>
              </div>
              <span className="cp-count">
                {query.trim() ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : `${TOOLS_REGISTRY.length} tools`}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
