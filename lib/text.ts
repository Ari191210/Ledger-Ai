/**
 * Bounds on free text, at both ends of its life.
 *
 * Students type topic names, deadline titles and notes, and those strings end
 * up interpolated into the AI system prompt. Two things follow. Unbounded text
 * is unbounded API cost, because the prompt is billed per token. And text that
 * can contain newlines can imitate the structure of the prompt around it.
 *
 * So: bound it on the way in, and neutralise it again on the way out. Rows
 * written before these limits existed are still in the database, which is why
 * the render-side guard is not redundant with the write-side one.
 */

/** Longest a topic, subject or title may be. Generous for a real chapter name,
 *  far short of anything that moves the token count. */
export const MAX_LABEL = 120;
export const MAX_NOTE = 1000;

export type Bounded = { ok: true; value: string } | { ok: false; error: string };

export function boundedText(
  raw: string | null | undefined,
  field: string,
  max = MAX_LABEL,
  required = true,
): Bounded {
  const value = (raw ?? "").trim();
  if (!value) {
    return required ? { ok: false, error: `${field} is required.` } : { ok: true, value: "" };
  }
  if (value.length > max) {
    return { ok: false, error: `Keep the ${field.toLowerCase()} under ${max} characters.` };
  }
  return { ok: true, value };
}

/**
 * Render-time guard for anything a student typed that reaches a prompt.
 *
 * Collapses every kind of line break and control character to a space, so a
 * stored value cannot close the data fence and open an instruction block after
 * it, and truncates so an oversized row written before these limits existed
 * cannot run up the bill either.
 */
export function promptSafe(raw: string, max = MAX_LABEL): string {
  return (
    raw
      // The C category covers control and format characters, which is where
      // newlines and the invisible direction overrides live. Written as a
      // Unicode property escape so no literal control byte sits in this file.
      .replace(/[\p{C}\p{Zl}\p{Zp}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max)
  );
}
