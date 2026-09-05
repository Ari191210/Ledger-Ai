import Link from "next/link";
import type { ComponentProps } from "react";
import {
  buttonClasses,
  type ButtonVariant,
  type ButtonSize,
} from "./button-classes";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * A link that looks like a button. Use this for navigation instead of wrapping
 * <Button> in <Link>, which produces `<a><button>` — invalid HTML, and two
 * nested interactive elements for keyboard and screen-reader users to trip on.
 *
 * No "use client": this ships no JavaScript of its own.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
