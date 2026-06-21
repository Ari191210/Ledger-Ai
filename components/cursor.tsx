"use client"
import { useEffect, useRef } from "react"

const BRAND = ["#ffcaaf", "#a7bed3", "#f1ffc4", "#c6e2e9", "#dab894"]
const INTERACTIVE = "a, button, [role='button'], input, textarea, select, label, [tabindex]"

export default function Cursor() {
  const elRef = useRef<HTMLDivElement>(null)
  const colorIdx = useRef(0)

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    const el = elRef.current
    if (!el) return

    let mx = -100, my = -100, rafId: number, visible = false

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      if (!visible) { visible = true; el.style.opacity = "1" }
    }
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) el.dataset.hover = "1"
    }
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) delete el.dataset.hover
    }
    const onClick = () => {
      colorIdx.current = (colorIdx.current + 1) % BRAND.length
      el.style.setProperty("--cur-color", BRAND[colorIdx.current])
      el.dataset.click = "1"
      setTimeout(() => delete el.dataset.click, 350)
    }
    const onDown = () => { el.dataset.press = "1" }
    const onUp   = () => { delete el.dataset.press }

    const tick = () => {
      el.style.transform = `translate(${mx}px, ${my}px)`
      rafId = requestAnimationFrame(tick)
    }

    document.addEventListener("mousemove", onMove,   { passive: true })
    document.addEventListener("mouseover", onOver,   { passive: true })
    document.addEventListener("mouseout",  onOut,    { passive: true })
    document.addEventListener("click",     onClick)
    document.addEventListener("mousedown", onDown,   { passive: true })
    document.addEventListener("mouseup",   onUp,     { passive: true })
    rafId = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("mouseout",  onOut)
      document.removeEventListener("click",     onClick)
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("mouseup",   onUp)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div ref={elRef} className="cur-x" aria-hidden="true">
      <div className="cur-x-arm cur-x-top" />
      <div className="cur-x-arm cur-x-right" />
      <div className="cur-x-arm cur-x-bottom" />
      <div className="cur-x-arm cur-x-left" />
      <div className="cur-x-dot" />
      <div className="cur-x-ring" />
    </div>
  )
}
