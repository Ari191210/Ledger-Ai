"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { loadUserData } from "@/lib/user-data";
import { useUI } from "./ui-context";
import CommandPalette from "./command-palette";

export default function AppNav() {
  const path   = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { setSidebarOpen, splitSlug } = useUI();
  const [displayName, setDisplayName] = useState("");
  const [embedded, setEmbedded]       = useState(false);

  useEffect(() => {
    try { setEmbedded(window.self !== window.top); } catch { setEmbedded(true); }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      setDisplayName(ud?.username || user.email?.split("@")[0] || "");
    });
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.push("/auth");
  }

  if (embedded) return null;

  const short     = displayName.length > 14 ? displayName.slice(0, 12) + "…" : displayName;
  const isProfile = path === "/dashboard/profile";
  const initial   = (displayName || "?")[0].toUpperCase();

  return (
    <>
      <CommandPalette />
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--paper)", borderBottom: "1px solid var(--ink)", display: "flex", alignItems: "stretch", height: 49 }}>

        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "0 18px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
          </span>
        </Link>

        {/* Home */}
        <Link href="/dashboard"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "0 16px", borderRight: "1px solid var(--rule)", background: path === "/dashboard" ? "var(--ink)" : "transparent", color: path === "/dashboard" ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
          ← Home
        </Link>

        {/* Ledger Score — pinned */}
        <Link href="/tools/score"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "0 14px", borderRight: "1px solid var(--rule)", background: path === "/tools/score" ? "var(--cinnabar-ink)" : "transparent", color: path === "/tools/score" ? "var(--paper)" : "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
          <span>★</span><span>Score</span>
        </Link>

        {/* Tools launcher button */}
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 18px", background: "transparent", border: "none", borderRight: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)", flexShrink: 0, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 13 }}>⊞</span>
          <span>Tools</span>
        </button>

        {/* Split indicator — shows when a split is active */}
        {splitSlug && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 14px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
            <span className="mono" style={{ fontSize: 9, color: "#1a6091", letterSpacing: "0.06em" }}>⊞ SPLIT ACTIVE</span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
            <Link href="/dashboard/profile"
              style={{ textDecoration: "none", height: "100%", display: "flex", alignItems: "center", padding: "0 14px", gap: 7, background: isProfile ? "var(--ink)" : "transparent", borderRight: "1px solid var(--rule)", cursor: "pointer" }}>
              <div style={{ width: 20, height: 20, background: isProfile ? "var(--paper)" : "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 12, color: isProfile ? "var(--ink)" : "var(--paper)", lineHeight: 1 }}>{initial}</span>
              </div>
              <span className="mono nav-username" style={{ color: isProfile ? "var(--paper)" : "var(--ink-3)", fontSize: 9, whiteSpace: "nowrap" }}>@{short}</span>
            </Link>
            <button onClick={handleSignOut}
              style={{ height: "100%", padding: "0 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
              Out
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
