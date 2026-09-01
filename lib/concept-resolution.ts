// ═══════════════════════════════════════════════════════════════════════════
// M6-3 — CONCEPT RESOLUTION: exact → alias → semantic, and a LEGAL UNRESOLVED
// STATE.
//
// EXECUTION_PLAN M6-3: *"Resolution: exact → alias → semantic, with a legal
// unresolved state. Done when: an unmatched declaration resolves to
// `concept_id = NULL` with text preserved; the system does not guess (V.2.4)."*
//
// Architecture B.4: *"Resolution is deterministic … An unresolved concept must
// be representable — `student_declared_text` with `concept_id = NULL` is a
// legal state, and the system must not invent a match to avoid a null."*
//
//
// WHY THIS FILE IMPORTS NOTHING
//
// Same discipline as `lib/auth-routes.ts` and `lib/student-profile.ts`: the
// decision is a pure function of (free text, the candidate set), so it is
// provable in both directions with no Supabase project in reach. `lib/
// concepts.ts` supplies the candidates — from the compiled seed tree, and from
// the `concepts` / `concept_aliases` tables where they exist — and this module
// decides. Nothing here reads a clock, a network or a database.
//
//
// WHAT "SEMANTIC" MEANS HERE, AND WHAT IT DELIBERATELY DOES NOT
//
// B.4 names the third tier *"embedding similarity above a threshold"*. This
// implementation is **lexical**, not embedding-based, and that is a scope
// decision rather than an omission:
//
//   · An embedding tier is a model call. Every model call in this product
//     belongs to the typed capability boundary (Part Q / EXECUTION_PLAN M15),
//     which does not exist yet. Reaching for one here would put an unversioned,
//     unprovenanced model call underneath concept identity — the one thing B.4
//     says every event, session, assessment, mistake and search addresses.
//   · B.4 also says resolution is DETERMINISTIC. A lexical score is
//     reproducible forever from the text alone; an embedding is reproducible
//     only against a pinned model, and a model swap would silently re-resolve
//     history.
//   · The failure mode of a weak third tier is an UNRESOLVED row, which is a
//     legal state this product is built to carry. The failure mode of a
//     confident wrong match is a fabricated concept identity, which Law 7
//     forbids. The tiers are therefore tuned to refuse rather than to reach.
//
// The contract is what matters, and it is stable: when the AI boundary lands, a
// similarity source may be substituted behind `matchedVia: "semantic"` without
// any caller changing. Nothing above this file knows how the third tier scores.
//
//
// AMBIGUITY IS REFUSED, NOT BROKEN
//
// If a tier produces more than one candidate, resolution stops there and
// reports `ambiguous`. It does NOT fall through to a weaker tier: a weaker tier
// resolving what a stronger tier found genuinely ambiguous is guessing with
// extra steps, and the whole point of M6-3 is that the system does not guess.
// ═══════════════════════════════════════════════════════════════════════════

export type UUID = string;

/** The taxonomy row shape resolution needs. A subset of `Concept`, so both the
 *  compiled seed tree (`BuiltConcept`) and a database row satisfy it. */
export interface ConceptCandidate {
  id: UUID;
  name: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  boardCodes?: readonly string[];
  /** 013 — set when this concept has been superseded by another. */
  mergedInto?: UUID | null;
}

/** A curated surface form for a concept. 013's `concept_aliases`. */
export interface ConceptAliasEntry {
  conceptId: UUID;
  alias: string;
}

export type MatchTier = "exact" | "alias" | "semantic";

export type UnresolvedReason =
  /** Nothing was said. */
  | "empty"
  /** There is no taxonomy to resolve against at all. */
  | "no_candidates"
  /** The best lexical score did not clear the threshold. */
  | "below_threshold"
  /** Two or more candidates were equally good. Refused, per the header. */
  | "ambiguous"
  /** `merged_into` forms a loop. Refused rather than followed forever. */
  | "merge_cycle"
  /** `merged_into` points at a concept that is not in the candidate set. */
  | "merge_dangling";

export type ConceptResolutionResult =
  | {
      status: "resolved";
      /** The TERMINAL concept — merges already followed. */
      conceptId: UUID;
      /** What the text matched before merges were followed. Equal to
       *  `conceptId` unless the matched concept has been superseded. */
      matchedConceptId: UUID;
      matchedVia: MatchTier;
      /** 1 for exact and alias; the lexical score for semantic. */
      score: number;
      /** How many `merged_into` hops were followed. 0 for a live concept. */
      mergeHops: number;
      /** The student's words, VERBATIM. Never normalised, never discarded. */
      declaredText: string;
    }
  | {
      status: "unresolved";
      /** THE LEGAL NULL. B.4: an unresolved concept must be representable. */
      conceptId: null;
      reason: UnresolvedReason;
      /** The student's words, VERBATIM. This is the whole point: the record
       *  keeps what was said even when it cannot say what it means. */
      declaredText: string;
      /** Best lexical score reached, so a curator can see how close it came. */
      bestScore: number;
      /** Non-empty on `ambiguous` — what tied. Never used to pick a winner. */
      candidateIds: readonly UUID[];
    };

// ═══════════════════════════════════════════════════════════════════════════
// NORMALISATION — one function, used by every tier
//
// Deliberately lossy in exactly four ways, each because the loss is noise:
// case, accents, apostrophes ("Newton's" / "Newtons"), and punctuation. It is
// NOT the slug from `lib/taxonomy/build.ts`: that one builds identity and must
// stay byte-stable forever; this one compares surface forms and may be tuned.
// Keeping them separate is what stops a comparison tweak silently re-issuing
// every concept id in the record.
// ═══════════════════════════════════════════════════════════════════════════

export function normaliseConceptText(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")        // combining marks
    .replace(/[\u2018\u2019\u02bc']/g, "")  // apostrophes vanish, never split
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Board codes are identifiers, not prose: compared case-insensitively and
 *  otherwise byte-for-byte. `CBSE-PHY-11-C06-T02-K01` means one thing. */
function normaliseBoardCode(input: string): string {
  return typeof input === "string" ? input.trim().toUpperCase() : "";
}

const tokensOf = (normalised: string): string[] =>
  normalised.length === 0 ? [] : normalised.split(" ");

// ═══════════════════════════════════════════════════════════════════════════
// THE INDEX
//
// Built once per candidate set and reused. A map value is an ARRAY on purpose:
// a duplicate surface form must stay visible so it can be refused as ambiguous,
// rather than being silently overwritten by whichever row was loaded last.
// ═══════════════════════════════════════════════════════════════════════════

export interface ResolutionIndex {
  readonly byName: ReadonlyMap<string, readonly UUID[]>;
  readonly byCode: ReadonlyMap<string, readonly UUID[]>;
  readonly byAlias: ReadonlyMap<string, readonly UUID[]>;
  readonly mergeMap: ReadonlyMap<UUID, UUID | null>;
  readonly known: ReadonlySet<UUID>;
  readonly scan: readonly { id: UUID; norm: string; tokens: readonly string[] }[];
  readonly size: number;
}

function push(map: Map<string, UUID[]>, key: string, id: UUID): void {
  if (key.length === 0) return;
  const existing = map.get(key);
  if (existing) {
    if (!existing.includes(id)) existing.push(id);
  } else {
    map.set(key, [id]);
  }
}

export function buildResolutionIndex(
  concepts: readonly ConceptCandidate[],
  aliases: readonly ConceptAliasEntry[] = [],
): ResolutionIndex {
  const byName = new Map<string, UUID[]>();
  const byCode = new Map<string, UUID[]>();
  const byAlias = new Map<string, UUID[]>();
  const mergeMap = new Map<UUID, UUID | null>();
  const known = new Set<UUID>();
  const scan: { id: UUID; norm: string; tokens: readonly string[] }[] = [];

  for (const c of concepts) {
    if (!c || typeof c.id !== "string" || typeof c.name !== "string") continue;
    known.add(c.id);
    mergeMap.set(c.id, c.mergedInto ?? null);

    const norm = normaliseConceptText(c.name);
    push(byName, norm, c.id);
    for (const code of c.boardCodes ?? []) push(byCode, normaliseBoardCode(code), c.id);
    if (norm.length > 0) scan.push({ id: c.id, norm, tokens: tokensOf(norm) });
  }

  for (const a of aliases) {
    if (!a || typeof a.conceptId !== "string" || typeof a.alias !== "string") continue;
    // An alias for a concept nobody loaded resolves to nothing useful, and
    // admitting it would produce a hit whose id cannot be explained.
    if (!known.has(a.conceptId)) continue;
    push(byAlias, normaliseConceptText(a.alias), a.conceptId);
  }

  return { byName, byCode, byAlias, mergeMap, known, scan, size: known.size };
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 3 SCORING — deterministic lexical similarity
//
// Two independent measures, combined by MAX because they fail in different
// places and each rescues the other:
//
//   · token-set Dice  — word order and word count are noise. "torque sign
//                       convention" and "sign convention for torque" are the
//                       same request; Levenshtein reads them as far apart.
//   · Levenshtein     — a typo inside one word. "torqe" shares no token with
//                       "torque", so Dice reads 0.
//
// MAX, not average, because averaging would mean a perfect hit on one measure
// is dragged below the threshold by the measure that cannot see it.
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum score for the semantic tier to answer at all. Below it the result
 *  is UNRESOLVED, which is a legal state — an honest null beats a guess. */
export const SEMANTIC_THRESHOLD = 0.82;

/** The winner must beat the runner-up by at least this much. A near-tie is an
 *  ambiguity, and ambiguity is refused (see the header). */
export const SEMANTIC_MARGIN = 0.05;

export function diceCoefficient(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared += 1;
  return (2 * shared) / (setA.size + setB.size);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j += 1) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j] + 1;
      const ins = curr[j - 1] + 1;
      const sub = prev[j - 1] + cost;
      curr[j] = del < ins ? (del < sub ? del : sub) : ins < sub ? ins : sub;
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[b.length];
}

export function editSimilarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  return 1 - levenshtein(a, b) / longest;
}

/** The tier-3 score for one candidate. Pure, symmetric, and in [0, 1]. */
export function lexicalScore(
  queryNorm: string,
  queryTokens: readonly string[],
  candidateNorm: string,
  candidateTokens: readonly string[],
): number {
  const dice = diceCoefficient(queryTokens, candidateTokens);
  // A length gap this wide cannot clear the threshold on edit distance, and
  // skipping it keeps the scan linear-ish over a taxonomy of any size.
  const shorter = Math.min(queryNorm.length, candidateNorm.length);
  const longer = Math.max(queryNorm.length, candidateNorm.length);
  const edit = longer === 0 || shorter / longer < SEMANTIC_THRESHOLD
    ? 0
    : editSimilarity(queryNorm, candidateNorm);
  return dice > edit ? dice : edit;
}

// ═══════════════════════════════════════════════════════════════════════════
// MERGES (M6-2) — a superseded concept stays resolvable
//
// C.2's target design: *"`merged_into UUID REFERENCES concepts(id)` so a
// superseded concept's historical references stay resolvable."* That is the
// whole reason a merge is a pointer and not a rewrite: an occurrence recorded
// in 2026 against concept A keeps pointing at A forever, and A keeps answering.
//
// MULTI-HOP, because nothing in B.4 or C.2 restricts a merge to one, and a
// second merge of an already-merged concept is an ordinary curation event.
// A → B → C resolves to C. A loop is REFUSED, not followed: a taxonomy that
// cannot say what a text means must say so, not hang.
// ═══════════════════════════════════════════════════════════════════════════

export const MAX_MERGE_HOPS = 16;

export type MergeChainResult =
  | { status: "ok"; conceptId: UUID; hops: number }
  | { status: "cycle"; conceptId: null; hops: number }
  | { status: "dangling"; conceptId: null; hops: number };

export function resolveMergeChain(
  start: UUID,
  mergeMap: ReadonlyMap<UUID, UUID | null>,
  maxHops: number = MAX_MERGE_HOPS,
): MergeChainResult {
  let cursor = start;
  let hops = 0;
  const seen = new Set<UUID>([start]);

  for (;;) {
    if (!mergeMap.has(cursor)) return { status: "dangling", conceptId: null, hops };
    const next = mergeMap.get(cursor) ?? null;
    if (next === null) return { status: "ok", conceptId: cursor, hops };
    if (seen.has(next)) return { status: "cycle", conceptId: null, hops };
    if (hops >= maxHops) return { status: "cycle", conceptId: null, hops };
    seen.add(next);
    cursor = next;
    hops += 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

const unresolved = (
  declaredText: string,
  reason: UnresolvedReason,
  bestScore = 0,
  candidateIds: readonly UUID[] = [],
): ConceptResolutionResult => ({
  status: "unresolved",
  conceptId: null,
  reason,
  declaredText,
  bestScore,
  candidateIds,
});

/**
 * Resolve free text to a concept id, or legally to none.
 *
 * NEVER THROWS. An unrecognised declaration is an expected outcome of this
 * product, not an error condition: a student saying *"the thing about wobbling
 * tops"* (V.2.4) must leave a row behind that keeps their words and admits the
 * taxonomy has no name for it yet.
 *
 * `declaredText` on the result is the argument, byte-for-byte. Nothing in this
 * module trims, cases or rewrites what the student said.
 */
export function resolveConceptText(
  declaredText: string,
  index: ResolutionIndex,
): ConceptResolutionResult {
  const raw = typeof declaredText === "string" ? declaredText : "";

  if (!index || index.size === 0) return unresolved(raw, "no_candidates");

  const norm = normaliseConceptText(raw);
  const code = normaliseBoardCode(raw);

  // ── TIER 0.5 · board code ────────────────────────────────────────────────
  // Not a fourth tier: a board code IS an exact match, on the identifier
  // rather than the label. Tried first because a code cannot mean anything
  // else, so a concept literally named after a code cannot shadow it.
  const codeHit = index.byCode.get(code);
  if (codeHit && codeHit.length === 1) return follow(raw, codeHit[0], "exact", 1, index);
  if (codeHit && codeHit.length > 1) return unresolved(raw, "ambiguous", 1, codeHit);

  if (norm.length === 0) return unresolved(raw, "empty");

  // ── TIER 1 · exact ───────────────────────────────────────────────────────
  const nameHit = index.byName.get(norm);
  if (nameHit && nameHit.length === 1) return follow(raw, nameHit[0], "exact", 1, index);
  if (nameHit && nameHit.length > 1) return unresolved(raw, "ambiguous", 1, nameHit);

  // ── TIER 2 · alias ───────────────────────────────────────────────────────
  const aliasHit = index.byAlias.get(norm);
  if (aliasHit && aliasHit.length === 1) return follow(raw, aliasHit[0], "alias", 1, index);
  if (aliasHit && aliasHit.length > 1) return unresolved(raw, "ambiguous", 1, aliasHit);

  // ── TIER 3 · semantic (lexical — see the header) ─────────────────────────
  const tokens = tokensOf(norm);
  let best = 0;
  let bestIds: UUID[] = [];
  let runnerUp = 0;

  for (const entry of index.scan) {
    const score = lexicalScore(norm, tokens, entry.norm, entry.tokens);
    if (score > best) {
      runnerUp = best;
      best = score;
      bestIds = [entry.id];
    } else if (score === best && best > 0) {
      bestIds.push(entry.id);
    } else if (score > runnerUp) {
      runnerUp = score;
    }
  }

  if (best < SEMANTIC_THRESHOLD) return unresolved(raw, "below_threshold", best, []);
  if (bestIds.length > 1) return unresolved(raw, "ambiguous", best, bestIds);
  if (best - runnerUp < SEMANTIC_MARGIN) return unresolved(raw, "ambiguous", best, bestIds);

  return follow(raw, bestIds[0], "semantic", best, index);
}

/** Apply M6-2's merge pointer to a tier's answer. A merge that cannot be
 *  followed makes the result UNRESOLVED rather than silently returning a
 *  superseded id — a stale identity is exactly what `merged_into` exists to
 *  prevent. */
function follow(
  declaredText: string,
  matchedConceptId: UUID,
  matchedVia: MatchTier,
  score: number,
  index: ResolutionIndex,
): ConceptResolutionResult {
  const chain = resolveMergeChain(matchedConceptId, index.mergeMap);
  if (chain.status === "cycle") {
    return unresolved(declaredText, "merge_cycle", score, [matchedConceptId]);
  }
  if (chain.status === "dangling") {
    return unresolved(declaredText, "merge_dangling", score, [matchedConceptId]);
  }
  return {
    status: "resolved",
    conceptId: chain.conceptId,
    matchedConceptId,
    matchedVia,
    score,
    mergeHops: chain.hops,
    declaredText,
  };
}

/**
 * Resolve several declarations at once against one index.
 *
 * Order is preserved and each is independent — one unresolved declaration must
 * never suppress a resolved one, because a student who names four things and is
 * understood about three has told us three true things.
 */
export function resolveConceptTexts(
  declarations: readonly string[],
  index: ResolutionIndex,
): ConceptResolutionResult[] {
  return declarations.map(d => resolveConceptText(d, index));
}
