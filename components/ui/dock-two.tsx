"use client"
import * as React from "react"
import { motion, useReducedMotion, type Easing } from "framer-motion"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface DockProps {
  className?: string
  items: {
    icon: LucideIcon
    label: string
    onClick?: () => void
    active?: boolean
  }[]
}

interface DockIconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  active?: boolean
  className?: string
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, onClick, active, className }, ref) => {
    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        whileHover={{ scale: 1.12, y: -3 }}
        whileTap={{ scale: 0.93 }}
        onClick={onClick}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn("relative group p-3 rounded-xl", className)}
        style={{
          background: active
            ? "color-mix(in srgb, var(--cinnabar-ink) 12%, transparent)"
            : "transparent",
          border: "none",
          cursor: "pointer",
          transition: "background 150ms ease",
        }}
      >
        <Icon
          size={20}
          strokeWidth={active ? 2.4 : 1.8}
          style={{ color: active ? "var(--cinnabar-ink)" : "var(--ink-2)" }}
          aria-hidden
        />
        <span
          className={cn(
            "absolute -top-9 left-1/2 -translate-x-1/2",
            "px-2 py-1 rounded-md text-xs border",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity whitespace-nowrap pointer-events-none"
          )}
          style={{
            fontFamily: "var(--mono)",
            letterSpacing: "0.08em",
            background: "var(--paper-2)",
            color: "var(--ink-2)",
            borderColor: "var(--rule)",
          }}
        >
          {label}
        </span>
      </motion.button>
    )
  }
)
DockIconButton.displayName = "DockIconButton"

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, className }, ref) => {
    const prefersReduced = useReducedMotion()

    return (
      <div
        ref={ref}
        className={cn("fixed bottom-5 left-1/2 -translate-x-1/2 z-50", className)}
      >
        <motion.div
          animate={prefersReduced ? undefined : { y: [-2, 2, -2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as Easing }}
          className="flex items-center gap-0.5 p-2 rounded-2xl border backdrop-blur-xl shadow-lg"
          style={{
            background: "color-mix(in oklch, var(--paper) 88%, transparent)",
            borderColor: "var(--rule)",
          }}
        >
          {items.map((item) => (
            <DockIconButton key={item.label} {...item} />
          ))}
        </motion.div>
      </div>
    )
  }
)
Dock.displayName = "Dock"

export { Dock }
