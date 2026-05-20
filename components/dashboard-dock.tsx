"use client"
import { useRouter, usePathname } from "next/navigation"
import { Dock } from "@/components/ui/dock-two"
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Zap,
  User,
  BrainCircuit,
} from "lucide-react"

export default function DashboardDock() {
  const router  = useRouter()
  const pathname = usePathname()

  const items = [
    { icon: LayoutDashboard, label: "Home",    href: "/dashboard",           active: pathname === "/dashboard" },
    { icon: Zap,             label: "Focus",   href: "/tools/focus",         active: pathname === "/tools/focus" },
    { icon: BookOpen,        label: "Notes",   href: "/tools/notes",         active: pathname === "/tools/notes" },
    { icon: Target,          label: "Papers",  href: "/tools/papers",        active: pathname === "/tools/papers" },
    { icon: BrainCircuit,    label: "Doubt",   href: "/tools/doubt",         active: pathname === "/tools/doubt" },
    { icon: User,            label: "Profile", href: "/dashboard/profile",   active: pathname === "/dashboard/profile" },
  ]

  const dockItems = items.map(i => ({ ...i, onClick: () => router.push(i.href) }))

  return (
    <>
      {/* Desktop: floating macOS-style dock */}
      <div className="desk-dock">
        <Dock items={dockItems} />
      </div>

      {/* Mobile: full-width bottom tab bar */}
      <nav className="mob-tab-bar" aria-label="Primary navigation">
        {items.map(({ icon: Icon, label, href, active }) => (
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
        ))}
      </nav>
    </>
  )
}
