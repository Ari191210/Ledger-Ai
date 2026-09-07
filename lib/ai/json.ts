/**
 * Repairing the one way a model reliably breaks JSON.
 *
 * A long prose answer comes back with real newline characters sitting inside
 * the string literals rather than the `\n` escapes JSON requires. The object is
 * otherwise complete and correct: it starts and ends where it should, every
 * key is right, and it is only the encoding of the whitespace that is invalid.
 * Refusing it means throwing away a good answer over a character the model
 * cannot reliably be told to escape.
 *
 * This is deliberately not a general "fix the JSON" pass. It does not close
 * brackets, guess missing fields, strip trailing commas, or repair truncation:
 * anything genuinely incomplete still fails, because inventing structure would
 * be inventing content. It only re-encodes control characters that are already
 * inside a string, which is lossless and cannot change what the answer says.
 */

/**
 * Escape raw control characters appearing inside JSON string literals. Text
 * outside strings is left exactly as it is, so a malformed structure stays
 * malformed and still fails to parse.
 */
export function escapeControlCharsInStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      // Only meaningful inside a string; outside one a backslash is already
      // invalid JSON and will fail the parse either way.
      escaped = inString;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (!inString) {
      out += ch;
      continue;
    }

    switch (ch) {
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      default:
        // Anything else below the space is unprintable and carries no meaning
        // in an answer; dropping it is closer to the intent than escaping it.
        out += ch < " " ? "" : ch;
    }
  }

  return out;
}

/**
 * Parse a model's JSON, repairing only unescaped control characters inside
 * strings. Returns null when the text is not recoverable that way, so the
 * caller can report an honest failure rather than a guess.
 */
export function parseModelJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // fall through to the one repair worth attempting
  }
  try {
    return JSON.parse(escapeControlCharsInStrings(text)) as T;
  } catch {
    return null;
  }
}
