// ═══════════════════════════════════════════════════════════════════════════
// THE SERVER-SIDE GUARD IN FRONT OF A MODEL CALL — ported for M8-4.
//
// `app/api/capture/extract/route.ts` is the FIRST new route in the rebuilt
// pipeline that reaches a model. It runs the same five checks, in the same
// order, that `app/api/ai/route.ts` has run in front of every model call since
// M0:
//
//   1 · authenticated       the identity is the token's, never the body's
//   2 · entitlement         one server-side choke point, `lib/tier.ts`
//   3 · strikes             three moderation blocks in 30 days ends AI access
//   4 · regex pre-scan      free, and runs before any API call is made
//   5 · classifier          Haiku, catching what a regex cannot
//   6 · meter               `consume_ai_call`, atomic, service-role only
//
// M15 is *"AI boundary"* and owns the rebuild of all of it. This pass may not
// touch `app/api/ai/route.ts` and may not invent a second, unguarded path to a
// model, so the checks are PORTED here rather than re-imagined — the ordering
// and the semantics are copied deliberately, including the two places the
// original fails OPEN (a broken classifier and a broken meter never block a
// student), because changing a safety posture is a decision and this pass is
// not the one making it.
//
//
// THE DUPLICATION IS REAL, AND IT IS FENCED
//
// `BLOCKED_PATTERNS` below is the same list `app/api/ai/route.ts` declares.
// Two copies of a safety list is how a safety list rots. So
// `tests/capture-extraction.test.mjs` reads BOTH files, extracts both arrays,
// and fails if they are not character-for-character identical. The duplication
// therefore cannot drift; it can only be deleted, which is what M15 will do.
//
// No I/O of its own. The three things that need a database or a network — the
// strike count, the classifier, the meter — are injected, so the ORDER of the
// checks is provable with nothing live in reach (U.3).
// ═══════════════════════════════════════════════════════════════════════════

// ── Content moderation ──────────────────────────────────────────────────────
// PORTED VERBATIM from app/api/ai/route.ts. Do not edit one copy.
const BLOCKED_PATTERNS: RegExp[] = [
  // Self-harm / suicide
  /\b(suicide|self[\s-]?harm|kill\s+(my|him|her|them)self|cut\s+myself|overdose|slit\s+wrist|end\s+my\s+life|want\s+to\s+die)\b/i,
  /\b(how\s+to\s+(commit\s+suicide|harm\s+myself|kill\s+myself|end\s+it\s+all|take\s+my\s+own\s+life))\b/i,
  // Violence / weapons
  /\b(how\s+to\s+(make|build|create|assemble|construct|manufacture)\s+(a\s+)?(bomb|weapon|explosive|gun|poison|bioweapon|chemical\s+weapon|pipe\s+bomb|molotov))\b/i,
  /\b(kill|murder|attack|stab|shoot|bomb|strangle|poison)\s+(a\s+)?(person|people|student|teacher|school|university|human|someone|kid|child)\b/i,
  /\b(mass\s+(shooting|killing|murder|casualt)|school\s+shooting|terrorist\s+attack|how\s+to\s+hurt)\b/i,
  // Drugs / substances
  /\b(how\s+to\s+(make|synthesize|cook|produce|manufacture|extract)\s+(meth|methamphetamine|heroin|fentanyl|crack|cocaine|mdma|lsd|crystal))\b/i,
  /\b(drug\s+(recipe|formula|synthesis|manufacturing)|narcotic\s+synthesis|cook\s+meth)\b/i,
  // Explicit / adult
  /\b(porn|pornography|explicit\s+sex|nude\s+image|child\s+(sexual|nude|porn)|sexual\s+content\s+about)\b/i,
  // Hacking / cybercrime
  /\b(hack\s+(into|a|the)\s+(school|account|system|database|website|server|exam)|ddos\s+attack|sql\s+injection\s+(attack)|phishing\s+(scam|email)|ransomware|keylogger|create\s+(malware|virus|trojan))\b/i,
  // Hate speech / extremism
  /\b(ethnic\s+cleansing|genocide\s+(of|against)|white\s+supremac|neo[\s-]?nazi|racial\s+superiority)\b/i,
  /\b(terrorist\s+(manifesto|recruitment|propaganda)|how\s+to\s+join\s+(isis|al[\s-]?qaeda|taliban)|radicaliz)\b/i,
];

/** The same sentence `/api/ai` returns. One wording for one refusal — a second
 *  phrasing would tell a probing client which route it had reached. */
export const MODERATION_ERROR =
  "This topic isn't something Ledger can help with. Please keep questions related to your studies.";

/** Three in thirty days ends AI access. `/api/ai`'s number, not a new one. */
export const STRIKE_LIMIT = 3;

// Normalize obfuscation tricks: l33tspeak, zero-width chars, separator dots
export function normalizeText(text: string): string {
  return text
    .replace(/[​-‍﻿­]/g, "")  // zero-width / soft-hyphen
    .replace(/[1!|]/g, "i").replace(/[0@]/g, "o")
    .replace(/3/g, "e").replace(/4/g, "a")
    .replace(/5\$/g, "s").replace(/7/g, "t")
    .replace(/[.\-_*]{1,2}(?=[a-z])/gi, "")        // k.i.l.l → kill
    .replace(/\s{2,}/g, " ");
}

/** Recursively extract all strings — nested arrays and objects included, so a
 *  payload cannot hide text one level down. */
export function extractStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(extractStrings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(extractStrings);
  }
  return [];
}

export function scanForHarmfulContent(inputs: string[]): boolean {
  return inputs.some(text => {
    const normalized = normalizeText(text.toLowerCase());
    return BLOCKED_PATTERNS.some(p => p.test(text) || p.test(normalized));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PREFLIGHT
// ═══════════════════════════════════════════════════════════════════════════

export type GuardRefusal =
  | "suspended"
  | "moderation"
  | "rate_limited";

export type GuardVerdict =
  | { allowed: true }
  | { allowed: false; refusal: GuardRefusal; status: number; message: string; logAs?: string };

export interface GuardDeps {
  /** Moderation blocks in the last 30 days. */
  strikeCount(userId: string): Promise<number>;
  /** The Haiku classifier. MUST fail open — `/api/ai`: *"never block on
   *  classifier failure"* — and this module relies on that, it does not
   *  re-impose it. */
  classify(inputs: string[]): Promise<{ safe: boolean; reason?: string }>;
  /** `consume_ai_call`: atomic increment, returns the count INCLUDING this
   *  call, or `null` when the meter itself broke (fail open). */
  meter(userId: string): Promise<{ used: number | null; enforcing: boolean; limit: number }>;
  /** Fire-and-forget. Never awaited by the caller's happy path. */
  recordBlock(userId: string, detail: string): void;
}

export interface GuardRequest {
  userId: string;
  /** A label for the log line. `/api/ai` logs the tool name; this logs the
   *  capability. */
  capability: string;
  /** Everything the model would see that a human supplied. */
  inputs: unknown;
}

/**
 * Run the guard. Returns a verdict; performs no HTTP and knows no framework.
 *
 * The ORDER is the contract, and it is `/api/ai`'s order exactly: the free
 * check runs before the paid one, and the meter is consumed LAST so a request
 * that was going to be refused does not spend the student's daily allowance.
 */
export async function guardModelCall(
  deps: GuardDeps,
  req: GuardRequest,
): Promise<GuardVerdict> {
  // ── strikes ──────────────────────────────────────────────────────────────
  const strikes = await deps.strikeCount(req.userId);
  if (strikes >= STRIKE_LIMIT) {
    return {
      allowed: false,
      refusal: "suspended",
      status: 403,
      message: "Your AI access has been suspended due to repeated policy violations.",
    };
  }

  const texts = extractStrings(req.inputs);

  // ── layer 1: regex, before any API call is made ──────────────────────────
  if (scanForHarmfulContent(texts)) {
    deps.recordBlock(
      req.userId,
      `${req.capability} — blocked by regex (strike ${strikes + 1}/${STRIKE_LIMIT})`,
    );
    return { allowed: false, refusal: "moderation", status: 400, message: MODERATION_ERROR };
  }

  // ── layer 2: the classifier ──────────────────────────────────────────────
  const verdict = await deps.classify(texts);
  if (!verdict.safe) {
    deps.recordBlock(
      req.userId,
      `${req.capability} — blocked by AI classifier, category: ${verdict.reason ?? "unknown"} ` +
        `(strike ${strikes + 1}/${STRIKE_LIMIT})`,
    );
    return { allowed: false, refusal: "moderation", status: 400, message: MODERATION_ERROR };
  }

  // ── the meter, last ──────────────────────────────────────────────────────
  const { used, enforcing, limit } = await deps.meter(req.userId);
  if (used !== null && enforcing && used > limit) {
    return {
      allowed: false,
      refusal: "rate_limited",
      status: 429,
      message: `You've queried the ledger ${limit} times today. It resets at midnight.`,
    };
  }

  return { allowed: true };
}
