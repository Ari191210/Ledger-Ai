"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-on shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.35)] hover:bg-accent-hover active:bg-accent-press active:translate-y-px active:shadow-none",
  secondary:
    "border border-border-2 bg-surface-2 text-text shadow-[inset_0_1px_0_var(--edge)] hover:bg-surface-3 active:translate-y-px active:shadow-none",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
};

// Touch targets: md/lg clear the 44px minimum on small screens and tighten up
// on pointer devices where 44px is unnecessarily chunky.
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-xs sm:h-8",
  md: "h-11 px-4 text-sm sm:h-9",
  lg: "h-12 px-6 text-sm sm:h-11",
};

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  onPointerDown,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.955 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.6 }}
      onPointerDown={(e) => {
        playClick("tap");
        onPointerDown?.(e);
      }}
      className={cn(
        // no outline on mouse press, but keep a real ring for keyboard users
        "inline-flex select-none items-center justify-center gap-2 rounded-md font-semibold transition-colors",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
        "disabled:pointer-events-none disabled:border-transparent disabled:bg-surface-2 disabled:text-text-3 disabled:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
