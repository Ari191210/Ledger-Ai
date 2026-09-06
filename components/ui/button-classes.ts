import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// A physical key has a lit top edge, sits on a shadow, and when pressed the
// light goes off the top and moves inside: the key is now below its own
// surround. That is the whole trick, and it is three shadow values rather
// than a graphic.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    "bg-accent text-accent-on",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_2px_rgba(0,0,0,0.35)]",
    "hover:bg-accent-hover hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_2px_5px_rgba(0,0,0,0.4)]",
    "active:bg-accent-press active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.28)]",
  ].join(" "),
  secondary: [
    "border border-border-2 bg-surface-2 text-text",
    "shadow-[inset_0_1px_0_var(--edge),0_1px_2px_rgba(0,0,0,0.25)]",
    "hover:bg-surface-3 hover:shadow-[inset_0_1px_0_var(--edge),0_2px_5px_rgba(0,0,0,0.3)]",
    "active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]",
  ].join(" "),
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text active:bg-surface-3",
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
 * Component for its click sound) so Server Components, and links, which must
 * never wrap a <button>, can render the same thing without shipping any JS.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-md font-semibold",
    // the tactile press, done with CSS so this costs no JS: lift on hover,
    // sink and compress on press.
    // Press is fast and linear-ish so the compression feels immediate; the
    // release rides a spring so the button settles back rather than snapping.
    // Asymmetry is the point: the finger's action is instant, the object's
    // recovery has mass.
    // translate and scale, NOT transform. Tailwind v4 writes the individual
    // CSS properties, so a transition naming `transform` transitions something
    // that never changes and the button snaps between states. It had been doing
    // exactly that: scale went 1 to 0.97 to 1 with no values in between.
    "transition-[translate,scale,background-color,box-shadow,color] duration-[190ms] ease-spring",
    "hover:-translate-y-px active:translate-y-[2px] active:scale-[0.965] active:duration-[70ms] active:ease-out",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0 motion-reduce:active:scale-100",
    // no outline on pointer press, but keep a real ring for keyboard users
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
    "disabled:pointer-events-none disabled:translate-y-0 disabled:border-transparent disabled:bg-surface-2 disabled:text-text-3 disabled:shadow-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
