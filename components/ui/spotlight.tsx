'use client'

import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

type SpotlightProps = {
  className?: string
  size?: number
}

export function Spotlight({ className, size = 200 }: SpotlightProps) {
  const spotRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !spotRef.current) return
    const parent = containerRef.current.parentElement as HTMLElement
    if (!parent) return

    parent.style.position = 'relative'
    parent.style.overflow = 'hidden'

    const xTo = gsap.quickTo(spotRef.current, 'x', { ease: 'power2.out', duration: 0.35 })
    const yTo = gsap.quickTo(spotRef.current, 'y', { ease: 'power2.out', duration: 0.35 })

    const onMove = (e: MouseEvent) => {
      const { left, top } = parent.getBoundingClientRect()
      xTo(e.clientX - left - size / 2)
      yTo(e.clientY - top - size / 2)
    }
    const onEnter = () => setIsHovered(true)
    const onLeave = () => setIsHovered(false)

    parent.addEventListener('mousemove', onMove)
    parent.addEventListener('mouseenter', onEnter)
    parent.addEventListener('mouseleave', onLeave)
    return () => {
      parent.removeEventListener('mousemove', onMove)
      parent.removeEventListener('mouseenter', onEnter)
      parent.removeEventListener('mouseleave', onLeave)
    }
  }, [size])

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-0">
      <div
        ref={spotRef}
        className={cn(
          'pointer-events-none absolute rounded-full blur-xl transition-opacity duration-200',
          isHovered ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{
          width: size,
          height: size,
          top: 0,
          left: 0,
          background: 'radial-gradient(circle at center, rgba(242,242,239,0.12), transparent 80%)',
        }}
      />
    </div>
  )
}
