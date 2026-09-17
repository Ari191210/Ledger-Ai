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
 * Folds away the characters that are in the text but not on the screen.
 *
 * Two different tricks, one answer. Fullwidth forms are folded onto the ASCII
 * they imitate, so a fullwidth ＞ becomes a > and cannot slip past a check
 * looking for the ASCII one. Format characters, the zero-width spaces and the
 * direction overrides, become a space.
 *
 * This was NFKC for about an hour on 2026-09-17 and that was a bad bug, caught
 * before anyone reported it but after it went live. NFKC also folds superscripts
 * and subscripts, so a student asking about 5 × 10⁸ m/s sent 5 × 108 m/s, x³
 * became x3, and 10⁻⁶ became 10−6. In a product where most questions are physics
 * and chemistry, that quietly changes what was asked. The fold is now the
 * fullwidth block and nothing else: it is the only range the attack used, and
 * every superscript, subscript, fraction and unit sign survives untouched.
 *
 * A space rather than nothing, because that is the older rule in this file and
 * it is the right one: deleting an invisible character joins the text on either
 * side of it, so "Mole<override>concept" would silently become one word nobody
 * typed. A space keeps them apart and is equally fatal to a marker, since the
 * pattern that looks for one already tolerates whitespace inside it.
 *
 * Tab and newline survive, because they are structure in an essay or a block of
 * notes rather than decoration. Every other control character becomes a space.
 *
 * An audit on 2026-09-17 got a closing fence marker through by putting a
 * zero-width space inside it. This is the fix, and it is here rather than in
 * fence.ts so there is one answer to this question in the codebase.
 */
export function foldInvisibles(raw: string): string {
  return raw
    // U+FF01 to U+FF5E are the fullwidth twins of ASCII ! to ~, a fixed 0xFEE0
    // above their plain forms. U+3000 is the ideographic space.
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\p{Cf}/gu, " ")
    .replace(/[^\P{Cc}\n\t]/gu, " ");
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
    foldInvisibles(raw)
      // The C category covers control and format characters, which is where
      // newlines and the invisible direction overrides live. Written as a
      // Unicode property escape so no literal control byte sits in this file.
      // foldInvisibles has already removed the invisible ones and normalised
      // compatibility forms; this still has to run, because a label collapses
      // the newlines that foldInvisibles deliberately keeps.
      .replace(/[\p{C}\p{Zl}\p{Zp}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max)
  );
}
