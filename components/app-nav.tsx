"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";
import { applyPalette, getActivePalette, PALETTE_META, type PaletteId } from "@/lib/palette";
import { useAuth } from "./auth-provider";
import { loadUserData } from "@/lib/user-data";
import { useUI } from "./ui-context";
import CommandPalette from "./command-palette";
import { TOOLS_REGISTRY, CAT_COLOR, type ToolCategory } from "@/lib/tools-registry";

type Tool = { slug: string; full: string; sub: string };
type Category = { label: string; color: string; tools: Tool[] };

// iOS-native drawer curve — feels like it grows from the trigger, not slides from a wall
const DRAWER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

// Derived from the registry — the single source of truth for tool slugs.
// A hardcoded copy here previously drifted after the June consolidation and
// left 23 dead links in the sidebar.
const CAT_ORDER: ToolCategory[] = ["PLAN", "LEARN", "WRITE", "PRACTISE", "FUTURE", "TRACK"];
const CATEGORIES: Category[] = CAT_ORDER.map(label => ({
  label,
  color: CAT_COLOR[label],
  tools: TOOLS_REGISTRY
    .filter(t => t.cat === label)
    .map(t => ({ slug: t.slug, full: t.title, sub: t.subtitle })),
}));

const TOTAL_TOOLS = CATEGORIES.reduce((n, c) => n + c.tools.length, 0);

function ToolRow({ t, color, idx, sidebarOpen, onOpen, onSplit }: {
  t: Tool; color: string; idx: number; sidebarOpen: boolean;
  onOpen: (s: string) => void; onSplit: (s: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Cap delay so the wave completes before users start scanning (~240ms max)
  const delay = Math.min(idx * 14, 240);
  return (
    <div
      style={{
        borderBottom: "1px solid var(--rule)", padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        borderLeft: hovered ? `3px solid ${color}` : "3px solid transparent",
        background: hovered ? "var(--paper)" : "transparent",
        transition: "background 140ms ease, border-color 140ms ease",
        animation: sidebarOpen
          ? `sidebar-item-in 0.24s cubic-bezier(0.23,1,0.32,1) ${delay}ms both`
          : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.full}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", marginTop: 3, letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onOpen(t.slug)}
          aria-label={`Open ${t.full}`}
          className="tool-row-btn"
          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--ink-2)", background: "transparent", color: "var(--ink-2)", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 0, boxShadow: "none", backdropFilter: "none" }}
        >Open</button>
        <button
          onClick={() => onSplit(t.slug)}
          aria-label={`Split view with ${t.full}`}
          className="tool-row-btn"
          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--rule)", background: "transparent", color: "var(--ink-3)", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 0, boxShadow: "none", backdropFilter: "none" }}
        >Split</button>
      </div>
    </div>
  );
}

export default function AppNav() {
  const path   = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { splitSlug, setSplitSlug } = useUI();

  const [displayName, setDisplayName] = useState("");
  const [embedded, setEmbedded]       = useState(false);
  const [open, setOpen]               = useState(false);
  const [hoveredNav, setHoveredNav]   = useState<string | null>(null);
  const [logoHovered, setLogoHovered] = useState(false);
  const [activeTheme, setActiveTheme] = useState<PaletteId>("ledger");
  const [navVisible,  setNavVisible]  = useState(false);
  const [isLight, setIsLight]         = useState(false);

  useEffect(() => {
    try { setEmbedded(window.self !== window.top); } catch { setEmbedded(true); }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      setDisplayName(ud?.username || user.email?.split("@")[0] || "");
    });
  }, [user]);

  const closeSidebar = useCallback(() => { setOpen(false); }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeSidebar(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeSidebar]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveTheme(getActivePalette());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PaletteId>).detail;
      setActiveTheme(detail);
      if (PALETTE_META[detail]?.isLight) localStorage.setItem("ledger-last-light", detail);
    };
    window.addEventListener("ledger-palette", handler);
    return () => window.removeEventListener("ledger-palette", handler);
  }, []);

  useEffect(() => {
    const mode = localStorage.getItem("ledger-theme-mode");
    if (mode === "light") {
      setIsLight(true);
      applyPalette("paper");
    }
  }, []);

  // Landing page: slide in after first scroll. All other pages: hide on scroll-down, show on scroll-up.
  useEffect(() => {
    if (path === "/") {
      setNavVisible(false);
      const onScroll = () => { setNavVisible(true); window.removeEventListener("scroll", onScroll); };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    setNavVisible(true);
    // Tool pages scroll inside .tool-main-panel (overflow-y: auto), not the
    // window — listen to both so hide-on-scroll works everywhere.
    const panel = document.querySelector<HTMLElement>(".tool-main-panel");
    let lastY = panel ? panel.scrollTop : (typeof window !== "undefined" ? window.scrollY : 0);
    const onScroll = () => {
      const y = panel ? panel.scrollTop : window.scrollY;
      if (y < 80) { setNavVisible(true); }
      else if (y > lastY + 8) { setNavVisible(false); }
      else if (y < lastY - 8) { setNavVisible(true); }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    panel?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      panel?.removeEventListener("scroll", onScroll);
    };
  }, [path]);

  function toggleLightDark() {
    if (isLight) {
      // Switch to dark: restore saved dark palette
      localStorage.setItem("ledger-theme-mode", "dark");
      setIsLight(false);
      const saved = localStorage.getItem("ledger-palette") as PaletteId | null;
      const target = saved || "ledger";
      applyPalette(target);
      setActiveTheme(target);
    } else {
      // Switch to light: save current dark palette, apply porcelain ("paper")
      localStorage.setItem("ledger-theme-mode", "light");
      localStorage.setItem("ledger-palette", activeTheme);
      setIsLight(true);
      applyPalette("paper");
      setActiveTheme("paper");
    }
  }

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  }

  async function handleSignOut() { await signOut(); router.push("/auth"); }
  function openTool(slug: string)  { router.push(`/tools/${slug}`); closeSidebar(); }
  function splitTool(slug: string) { setSplitSlug(slug); closeSidebar(); }

  if (embedded) return null;

  const short     = displayName.length > 14 ? displayName.slice(0, 12) + "…" : displayName;
  const isProfile = path === "/dashboard/profile";
  const initial   = (displayName || "?")[0].toUpperCase();

  const navLink = (href: string, label: string, extra?: React.ReactNode, mobileHide?: boolean) => {
    const active = path === href;
    const hovered = hoveredNav === href;
    return (
      <Link
        href={href}
        className={mobileHide ? "mob-hide" : undefined}
        onMouseEnter={() => setHoveredNav(href)}
        onMouseLeave={() => setHoveredNav(null)}
        style={{
          textDecoration: "none", display: "flex", alignItems: "center", gap: 6, padding: "0 16px",
          borderRight: "1px solid var(--rule)",
          background: active ? "var(--paper-2)" : hovered ? "color-mix(in srgb, var(--ink) 5%, transparent)" : "transparent",
          color: active ? "var(--ink)" : hovered ? "var(--ink)" : "var(--ink-2)",
          fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
          height: "100%", transition: "background 160ms ease, color 160ms ease",
          position: "relative",
          boxShadow: active ? "inset 0 -2px 0 0 var(--cinnabar-ink)" : undefined,
          transform: hovered && !active ? "translateY(-1px)" : undefined,
        }}
      >
        {extra}{label}
      </Link>
    );
  };

  return (
    <>
      <CommandPalette />

      {/* ── Top nav bar ── */}
      <nav role="navigation" aria-label="Main navigation" className="gl-pane float-nav" style={{
        position: "fixed", top: 16, left: "50%", zIndex: 100,
        width: "calc(100% - 48px)", maxWidth: 960,
        border: "1px solid var(--rule)",
        display: "flex", alignItems: "stretch", height: 52,
        borderRadius: 14,
        overflow: "hidden",
        transform: navVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-80px)",
        transition: "transform 0.55s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <Link
          href="/"
          aria-label="Ledger — home"
          className="nav-logo"
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          style={{
            textDecoration: "none", display: "flex", alignItems: "center", padding: "0 20px",
            borderRight: "1px solid var(--rule)", flexShrink: 0,
            transition: "background 160ms ease",
            background: logoHovered ? "color-mix(in srgb, var(--cinnabar-ink) 5%, transparent)" : "transparent",
          }}
        >
          <span style={{
            fontFamily: "'Melodrama', var(--serif)", fontStyle: "normal", fontWeight: 700, fontSize: 20,
            color: "var(--ink)",
            letterSpacing: logoHovered ? "0.06em" : "0.01em",
            transform: logoHovered ? "scale(1.04)" : "scale(1)",
            display: "inline-block",
            transition: "letter-spacing 280ms cubic-bezier(0.22,1,0.36,1), transform 280ms cubic-bezier(0.22,1,0.36,1)",
          }}>
            Ledger
          </span>
        </Link>

        {navLink("/dashboard", "Dashboard", undefined, true)}

        {/* ── Light / dark toggle ── */}
        <button
          onClick={toggleLightDark}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="mob-hide"
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "0 16px", height: "100%", flexShrink: 0,
            background: isLight ? "color-mix(in srgb, var(--cinnabar-ink) 8%, transparent)" : "transparent",
            border: "none",
            borderRight: "1px solid var(--rule)", cursor: "pointer",
            color: isLight ? "var(--cinnabar-ink)" : "var(--ink-2)",
            fontFamily: "var(--sans)", fontSize: 10, fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
            transition: "background 160ms ease, color 160ms ease",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isLight ? "color-mix(in srgb, var(--cinnabar-ink) 14%, transparent)" : "color-mix(in srgb, var(--ink) 6%, transparent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isLight ? "color-mix(in srgb, var(--cinnabar-ink) 8%, transparent)" : "transparent"; }}
        >
          {isLight ? (
            /* moon — currently light, click → dark */
            <Moon size={16} />
          ) : (
            /* sun — currently dark, click → light */
            <Sun size={16} />
          )}
          <span>{isLight ? "Dark" : "Light"}</span>
        </button>

        <Link
          href="/tools/grade-tracker"
          className="mob-hide"
          onMouseEnter={() => setHoveredNav("/tools/grade-tracker")}
          onMouseLeave={() => setHoveredNav(null)}
          style={{
            textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "0 14px",
            borderRight: "1px solid var(--rule)",
            background: path === "/tools/grade-tracker" ? "var(--paper-2)" : hoveredNav === "/tools/grade-tracker" ? "color-mix(in srgb, var(--cinnabar-ink) 8%, transparent)" : "transparent",
            color: "var(--cinnabar-ink)",
            fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
            height: "100%",
            transition: "background 160ms ease, transform 160ms ease",
            transform: hoveredNav === "/tools/grade-tracker" && path !== "/tools/grade-tracker" ? "translateY(-1px)" : undefined,
            boxShadow: path === "/tools/grade-tracker" ? "inset 0 -2px 0 0 var(--cinnabar-ink)" : undefined,
          }}
        >
          <span>★</span><span>Score</span>
        </Link>

        <button
          onClick={() => setOpen(true)}
          aria-label="Open tools panel"
          aria-expanded={open}
          aria-haspopup="dialog"
          className="nav-btn-press"
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "0 18px",
            background: open ? "var(--paper-2)" : "transparent", border: "none",
            borderRight: "1px solid var(--rule)", cursor: "pointer",
            fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--ink)", flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 12 }}>⊞</span><span className="nav-tools-label">Tools</span>
        </button>

        {splitSlug && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 14px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--slate)", letterSpacing: "0.08em", textTransform: "uppercase" }}>⊞ Split Active</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* ⌘K — opens command palette */}
        <button
          onClick={openPalette}
          aria-label="Open command palette (Ctrl+K)"
          title="Command palette — Ctrl+K / ⌘K"
          className="nav-cmd"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            height: "100%", padding: "0 14px",
            background: "none", border: "none", borderLeft: "1px solid var(--rule)",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          <span style={{
            fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em",
            color: "var(--ink-3)", padding: "2px 6px",
            border: "1px solid var(--rule)",
          }}>⌘K</span>
        </button>

        {user && (
          <div style={{ display: "flex", alignItems: "center", borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
            <Link href="/dashboard/profile" className="nav-profile-link" style={{
              textDecoration: "none", height: "100%", display: "flex", alignItems: "center",
              padding: "0 14px", gap: 8,
              background: isProfile ? "var(--paper-2)" : "transparent",
              borderRight: "1px solid var(--rule)",
            }}>
              <div style={{ width: 22, height: 22, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 700, fontSize: 11, color: "var(--paper)", lineHeight: 1 }}>{initial}</span>
              </div>
              <span className="mono nav-username" style={{ color: "var(--ink-3)", fontSize: 9, whiteSpace: "nowrap" }}>@{short}</span>
            </Link>
            <button onClick={handleSignOut} aria-label="Sign out" className="nav-signout" style={{
              height: "100%", padding: "0 16px", background: "none", border: "none", cursor: "pointer",
              fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap",
            }}>
              <span className="nav-signout-label">Out</span>
              <span className="nav-signout-icon" aria-hidden="true">↵</span>
            </button>
          </div>
        )}
      </nav>

      {/* Spacer: compensates for fixed nav (52px height + 12px top + 12px clearance) */}
      <div style={{ height: 76 }} aria-hidden="true" />

      {/* ── Sidebar backdrop — always mounted so it can fade out ── */}
      <div
        onClick={open ? closeSidebar : undefined}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 199,
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: `opacity ${open ? 220 : 180}ms ease`,
        }}
      />

      {/* ── Slide-in sidebar — browse by category, open or split ── */}
      <div
        role="dialog"
        aria-label="Tools panel"
        aria-modal="true"
        aria-hidden={!open}
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: "min(360px, calc(100vw - 32px))",
          background: "var(--paper-2)", borderRight: "1px solid var(--rule)",
          zIndex: 200, display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: `transform ${open ? 280 : 200}ms ${DRAWER_EASE}`,
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: "0 20px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'Melodrama', var(--serif)", fontStyle: "normal", fontWeight: 700, fontSize: 17, color: "var(--ink)", letterSpacing: "0.01em" }}>Ledger</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{TOTAL_TOOLS} tools</span>
          </div>
          <button
            onClick={closeSidebar}
            aria-label="Close tools panel"
            style={{ fontFamily: "var(--mono)", fontSize: 9, background: "none", border: "1px solid var(--rule)", padding: "4px 10px", cursor: "pointer", color: "var(--ink-3)", letterSpacing: "0.04em", borderRadius: 0, boxShadow: "none", backdropFilter: "none" }}
          >✕ Esc</button>
        </div>

        {/* ⌘K search prompt */}
        <button
          onClick={() => { closeSidebar(); openPalette(); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "11px 16px", background: "none", border: "none",
            borderBottom: "1px solid var(--rule)",
            cursor: "pointer", textAlign: "left", flexShrink: 0,
            borderRadius: 0, boxShadow: "none", backdropFilter: "none",
          }}
        >
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", flex: 1 }}>Search all tools…</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", padding: "2px 6px", border: "1px solid var(--rule)", letterSpacing: "0.06em", flexShrink: 0 }}>⌘K</span>
        </button>

        {/* Split hint */}
        <div style={{ padding: "7px 16px", borderBottom: "1px solid var(--rule)", flexShrink: 0, background: "color-mix(in srgb, var(--ink) 3%, transparent)" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
            Open navigates · <span style={{ color: "var(--slate)" }}>Split</span> opens a second tool alongside
          </span>
        </div>

        {/* Tool list — always browsing by category */}
        <div role="list" style={{ flex: 1, overflowY: "auto" }}>
          {(() => {
            let globalIdx = 0;
            return CATEGORIES.map(cat => (
              <div key={cat.label}>
                <div style={{ padding: "7px 16px", borderBottom: "1px solid var(--rule)", borderTop: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: cat.color, letterSpacing: "0.14em", textTransform: "uppercase" }}>{cat.label}</span>
                </div>
                {cat.tools.map(t => {
                  const idx = globalIdx++;
                  return <ToolRow key={t.slug} t={t} color={cat.color} idx={idx} sidebarOpen={open} onOpen={openTool} onSplit={splitTool} />;
                })}
              </div>
            ));
          })()}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--rule)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.06em" }}>Esc to close</span>
          <Link href="/dashboard" onClick={closeSidebar} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", textDecoration: "none", letterSpacing: "0.06em" }}>
            → All tools
          </Link>
        </div>
      </div>
    </>
  );
}
