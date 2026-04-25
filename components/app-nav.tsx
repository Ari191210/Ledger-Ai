"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { loadUserData } from "@/lib/user-data";

const TOOLS = [
  { n: "01", slug: "planner",    label: "Planner"    },
  { n: "02", slug: "marks",      label: "Marks"      },
  { n: "03", slug: "notes",      label: "Notes"      },
  { n: "04", slug: "doubt",      label: "Doubt"      },
  { n: "05", slug: "focus",      label: "Focus"      },
  { n: "06", slug: "career",     label: "Career"     },
  { n: "07", slug: "papers",     label: "Papers"     },
  { n: "08", slug: "assignment", label: "Rescue"     },
  { n: "09", slug: "resume",     label: "Resume"     },
  { n: "10", slug: "rooms",      label: "Rooms"      },
];

export default function AppNav() {
  const path   = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");

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

  const short = displayName.length > 16 ? displayName.slice(0, 14) + "…" : displayName;
  const isProfile = path === "/dashboard/profile";

  return (
    <nav
      style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--paper)", borderBottom: "1px solid var(--ink)",
        display: "flex", alignItems: "stretch", overflowX: "auto",
      }}
    >
      {/* Wordmark */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "0 20px 0 28px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
        </span>
      </Link>

      {/* Dashboard link */}
      <Link href="/dashboard"
        style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "14px 16px", borderRight: "1px solid var(--ink)", background: path === "/dashboard" ? "var(--ink)" : "transparent", color: path === "/dashboard" ? "var(--paper)" : "var(--ink-2)", flexShrink: 0, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        ← Home
      </Link>

      {/* Tool links */}
      <div style={{ display: "flex", flex: 1, overflowX: "auto" }}>
        {TOOLS.map((t) => {
          const active = path === `/tools/${t.slug}`;
          return (
            <Link key={t.slug} href={`/tools/${t.slug}`}
              style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "14px 14px", borderRight: "1px solid var(--rule)", background: active ? "var(--ink)" : "transparent", color: active ? "var(--paper)" : "var(--ink-2)", flexShrink: 0, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {t.n} {t.label}
            </Link>
          );
        })}
      </div>

      {/* User */}
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 0, borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
          <Link href="/dashboard/profile"
            style={{ textDecoration: "none", height: "100%", display: "flex", alignItems: "center", padding: "0 14px", gap: 8, background: isProfile ? "var(--ink)" : "transparent", borderRight: "1px solid var(--rule)", cursor: "pointer" }}>
            <div style={{ width: 22, height: 22, background: isProfile ? "var(--paper)" : "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 13, color: isProfile ? "var(--ink)" : "var(--paper)", lineHeight: 1 }}>
                {(displayName || "?")[0].toUpperCase()}
              </span>
            </div>
            <span className="mono" style={{ color: isProfile ? "var(--paper)" : "var(--ink-3)", fontSize: 9, whiteSpace: "nowrap" }}>@{short}</span>
          </Link>
          <button onClick={handleSignOut}
            style={{ height: "100%", padding: "0 16px", background: "none", border: "none", borderLeft: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
