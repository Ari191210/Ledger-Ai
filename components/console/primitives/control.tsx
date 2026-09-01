"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL — the three tiers, and the acknowledgement contract.
//
// Hierarchy is built from WEIGHT, never hue (CONSOLE.md §6). The primary is
// filled with ink rather than an accent: the strongest element on the screen
// uses the strongest neutral, so the focal point survives with every coloured
// element stripped out.
//
// Every control acknowledges (§3.0). Press travel is asymmetric — 40ms down,
// 220ms up — because a real button has no latency between finger and
// mechanism, and the return is the spring relaxing. That behaviour lives in
// the .c-control class, so a control CANNOT be built without it. There is no
// prop to disable it and no unstyled variant.
//
// One component serves buttons and links because "what it does" and "where it
// goes" are the same decision to a student. Passing `href` renders an anchor;
// passing `onClick` renders a button. Passing both is a type error.
// ═══════════════════════════════════════════════════════════════════════════

export type ControlTier = "primary" | "secondary" | "tertiary";

const TIER_CLASS: Record<ControlTier, string> = {
  primary: "c-control c-control--primary",
  secondary: "c-control",
  tertiary: "c-control c-control--text",
};

type Common = {
  tier?: ControlTier;
  children: ReactNode;
  /** Only when the visible label is not enough on its own. */
  ariaLabel?: string;
  disabled?: boolean;
};

type AsLink = Common & { href: string; onClick?: never; type?: never };
type AsButton = Common & {
  href?: never;
  onClick?: () => void;
  type?: "button" | "submit";
};

export type ControlProps = AsLink | AsButton;

export default function Control(props: ControlProps) {
  const { tier = "secondary", children, ariaLabel, disabled } = props;
  const className = TIER_CLASS[tier];

  if ("href" in props && props.href) {
    // A disabled link is not a link. Render it as an inert button so it is
    // correctly announced and cannot be activated by keyboard.
    if (disabled) {
      return (
        <button type="button" className={className} disabled aria-label={ariaLabel}>
          {children}
        </button>
      );
    }
    return (
      <Link href={props.href} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      className={className}
      onClick={props.onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
