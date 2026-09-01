// ═══════════════════════════════════════════════════════════════════════════
// M15-4 — TYPED OUTPUT. REJECT, NEVER DEGRADE.
//
// EXECUTION_PLAN M15-4: *"Typed output schemas; **reject, never degrade**;
// delete the greedy `/\{[\s\S]*\}/` extraction."*
// Architecture Q.4: *"Typed input and output schemas per capability. Output
// that fails validation is **rejected**, not degraded — one bounded
// structured-repair retry, then a typed failure. The greedy brace regex is
// deleted."*
//
//
// WHAT WAS THERE, AND WHY IT WAS WORSE THAN NO CHECK AT ALL
//
// `app/api/ai/route.ts:2694` did this:
//
//     const jsonMatch = text.match(/\{[\s\S]*\}/);
//     if (jsonMatch) { const parsed = JSON.parse(jsonMatch[0]); … }
//     return NextResponse.json({ raw: text });
//
// Three defects, in ascending order of seriousness.
//
//   · The regex is GREEDY and unanchored. On a reply containing prose braces
//     it spans from the first `{` anywhere in the text to the last `}`
//     anywhere in the text — a substring that is not the model's object and
//     frequently is not JSON at all.
//   · Whatever came out of `JSON.parse` was returned to the client UNCHECKED.
//     A reply with the right braces and the wrong fields reached the student's
//     screen as data, and every tool downstream read it as though the server
//     had verified it.
//   · The `{ raw: text }` fallback is the degrade path. A capability whose
//     contract is `{questions:[…]}` could return an arbitrary string under a
//     key nobody validates, and the request still succeeded with HTTP 200.
//
// PRODUCT_PRINCIPLES §3.2 — *"no claim without proof"* — applied to model
// output: a response the server cannot vouch for is not a weaker answer, it is
// a fabrication with a 200 on it. So there is no salvage arm below. There is a
// parse, a check, ONE bounded structured-repair retry, and a typed failure.
//
//
// WHY THE SCHEMAS ARE READ OFF THE PROMPTS
//
// Every capability's prompt already prints the shape it demands
// (*"respond with exactly this JSON shape: {…}"*). The contract in
// `registry.ts` is that printed shape, mechanically extracted, so the shape the
// model is asked for and the shape the server enforces cannot drift apart —
// they are the same text. Where a prompt does not fix one top-level shape the
// contract is `keys: null`: the output must still be a JSON object, and there
// is simply no key list to check. That is an honest absence, not a hole — the
// alternative is a schema somebody guessed, which rejects correct answers.
//
// Pure. No model, no network, no clock.
// ═══════════════════════════════════════════════════════════════════════════

import type { OutputContract, OutputFieldKind } from "./types";

export type OutputRejection =
  /** The reply was not JSON at all. */
  | "not_json"
  /** It parsed, but not to a JSON object. */
  | "not_object"
  /** A field the contract requires is absent. */
  | "missing_field"
  /** A field is present with the wrong JSON kind. */
  | "wrong_kind";

export type OutputVerdict =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; rejection: OutputRejection; detail: string; missing: string[] };

/** The off-topic escape hatch the `SAFETY_PREAMBLE` instructs the model to use.
 *  Recognised BEFORE the contract is applied, because it is a refusal, not a
 *  malformed answer, and it must keep producing the moderation response the
 *  route has always produced. */
export const OFF_TOPIC_MARKER = "off_topic";

export function isOffTopic(value: Record<string, unknown>): boolean {
  return value.error === OFF_TOPIC_MARKER;
}

// ── the parse ──────────────────────────────────────────────────────────────

/**
 * Parse a model reply as one JSON object.
 *
 * The ONLY tolerance is a markdown code fence, and only when it wraps the whole
 * reply. That is not salvage: a fence is a transport wrapper the model was told
 * not to add, its removal is unambiguous, and what is inside is still required
 * to parse as JSON in its entirety. Anything else — prose before the object,
 * two objects, a truncated object — is a rejection.
 *
 * There is deliberately no "find the JSON somewhere in here" path. That was the
 * greedy regex, and it is what this function exists to replace.
 */
export function parseModelJson(text: string): OutputVerdict {
  let body = text.trim();

  const fence = body.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  if (fence) body = fence[1].trim();

  if (!body) {
    return { ok: false, rejection: "not_json", detail: "the model returned nothing", missing: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return {
      ok: false,
      rejection: "not_json",
      detail: "the reply is not JSON",
      missing: [],
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      rejection: "not_object",
      detail: "the reply parsed, but not to a JSON object",
      missing: [],
    };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}

// ── the contract ───────────────────────────────────────────────────────────

export function kindOf(value: unknown): OutputFieldKind | "undefined" {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "string": return "string";
    case "number": return "number";
    case "boolean": return "boolean";
    case "object": return "object";
    default: return "undefined";
  }
}

/**
 * Check a parsed object against a capability's contract.
 *
 * Extra keys are allowed; declared keys are not optional. A model that adds a
 * field has answered the question and volunteered more, which harms nobody. A
 * model that drops a field has not answered the question, and the surface that
 * consumes it will render an empty panel or throw — which is the failure this
 * check exists to turn into an honest error instead of a blank screen.
 */
export function checkContract(
  value: Record<string, unknown>,
  contract: OutputContract,
): OutputVerdict {
  if (!contract.keys) return { ok: true, value };

  const missing: string[] = [];
  const wrong: string[] = [];

  for (const [key, expected] of Object.entries(contract.keys)) {
    const actual = kindOf(value[key]);
    if (actual === "undefined") { missing.push(key); continue; }
    // `null` for a declared field is treated as absent rather than as a value:
    // every one of these contracts came from a prompt that printed a concrete
    // example, so `null` is the model declining to fill the field.
    if (actual === "null" && expected !== "null") { missing.push(key); continue; }
    if (actual !== expected) wrong.push(`${key} (expected ${expected}, got ${actual})`);
  }

  if (missing.length > 0) {
    return {
      ok: false,
      rejection: "missing_field",
      detail: `the reply is missing: ${missing.join(", ")}`,
      missing,
    };
  }
  if (wrong.length > 0) {
    return {
      ok: false,
      rejection: "wrong_kind",
      detail: `the reply has the wrong type for: ${wrong.join("; ")}`,
      missing: wrong.map(w => w.split(" ")[0]),
    };
  }
  return { ok: true, value };
}

/** Parse and check in one step — what the route calls. */
export function validateOutput(text: string, contract: OutputContract): OutputVerdict {
  const parsed = parseModelJson(text);
  if (!parsed.ok) return parsed;
  return checkContract(parsed.value, contract);
}

// ── the one bounded repair (Q.4) ───────────────────────────────────────────

/**
 * The instruction for the single structured-repair attempt Q.4 allows.
 *
 * It re-states the contract and names what was wrong. It does NOT include the
 * model's previous reply as something to "fix up" — a repair that edits a
 * broken answer produces a plausible answer, and plausible is precisely what
 * cannot be told apart from correct downstream. The retry asks the question
 * again, with the contract made explicit.
 *
 * ONE. `MAX_REPAIR_ATTEMPTS` is not a knob to raise: the second failure is
 * information (this capability's contract and this model disagree), and burying
 * it under retries is how a silently broken capability stays silently broken.
 */
export const MAX_REPAIR_ATTEMPTS = 1;

export function repairInstruction(verdict: OutputVerdict, contract: OutputContract): string {
  if (verdict.ok) return "";
  const shape = contract.keys
    ? `The JSON object must have exactly these top-level fields, with these types: ` +
      Object.entries(contract.keys).map(([k, v]) => `"${k}" (${v})`).join(", ") + "."
    : `The reply must be a single JSON object.`;
  return (
    `\n\nYOUR PREVIOUS REPLY WAS REJECTED: ${verdict.detail}.\n` +
    `Answer the request above again. Output ONE JSON object and nothing else — ` +
    `no markdown fences, no prose before or after it. ${shape}`
  );
}
