"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "framer-motion"

interface DockItem {
  title: string
  icon: React.ReactNode
  href: string
}

interface FloatingDockProps {
  items: DockItem[]
  className?: string
  mobileClassName?: string
}

export function FloatingDock({ items, className, mobileClassName }: FloatingDockProps) {
  return (
    <>
      <DesktopDock items={items} className={className} />
      <MobileDock items={items} className={mobileClassName} />
    </>
  )
}

function DesktopDock({ items, className }: { items: DockItem[]; className?: string }) {
  const mouseX = useMotionValue(Infinity)

  return (
    <motion.div
      onMouseMove={e => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={className}
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 12,
        padding: "10px 16px",
        background: "color-mix(in srgb, var(--paper-2) 80%, transparent)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: "1px solid color-mix(in srgb, var(--ink) 10%, transparent)",
        borderRadius: 20,
      }}
      role="navigation"
      aria-label="Quick navigation dock"
    >
      {items.map((item) => (
        <DockIcon key={item.title} item={item} mouseX={mouseX} />
      ))}
    </motion.div>
  )
}

function DockIcon({ item, mouseX }: { item: DockItem; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  const distance = useTransform(mouseX, val => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const widthRaw  = useTransform(distance, [-120, 0, 120], [40, 64, 40])
  const heightRaw = useTransform(distance, [-120, 0, 120], [40, 64, 40])

  const width  = useSpring(widthRaw,  { mass: 0.1, stiffness: 180, damping: 14 })
  const height = useSpring(heightRaw, { mass: 0.1, stiffness: 180, damping: 14 })

  return (
    <Link href={item.href} style={{ textDecoration: "none", position: "relative" }}>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: "50%",
              background: "var(--paper-2)",
              border: "1px solid color-mix(in srgb, var(--ink) 14%, transparent)",
              borderRadius: 8,
              padding: "4px 10px",
              fontFamily: "var(--sans)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {item.title}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="dock-icon-wrap"
      >
        <motion.div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 14,
            background: "color-mix(in srgb, var(--ink) 7%, var(--paper))",
            border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
            transition: "background 200ms, border-color 200ms, color 200ms",
          }}
          whileHover={{
            background: "color-mix(in srgb, var(--cinnabar-ink) 15%, var(--paper))",
            borderColor: "color-mix(in srgb, var(--cinnabar-ink) 40%, transparent)",
            color: "var(--cinnabar-ink)",
          }}
        >
          <div style={{ width: "60%", height: "60%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {item.icon}
          </div>
        </motion.div>
      </motion.div>
    </Link>
  )
}

function MobileDock({ items, className }: { items: DockItem[]; className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={className}
      style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-end" }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              right: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "10px 12px",
              background: "color-mix(in srgb, var(--paper-2) 90%, transparent)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)",
              borderRadius: 16,
            }}
          >
            {items.map(item => (
              <Link
                key={item.title}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textDecoration: "none",
                  padding: "6px 8px",
                  borderRadius: 10,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "color-mix(in srgb, var(--ink) 8%, var(--paper))",
                  border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--ink-2)", flexShrink: 0,
                }}>
                  <div style={{ width: "60%", height: "60%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.icon}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap" }}>
                  {item.title}
                </span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        style={{
          width: 44, height: 44, borderRadius: 14,
          background: "color-mix(in srgb, var(--paper-2) 80%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 18, color: "var(--ink-2)",
        }}
      >
        {open ? "✕" : "⠿"}
      </button>
    </div>
  )
}
