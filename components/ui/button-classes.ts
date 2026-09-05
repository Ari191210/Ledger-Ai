import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-on shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.35)] hover:bg-accent-hover active:bg-accent-press active:shadow-none",
  secondary:
    "border border-border-2 bg-surface-2 text-text shadow-[inset_0_1px_0_var(--edge)] hover:bg-surface-3 active:shadow-none",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
};

// Touch targets: md/lg clear the 44px minimum on small screens and tighten up
// on pointer devices where 44px is unnecessarily chunky.
const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs sm:h-8",
  md: "h-11 px-4 text-sm sm:h-9",
  lg: "h-12 px-6 text-sm sm:h-11",
};

/**
 * Shared button styling. Lives apart from button.tsx (which is a Client
 * Component for its click sound) so Server Components — and links, which must
 * never wrap a <button> — can render the same thing without shipping any JS.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-md font-semibold",
    // the tactile press, done with CSS so this costs no JS: lift on hover,
    // sink and compress on press.
    "transition-[transform,background-color,box-shadow,color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "hover:-translate-y-px active:translate-y-px active:scale-[0.97] active:duration-75",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0 motion-reduce:active:scale-100",
    // no outline on pointer press, but keep a real ring for keyboard users
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
    "disabled:pointer-events-none disabled:translate-y-0 disabled:border-transparent disabled:bg-surface-2 disabled:text-text-3 disabled:shadow-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
