import type { ReactNode } from "react";
import Text, { type TextTone } from "./text";
import Control from "./control";
import { Stack, Row } from "./layout";

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK — Chip and Empty.
//
// Both exist to make the constitution's harder rules automatic:
//   · a chip's direction is always carried by a GLYPH as well as a hue, so
//     colour is never the sole carrier of meaning
//   · an empty state is always an invitation with exactly ONE control, never
//     an apology and never an illustration (CONSOLE.md §9)
// ═══════════════════════════════════════════════════════════════════════════

export type ChipTone = "neutral" | "progress" | "info" | "warn" | "error";

/** The glyph is not decorative — it is the non-colour carrier of direction. */
const GLYPH: Record<ChipTone, string | null> = {
  neutral: null,
  progress: "▲",
  info: null,
  warn: "!",
  error: "▼",
};

const TONE_TEXT: Record<ChipTone, TextTone> = {
  neutral: "secondary",
  progress: "progress",
  info: "info",
  warn: "warn",
  error: "error",
};

export function Chip({
  tone = "neutral",
  children,
  /** Set when the chip reports a fall rather than a rise. */
  down = false,
}: {
  tone?: ChipTone;
  children: ReactNode;
  down?: boolean;
}) {
  const glyph = tone === "progress" && down ? GLYPH.error : GLYPH[tone];
  return (
    <Row gap={1} align="baseline">
      {glyph && (
        <Text step="micro" tone={TONE_TEXT[tone]}>
          {glyph}
        </Text>
      )}
      <Text step="label" tone={TONE_TEXT[tone]}>
        {children}
      </Text>
    </Row>
  );
}

/**
 * EMPTY — an invitation, never an apology.
 *
 * `action` is required. An empty state without a next step is a dead end, and
 * a dead end at first run is where activation dies. Making it required means
 * the dead end cannot be shipped.
 */
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action: { label: string; href: string };
}) {
  return (
    <Stack gap={3} align="start">
      <Text step="title" as="h2">
        {title}
      </Text>
      {body && (
        <Text as="p" tone="secondary">
          {body}
        </Text>
      )}
      <Control tier="primary" href={action.href}>
        {action.label}
      </Control>
    </Stack>
  );
}
