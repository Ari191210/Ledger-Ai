// ═══════════════════════════════════════════════════════════════════════════
// CONSOLE PRIMITIVES — the whole vocabulary, one import.
//
//   import { Stack, Text, Control, Readout } from "@/components/console/primitives";
//
// A single entry point is not tidiness: it is what makes the correct
// implementation the easiest one. Reaching for a primitive must cost less than
// writing a div with an inline style, or the system loses to the path of least
// resistance — which is precisely how this codebase accumulated 435 inline
// style objects in one file.
//
// THE RULES THESE ENFORCE, so no future component can violate them by
// accident rather than by decision:
//
//   · type      six ramp steps, a union — `step={17}` does not compile
//   · space     six steps, a union — `gap={13}` does not compile
//   · colour    semantic roles only — a hex cannot be passed
//   · depth     tone, never shadow — there is no elevation prop
//   · press     travel is in the class — there is no unstyled control
//   · labels    required on Field — an unlabelled input cannot ship
//   · empties   an action is required — a dead end cannot ship
//
// None of these primitives accepts a `style` prop. If a caller needs something
// the vocabulary cannot express, the primitive is wrong and should be
// strengthened — patching the call site is how design systems die
// (CONSOLE.md §6).
// ═══════════════════════════════════════════════════════════════════════════

export { default as Text } from "./text";
export type { TypeStep, TextTone, TextWeight, TextProps } from "./text";

export { Stack, Row, Spacer, Panel, Rule, Measure } from "./layout";
export type { Space, PanelTone, PanelProps } from "./layout";

export { default as Control } from "./control";
export type { ControlTier, ControlProps } from "./control";

export { default as Field } from "./field";
export type { FieldProps } from "./field";

export { Chip, Empty } from "./feedback";
export type { ChipTone } from "./feedback";

// Motion primitives. Roll and Fill (CONSOLE.md §4.2).
export { default as Readout } from "../readout";
export type { ReadoutProps, ReadoutStep } from "../readout";

export { default as Track } from "../track";
export type { TrackProps, TrackSize } from "../track";
