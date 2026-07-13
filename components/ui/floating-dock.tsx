"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "motion/react"

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
      <DesktopDock items={items} className={`mob-hide ${className ?? ""}`.trim()} />
      <MobileDock  items={items} className={`mob-only ${mobileClassName ?? ""}`.trim()} />
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
  const pathname = usePathname()
  const [pressed, setPressed] = useState<string | null>(null)

  // Split: first 5 in bar, rest in "More" tray
  const primary = items.slice(0, 5)
  const overflow = items.slice(5)
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/")

  return (
    <nav
      className={className}
      aria-label="Mobile navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "color-mix(in srgb, var(--paper-2) 88%, transparent)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid color-mix(in srgb, var(--ink) 10%, transparent)",
      }}
    >
      {/* More tray — slides up from bar */}
      <AnimatePresence>
        {moreOpen && overflow.length > 0 && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMoreOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: -1,
                background: "rgba(8,9,12,0.5)",
              }}
            />
            {/* Tray */}
            <motion.div
              key="tray"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                bottom: "100%",
                left: 16,
                right: 16,
                marginBottom: 10,
                background: "color-mix(in srgb, var(--paper-2) 95%, transparent)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)",
                borderRadius: 18,
                padding: "8px 6px",
                display: "grid",
                gridTemplateColumns: `repeat(${overflow.length}, 1fr)`,
              }}
            >
              {overflow.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: 5, padding: "12px 8px",
                      borderRadius: 12,
                      background: active
                        ? "color-mix(in srgb, var(--cinnabar-ink) 12%, transparent)"
                        : "transparent",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 11,
                        background: active
                          ? "color-mix(in srgb, var(--cinnabar-ink) 16%, var(--paper))"
                          : "color-mix(in srgb, var(--ink) 7%, var(--paper))",
                        border: `1px solid ${active
                          ? "color-mix(in srgb, var(--cinnabar-ink) 35%, transparent)"
                          : "color-mix(in srgb, var(--ink) 10%, transparent)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: active ? "var(--cinnabar-ink)" : "var(--ink-3)",
                      }}>
                        <div style={{ width: "55%", height: "55%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {item.icon}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: "var(--sans)", fontSize: 10, fontWeight: 500,
                        color: active ? "var(--cinnabar-ink)" : "var(--ink-3)",
                        letterSpacing: "0.01em",
                      }}>
                        {item.title}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main tab row */}
      <div style={{
        display: "flex",
        alignItems: "stretch",
        height: 58,
      }}>
        {primary.map(item => {
          const active = isActive(item.href)
          const isPressed = pressed === item.title
          return (
            <Link
              key={item.title}
              href={item.href}
              style={{ flex: 1, textDecoration: "none" }}
              onMouseDown={() => setPressed(item.title)}
              onMouseUp={() => setPressed(null)}
              onTouchStart={() => setPressed(item.title)}
              onTouchEnd={() => setPressed(null)}
            >
              <motion.div
                animate={{ scale: isPressed ? 0.88 : 1 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  position: "relative",
                }}
              >
                {/* Active pill indicator */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      key="pill"
                      layoutId="mobile-dock-active"
                      initial={{ opacity: 0, scaleX: 0.4 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0.4 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        position: "absolute",
                        top: 6,
                        width: 32, height: 3,
                        borderRadius: 99,
                        background: "var(--cinnabar-ink)",
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon container */}
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: active
                    ? "color-mix(in srgb, var(--cinnabar-ink) 14%, var(--paper))"
                    : "transparent",
                  transition: "background 200ms ease",
                  color: active ? "var(--cinnabar-ink)" : "var(--ink-3)",
                }}>
                  <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.icon}
                  </div>
                </div>

                {/* Label */}
                <span style={{
                  fontFamily: "var(--sans)",
                  fontSize: 9,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--cinnabar-ink)" : "var(--ink-3)",
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                  transition: "color 200ms ease, font-weight 200ms ease",
                }}>
                  {item.title.split(" ")[0]}
                </span>
              </motion.div>
            </Link>
          )
        })}

        {/* More button */}
        {overflow.length > 0 && (
          <button
            onClick={() => setMoreOpen(o => !o)}
            aria-label={moreOpen ? "Close more" : "More navigation"}
            aria-expanded={moreOpen}
            style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4,
            }}
          >
            <motion.div
              animate={{ rotate: moreOpen ? 45 : 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: 34, height: 34, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: moreOpen
                  ? "color-mix(in srgb, var(--cinnabar-ink) 14%, var(--paper))"
                  : "transparent",
                color: moreOpen ? "var(--cinnabar-ink)" : "var(--ink-3)",
                fontSize: 20, lineHeight: 1,
                transition: "background 200ms ease, color 200ms ease",
              }}
            >
              ⊕
            </motion.div>
            <span style={{
              fontFamily: "var(--sans)", fontSize: 9, fontWeight: 400,
              color: moreOpen ? "var(--cinnabar-ink)" : "var(--ink-3)",
              letterSpacing: "0.02em", lineHeight: 1,
              transition: "color 200ms ease",
            }}>
              More
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}
