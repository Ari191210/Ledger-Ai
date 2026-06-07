"use client"
import { useEffect, useRef } from "react"

export default function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only run on fine-pointer devices (desktop)
    if (!window.matchMedia("(pointer: fine)").matches) return

    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mouseX = -100, mouseY = -100
    let ringX  = -100, ringY  = -100
    let rafId: number
    let visible = false

    const INTERACTIVE = "a, button, [role='button'], input, textarea, select, label, [tabindex]"

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      if (!visible) {
        visible = true
        dot.style.opacity  = "1"
        ring.style.opacity = "1"
        ringX = mouseX
        ringY = mouseY
      }
    }

    const onOver = (e: MouseEvent) => {
      const el = (e.target as Element).closest(INTERACTIVE)
      if (el) {
        dot.dataset.hover  = "1"
        ring.dataset.hover = "1"
      }
    }

    const onOut = (e: MouseEvent) => {
      const el = (e.target as Element).closest(INTERACTIVE)
      if (el) {
        delete dot.dataset.hover
        delete ring.dataset.hover
      }
    }

    const onDown = () => { dot.dataset.press  = "1"; ring.dataset.press  = "1" }
    const onUp   = () => { delete dot.dataset.press; delete ring.dataset.press }

    const tick = () => {
      dot.style.transform = `translate(${mouseX - 4}px,${mouseY - 4}px)`
      ringX += (mouseX - ringX) * 0.11
      ringY += (mouseY - ringY) * 0.11
      ring.style.transform = `translate(${ringX - 16}px,${ringY - 16}px)`
      rafId = requestAnimationFrame(tick)
    }

    document.addEventListener("mousemove",  onMove, { passive: true })
    document.addEventListener("mouseover",  onOver, { passive: true })
    document.addEventListener("mouseout",   onOut,  { passive: true })
    document.addEventListener("mousedown",  onDown, { passive: true })
    document.addEventListener("mouseup",    onUp,   { passive: true })
    rafId = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener("mousemove",  onMove)
      document.removeEventListener("mouseover",  onOver)
      document.removeEventListener("mouseout",   onOut)
      document.removeEventListener("mousedown",  onDown)
      document.removeEventListener("mouseup",    onUp)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div ref={dotRef}  className="cur-dot"  aria-hidden="true" />
      <div ref={ringRef} className="cur-ring" aria-hidden="true" />
    </>
  )
}
