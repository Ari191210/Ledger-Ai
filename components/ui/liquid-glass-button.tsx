"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const liquidButtonVariants = cva(
  "relative inline-flex items-center justify-center cursor-pointer gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:scale-105 text-white",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:  "h-8 px-4 text-xs",
        lg:  "h-10 px-6",
        xl:  "h-12 px-8",
        xxl: "h-14 px-10",
      },
    },
    defaultVariants: { variant: "default", size: "xxl" },
  }
)

function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden>
      <defs>
        <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

export function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof liquidButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"
  return (
    <>
      <Comp
        className={cn(liquidButtonVariants({ variant, size, className }))}
        {...props}
      >
        {/* glass overlay */}
        <div className="absolute inset-0 rounded-full
          shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]
          transition-all pointer-events-none" />
        {/* backdrop blur via SVG filter */}
        <div
          className="absolute inset-0 -z-10 overflow-hidden rounded-full"
          style={{ backdropFilter: 'url("#liquid-glass")' }}
        />
        <span className="relative z-10 pointer-events-none">{children}</span>
        <GlassFilter />
      </Comp>
    </>
  )
}
