"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-on shadow-[0_1px_0_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.12)] hover:bg-accent-hover active:bg-accent-press",
  secondary:
    "border border-border-2 bg-surface text-text hover:bg-surface-2 active:bg-surface-3",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-base",
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
        "inline-flex select-none items-center justify-center gap-2 rounded-md font-semibold outline-none transition-colors",
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
