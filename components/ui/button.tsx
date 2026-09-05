"use client";

import type { ButtonHTMLAttributes } from "react";
import { playClick } from "@/lib/sound";
import { buttonClasses, type ButtonVariant, type ButtonSize } from "./button-classes";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * For real actions (submit, toggle, open a modal). To navigate somewhere, use
 * ButtonLink instead: a <button> inside an <a> is invalid HTML.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  onPointerDown,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      onPointerDown={(e) => {
        playClick("tap");
        onPointerDown?.(e);
      }}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
}
