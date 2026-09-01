"use client";

import { useId } from "react";
import Text from "./text";
import { Stack } from "./layout";

// ═══════════════════════════════════════════════════════════════════════════
// FIELD — a recessed well.
//
// You put things INTO a field, so it is darker than its surroundings
// (CONSOLE.md §6). Depth is tone; there is no inset shadow.
//
// The label is required, not optional. An unlabelled input is an accessibility
// defect, and making the label a required prop means the defect cannot be
// shipped by omission. `hideLabel` exists for genuine cases like a search box
// whose purpose is obvious — it hides the label visually while keeping it for
// assistive tech, which is different from not having one.
//
// Errors are states, never popups (§3), so the message renders beneath the
// field it belongs to and is wired to it with aria-describedby.
// ═══════════════════════════════════════════════════════════════════════════

export type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Rendered beneath. Use for guidance, not for restating the label. */
  hint?: string;
  /** Presence switches the field to its error state. */
  error?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "date";
  multiline?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  autoFocus?: boolean;
};

export default function Field({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  type = "text",
  multiline = false,
  disabled = false,
  hideLabel = false,
  autoFocus = false,
}: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  const shared = {
    id,
    value,
    placeholder,
    disabled,
    autoFocus,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "c-field",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  };

  return (
    <Stack gap={2}>
      {hideLabel ? (
        <label htmlFor={id} className="c-visually-hidden">
          {label}
        </label>
      ) : (
        <Text as="label" step="label" htmlFor={id}>
          {label}
        </Text>
      )}

      {multiline ? (
        <textarea {...shared} rows={4} data-invalid={error ? "true" : undefined} />
      ) : (
        <input {...shared} type={type} data-invalid={error ? "true" : undefined} />
      )}

      {error ? (
        <Text as="p" step="body" tone="error" id={`${id}-err`}>
          {error}
        </Text>
      ) : hint ? (
        <Text as="p" step="body" tone="secondary" id={`${id}-hint`}>
          {hint}
        </Text>
      ) : null}
    </Stack>
  );
}
