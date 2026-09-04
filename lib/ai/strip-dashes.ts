// Ported from docs/legacy/ai-route.ts (stripDashes / stripDashesDeep). One
// house-style rule that survives the rebuild unconditionally: no em-dash,
// en-dash, or "--" in AI prose. It is asked for in the prompt and enforced
// again here, because a prompt is a request and a post-process is a
// guarantee.

export function stripDashes(text: string): string {
  // Split on code spans so their contents are never rewritten.
  const TICK = String.fromCharCode(96);
  const fence = TICK + TICK + TICK;
  const splitter = new RegExp(
    "(" + fence + "[\\s\\S]*?" + fence + "|" + TICK + "[^" + TICK + "\\n]*" + TICK + ")",
    "g",
  );
  return text
    .split(splitter)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/\s+[—–―]\s+/g, " ")
            .replace(/\s+--\s+/g, " ")
            .replace(/([A-Za-z0-9])[—–―]([A-Za-z0-9])/g, "$1, $2")
            .replace(/[—–―]/g, ", "),
    )
    .join("");
}

/** stripDashes over every string in a parsed JSON value, at any depth. */
export function stripDashesDeep<T>(value: T): T {
  if (typeof value === "string") return stripDashes(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => stripDashesDeep(v)) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripDashesDeep(v)]),
    ) as T;
  }
  return value;
}
