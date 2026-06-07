import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useEffect, useRef } from "react"

export const animationDefaults = {
  entrance: { duration: 0.8, ease: "power3.out" },
  hover: { duration: 0.25, ease: "power2.out" },
  hoverReturn: { duration: 0.4, ease: "power3.out" },
  stagger: 0.1,
  reveal: { y: 40, duration: 0.8, ease: "power3.out" },
}

export function useEntranceAnimation(scope: React.RefObject<HTMLElement>, selector: string, options?: {
  y?: number
  x?: number
  scale?: number
  filter?: string
  stagger?: number
  delay?: number
  start?: string
  once?: boolean
  clearProps?: string
}) {
  useGSAP(() => {
    const ctx = gsap.context(() => {
      const elements = scope.current?.querySelectorAll<HTMLElement>(selector)
      if (!elements?.length) return

      const {
        y = 40,
        x = 0,
        scale = 1,
        filter = "none",
        stagger = 0.1,
        delay = 0,
        start = "top 90%",
        once = true,
        clearProps = "transform,opacity,visibility,filter",
      } = options || {}

      gsap.set(elements, { autoAlpha: 0, y, x, scale, filter })

      gsap.to(elements, {
        autoAlpha: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: "none",
        duration: 0.8,
        ease: "power3.out",
        stagger,
        delay,
        scrollTrigger: { trigger: elements[0], start, once },
        clearProps,
      })
    }, scope)
    return () => ctx.revert()
  }, { scope })
}

export function useHoverScale(element: HTMLElement | null, scale = 1.02, y = -4) {
  useEffect(() => {
    if (!element) return
    const onEnter = () => gsap.to(element, { scale, y, duration: 0.25, ease: "power2.out", overwrite: "auto" })
    const onLeave = () => gsap.to(element, { scale: 1, y: 0, duration: 0.4, ease: "power3.out", overwrite: "auto" })
    element.addEventListener("mouseenter", onEnter)
    element.addEventListener("mouseleave", onLeave)
    return () => {
      element.removeEventListener("mouseenter", onEnter)
      element.removeEventListener("mouseleave", onLeave)
    }
  }, [element, scale, y])
}

export function useParallax(element: HTMLElement | null, intensity = 20) {
  useEffect(() => {
    if (!element) return
    const onMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * intensity
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * intensity
      gsap.to(element, { x, y, duration: 2, ease: "power2.out", overwrite: "auto" })
    }
    const onLeave = () => gsap.to(element, { x: 0, y: 0, duration: 1.6, ease: "power3.out" })
    element.addEventListener("mousemove", onMove)
    element.addEventListener("mouseleave", onLeave)
    return () => {
      element.removeEventListener("mousemove", onMove)
      element.removeEventListener("mouseleave", onLeave)
    }
  }, [element, intensity])
}

export function useScrollReveal(scope: React.RefObject<HTMLElement>, selector: string, options?: {
  start?: string
  end?: string
  scrub?: number | boolean
  y?: number
  x?: number
  scale?: number
}) {
  useGSAP(() => {
    const ctx = gsap.context(() => {
      const elements = scope.current?.querySelectorAll<HTMLElement>(selector)
      if (!elements?.length) return

      const { start = "top 90%", end = "bottom top", scrub = 1, y = 50, x = 0, scale } = options || {}

      gsap.fromTo(elements, { y, x, scale: scale || 1 }, {
        y: 0,
        x: 0,
        scale: 1,
        ease: "none",
        scrollTrigger: { trigger: elements[0], start, end, scrub },
      })
    }, scope)
    return () => ctx.revert()
  }, { scope })
}

export function useCounterAnimation(element: HTMLElement | null, target: number, options?: {
  duration?: number
  ease?: string
  decimals?: number
  suffix?: string
  onComplete?: () => void
}) {
  useEffect(() => {
    if (!element) return
    const { duration = 2, ease = "power2.out", decimals = 0, suffix = "", onComplete } = options || {}
    const obj = { val: 0 }
    gsap.to(obj, {
      val: target,
      duration,
      ease,
      onUpdate() {
        element.textContent = (decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val)) + suffix
      },
      onComplete,
    })
  }, [element, target, options?.duration, options?.ease, options?.decimals, options?.suffix, options?.onComplete])
}

export function useProgressAnimation(element: HTMLElement | null, targetPercent: number, options?: {
  duration?: number
  ease?: string
}) {
  useEffect(() => {
    if (!element) return
    const { duration = 1.5, ease = "power3.out" } = options || {}
    gsap.fromTo(element, { width: 0 }, { width: `${targetPercent}%`, duration, ease })
  }, [element, targetPercent, options?.duration, options?.ease])
}

export function preHideElements(scope: React.RefObject<HTMLElement>, selectors: Record<string, {
  y?: number
  x?: number
  scale?: number
  filter?: string
  autoAlpha?: number
}>) {
  useGSAP(() => {
    const ctx = gsap.context(() => {
      Object.entries(selectors).forEach(([selector, props]) => {
        const elements = scope.current?.querySelectorAll<HTMLElement>(selector)
        if (elements?.length) {
          gsap.set(elements, {
            autoAlpha: props.autoAlpha ?? 0,
            y: props.y ?? 0,
            x: props.x ?? 0,
            scale: props.scale ?? 1,
            filter: props.filter ?? "none",
          })
        }
      })
    }, scope)
    return () => ctx.revert()
  }, { scope })
}