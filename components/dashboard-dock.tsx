"use client"
import { useRouter, usePathname } from "next/navigation"
import { Dock, DockIcon } from "@/components/ui/dock"
import {
  LayoutDashboard,
  BookOpen,
  Target,
  CalendarDays,
  BarChart2,
  User,
} from "lucide-react"

const ITEMS = [
  { icon: LayoutDashboard, label: "Home",    href: "/dashboard" },
  { icon: BarChart2,       label: "Score",   href: "/tools/score" },
  { icon: CalendarDays,    label: "Planner", href: "/tools/planner" },
  { icon: Target,          label: "Papers",  href: "/tools/papers" },
  { icon: BookOpen,        label: "Doubt",   href: "/tools/doubt" },
  { icon: User,            label: "Profile", href: "/dashboard/profile" },
]

export default function DashboardDock() {
  const router   = useRouter()
  const pathname = usePathname()

  return (
    <>
      {/* Desktop: floating magnifying dock */}
      <div className="desk-dock">
        <Dock
          iconSize={38}
          iconMagnification={56}
          iconDistance={120}
          className="border-[var(--rule)] bg-[var(--paper-2)]/80 backdrop-blur-xl gap-1 px-3"
        >
          {ITEMS.map(({ icon: Icon, label, href }) => {
            const active = pathname === href
            return (
              <DockIcon
                key={label}
                title={label}
                onClick={() => router.push(href)}
                className={
                  active
                    ? "bg-[color-mix(in_srgb,var(--cinnabar-ink)_18%,transparent)] text-[var(--cinnabar-ink)]"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
                }
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.7} aria-hidden />
              </DockIcon>
            )
          })}
        </Dock>
      </div>

      {/* Mobile: full-width bottom tab bar */}
      <nav className="mob-tab-bar" aria-label="Primary navigation">
        {ITEMS.map(({ icon: Icon, label, href }) => {
          const active = pathname === href
          return (
            <button
              key={label}
              onClick={() => router.push(href)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              style={{
                flex:           1,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            3,
                padding:        "6px 4px",
                background:     "none",
                border:         "none",
                cursor:         "pointer",
                borderTop:      active ? "2px solid var(--cinnabar-ink)" : "2px solid transparent",
                color:          active ? "var(--cinnabar-ink)" : "var(--ink-3)",
                transition:     "color 150ms ease, border-color 150ms ease",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} aria-hidden />
              <span style={{
                fontFamily:    "var(--mono)",
                fontSize:      8,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                lineHeight:    1,
              }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
