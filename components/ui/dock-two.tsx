"use client"
import * as React from "react"
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
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          "relative group p-3 rounded-xl transition-all duration-150",
          active ? "bg-[var(--cinnabar)]/15" : "hover:bg-[var(--paper-2)]",
          className
        )}
        style={{ transform: "translateY(0)", transition: "transform 150ms ease, background 150ms ease" }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.1)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0) scale(1)" }}
        onMouseDown={e  => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)" }}
        onMouseUp={e    => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.1)" }}
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
      </button>
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
        style={{ animation: "dock-float 4s ease-in-out infinite" }}
      >
        <style>{`
          @keyframes dock-float {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50%       { transform: translateX(-50%) translateY(4px); }
          }
        `}</style>
        <div
          className="flex items-center gap-0.5 p-2 rounded-2xl border backdrop-blur-xl shadow-lg"
          style={{
            background: "color-mix(in oklch, var(--paper) 88%, transparent)",
            borderColor: "var(--rule)",
          }}
        >
          {items.map((item) => (
            <DockIconButton key={item.label} {...item} />
          ))}
        </div>
      </div>
    )
  }
)
Dock.displayName = "Dock"

export { Dock }
