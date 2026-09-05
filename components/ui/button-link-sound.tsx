"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { playClick } from "@/lib/sound";
import { buttonClasses, type ButtonVariant, type ButtonSize } from "./button-classes";

type SoundButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * ButtonLink that clicks like a Button does.
 *
 * Inside the app this matters: every other control there answers to the touch,
 * and a navigation button that stays silent feels broken next to them. Out on
 * the marketing pages it does not, so those use the plain ButtonLink and ship
 * no JavaScript for it.
 *
 * Still a single <a>: this is about the sound, not about nesting a <button>.
 */
export function SoundButtonLink({
  variant = "primary",
  size = "md",
  className,
  onPointerDown,
  children,
  ...props
}: SoundButtonLinkProps) {
  return (
    <Link
      onPointerDown={(e) => {
        playClick("tap");
        onPointerDown?.(e);
      }}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
