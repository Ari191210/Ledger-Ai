"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const path = usePathname();

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--paper)",
        borderBottom: "1px solid var(--ink)",
        display: "flex",
        alignItems: "stretch",
        overflowX: "auto",
      }}
    >
      {/* Wordmark */}
      <Link
        href="/"
        style={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          padding: "0 28px 0 44px",
          borderRight: "1px solid var(--rule)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
        </span>
      </Link>

      {/* Tool links */}
      <div style={{ display: "flex", flex: 1 }}>
        {TOOLS.map((t) => {
          const active = path === `/tools/${t.slug}`;
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                padding: "14px 16px",
                borderRight: "1px solid var(--rule)",
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--paper)" : "var(--ink-2)",
                flexShrink: 0,
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {t.n} {t.label}
            </Link>
          );
        })}
      </div>

    </nav>
  );
}
