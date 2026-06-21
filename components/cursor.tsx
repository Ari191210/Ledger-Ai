"use client"
import { useEffect, useRef } from "react"

const BRAND = ["#ffcaaf", "#a7bed3", "#f1ffc4", "#c6e2e9", "#dab894"]
const INTERACTIVE = "a, button, [role='button'], input, textarea, select, label, [tabindex]"

export default function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const colorIdx = useRef(0)

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mx = -100, my = -100
    let rx = -100, ry = -100
    let rsTarget = 1, rs = 1
    let rafId: number
    let visible = false

    const setColor = (c: string) => {
      dot.style.background = c
      ring.style.borderColor = c
    }
    setColor(BRAND[0])

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      if (!visible) {
        visible = true
        dot.style.opacity  = "1"
        ring.style.opacity = "1"
        rx = mx; ry = my
      }
    }
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) rsTarget = 2.4
    }
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) rsTarget = 1
    }
    const onClick = () => {
      colorIdx.current = (colorIdx.current + 1) % BRAND.length
      setColor(BRAND[colorIdx.current])
      rsTarget = 3.5
      setTimeout(() => { rsTarget = 1 }, 250)
    }

    const tick = () => {
      rx += (mx - rx) * 0.12
      ry += (my - ry) * 0.12
      rs += (rsTarget - rs) * 0.16

      dot.style.transform  = `translate(${mx}px, ${my}px)`
      ring.style.transform = `translate(${rx}px, ${ry}px) scale(${rs.toFixed(3)})`
      rafId = requestAnimationFrame(tick)
    }

    document.addEventListener("mousemove", onMove,  { passive: true })
    document.addEventListener("mouseover", onOver,  { passive: true })
    document.addEventListener("mouseout",  onOut,   { passive: true })
    document.addEventListener("click",     onClick)
    rafId = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("mouseout",  onOut)
      document.removeEventListener("click",     onClick)
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
