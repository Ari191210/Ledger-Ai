"use client"
import * as React from "react"
import { motion, type Variants, type Easing } from "framer-motion"
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

const floatingAnimation: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as Easing,
    },
  },
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, onClick, active, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "relative group p-3 rounded-xl transition-colors",
          active
            ? "bg-[var(--cinnabar)]/15"
            : "hover:bg-[var(--paper-2)]",
          className
        )}
      >
        <Icon
          className={cn(
            "w-5 h-5 transition-colors",
            active ? "text-[var(--cinnabar)]" : "text-[var(--ink-2)]"
          )}
        />
        <span
          className={cn(
            "absolute -top-9 left-1/2 -translate-x-1/2",
            "px-2 py-1 rounded-md text-xs font-mono tracking-wide",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity whitespace-nowrap pointer-events-none",
            "border"
          )}
          style={{
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
    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          className
        )}
      >
        <motion.div
          initial="initial"
          animate="animate"
          variants={floatingAnimation}
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
