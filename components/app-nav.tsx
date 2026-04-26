"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { loadUserData } from "@/lib/user-data";

const TOOLS = [
  { n: "01", slug: "planner",    label: "Planner",  full: "Smart Study Planner"  },
  { n: "02", slug: "marks",      label: "Marks",    full: "Marks Predictor"      },
  { n: "03", slug: "notes",      label: "Notes",    full: "Notes Simplifier"     },
  { n: "04", slug: "doubt",      label: "Doubt",    full: "Doubt Solver"         },
  { n: "05", slug: "focus",      label: "Focus",    full: "Focus Dashboard"      },
  { n: "06", slug: "career",     label: "Career",   full: "Career Pathfinder"    },
  { n: "07", slug: "papers",     label: "Papers",   full: "Past Papers"          },
  { n: "08", slug: "assignment", label: "Rescue",   full: "Assignment Rescue"    },
  { n: "09", slug: "resume",     label: "Resume",   full: "Resume Builder"       },
  { n: "10", slug: "rooms",      label: "Rooms",    full: "Study Rooms"          },
  { n: "11", slug: "tutor",      label: "Tutor",    full: "Topic Tutor"          },
];

export default function AppNav() {
  const path   = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [menuOpen, setMenuOpen]       = useState(false);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      setDisplayName(ud?.username || user.email?.split("@")[0] || "");
    });
  }, [user]);

  useEffect(() => { setMenuOpen(false); }, [path]);

  async function handleSignOut() {
    await signOut();
    router.push("/auth");
  }

  const short     = displayName.length > 14 ? displayName.slice(0, 12) + "…" : displayName;
  const isProfile = path === "/dashboard/profile";
  const initial   = (displayName || "?")[0].toUpperCase();

  return (
    <>
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--paper)", borderBottom: "1px solid var(--ink)", display: "flex", alignItems: "stretch" }}>

        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "0 16px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
          </span>
        </Link>

        {/* Dashboard home */}
        <Link href="/dashboard"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "12px 12px", borderRight: "1px solid var(--ink)", background: path === "/dashboard" ? "var(--ink)" : "transparent", color: path === "/dashboard" ? "var(--paper)" : "var(--ink-2)", flexShrink: 0, fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          ← Home
        </Link>

        {/* Hamburger — only on mobile */}
        <button
          className="mob-nav-btn"
          onClick={() => setMenuOpen(o => !o)}
          style={{ display: "none", alignItems: "center", padding: "12px 14px", background: menuOpen ? "var(--ink)" : "transparent", color: menuOpen ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0, gap: 6 }}>
          {menuOpen ? "✕ Close" : "☰ Tools"}
        </button>

        {/* Tool links — each takes equal share of remaining width, always fits */}
        <div className="mob-nav-tools" style={{ display: "flex", flex: 1 }}>
          {TOOLS.map((t) => {
            const active = path === `/tools/${t.slug}`;
            return (
              <Link key={t.slug} href={`/tools/${t.slug}`}
                style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", flex: 1, borderRight: "1px solid var(--rule)", background: active ? "var(--ink)" : "transparent", color: active ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* User */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
            <Link href="/dashboard/profile"
              style={{ textDecoration: "none", height: "100%", display: "flex", alignItems: "center", padding: "0 12px", gap: 7, background: isProfile ? "var(--ink)" : "transparent", borderRight: "1px solid var(--rule)", cursor: "pointer" }}>
              <div style={{ width: 20, height: 20, background: isProfile ? "var(--paper)" : "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 12, color: isProfile ? "var(--ink)" : "var(--paper)", lineHeight: 1 }}>{initial}</span>
              </div>
              <span className="mono nav-username" style={{ color: isProfile ? "var(--paper)" : "var(--ink-3)", fontSize: 9, whiteSpace: "nowrap" }}>@{short}</span>
            </Link>
            <button onClick={handleSignOut}
              style={{ height: "100%", padding: "0 12px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
              Out
            </button>
          </div>
        )}
      </nav>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div className="mob-nav-menu" style={{ display: "flex" }}>
          {TOOLS.map((t) => {
            const active = path === `/tools/${t.slug}`;
            return (
              <Link key={t.slug} href={`/tools/${t.slug}`}
                style={{ textDecoration: "none", padding: "16px 20px", borderBottom: "1px solid var(--rule)", background: active ? "var(--ink)" : "transparent", color: active ? "var(--paper)" : "var(--ink)", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{t.n} · {t.full}</span>
                <span style={{ opacity: 0.4 }}>→</span>
              </Link>
            );
          })}
          <Link href="/dashboard/profile"
            style={{ textDecoration: "none", padding: "16px 20px", borderBottom: "1px solid var(--rule)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
            <span>Profile · @{short}</span>
            <span style={{ opacity: 0.4 }}>→</span>
          </Link>
          <button onClick={handleSignOut}
            style={{ padding: "16px 20px", background: "none", border: "none", borderBottom: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--cinnabar-ink)", textAlign: "left" }}>
            Sign out
          </button>
        </div>
      )}
    </>
  );
}
