/**
 * TAXONOMY BUILDER — deterministic concept trees.
 *
 * Turns a declarative syllabus into `Concept` rows matching
 * PRODUCT_DECISIONS.md §4.2 and lib/mistakes/types.ts exactly.
 *
 * DETERMINISM IS THE POINT. Identifiers are UUIDv5 over a fixed namespace and
 * the concept's canonical slug path, so the same syllabus always produces the
 * same ids on every machine, forever. A seed can be re-run, diffed, and
 * reasoned about; a concept never silently changes identity.
 *
 * SHA-1 is implemented here in pure TypeScript rather than imported from
 * `node:crypto`, so the builder behaves identically in Node, the browser and
 * the build step, with no dependency.
 *
 * This file contains NO syllabus content. Content lives in siblings such as
 * `cbse-physics.ts`, so a new subject is a new data file and never a code change.
 */

import type { Concept, UUID } from '../mistakes/types';

// ═══════════════════════════════════════════════════════════════════════════
// THE SHAPE OF A SYLLABUS
// ═══════════════════════════════════════════════════════════════════════════

export interface SyllabusTopic {
  name: string;
  /** Leaf concepts. These are what an occurrence points at. */
  concepts: string[];
}

export interface SyllabusChapter {
  name: string;
  /** Year group. Encoded in the board code, never as a tree level. */
  cls: number;
  /** Chapter number within its class, as published. */
  number: number;
  /** The board's unit grouping this chapter belongs to. */
  unit: string;
  /**
   * Marks attributable to this chapter in the board exam. Feeds severity
   * (§4.6.1). Every leaf inherits its chapter's weight — the question severity
   * asks is "how much is this area worth", not "how much is this sentence worth".
   */
  examWeight: number;
  topics: SyllabusTopic[];
}

export interface Syllabus {
  subject: string;
  /** Board prefix used in every generated code, e.g. "CBSE". */
  board: string;
  /** Short subject code used in every generated code, e.g. "PHY". */
  subjectCode: string;
  chapters: SyllabusChapter[];
}

/** Where a row sits in the tree. Derived, never stored — see §4.2. */
export type ConceptLevel = 'subject' | 'chapter' | 'topic' | 'concept';

export interface BuiltConcept extends Concept {
  /** Derived for validation and reporting. Not a database column. */
  level: ConceptLevel;
  /** The canonical slug path the id was derived from. */
  path: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DETERMINISTIC IDENTITY — UUIDv5 (RFC 4122)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The StudyLedger taxonomy namespace. NEVER change this value — every concept
 * id in every environment derives from it, and altering it would orphan the
 * entire record.
 */
export const TAXONOMY_NAMESPACE = '6f1d8c2e-4b3a-5e7f-9a1c-2d4e6f8a0b3c';

function rotl(n: number, s: number): number {
  return ((n << s) | (n >>> (32 - s))) >>> 0;
}

/** SHA-1 over a byte array. Standard, and deliberately dependency-free. */
function sha1(input: number[]): number[] {
  const msg = input.slice();
  const bitLength = input.length * 8;

  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  // 64-bit big-endian length. Names here are far below 2^32 bits, so the high
  // word is always zero.
  msg.push(0, 0, 0, 0,
    (bitLength >>> 24) & 0xff, (bitLength >>> 16) & 0xff,
    (bitLength >>> 8) & 0xff, bitLength & 0xff);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);

  for (let i = 0; i < msg.length; i += 64) {
    for (let j = 0; j < 16; j += 1) {
      const o = i + j * 4;
      w[j] = ((msg[o] << 24) | (msg[o + 1] << 16) | (msg[o + 2] << 8) | msg[o + 3]) >>> 0;
    }
    for (let j = 16; j < 80; j += 1) {
      w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j += 1) {
      let f: number, k: number;
      if (j < 20)      { f = (b & c) | (~b & d);            k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d;                      k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d);    k = 0x8f1bbcdc; }
      else             { f = b ^ c ^ d;                      k = 0xca62c1d6; }
      const t = (rotl(a, 5) + (f >>> 0) + e + k + w[j]) >>> 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }

  const out: number[] = [];
  for (const h of [h0, h1, h2, h3, h4]) {
    out.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff);
  }
  return out;
}

/** RFC 4122 v5 — SHA-1 of (namespace ‖ name), with version and variant bits set. */
export function uuidV5(name: string, namespace: string = TAXONOMY_NAMESPACE): UUID {
  const nsHex = namespace.replace(/-/g, '');
  const nsBytes: number[] = [];
  for (let i = 0; i < 32; i += 2) nsBytes.push(parseInt(nsHex.slice(i, i + 2), 16));

  const nameBytes: number[] = [];
  for (const ch of new TextEncoder().encode(name)) nameBytes.push(ch);

  const hash = sha1([...nsBytes, ...nameBytes]);
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant

  const hex = hash.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Stable, lossless-enough slug. Deterministic for a given input. */
export function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ═══════════════════════════════════════════════════════════════════════════
// THE BUILDER
// ═══════════════════════════════════════════════════════════════════════════

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/**
 * Build the full concept tree for one syllabus.
 *
 * Row order is deterministic and depth-first: subject, then each chapter, then
 * its topics, then their concepts. A generated seed file therefore diffs
 * cleanly when the syllabus changes.
 *
 * PATH CONVENTION. `chapter` and `topic` are NOT NULL in the schema, so rather
 * than inventing placeholder values, a node repeats its own name in every path
 * field at or below its level:
 *
 *   subject  Physics | Physics    | Physics         | Physics
 *   chapter  Physics | Rotational | Rotational      | Rotational
 *   topic    Physics | Rotational | Angular Momentum| Angular Momentum
 *   concept  Physics | Rotational | Angular Momentum| Sign convention…
 *
 * A leaf's (subject, chapter, topic) is then exactly what §4.3 denormalises
 * onto an occurrence — no join and no transformation at capture time.
 */
export function buildTaxonomy(syllabus: Syllabus): BuiltConcept[] {
  const { subject, board, subjectCode } = syllabus;
  const rows: BuiltConcept[] = [];

  const subjectPath = slug(subject);
  const subjectId = uuidV5(subjectPath);
  const subjectCodeStr = `${board}-${subjectCode}`;

  rows.push({
    id: subjectId,
    subject, chapter: subject, topic: subject, name: subject,
    parentId: null,
    boardCodes: [subjectCodeStr],
    examWeight: 0, // a subject is not itself examined; its chapters are
    level: 'subject',
    path: subjectPath,
  });

  for (const chapter of syllabus.chapters) {
    const chapterPath = `${subjectPath}/${chapter.cls}/${slug(chapter.name)}`;
    const chapterId = uuidV5(chapterPath);
    const chapterCode = `${board}-${subjectCode}-${chapter.cls}-C${pad(chapter.number)}`;

    rows.push({
      id: chapterId,
      subject, chapter: chapter.name, topic: chapter.name, name: chapter.name,
      parentId: subjectId,
      boardCodes: [chapterCode],
      examWeight: chapter.examWeight,
      level: 'chapter',
      path: chapterPath,
    });

    chapter.topics.forEach((topic, topicIndex) => {
      const topicPath = `${chapterPath}/${slug(topic.name)}`;
      const topicId = uuidV5(topicPath);
      const topicCode = `${chapterCode}-T${pad(topicIndex + 1)}`;

      rows.push({
        id: topicId,
        subject, chapter: chapter.name, topic: topic.name, name: topic.name,
        parentId: chapterId,
        boardCodes: [topicCode],
        examWeight: chapter.examWeight,
        level: 'topic',
        path: topicPath,
      });

      topic.concepts.forEach((conceptName, conceptIndex) => {
        const conceptPath = `${topicPath}/${slug(conceptName)}`;
        rows.push({
          id: uuidV5(conceptPath),
          subject, chapter: chapter.name, topic: topic.name, name: conceptName,
          parentId: topicId,
          boardCodes: [`${topicCode}-K${pad(conceptIndex + 1)}`],
          examWeight: chapter.examWeight,
          level: 'concept',
          path: conceptPath,
        });
      });
    });
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION — the taxonomy is an asset, so it is checked like one
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidationIssue {
  rule: string;
  detail: string;
  id?: UUID;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  counts: {
    total: number;
    subjects: number;
    chapters: number;
    topics: number;
    leaves: number;
    maxDepth: number;
  };
}

export function validateTaxonomy(rows: readonly BuiltConcept[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const byId = new Map<UUID, BuiltConcept>();

  // ── unique ids ──────────────────────────────────────────────────────────
  for (const r of rows) {
    if (byId.has(r.id)) {
      issues.push({ rule: 'duplicate-id', detail: `${r.path} collides with ${byId.get(r.id)!.path}`, id: r.id });
    }
    byId.set(r.id, r);
  }

  // ── unique paths, so ids are reproducible ───────────────────────────────
  const paths = new Set<string>();
  for (const r of rows) {
    if (paths.has(r.path)) issues.push({ rule: 'duplicate-path', detail: r.path, id: r.id });
    paths.add(r.path);
  }

  // ── no duplicate board codes, anywhere ──────────────────────────────────
  const codes = new Map<string, string>();
  for (const r of rows) {
    if (r.boardCodes.length === 0) {
      issues.push({ rule: 'missing-board-code', detail: r.path, id: r.id });
    }
    for (const code of r.boardCodes) {
      if (codes.has(code)) {
        issues.push({ rule: 'duplicate-board-code', detail: `${code} on ${r.path} and ${codes.get(code)}`, id: r.id });
      }
      codes.set(code, r.path);
    }
  }

  // ── valid parents, no orphans ───────────────────────────────────────────
  const roots = rows.filter(r => r.parentId === null);
  if (roots.length === 0) issues.push({ rule: 'no-root', detail: 'the tree has no root' });

  for (const r of rows) {
    if (r.parentId === null) {
      if (r.level !== 'subject') {
        issues.push({ rule: 'orphan', detail: `${r.path} has no parent but is a ${r.level}`, id: r.id });
      }
      continue;
    }
    const parent = byId.get(r.parentId);
    if (!parent) {
      issues.push({ rule: 'orphan', detail: `${r.path} references a parent that does not exist`, id: r.id });
      continue;
    }
    const expected: Record<ConceptLevel, ConceptLevel | null> = {
      subject: null, chapter: 'subject', topic: 'chapter', concept: 'topic',
    };
    if (expected[r.level] !== parent.level) {
      issues.push({
        rule: 'invalid-parent-level',
        detail: `${r.level} '${r.path}' has a ${parent.level} parent; expected ${expected[r.level]}`,
        id: r.id,
      });
    }
    if (parent.subject !== r.subject) {
      issues.push({ rule: 'cross-subject-parent', detail: r.path, id: r.id });
    }
  }

  // ── no cycles, and depth is bounded ─────────────────────────────────────
  let maxDepth = 0;
  for (const r of rows) {
    const seen = new Set<UUID>([r.id]);
    let depth = 0;
    let cursor: BuiltConcept | undefined = r;
    while (cursor?.parentId) {
      const next: BuiltConcept | undefined = byId.get(cursor.parentId);
      if (!next) break;
      if (seen.has(next.id)) {
        issues.push({ rule: 'cycle', detail: `cycle reached from ${r.path}`, id: r.id });
        break;
      }
      seen.add(next.id);
      cursor = next;
      depth += 1;
      if (depth > 16) {
        issues.push({ rule: 'cycle', detail: `runaway depth from ${r.path}`, id: r.id });
        break;
      }
    }
    if (depth > maxDepth) maxDepth = depth;
  }

  // ── every leaf belongs to exactly one chapter ───────────────────────────
  const hasChildren = new Set<UUID>();
  for (const r of rows) if (r.parentId) hasChildren.add(r.parentId);

  const leaves = rows.filter(r => !hasChildren.has(r.id));
  for (const leaf of leaves) {
    if (leaf.level !== 'concept') {
      issues.push({ rule: 'barren-branch', detail: `${leaf.level} '${leaf.path}' has no children`, id: leaf.id });
      continue;
    }
    const topic = leaf.parentId ? byId.get(leaf.parentId) : undefined;
    const chapter = topic?.parentId ? byId.get(topic.parentId) : undefined;
    if (!chapter || chapter.level !== 'chapter') {
      issues.push({ rule: 'leaf-without-chapter', detail: leaf.path, id: leaf.id });
      continue;
    }
    if (chapter.chapter !== leaf.chapter) {
      issues.push({
        rule: 'leaf-chapter-mismatch',
        detail: `${leaf.path} says '${leaf.chapter}' but its ancestor is '${chapter.chapter}'`,
        id: leaf.id,
      });
    }
  }

  // ── the path convention holds ───────────────────────────────────────────
  for (const r of rows) {
    if (r.level === 'subject' && !(r.chapter === r.subject && r.topic === r.subject && r.name === r.subject)) {
      issues.push({ rule: 'path-convention', detail: `subject row ${r.path}`, id: r.id });
    }
    if (r.level === 'chapter' && !(r.topic === r.chapter && r.name === r.chapter)) {
      issues.push({ rule: 'path-convention', detail: `chapter row ${r.path}`, id: r.id });
    }
    if (r.level === 'topic' && r.name !== r.topic) {
      issues.push({ rule: 'path-convention', detail: `topic row ${r.path}`, id: r.id });
    }
    if (!r.name.trim()) issues.push({ rule: 'empty-name', detail: r.path, id: r.id });
    if (!Number.isFinite(r.examWeight) || r.examWeight < 0) {
      issues.push({ rule: 'invalid-exam-weight', detail: `${r.path} = ${r.examWeight}`, id: r.id });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    counts: {
      total: rows.length,
      subjects: rows.filter(r => r.level === 'subject').length,
      chapters: rows.filter(r => r.level === 'chapter').length,
      topics: rows.filter(r => r.level === 'topic').length,
      leaves: rows.filter(r => r.level === 'concept').length,
      maxDepth,
    },
  };
}
