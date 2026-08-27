"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { applyTheme, getActiveBase, getActiveAccent, BASE_META, type BaseId } from "@/lib/palette";
import { useAuth } from "./auth-provider";
import { loadUserData } from "@/lib/user-data";
import { useUI } from "./ui-context";
import CommandPalette from "./command-palette";

// ═══════════════════════════════════════════════════════════════════════════
// TOP NAV
//
// The nav bar is for navigation, not for browsing the catalogue. The tool
// drawer that used to live here now has its own route, /tools, which
// can be linked to, bookmarked, searched and filtered. The nav carries one
// link to it. ⌘K still opens the palette for anyone who knows what they want.
// ═══════════════════════════════════════════════════════════════════════════

export default function AppNav() {
  const path   = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { splitSlug } = useUI();

  const [displayName, setDisplayName] = useState("");
  const [embedded, setEmbedded]       = useState(false);
  const [hoveredNav, setHoveredNav]   = useState<string | null>(null);
  const [logoHovered, setLogoHovered] = useState(false);
  const [activeBase, setActiveBase]   = useState<BaseId>("obsidian");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveBase(getActiveBase());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ base: BaseId; accent: string }>).detail;
      setActiveBase(detail.base);
      if (BASE_META[detail.base]?.isLight) localStorage.setItem("ledger-last-light", detail.base);
    };
    window.addEventListener("ledger-theme", handler);
    return () => window.removeEventListener("ledger-theme", handler);
  }, []);

  useEffect(() => {
    const mode = localStorage.getItem("ledger-theme-mode");
    if (mode === "light") {
      setIsLight(true);
      applyTheme("paper", getActiveAccent());
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
    const accent = getActiveAccent();
    if (isLight) {
      // Switch to dark: restore saved dark base, keep the accent unchanged
      localStorage.setItem("ledger-theme-mode", "dark");
      setIsLight(false);
      const saved = localStorage.getItem("ledger-base") as BaseId | null;
      const target = saved || "obsidian";
      applyTheme(target, accent);
      setActiveBase(target);
    } else {
      // Switch to light: save current dark base, apply the "paper" light base
      localStorage.setItem("ledger-theme-mode", "light");
      localStorage.setItem("ledger-base", activeBase);
      setIsLight(true);
      applyTheme("paper", accent);
      setActiveBase("paper");
    }
  }

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  }

  async function handleSignOut() { await signOut(); router.push("/auth"); }

  if (embedded) return null;

  const short     = displayName.length > 14 ? displayName.slice(0, 12) + "…" : displayName;
  const isProfile = path === "/dashboard/profile";
  const initial   = (displayName || "?")[0].toUpperCase();

  const navLink = (href: string, label: string, extra?: React.ReactNode, mobileHide?: boolean) => {
    const active = href === "/tools" ? path === "/tools" : path === href;
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

        {navLink("/dashboard", "Dashboard")}
        {navLink("/tools", "Tools")}

        {/* ── Light / dark toggle ── */}
        <button
          onClick={toggleLightDark}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="mob-hide"
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "0 16px", height: "100%", flexShrink: 0,
            background: "transparent",
            border: "none",
            borderRight: "1px solid var(--rule)", cursor: "pointer",
            color: "var(--ink-2)",
            fontFamily: "var(--sans)", fontSize: 10, fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
            transition: "background 160ms ease, color 160ms ease",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--ink) 6%, transparent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          {/* moon when light (click → dark), sun when dark (click → light) */}
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
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
    </>
  );
}
