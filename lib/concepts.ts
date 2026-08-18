// ═══════════════════════════════════════════════════════════════════════════
// M6-1 — THE CONCEPT MODEL, IN PRODUCTION.
//
// EXECUTION_PLAN M6-1: *"Wire `concepts` + `lib/taxonomy/{build,cbse-physics}
// .ts` into production. Done when: the seeded tree has production importers;
// the tests test a shipped path."*
//
// Architecture T12, *"dark code decays"*: everything under `lib/taxonomy` had **zero
// production importers** and a green test suite. **This file is the importer.**
// Everything below `import { buildTaxonomy }` is shipped code, and the seed
// tree is now a thing the product depends on rather than a thing a test
// exercises.
//
//
// WHERE THE BOUNDARY OF M6-1 IS, AND WHY IT IS HERE
//
// This module is a READ-SIDE data access layer and a resolver, and nothing
// else. It builds no UI, wires no tool page, and writes no row. That is
// deliberate: B.4 says the concept model's outputs are *"`concept_id`
// resolution for events, sessions, assessments, mistakes, coverage and
// search"* — every one of which is a LATER milestone (M7 events, M9 sessions,
// M10 assessment, M11 mistakes, M12 coverage, M23 search). M6 is the leaf
// dependency those consume; building a consumer here would be building M7
// early, on a substrate the plan says must not exist yet.
//
// So "production importer" means exactly what it says: the seeded tree is
// imported, validated and served by an application module that the next
// milestone calls, rather than by a build script that emits SQL.
//
//
// TWO SOURCES, ONE AUTHORITY
//
// B.4: *"Source of truth. The `concepts` table from `007_mistakes.sql`."* The
// table is authoritative — it alone carries merges, curated concepts and
// admitted aliases. The compiled tree is the **provenance** of the seeded rows,
// not a rival to them: `014_concepts_cbse_physics_seed.sql` is generated from
// it, ids are UUIDv5 over a fixed namespace, so the tree and the seeded rows
// are the same rows by construction.
//
// That is what makes `verifySeedAgainstDatabase()` meaningful: any disagreement
// between them is drift, and drift in reference data is the T1 failure one
// level down. The tree is never used to CONTRADICT the database; it is used to
// answer offline, and to detect when the database stopped matching it.
//
//
// WHY THE DATABASE PATH DEGRADES INSTEAD OF THROWING
//
// 013 and 014 have NOT been applied to any database. Following the M5-2
// precedent exactly (`lib/student-context.ts`), a read that assumed them would
// break every caller at once, so each read reports the `source` it actually
// used rather than degrading silently.
//
// DELETE THE FALLBACKS when `select * from public.migration_ledger() where
// version in ('013','014')` returns two rows — the same removal condition M1-3
// wrote into the score-snapshot cron and M5-2 wrote into `getStudentContext()`.
// ═══════════════════════════════════════════════════════════════════════════

import { buildTaxonomy, validateTaxonomy, type BuiltConcept } from "./taxonomy/build";
import { CBSE_PHYSICS } from "./taxonomy/cbse-physics";
import { createStudentServerClient } from "./supabase-server";
import {
  buildResolutionIndex,
  resolveConceptText,
  resolveMergeChain,
  type ConceptAliasEntry,
  type ConceptCandidate,
  type ConceptResolutionResult,
  type ResolutionIndex,
  type UUID,
} from "./concept-resolution";

/** The cut of the seeded tree this build ships. Mirrors `taxonomy_version` in
 *  `scripts/build-taxonomy-seed.mjs` and the column 013 adds. One constant,
 *  asserted equal in `tests/concepts.test.mjs`, so the code and the SQL cannot
 *  drift apart quietly. */
export const TAXONOMY_VERSION = 1;

/** The syllabuses compiled into this build. One today; a second subject is a
 *  new data file in `lib/taxonomy/` and one entry here — never a code change,
 *  which is the promise `cbse-physics.ts` opens with. */
const SYLLABUSES = [CBSE_PHYSICS];

// ═══════════════════════════════════════════════════════════════════════════
// THE SEEDED TREE
// ═══════════════════════════════════════════════════════════════════════════

let seeded: readonly BuiltConcept[] | null = null;

/**
 * The compiled concept tree, built once per process and validated on first use.
 *
 * IT THROWS ON AN INVALID TAXONOMY, deliberately. `validateTaxonomy()` catches
 * orphans, cycles, duplicate ids and duplicate board codes — every one of which
 * would make concept identity wrong rather than merely missing. A product whose
 * concept ids are wrong records mistakes against the wrong concept and reports
 * them forever; failing at import is the only honest response, and the failure
 * is unreachable in practice because the same validation gates the seed
 * generator and the test suite.
 */
export function seededConcepts(): readonly BuiltConcept[] {
  if (seeded) return seeded;
  const rows = SYLLABUSES.flatMap(s => buildTaxonomy(s));
  const result = validateTaxonomy(rows);
  if (!result.ok) {
    const first = result.issues.slice(0, 3).map(i => `${i.rule}: ${i.detail}`).join("; ");
    throw new Error(
      `The compiled concept taxonomy is invalid (${result.issues.length} issues). ${first}`,
    );
  }
  seeded = rows;
  return seeded;
}

/** Leaf concepts only — the level an occurrence, a session concept or an
 *  assessment slot actually points at. Subjects, chapters and topics exist to
 *  roll up, never to be addressed. */
export function seededLeaves(): readonly BuiltConcept[] {
  return seededConcepts().filter(c => c.level === "concept");
}

export function getSeededConcept(id: UUID): BuiltConcept | null {
  return seededConcepts().find(c => c.id === id) ?? null;
}

/** The seeded tree in the row shape `concepts` stores. Used by the seed
 *  verification below, and by anything that needs to compare the two. */
export interface ConceptRow {
  id: UUID;
  subject: string;
  chapter: string;
  topic: string;
  name: string;
  parent_id: UUID | null;
  board_codes: string[];
  exam_weight: number;
  taxonomy_version: number;
  merged_into?: UUID | null;
}

export function seededConceptRows(): ConceptRow[] {
  return seededConcepts().map(c => ({
    id: c.id,
    subject: c.subject,
    chapter: c.chapter,
    topic: c.topic,
    name: c.name,
    parent_id: c.parentId,
    board_codes: [...c.boardCodes],
    exam_weight: c.examWeight,
    taxonomy_version: TAXONOMY_VERSION,
    merged_into: null,
  }));
}

const asCandidate = (c: BuiltConcept): ConceptCandidate => ({
  id: c.id,
  name: c.name,
  subject: c.subject,
  chapter: c.chapter,
  topic: c.topic,
  boardCodes: c.boardCodes,
  mergedInto: null,
});

// ═══════════════════════════════════════════════════════════════════════════
// READING THE TABLE
//
// Through `createStudentServerClient()` — the anon-key, cookie-reading,
// RLS-scoped client M4-1 added — and never through `supabaseServer`, the
// service role. The taxonomy's RLS is already correct for this
// (`007_mistakes.sql:322-324`: globally readable by `authenticated`,
// service-role writable), so reading it as the caller is both sufficient and
// the posture that stays correct when a curated concept later needs a
// permission that the seed does not.
//
// NOTHING HERE WRITES. The taxonomy is a curated company asset; a write path
// from application code is how a shared asset becomes user-generated content.
// ═══════════════════════════════════════════════════════════════════════════

/** Where a set of concepts came from. A caller that got the compiled tree
 *  instead of the table is told so, never left to assume. */
export type ConceptSource = "concepts_table" | "compiled_seed";

export interface ConceptQueryResult {
  concepts: ConceptRow[];
  source: ConceptSource;
}

type ServerClient = Awaited<ReturnType<typeof createStudentServerClient>>;

/** `merged_into` and `taxonomy_version` exist only after 013. Selected
 *  separately so a pre-013 database returns the rest rather than nothing. */
const BASE_COLUMNS = "id, subject, chapter, topic, name, parent_id, board_codes, exam_weight";
const POST_013_COLUMNS = `${BASE_COLUMNS}, taxonomy_version, merged_into`;

async function selectConcepts(
  supabase: ServerClient,
  columns: string,
): Promise<ConceptRow[] | null> {
  const { data, error } = await supabase.from("concepts").select(columns);
  if (error || !data) return null;
  return (data as unknown as Record<string, unknown>[]).map(normaliseRow);
}

function normaliseRow(row: Record<string, unknown>): ConceptRow {
  return {
    id: String(row.id),
    subject: String(row.subject ?? ""),
    chapter: String(row.chapter ?? ""),
    topic: String(row.topic ?? ""),
    name: String(row.name ?? ""),
    parent_id: (row.parent_id as UUID | null) ?? null,
    board_codes: Array.isArray(row.board_codes) ? (row.board_codes as string[]) : [],
    exam_weight: Number(row.exam_weight ?? 0),
    // A pre-013 row has no version column. It is version 1 by definition:
    // 013's DEFAULT says so, and that is the cut the seed produces.
    taxonomy_version: Number(row.taxonomy_version ?? TAXONOMY_VERSION),
    merged_into: (row.merged_into as UUID | null) ?? null,
  };
}

/**
 * Every concept the record can address.
 *
 * Falls back to the compiled tree when the table is unreachable or empty — and
 * SAYS SO through `source`. An empty `concepts` table is the pre-014 state, not
 * an error: the resolver still has a taxonomy to work against, and the caller
 * can see that nothing has been seeded yet.
 */
export async function listConcepts(): Promise<ConceptQueryResult> {
  try {
    const supabase = await createStudentServerClient();
    const rows =
      (await selectConcepts(supabase, POST_013_COLUMNS)) ??
      (await selectConcepts(supabase, BASE_COLUMNS));
    if (rows && rows.length > 0) return { concepts: rows, source: "concepts_table" };
  } catch {
    // No request context, no session, no project — every one of which means
    // "the table cannot answer", which the fallback below handles honestly.
  }
  return { concepts: seededConceptRows(), source: "compiled_seed" };
}

/**
 * One concept by id, with merges already followed.
 *
 * A caller asking about a superseded concept gets its replacement, and is told
 * which id it asked about. That is the M6-2 contract from the read side: an
 * occurrence recorded in 2026 against a concept that has since been merged
 * still resolves, and nothing about the stored row had to change.
 */
export async function getConcept(
  id: UUID,
): Promise<{ concept: ConceptRow | null; requestedId: UUID; mergeHops: number; source: ConceptSource }> {
  const { concepts, source } = await listConcepts();
  const mergeMap = new Map<UUID, UUID | null>(concepts.map(c => [c.id, c.merged_into ?? null]));
  const chain = resolveMergeChain(id, mergeMap);
  if (chain.status !== "ok") {
    return { concept: null, requestedId: id, mergeHops: chain.hops, source };
  }
  return {
    concept: concepts.find(c => c.id === chain.conceptId) ?? null,
    requestedId: id,
    mergeHops: chain.hops,
    source,
  };
}

/** Admitted aliases (013). Empty — never an error — before 013 is applied, and
 *  empty is the correct pre-013 answer: there are none. */
export async function listAliases(): Promise<ConceptAliasEntry[]> {
  try {
    const supabase = await createStudentServerClient();
    const { data, error } = await supabase
      .from("concept_aliases")
      .select("concept_id, alias")
      .not("admitted_at", "is", null);
    if (error || !data) return [];
    return (data as unknown as Record<string, unknown>[]).map(r => ({
      conceptId: String(r.concept_id),
      alias: String(r.alias ?? ""),
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLUTION (M6-3)
//
// The decision itself is in `lib/concept-resolution.ts` and imports nothing.
// This half supplies the candidates and is the only part that touches I/O.
// ═══════════════════════════════════════════════════════════════════════════

let offlineIndex: ResolutionIndex | null = null;

/** An index over the compiled tree alone. Synchronous, allocation-free after
 *  the first call, and available anywhere — including a build step or a test —
 *  because it needs no database and no request. */
export function seededResolutionIndex(): ResolutionIndex {
  if (!offlineIndex) offlineIndex = buildResolutionIndex(seededConcepts().map(asCandidate));
  return offlineIndex;
}

/**
 * Resolve free text against the compiled tree, with no database in reach.
 *
 * This is the path the seed guarantees: it knows nothing of merges or admitted
 * aliases, so it can only ever answer exact or semantic. Use it where a round
 * trip is impossible; use `resolveConcept()` where one is.
 */
export function resolveConceptOffline(declaredText: string): ConceptResolutionResult {
  return resolveConceptText(declaredText, seededResolutionIndex());
}

export interface ConceptResolutionContext {
  index: ResolutionIndex;
  source: ConceptSource;
  aliasCount: number;
}

/** Build one index and resolve many declarations against it. A session confirms
 *  several concepts at once and must not pay for the taxonomy once per word. */
export async function conceptResolutionContext(): Promise<ConceptResolutionContext> {
  const [{ concepts, source }, aliases] = await Promise.all([listConcepts(), listAliases()]);
  const candidates: ConceptCandidate[] = concepts.map(c => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    chapter: c.chapter,
    topic: c.topic,
    boardCodes: c.board_codes,
    mergedInto: c.merged_into ?? null,
  }));
  return {
    index: buildResolutionIndex(candidates, aliases),
    source,
    aliasCount: aliases.length,
  };
}

/**
 * Resolve one free-text declaration to a concept id, or legally to none.
 *
 * THE UNRESOLVED RESULT IS NOT AN ERROR. Architecture V.2.4: a student types
 * *"and the thing about wobbling tops"*, no taxonomy match exists, and the
 * correct outcome is a row with `concept_id = NULL` and the declared text
 * preserved. This function returns exactly that and never throws, so a caller
 * has no reason to reach for a guess in a `catch`.
 */
export async function resolveConcept(declaredText: string): Promise<ConceptResolutionResult> {
  const { index } = await conceptResolutionContext();
  return resolveConceptText(declaredText, index);
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED VERIFICATION — reference data gets the T1 treatment too
//
// M1 built a ledger because *"which migrations are applied is unknowable"*.
// The same question applies one level down: is the taxonomy in the database the
// taxonomy this build was compiled against? Ids are deterministic, so the
// question has an exact answer, and this computes it.
//
// It REPORTS; it does not repair. A repair would be a write to a curated asset
// from application code, and a silent one at that.
// ═══════════════════════════════════════════════════════════════════════════

export interface SeedVerification {
  ok: boolean;
  source: ConceptSource;
  expected: number;
  present: number;
  /** In the compiled tree, absent from the table — the seed has not been run,
   *  or has not been re-run since the syllabus changed. */
  missingIds: UUID[];
  /** In the table, not in the compiled tree. Curated additions and merged-away
   *  concepts both land here legitimately; it is a report, not a fault. */
  unknownIds: UUID[];
  /** Same id, different label. This is real drift: a hand-edit to a generated
   *  seed, or a database edited outside the repository. */
  changedIds: UUID[];
  /** Rows carrying a taxonomy_version this build does not ship. */
  versionMismatch: number;
}

export async function verifySeedAgainstDatabase(): Promise<SeedVerification> {
  const { concepts, source } = await listConcepts();
  const expected = seededConceptRows();
  const byId = new Map(concepts.map(c => [c.id, c]));

  const missingIds: UUID[] = [];
  const changedIds: UUID[] = [];
  let versionMismatch = 0;

  for (const e of expected) {
    const actual = byId.get(e.id);
    if (!actual) {
      missingIds.push(e.id);
      continue;
    }
    if (
      actual.name !== e.name ||
      actual.subject !== e.subject ||
      actual.chapter !== e.chapter ||
      actual.topic !== e.topic ||
      (actual.parent_id ?? null) !== (e.parent_id ?? null)
    ) {
      changedIds.push(e.id);
    }
    if (actual.taxonomy_version !== e.taxonomy_version) versionMismatch += 1;
  }

  const expectedIds = new Set(expected.map(e => e.id));
  const unknownIds = concepts.filter(c => !expectedIds.has(c.id)).map(c => c.id);

  return {
    ok: missingIds.length === 0 && changedIds.length === 0 && versionMismatch === 0,
    source,
    expected: expected.length,
    present: concepts.length,
    missingIds,
    unknownIds,
    changedIds,
    versionMismatch,
  };
}
